from extensions import db
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class Staff(db.Model):
    __tablename__ = "staff"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    employee_id = db.Column(db.String(50), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(255))
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100))
    postal_code = db.Column(db.String(20))
    role = db.Column(db.String(50))
    department = db.Column(db.String(100))
    join_date = db.Column(db.Date)
    salary = db.Column(db.Numeric(10, 2))
    status = db.Column(db.String(20), default="Active")
    performance = db.Column(db.String(20), default="Good")
    tasks = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("shop_id", "email", name="uq_staff_shop_email"),
        db.UniqueConstraint("shop_id", "employee_id", name="uq_staff_shop_employee"),
        db.Index("ix_staff_shop_id", "shop_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "employee_id": self.employee_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "postal_code": self.postal_code,
            "role": self.role,
            "department": self.department,
            "join_date": self.join_date.isoformat() if self.join_date else None,
            "salary": float(self.salary or 0),
            "status": self.status,
            "performance": self.performance,
            "tasks": self.tasks or 0,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Staff {self.employee_id}: {self.first_name} {self.last_name}>"