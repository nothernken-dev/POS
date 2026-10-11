from flask import request, jsonify, current_app
from flask_login import login_required, current_user
from models.payment import Payment
from models.shop import Shop
from extensions import db
from datetime import datetime, timezone
from dateutil import parser


def utcnow():
    return datetime.now(timezone.utc)


def init_payment_routes(app):

    @app.route("/api/payments", methods=["GET"])
    @login_required
    def get_payments():
        try:
            shop_id = request.args.get("shop_id")
            status = request.args.get("status")
            plan = request.args.get("plan")
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            search = request.args.get("search", "")

            query = Payment.query
            if shop_id:
                query = query.filter(Payment.shop_id == shop_id)
            if status and status != "all":
                query = query.filter(Payment.status == status)
            if plan and plan != "all":
                query = query.filter(Payment.plan == plan)
            if start_date:
                query = query.filter(Payment.payment_date >= start_date)
            if end_date:
                query = query.filter(Payment.payment_date <= end_date)
            if search:
                query = query.filter(db.or_(
                    Payment.transaction_id.ilike(f"%{search}%"),
                    Payment.receipt_number.ilike(f"%{search}%"),
                    Payment.customer_name.ilike(f"%{search}%"),
                    Payment.customer_email.ilike(f"%{search}%"),
                ))

            payments = query.order_by(Payment.payment_date.desc()).all()
            if hasattr(current_user, "shop_id") and current_user.shop_id:
                payments = [p for p in payments if p.shop_id == current_user.shop_id]

            return jsonify({
                "success": True,
                "payments": [p.to_dict() for p in payments],
                "total": len(payments),
            }), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching payments: {e}")
            return jsonify({"success": False, "error": "Failed to fetch payments"}), 500

    @app.route("/api/payments/<int:payment_id>", methods=["GET"])
    @login_required
    def get_payment(payment_id):
        try:
            payment = db.session.get(Payment, payment_id)
            if not payment:
                return jsonify({"success": False, "error": "Payment not found"}), 404
            return jsonify({"success": True, "payment": payment.to_dict()}), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching payment: {e}")
            return jsonify({"success": False, "error": "Failed to fetch payment"}), 500

    @app.route("/api/payments", methods=["POST"])
    @login_required
    def create_payment():
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "No data provided"}), 400

            required = ["shop_id", "amount", "payment_date", "customer_name"]
            missing = [f for f in required if not data.get(f)]
            if missing:
                return jsonify({"success": False, "error": f'Missing: {", ".join(missing)}'}), 400

            if not db.session.get(Shop, data["shop_id"]):
                return jsonify({"success": False, "error": "Shop not found"}), 404

            try:
                amount = float(data["amount"])
                if amount <= 0:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({"success": False, "error": "Invalid amount"}), 400

            plan = data.get("plan", "Basic")
            if plan not in Payment.get_plan_options():
                return jsonify({"success": False, "error": "Invalid plan"}), 400

            status = data.get("status", "pending")
            if status not in Payment.get_status_options():
                return jsonify({"success": False, "error": "Invalid status"}), 400

            payment_method = data.get("payment_method", "credit_card")
            if payment_method not in Payment.get_payment_method_options():
                return jsonify({"success": False, "error": "Invalid payment method"}), 400

            try:
                payment_date = parser.parse(data["payment_date"])
            except (ValueError, TypeError, OverflowError) as e:
                return jsonify({"success": False, "error": f"Invalid payment date: {e}"}), 400

            payment = Payment(
                shop_id=data["shop_id"], amount=amount, plan=plan,
                payment_method=payment_method, status=status,
                customer_name=data["customer_name"],
                customer_email=data.get("customer_email"),
                customer_phone=data.get("customer_phone"),
                payment_date=payment_date, notes=data.get("notes"),
            )
            db.session.add(payment)
            db.session.commit()
            return jsonify({
                "success": True,
                "message": "Payment created successfully",
                "payment": payment.to_dict(),
            }), 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating payment: {e}")
            return jsonify({"success": False, "error": f"Failed: {str(e)}"}), 500

    @app.route("/api/payments/<int:payment_id>", methods=["PUT"])
    @login_required
    def update_payment(payment_id):
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "No data provided"}), 400

            payment = db.session.get(Payment, payment_id)
            if not payment:
                return jsonify({"success": False, "error": "Payment not found"}), 404

            if "amount" in data:
                try:
                    amount = float(data["amount"])
                    if amount <= 0:
                        raise ValueError
                    payment.amount = amount
                except (ValueError, TypeError):
                    return jsonify({"success": False, "error": "Invalid amount"}), 400

            if "plan" in data:
                if data["plan"] not in Payment.get_plan_options():
                    return jsonify({"success": False, "error": "Invalid plan"}), 400
                payment.plan = data["plan"]

            if "status" in data:
                if data["status"] not in Payment.get_status_options():
                    return jsonify({"success": False, "error": "Invalid status"}), 400
                payment.status = data["status"]

            if "payment_method" in data:
                if data["payment_method"] not in Payment.get_payment_method_options():
                    return jsonify({"success": False, "error": "Invalid payment method"}), 400
                payment.payment_method = data["payment_method"]

            for f in ["customer_name", "customer_email", "customer_phone", "notes"]:
                if f in data:
                    setattr(payment, f, data[f])

            if "payment_date" in data:
                try:
                    payment.payment_date = parser.parse(data["payment_date"])
                except (ValueError, TypeError, OverflowError) as e:
                    return jsonify({"success": False, "error": f"Invalid date: {e}"}), 400

            db.session.commit()
            return jsonify({
                "success": True,
                "message": "Payment updated successfully",
                "payment": payment.to_dict(),
            }), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating payment: {e}")
            return jsonify({"success": False, "error": "Failed to update payment"}), 500

    @app.route("/api/payments/<int:payment_id>", methods=["DELETE"])
    @login_required
    def delete_payment(payment_id):
        try:
            payment = db.session.get(Payment, payment_id)
            if not payment:
                return jsonify({"success": False, "error": "Payment not found"}), 404
            if not getattr(current_user, "is_admin", False):
                return jsonify({"success": False, "error": "Access denied"}), 403
            db.session.delete(payment)
            db.session.commit()
            return jsonify({"success": True, "message": "Payment deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": "Failed to delete payment"}), 500

    @app.route("/api/payments/stats", methods=["GET"])
    @login_required
    def get_payment_stats():
        try:
            shop_id = request.args.get("shop_id")
            query = Payment.query
            if shop_id:
                query = query.filter(Payment.shop_id == shop_id)
            if hasattr(current_user, "shop_id") and current_user.shop_id:
                query = query.filter(Payment.shop_id == current_user.shop_id)

            total_revenue = db.session.query(db.func.sum(Payment.amount)).filter(
                Payment.status == "completed"
            ).scalar() or 0

            revenue_by_plan = db.session.query(
                Payment.plan, db.func.sum(Payment.amount)
            ).filter(Payment.status == "completed").group_by(Payment.plan).all()

            thirty_days_ago = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            recent_revenue = db.session.query(db.func.sum(Payment.amount)).filter(
                Payment.status == "completed", Payment.payment_date >= thirty_days_ago
            ).scalar() or 0

            return jsonify({
                "success": True,
                "stats": {
                    "totalRevenue": float(total_revenue),
                    "pendingPayments": query.filter(Payment.status == "pending").count(),
                    "completedPayments": query.filter(Payment.status == "completed").count(),
                    "failedPayments": query.filter(Payment.status == "failed").count(),
                    "refundedPayments": query.filter(Payment.status == "refunded").count(),
                    "totalPayments": query.count(),
                    "revenueByPlan": [{"plan": p[0], "revenue": float(p[1])} for p in revenue_by_plan],
                    "recentRevenue": float(recent_revenue),
                },
            }), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching payment stats: {e}")
            return jsonify({"success": False, "error": "Failed to fetch stats"}), 500

    @app.route("/api/payments/<int:payment_id>/status", methods=["PATCH"])
    @login_required
    def update_payment_status(payment_id):
        try:
            data = request.get_json()
            status = data.get("status")
            if not status:
                return jsonify({"success": False, "error": "Status is required"}), 400

            payment = db.session.get(Payment, payment_id)
            if not payment:
                return jsonify({"success": False, "error": "Payment not found"}), 404

            if status not in Payment.get_status_options():
                return jsonify({"success": False, "error": "Invalid status"}), 400

            payment.status = status
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Payment status updated to {status}",
                "payment": payment.to_dict(),
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": "Failed to update payment status"}), 500