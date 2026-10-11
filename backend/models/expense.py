from extensions import db
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    reference = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default="Pending")
    notes = db.Column(db.Text, nullable=True)
    receipt_url = db.Column(db.String(500), nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    shop = db.relationship("Shop", backref="expenses", lazy=True)

    __table_args__ = (db.Index("ix_expense_shop_id", "shop_id"),)

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "item_name": self.item_name,
            "amount": float(self.amount or 0),
            "date": self.date.isoformat() if self.date else None,
            "payment_method": self.payment_method,
            "reference": self.reference,
            "status": self.status,
            "notes": self.notes,
            "receipt_url": self.receipt_url,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }