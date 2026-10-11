from flask import request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.customer import Customer
from models.sales import Sale
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


def get_current_shop_id():
    if not current_user.is_authenticated:
        return None
    return getattr(current_user, "id", None)


def init_customer_routes(app):

    @app.route("/api/customers", methods=["GET"])
    @login_required
    def get_customers():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            status = request.args.get("status")
            tier = request.args.get("tier")
            search = request.args.get("search")

            query = Customer.query.filter_by(shop_id=shop_id)
            if status:
                query = query.filter_by(status=status)
            if tier:
                query = query.filter_by(tier=tier)
            if search:
                query = query.filter(db.or_(
                    Customer.first_name.contains(search),
                    Customer.last_name.contains(search),
                    Customer.email.contains(search),
                    Customer.phone.contains(search),
                ))

            customers = query.order_by(Customer.created_at.desc()).all()
            return jsonify([c.to_dict() for c in customers])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/customers/<int:customer_id>", methods=["GET"])
    @login_required
    def get_customer(customer_id):
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            customer = Customer.query.filter_by(id=customer_id, shop_id=shop_id).first()
            if not customer:
                return jsonify({"error": "Customer not found"}), 404
            return jsonify(customer.to_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/customers", methods=["POST"])
    @login_required
    def create_customer():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            data = request.get_json()
            required = ["first_name", "last_name", "email", "phone"]
            missing = [f for f in required if f not in data]
            if missing:
                return jsonify({"error": f'Missing required fields: {", ".join(missing)}'}), 400

            if Customer.query.filter_by(email=data["email"], shop_id=shop_id).first():
                return jsonify({"error": "Customer with this email already exists in your shop"}), 400

            customer = Customer(
                shop_id=shop_id,
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                phone=data["phone"],
                address=data.get("address", ""),
                city=data.get("city", ""),
                state=data.get("state", ""),
                country=data.get("country", ""),
                postal_code=data.get("postal_code", ""),
                status=data.get("status", "Active"),
                tier=data.get("tier", "Bronze"),
                notes=data.get("notes", ""),
            )
            db.session.add(customer)
            db.session.commit()
            return jsonify(customer.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/customers/<int:customer_id>", methods=["PUT"])
    @login_required
    def update_customer(customer_id):
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            customer = Customer.query.filter_by(id=customer_id, shop_id=shop_id).first()
            if not customer:
                return jsonify({"error": "Customer not found"}), 404

            data = request.get_json()
            if "email" in data:
                existing = Customer.query.filter_by(email=data["email"], shop_id=shop_id).first()
                if existing and existing.id != customer_id:
                    return jsonify({"error": "Email already in use in your shop"}), 400

            for field in [
                "first_name", "last_name", "email", "phone", "address",
                "city", "state", "country", "postal_code", "status", "tier", "notes",
            ]:
                if field in data:
                    setattr(customer, field, data[field])

            db.session.commit()
            return jsonify(customer.to_dict())
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/customers/<int:customer_id>", methods=["DELETE"])
    @login_required
    def delete_customer(customer_id):
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            customer = Customer.query.filter_by(id=customer_id, shop_id=shop_id).first()
            if not customer:
                return jsonify({"error": "Customer not found"}), 404
            customer.status = "Inactive"
            db.session.commit()
            return jsonify({"message": "Customer deactivated successfully"})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/customers/stats", methods=["GET"])
    @login_required
    def get_customer_stats():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            customers = Customer.query.filter_by(shop_id=shop_id).all()
            active = Customer.query.filter_by(shop_id=shop_id, status="Active").count()
            inactive = Customer.query.filter_by(shop_id=shop_id, status="Inactive").count()
            total_spent = sum(float(c.total_spent or 0) for c in customers)
            total_orders = sum(c.total_orders or 0 for c in customers)

            tier_breakdown = {
                "Platinum": Customer.query.filter_by(shop_id=shop_id, tier="Platinum").count(),
                "Gold": Customer.query.filter_by(shop_id=shop_id, tier="Gold").count(),
                "Silver": Customer.query.filter_by(shop_id=shop_id, tier="Silver").count(),
                "Bronze": Customer.query.filter_by(shop_id=shop_id, tier="Bronze").count(),
            }

            return jsonify({
                "total": len(customers),
                "active": active,
                "inactive": inactive,
                "total_spent": total_spent,
                "total_orders": total_orders,
                "average_spent": (total_spent / len(customers)) if customers else 0,
                "tier_breakdown": tier_breakdown,
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/customers/update-stats", methods=["POST"])
    @login_required
    def update_all_customer_stats():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            customers = Customer.query.filter_by(shop_id=shop_id).all()
            updated = 0

            for customer in customers:
                sales = Sale.query.filter_by(
                    customer_id=customer.id,
                    shop_id=shop_id,
                    status="Completed",
                ).all()
                if sales:
                    customer.total_spent = sum(float(s.total or 0) for s in sales)
                    customer.total_orders = len(sales)
                    customer.update_tier()
                    customer.last_activity = max(s.created_at for s in sales)
                    updated += 1

            db.session.commit()
            return jsonify({"message": f"Updated {updated} customers", "updated_count": updated}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500