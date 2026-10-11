from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.staff import Staff
from models.shop import Shop
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
import re


def utcnow():
    return datetime.now(timezone.utc)


staff_bp = Blueprint("staff", __name__, url_prefix="/api/staff")


def init_staff_routes(app):
    app.register_blueprint(staff_bp)


def generate_employee_id(shop_id):
    count = Staff.query.filter_by(shop_id=shop_id).count()
    return f"EMP-{shop_id:02d}-{count+1:04d}"


def validate_email(email):
    return re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email) is not None


def _get_shop_id_or_401():
    shop_id = request.args.get("shop_id")
    if not shop_id:
        return None
    return shop_id


@staff_bp.route("", methods=["GET"])
@login_required
def get_all_staff():
    try:
        shop_id = request.args.get("shop_id")
        if not shop_id:
            return jsonify({"error": "Shop ID is required"}), 400

        query = Staff.query.filter_by(shop_id=shop_id)
        if request.args.get("search"):
            search = f"%{request.args.get('search')}%"
            query = query.filter(db.or_(
                Staff.first_name.like(search), Staff.last_name.like(search),
                Staff.email.like(search), Staff.employee_id.like(search),
            ))
        if request.args.get("status"):
            query = query.filter_by(status=request.args.get("status"))
        if request.args.get("role"):
            query = query.filter_by(role=request.args.get("role"))
        if request.args.get("department"):
            query = query.filter_by(department=request.args.get("department"))

        staff = query.order_by(Staff.created_at.desc()).all()
        return jsonify([s.to_dict() for s in staff]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@staff_bp.route("/<int:staff_id>", methods=["GET"])
@login_required
def get_staff(staff_id):
    try:
        staff = db.session.get(Staff, staff_id)
        if not staff:
            return jsonify({"error": "Staff not found"}), 404
        return jsonify(staff.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@staff_bp.route("", methods=["POST"])
@login_required
def create_staff():
    try:
        data = request.get_json()
        required_fields = ["shop_id", "first_name", "last_name", "email", "phone",
                           "role", "department", "join_date", "salary"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400

        if not validate_email(data["email"]):
            return jsonify({"error": "Invalid email format"}), 400

        if not db.session.get(Shop, data["shop_id"]):
            return jsonify({"error": "Shop not found"}), 404

        if Staff.query.filter_by(shop_id=data["shop_id"], email=data["email"].strip().lower()).first():
            return jsonify({"error": f'Email {data["email"]} already registered in this shop.'}), 400

        employee_id = generate_employee_id(data["shop_id"])
        staff = Staff(
            shop_id=data["shop_id"], employee_id=employee_id,
            first_name=data["first_name"].strip(), last_name=data["last_name"].strip(),
            email=data["email"].strip().lower(), phone=data["phone"].strip(),
            address=data.get("address", "").strip(), city=data.get("city", "").strip(),
            state=data.get("state", "").strip(), country=data.get("country", "").strip(),
            postal_code=data.get("postal_code", "").strip(),
            role=data["role"], department=data["department"],
            join_date=datetime.strptime(data["join_date"], "%Y-%m-%d").date(),
            salary=float(data["salary"]),
            status=data.get("status", "Active"), performance=data.get("performance", "Good"),
            tasks=int(data.get("tasks", 0)), notes=data.get("notes", "").strip(),
        )
        db.session.add(staff)
        db.session.commit()
        return jsonify(staff.to_dict()), 201
    except IntegrityError as e:
        db.session.rollback()
        if "uq_staff_shop_email" in str(e):
            return jsonify({"error": "This email is already registered in this shop."}), 400
        if "uq_staff_shop_employee" in str(e):
            return jsonify({"error": "Employee ID conflict."}), 400
        return jsonify({"error": "Database error"}), 500
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@staff_bp.route("/<int:staff_id>", methods=["PUT"])
@login_required
def update_staff(staff_id):
    try:
        data = request.get_json()
        staff = db.session.get(Staff, staff_id)
        if not staff:
            return jsonify({"error": "Staff not found"}), 404

        if data.get("email") and data["email"] != staff.email:
            if not validate_email(data["email"]):
                return jsonify({"error": "Invalid email format"}), 400
            existing = Staff.query.filter(
                Staff.shop_id == staff.shop_id,
                Staff.email == data["email"].strip().lower(),
                Staff.id != staff_id,
            ).first()
            if existing:
                return jsonify({"error": "Email already registered in this shop."}), 400

        simple_fields = ["first_name", "last_name", "email", "phone", "address",
                         "city", "state", "country", "postal_code", "role",
                         "department", "status", "performance", "notes"]
        for field in simple_fields:
            if field in data and data[field] is not None:
                value = data[field].strip() if isinstance(data[field], str) else data[field]
                if field == "email":
                    value = value.lower()
                setattr(staff, field, value)

        if data.get("join_date"):
            staff.join_date = datetime.strptime(data["join_date"], "%Y-%m-%d").date()
        if data.get("salary") is not None:
            staff.salary = float(data["salary"])
        if data.get("tasks") is not None:
            staff.tasks = int(data["tasks"])

        db.session.commit()
        return jsonify(staff.to_dict()), 200
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "Database constraint violation"}), 400
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@staff_bp.route("/<int:staff_id>", methods=["DELETE"])
@login_required
def delete_staff(staff_id):
    try:
        staff = db.session.get(Staff, staff_id)
        if not staff:
            return jsonify({"error": "Staff not found"}), 404
        staff.status = "Inactive"
        db.session.commit()
        return jsonify({"message": f"Staff {staff.first_name} {staff.last_name} deactivated"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@staff_bp.route("/<int:staff_id>/role", methods=["PATCH"])
@login_required
def change_staff_role(staff_id):
    try:
        data = request.get_json()
        if not data.get("role"):
            return jsonify({"error": "Role is required"}), 400
        staff = db.session.get(Staff, staff_id)
        if not staff:
            return jsonify({"error": "Staff not found"}), 404
        staff.role = data["role"]
        db.session.commit()
        return jsonify(staff.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@staff_bp.route("/stats", methods=["GET"])
@login_required
def get_staff_stats():
    try:
        shop_id = request.args.get("shop_id")
        if not shop_id:
            return jsonify({"error": "Shop ID is required"}), 400

        staff = Staff.query.filter_by(shop_id=shop_id).all()
        role_breakdown = {}
        department_breakdown = {}
        for s in staff:
            role = s.role or "Unknown"
            role_breakdown[role] = role_breakdown.get(role, 0) + 1
            dept = s.department or "Unknown"
            department_breakdown[dept] = department_breakdown.get(dept, 0) + 1

        salaries = [float(s.salary) for s in staff if s.salary]
        total_salary = sum(salaries)

        return jsonify({
            "total": len(staff),
            "active": len([s for s in staff if s.status == "Active"]),
            "on_leave": len([s for s in staff if s.status == "On Leave"]),
            "inactive": len([s for s in staff if s.status == "Inactive"]),
            "role_breakdown": role_breakdown,
            "department_breakdown": department_breakdown,
            "total_salary": total_salary,
            "average_salary": (total_salary / len(salaries)) if salaries else 0,
            "total_tasks": sum(s.tasks or 0 for s in staff),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500