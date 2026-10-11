from extensions import db
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(12, 2), nullable=False)
    cost = db.Column(db.Numeric(12, 2), default=0)
    stock = db.Column(db.Integer, default=0)
    stock_limit = db.Column(db.Integer, default=50)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    image_emoji = db.Column(db.String(10), default="📦")
    image_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    expected_profit_per_unit = db.Column(db.Numeric(12, 2), default=0)
    expected_profit_total = db.Column(db.Numeric(14, 2), default=0)
    profit_margin_percentage = db.Column(db.Numeric(6, 2), default=0)

    price_history = db.Column(db.Text, default="[]")

    supplier = db.relationship("Supplier", backref="products", lazy=True)
    shop = db.relationship("Shop", backref="products", lazy=True)

    __table_args__ = (
        db.UniqueConstraint("shop_id", "sku", name="uq_product_shop_sku"),
        db.Index("ix_product_shop_id", "shop_id"),
    )

    def calculate_profit(self):
        price = float(self.price or 0)
        cost = float(self.cost or 0)
        if price > 0:
            ppu = round(price - cost, 2)
            self.expected_profit_per_unit = ppu
            self.expected_profit_total = round(ppu * (self.stock or 0), 2)
            self.profit_margin_percentage = round((ppu / price) * 100, 2)
        else:
            self.expected_profit_per_unit = 0
            self.expected_profit_total = 0
            self.profit_margin_percentage = 0
        return float(self.expected_profit_per_unit)

    def add_price_history(self, old_price, old_cost):
        import json
        try:
            history = json.loads(self.price_history) if self.price_history else []
        except Exception:
            history = []

        old_price = float(old_price or 0)
        old_cost = float(old_cost or 0)
        new_price = float(self.price or 0)
        new_cost = float(self.cost or 0)

        if old_price != new_price or old_cost != new_cost:
            history.append({
                "date": utcnow().isoformat(),
                "old_price": round(old_price, 2),
                "new_price": round(new_price, 2),
                "old_cost": round(old_cost, 2),
                "new_cost": round(new_cost, 2),
                "old_profit": round(old_price - old_cost, 2),
                "new_profit": round(new_price - new_cost, 2),
            })
            self.price_history = json.dumps(history[-50:])

    def get_price_history(self):
        import json
        if self.price_history:
            try:
                return json.loads(self.price_history)
            except Exception:
                return []
        return []

    def get_status(self):
        if self.stock is None:
            return "Unknown"
        if self.stock >= (self.stock_limit or 0):
            return "In Stock"
        if self.stock > 0:
            return "Low Stock"
        return "Out of Stock"

    def to_dict(self, include_history=False):
        data = {
            "id": self.id,
            "shop_id": self.shop_id,
            "name": self.name,
            "sku": self.sku,
            "description": self.description,
            "price": float(self.price or 0),
            "cost": float(self.cost or 0),
            "stock": self.stock,
            "stock_limit": self.stock_limit,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
            "status": self.get_status(),
            "image_emoji": self.image_emoji,
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active,
            "expected_profit_per_unit": float(self.expected_profit_per_unit or 0),
            "expected_profit_total": float(self.expected_profit_total or 0),
            "profit_margin_percentage": float(self.profit_margin_percentage or 0),
        }
        if include_history:
            data["price_history"] = self.get_price_history()
        return data