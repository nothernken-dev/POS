from extensions import db
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)
    postal_code = db.Column(db.String(20), nullable=True)

    total_spent = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    total_orders = db.Column(db.Integer, default=0, nullable=False)
    tier = db.Column(db.String(20), default="Bronze")
    status = db.Column(db.String(20), default="Active")
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    last_activity = db.Column(db.DateTime(timezone=True), default=utcnow)

    shop = db.relationship("Shop", backref="customers", lazy=True)

    __table_args__ = (
        db.UniqueConstraint("shop_id", "email", name="uq_customer_shop_email"),
        db.Index("ix_customer_shop_id", "shop_id"),
    )

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_tier_color(self):
        colors = {
            "Platinum": "bg-gray-700",
            "Gold": "bg-yellow-500",
            "Silver": "bg-gray-400",
            "Bronze": "bg-amber-600",
        }
        return colors.get(self.tier, "bg-gray-400")

    def update_tier(self):
        spent = float(self.total_spent or 0)
        if spent >= 5000:
            self.tier = "Platinum"
        elif spent >= 2000:
            self.tier = "Gold"
        elif spent >= 500:
            self.tier = "Silver"
        else:
            self.tier = "Bronze"

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.get_full_name(),
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "postal_code": self.postal_code,
            "total_spent": float(self.total_spent or 0),
            "total_orders": self.total_orders,
            "tier": self.tier,
            "tier_color": self.get_tier_color(),
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
        }