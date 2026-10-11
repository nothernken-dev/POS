from extensions import db
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False)
    receipt_number = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    plan = db.Column(db.String(20), nullable=False, default="Basic")
    payment_method = db.Column(db.String(50), nullable=False, default="credit_card")
    status = db.Column(db.String(20), nullable=False, default="pending")
    customer_name = db.Column(db.String(100), nullable=False)
    customer_email = db.Column(db.String(100))
    customer_phone = db.Column(db.String(20))
    payment_date = db.Column(db.DateTime(timezone=True), nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    shop = db.relationship("Shop", backref=db.backref("payments", lazy=True, cascade="all, delete-orphan"))

    __table_args__ = (db.Index("ix_payment_shop_id", "shop_id"),)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.created_at:
            self.created_at = utcnow()
        if not self.transaction_id:
            self.generate_transaction_id()
        if not self.receipt_number:
            self.generate_receipt_number()

    def generate_transaction_id(self):
        ts = utcnow().strftime("%Y%m%d%H%M%S")
        suffix = str(abs(hash(str(utcnow().timestamp()))))[:4]
        self.transaction_id = f"TXN-{ts}-{suffix}"

    def generate_receipt_number(self):
        ts = utcnow().strftime("%Y%m%d")
        start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        count = Payment.query.filter(Payment.created_at >= start).count() + 1
        self.receipt_number = f"REC-{ts}-{str(count).zfill(4)}"

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "shop_name": self.shop.name if self.shop else None,
            "transaction_id": self.transaction_id,
            "receipt_number": self.receipt_number,
            "amount": float(self.amount or 0),
            "plan": self.plan,
            "payment_method": self.payment_method,
            "status": self.status,
            "customer_name": self.customer_name,
            "customer_email": self.customer_email,
            "customer_phone": self.customer_phone,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "formatted_amount": f"KES {float(self.amount or 0):,.0f}",
        }

    def __repr__(self):
        return f"<Payment {self.transaction_id} - {self.amount}>"

    @staticmethod
    def get_status_options():
        return ["pending", "completed", "failed", "refunded"]

    @staticmethod
    def get_plan_options():
        return ["Basic", "Standard", "Premium"]

    @staticmethod
    def get_payment_method_options():
        return ["credit_card", "bank_transfer", "mobile_money", "cash"]