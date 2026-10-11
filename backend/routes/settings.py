from flask import request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.settings import Setting, NotificationPreference, UserSecurity
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


def get_current_shop_id():
    if hasattr(current_user, "id"):
        return current_user.id
    return None


def init_settings_routes(app):

    @app.route("/api/settings", methods=["GET"])
    @login_required
    def get_settings():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            category = request.args.get("category")
            query = Setting.query.filter_by(shop_id=shop_id)
            if category:
                query = query.filter_by(category=category)
            return jsonify([s.to_dict() for s in query.all()])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/settings/<string:key>", methods=["GET"])
    @login_required
    def get_setting(key):
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            setting = Setting.query.filter_by(key=key, shop_id=shop_id).first()
            if not setting:
                return jsonify({"error": "Setting not found"}), 404
            return jsonify(setting.to_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/settings", methods=["POST"])
    @login_required
    def create_or_update_setting():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            data = request.get_json()
            if not data or "key" not in data:
                return jsonify({"error": "Key is required"}), 400

            setting = Setting.query.filter_by(key=data["key"], shop_id=shop_id).first()
            if setting:
                setting.value = data.get("value", "")
                setting.category = data.get("category", "general")
            else:
                setting = Setting(
                    shop_id=shop_id,
                    key=data["key"],
                    value=data.get("value", ""),
                    category=data.get("category", "general"),
                    is_public=data.get("is_public", False),
                )
                db.session.add(setting)

            db.session.commit()
            return jsonify(setting.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/settings/batch", methods=["POST"])
    @login_required
    def batch_update_settings():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            data = request.get_json()
            if not data or "settings" not in data:
                return jsonify({"error": "Settings array is required"}), 400

            updated = []
            for sd in data["settings"]:
                setting = Setting.query.filter_by(key=sd["key"], shop_id=shop_id).first()
                if setting:
                    setting.value = sd.get("value", "")
                    setting.category = sd.get("category", "general")
                else:
                    setting = Setting(
                        shop_id=shop_id, key=sd["key"], value=sd.get("value", ""),
                        category=sd.get("category", "general"),
                        is_public=sd.get("is_public", False),
                    )
                    db.session.add(setting)
                updated.append(setting.to_dict())

            db.session.commit()
            return jsonify({"message": f'Updated {len(updated)} settings', "settings": updated}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/notifications/preferences", methods=["GET"])
    @login_required
    def get_notification_preferences():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            preferences = NotificationPreference.query.filter_by(shop_id=shop_id).all()
            if not preferences:
                defaults = [
                    {"notification_type": "email", "enabled": True},
                    {"notification_type": "push", "enabled": True},
                    {"notification_type": "sms", "enabled": False},
                    {"notification_type": "marketing", "enabled": False},
                ]
                for p in defaults:
                    db.session.add(NotificationPreference(shop_id=shop_id, **p))
                db.session.commit()
                preferences = NotificationPreference.query.filter_by(shop_id=shop_id).all()

            return jsonify([{"type": p.notification_type, "enabled": p.enabled} for p in preferences])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/notifications/preferences", methods=["POST"])
    @login_required
    def update_notification_preferences():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            data = request.get_json()
            if not data or "preferences" not in data:
                return jsonify({"error": "Preferences array is required"}), 400

            for pd in data["preferences"]:
                pref = NotificationPreference.query.filter_by(
                    shop_id=shop_id, notification_type=pd["type"]
                ).first()
                if pref:
                    pref.enabled = pd.get("enabled", False)

            db.session.commit()
            return jsonify({"message": "Preferences updated successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/security/settings", methods=["GET"])
    @login_required
    def get_security_settings():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            security = UserSecurity.query.filter_by(shop_id=shop_id).first()
            if not security:
                security = UserSecurity(shop_id=shop_id, two_factor_auth=False, session_timeout=30)
                db.session.add(security)
                db.session.commit()

            return jsonify({
                "two_factor_auth": security.two_factor_auth,
                "session_timeout": security.session_timeout,
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/security/settings", methods=["POST"])
    @login_required
    def update_security_settings():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            data = request.get_json()

            security = UserSecurity.query.filter_by(shop_id=shop_id).first()
            if not security:
                security = UserSecurity(shop_id=shop_id)
                db.session.add(security)

            if "two_factor_auth" in data:
                security.two_factor_auth = data["two_factor_auth"]
            if "session_timeout" in data:
                security.session_timeout = int(data["session_timeout"])

            db.session.commit()
            return jsonify({
                "message": "Security settings updated",
                "settings": {
                    "two_factor_auth": security.two_factor_auth,
                    "session_timeout": security.session_timeout,
                },
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/security/change-password", methods=["POST"])
    @login_required
    def change_password():
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401
            data = request.get_json()
            if not data or "current_password" not in data or "new_password" not in data:
                return jsonify({"error": "Current and new password required"}), 400

            from models.shop import Shop
            shop = db.session.get(Shop, shop_id)
            if not shop:
                return jsonify({"error": "Shop not found"}), 404
            if not shop.check_password(data["current_password"]):
                return jsonify({"error": "Current password is incorrect"}), 400

            shop.set_password(data["new_password"])
            db.session.commit()
            return jsonify({"message": "Password changed successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500