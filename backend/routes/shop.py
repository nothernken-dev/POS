# ============================================================
# TIRSI POS API
# routes/shop.py
#
# Shop Authentication
# Shop Registration
# Shop Management
# Shop Statistics
# ============================================================

from flask import (
    request,
    jsonify,
    current_app,
)

from flask_login import (
    login_required,
    login_user,
    logout_user,
    current_user,
)

from datetime import datetime
import re

from models.shop import Shop
from extensions import db


# ============================================================
# HELPERS
# ============================================================

def admin_required():
    """
    Check whether the currently logged-in user is an admin.
    """
    if not current_user.is_authenticated:
        return False
    return getattr(current_user, "is_admin", False)


def shop_response(shop):
    """
    Convert Shop model into safe JSON response.
    """
    return {
        "id": shop.id,
        "name": shop.name,
        "email": shop.email,
        "phone": shop.phone,
        "address": shop.address,
        "owner": shop.owner,
        "subscription": shop.subscription,
        "status": shop.status,
        "revenue": float(shop.revenue or 0),
        "users": shop.users_count,
        "createdAt": (
            shop.created_at.strftime("%Y-%m-%d")
            if shop.created_at
            else None
        ),
        "lastActive": (
            shop.last_active.strftime("%Y-%m-%d %H:%M")
            if shop.last_active
            else None
        ),
    }


def handle_cors_preflight():
    """
    Handle browser OPTIONS requests.
    """
    response = jsonify({"success": True})
    origin = request.headers.get("Origin")

    if origin:
        allowed_origins = current_app.config.get("CORS_ORIGINS", [])
        normalized_origin = origin.rstrip("/")

        if normalized_origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, "
                "X-Shop-ID, X-Requested-With, "
                "Accept, Origin, Cookie"
            )
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, "
                "DELETE, OPTIONS"
            )
            response.headers["Access-Control-Max-Age"] = "86400"

    return response, 200


def add_cors_headers(response):
    """
    Add CORS headers to normal responses.
    """
    origin = request.headers.get("Origin")

    if not origin:
        return response

    allowed_origins = current_app.config.get("CORS_ORIGINS", [])
    normalized_origin = origin.rstrip("/")

    if normalized_origin not in allowed_origins:
        return response

    if isinstance(response, tuple):
        flask_response = response[0]
        flask_response.headers["Access-Control-Allow-Origin"] = origin
        flask_response.headers["Access-Control-Allow-Credentials"] = "true"
        flask_response.headers["Vary"] = "Origin"
        return response

    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Vary"] = "Origin"

    return response


def valid_email(email):
    """
    Basic email validation.
    """
    if not email:
        return False
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(pattern, email) is not None


# ============================================================
# ROUTES INITIALIZER
# ============================================================

def init_shop_routes(app):

    # ========================================================
    # SHOP REGISTRATION (admin only)
    # ========================================================

    @app.route("/api/shops", methods=["POST", "OPTIONS"])
    @login_required
    def create_shop():
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            if not admin_required():
                current_app.logger.warning("create_shop: admin access required")
                response = jsonify({
                    "success": False,
                    "error": "Admin access required",
                })
                return add_cors_headers((response, 403))

            if not request.is_json:
                current_app.logger.warning(
                    f"create_shop: bad content-type {request.content_type}"
                )
                response = jsonify({
                    "success": False,
                    "error": "Content-Type must be application/json",
                })
                return add_cors_headers((response, 400))

            data = request.get_json()
            current_app.logger.info(f"create_shop payload: {data}")

            if not data:
                response = jsonify({
                    "success": False,
                    "error": "No shop data provided",
                })
                return add_cors_headers((response, 400))

            name = str(data.get("name", "")).strip()
            email = str(data.get("email", "")).strip().lower()
            phone = str(data.get("phone", "")).strip()
            address = str(data.get("address", "")).strip()
            owner = str(data.get("owner", "")).strip()
            password = data.get("password", "")
            subscription = str(data.get("subscription", "basic")).strip().lower()
            status = str(data.get("status", "active")).strip().lower()

            if not name:
                return add_cors_headers((
                    jsonify({"success": False, "error": "Shop name is required"}),
                    400,
                ))
            if not email:
                return add_cors_headers((
                    jsonify({"success": False, "error": "Shop email is required"}),
                    400,
                ))
            if not valid_email(email):
                return add_cors_headers((
                    jsonify({"success": False, "error": "Invalid email address"}),
                    400,
                ))
            if not password:
                return add_cors_headers((
                    jsonify({"success": False, "error": "Password is required"}),
                    400,
                ))
            if len(password) < 6:
                return add_cors_headers((
                    jsonify({
                        "success": False,
                        "error": "Password must be at least 6 characters",
                    }),
                    400,
                ))
            if not owner:
                return add_cors_headers((
                    jsonify({"success": False, "error": "Shop owner is required"}),
                    400,
                ))
            if subscription not in ["basic", "standard", "premium"]:
                return add_cors_headers((
                    jsonify({
                        "success": False,
                        "error": f"Invalid subscription: {subscription}",
                    }),
                    400,
                ))
            if status not in ["active", "inactive", "suspended"]:
                return add_cors_headers((
                    jsonify({
                        "success": False,
                        "error": f"Invalid status: {status}",
                    }),
                    400,
                ))

            existing_email = Shop.query.filter(Shop.email == email).first()
            if existing_email:
                return add_cors_headers((
                    jsonify({
                        "success": False,
                        "error": "A shop with this email already exists",
                    }),
                    409,
                ))

            if phone:
                existing_phone = Shop.query.filter(Shop.phone == phone).first()
                if existing_phone:
                    return add_cors_headers((
                        jsonify({
                            "success": False,
                            "error": "A shop with this phone number already exists",
                        }),
                        409,
                    ))

            shop = Shop(
                name=name,
                email=email,
                phone=phone,
                address=address,
                owner=owner,
                subscription=subscription,
                status=status,
                revenue=0,
                users_count=0,
                created_at=datetime.utcnow(),
                last_active=None,
            )
            shop.set_password(password)

            db.session.add(shop)
            db.session.commit()

            current_app.logger.info(f"Shop created: {email}")

            response = jsonify({
                "success": True,
                "message": "Shop registered successfully",
                "shop": shop_response(shop),
            })
            return add_cors_headers((response, 201))

        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Shop registration error: {e}")
            response = jsonify({
                "success": False,
                "error": "Failed to register shop. Please try again.",
            })
            return add_cors_headers((response, 500))

    # ========================================================
    # SHOP LOGIN
    # ========================================================

    @app.route("/api/shop/login", methods=["POST", "OPTIONS"])
    def shop_login():
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            if not request.is_json:
                response = jsonify({
                    "success": False,
                    "error": "Content-Type must be application/json",
                })
                return add_cors_headers((response, 400))

            data = request.get_json()
            if not data:
                response = jsonify({
                    "success": False,
                    "error": "No data provided",
                })
                return add_cors_headers((response, 400))

            email = str(data.get("email", "")).strip().lower()
            password = data.get("password")

            if not email or not password:
                response = jsonify({
                    "success": False,
                    "error": "Email and password are required",
                })
                return add_cors_headers((response, 400))

            shop = Shop.query.filter_by(email=email).first()
            if not shop:
                response = jsonify({
                    "success": False,
                    "error": "Invalid email or password",
                })
                return add_cors_headers((response, 401))

            if shop.status != "active":
                response = jsonify({
                    "success": False,
                    "error": "Shop account is inactive",
                })
                return add_cors_headers((response, 403))

            if not shop.check_password(password):
                response = jsonify({
                    "success": False,
                    "error": "Invalid email or password",
                })
                return add_cors_headers((response, 401))

            shop.last_active = datetime.utcnow()
            db.session.commit()

            login_user(shop, remember=True)

            response = jsonify({
                "success": True,
                "message": "Login successful",
                "shop": shop_response(shop),
                "user": {
                    "id": shop.id,
                    "email": shop.email,
                    "name": shop.name,
                    "owner": shop.owner,
                    "is_admin": False,
                    "role": "shop_owner",
                },
            })
            return add_cors_headers((response, 200))

        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Login error: {e}")
            response = jsonify({
                "success": False,
                "error": "Login failed. Please try again.",
            })
            return add_cors_headers((response, 500))

    # ========================================================
    # SHOP LOGOUT
    # ========================================================

    @app.route("/api/shop/logout", methods=["POST", "OPTIONS"])
    @login_required
    def shop_logout():
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            logout_user()
            response = jsonify({
                "success": True,
                "message": "Logged out successfully",
            })
            return add_cors_headers((response, 200))

        except Exception as e:
            current_app.logger.error(f"Logout error: {e}")
            response = jsonify({"success": False, "error": "Logout failed"})
            return add_cors_headers((response, 500))

    # ========================================================
    # GET CURRENT SHOP
    # ========================================================

    @app.route("/api/shop/me", methods=["GET", "OPTIONS"])
    @login_required
    def get_shop_profile():
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            if not isinstance(current_user, Shop):
                response = jsonify({
                    "success": False,
                    "error": "Shop account required",
                })
                return add_cors_headers((response, 403))

            shop = db.session.get(Shop, current_user.id)
            if not shop:
                response = jsonify({
                    "success": False,
                    "error": "Shop not found",
                })
                return add_cors_headers((response, 404))

            response = jsonify({
                "success": True,
                "shop": shop_response(shop),
            })
            return add_cors_headers((response, 200))

        except Exception as e:
            current_app.logger.error(f"Profile error: {e}")
            response = jsonify({
                "success": False,
                "error": "Failed to load profile",
            })
            return add_cors_headers((response, 500))

    # ========================================================
    # GET ALL SHOPS (admin only)
    # ========================================================

    @app.route("/api/shops", methods=["GET", "OPTIONS"])
    @login_required
    def get_shops():
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            if not admin_required():
                response = jsonify({
                    "success": False,
                    "error": "Admin access required",
                })
                return add_cors_headers((response, 403))

            shops = Shop.query.order_by(Shop.created_at.desc()).all()

            response = jsonify({
                "success": True,
                "shops": [shop_response(shop) for shop in shops],
                "total": len(shops),
            })
            return add_cors_headers((response, 200))

        except Exception as e:
            current_app.logger.error(f"Get shops error: {e}")
            response = jsonify({
                "success": False,
                "error": "Failed to fetch shops",
            })
            return add_cors_headers((response, 500))

    # ========================================================
    # UPDATE SHOP (admin only)
    # ========================================================

    @app.route("/api/shops/<int:shop_id>", methods=["PUT", "OPTIONS"])
    @login_required
    def update_shop(shop_id):
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            if not admin_required():
                response = jsonify({
                    "success": False,
                    "error": "Admin access required",
                })
                return add_cors_headers((response, 403))

            shop = db.session.get(Shop, shop_id)
            if not shop:
                response = jsonify({
                    "success": False,
                    "error": "Shop not found",
                })
                return add_cors_headers((response, 404))

            data = request.get_json()
            if not data:
                response = jsonify({
                    "success": False,
                    "error": "No data provided",
                })
                return add_cors_headers((response, 400))

            current_app.logger.info(f"update_shop #{shop_id} payload: {data}")

            if "name" in data:
                name = str(data["name"]).strip()
                if not name:
                    return add_cors_headers((
                        jsonify({"success": False, "error": "Shop name cannot be empty"}),
                        400,
                    ))
                shop.name = name

            if "email" in data:
                email = str(data["email"]).strip().lower()
                if not valid_email(email):
                    return add_cors_headers((
                        jsonify({"success": False, "error": "Invalid email address"}),
                        400,
                    ))
                existing = Shop.query.filter(
                    Shop.email == email,
                    Shop.id != shop_id,
                ).first()
                if existing:
                    return add_cors_headers((
                        jsonify({
                            "success": False,
                            "error": "Another shop with this email already exists",
                        }),
                        409,
                    ))
                shop.email = email

            if "phone" in data:
                shop.phone = str(data["phone"]).strip()

            if "address" in data:
                shop.address = str(data["address"]).strip()

            if "owner" in data:
                owner = str(data["owner"]).strip()
                if not owner:
                    return add_cors_headers((
                        jsonify({"success": False, "error": "Owner name cannot be empty"}),
                        400,
                    ))
                shop.owner = owner

            if "subscription" in data:
                sub = str(data["subscription"]).strip().lower()
                if sub not in ["basic", "standard", "premium"]:
                    return add_cors_headers((
                        jsonify({"success": False, "error": f"Invalid subscription: {sub}"}),
                        400,
                    ))
                shop.subscription = sub

            if "status" in data:
                st = str(data["status"]).strip().lower()
                if st not in ["active", "inactive", "suspended"]:
                    return add_cors_headers((
                        jsonify({"success": False, "error": f"Invalid status: {st}"}),
                        400,
                    ))
                shop.status = st

            if "password" in data and data["password"]:
                pwd = data["password"]
                if len(pwd) < 6:
                    return add_cors_headers((
                        jsonify({
                            "success": False,
                            "error": "Password must be at least 6 characters",
                        }),
                        400,
                    ))
                shop.set_password(pwd)

            shop.updated_at = datetime.utcnow()
            db.session.commit()

            response = jsonify({
                "success": True,
                "message": "Shop updated successfully",
                "shop": shop_response(shop),
            })
            return add_cors_headers((response, 200))

        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Shop update error: {e}")
            response = jsonify({
                "success": False,
                "error": "Failed to update shop.",
            })
            return add_cors_headers((response, 500))

    # ========================================================
    # DELETE SHOP (admin only)
    # ========================================================

    @app.route("/api/shops/<int:shop_id>", methods=["DELETE", "OPTIONS"])
    @login_required
    def delete_shop(shop_id):
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            if not admin_required():
                response = jsonify({
                    "success": False,
                    "error": "Admin access required",
                })
                return add_cors_headers((response, 403))

            shop = db.session.get(Shop, shop_id)
            if not shop:
                response = jsonify({
                    "success": False,
                    "error": "Shop not found",
                })
                return add_cors_headers((response, 404))

            current_app.logger.info(f"Deleting shop #{shop_id}: {shop.email}")

            db.session.delete(shop)
            db.session.commit()

            response = jsonify({
                "success": True,
                "message": "Shop deleted successfully",
            })
            return add_cors_headers((response, 200))

        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Shop delete error: {e}")
            response = jsonify({
                "success": False,
                "error": f"Failed to delete shop: {str(e)}",
            })
            return add_cors_headers((response, 500))

    # ========================================================
    # SHOP STATISTICS (admin only)
    # ========================================================

    @app.route("/api/shops/stats", methods=["GET", "OPTIONS"])
    @login_required
    def get_shop_stats():
        if request.method == "OPTIONS":
            return handle_cors_preflight()

        try:
            if not admin_required():
                response = jsonify({
                    "success": False,
                    "error": "Admin access required",
                })
                return add_cors_headers((response, 403))

            total_revenue = (
                db.session
                .query(db.func.sum(Shop.revenue))
                .scalar()
                or 0
            )

            stats = {
                "total": Shop.query.count(),
                "active": Shop.query.filter_by(status="active").count(),
                "inactive": Shop.query.filter_by(status="inactive").count(),
                "suspended": Shop.query.filter_by(status="suspended").count(),
                "premium": Shop.query.filter_by(subscription="premium").count(),
                "standard": Shop.query.filter_by(subscription="standard").count(),
                "basic": Shop.query.filter_by(subscription="basic").count(),
                "totalRevenue": float(total_revenue),
            }

            response = jsonify({"success": True, "stats": stats})
            return add_cors_headers((response, 200))

        except Exception as e:
            current_app.logger.error(f"Stats error: {e}")
            response = jsonify({
                "success": False,
                "error": "Failed to fetch stats",
            })
            return add_cors_headers((response, 500))


# ============================================================
# END OF routes/shop.py
# ============================================================