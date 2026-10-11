from extensions import db
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class Setting(db.Model):
    __tablename__ = "settings"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    key = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default="general")
    is_public = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    shop = db.relationship("Shop", backref="settings", lazy=True)

    __table_args__ = (
        db.UniqueConstraint("shop_id", "key", name="uq_setting_shop_key"),
        db.Index("ix_setting_shop_id", "shop_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "key": self.key,
            "value": self.value,
            "category": self.category,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class NotificationPreference(db.Model):
    __tablename__ = "notification_preferences"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    shop = db.relationship("Shop", backref="notification_preferences", lazy=True)

    __table_args__ = (
        db.UniqueConstraint("shop_id", "notification_type", name="uq_notif_shop_type"),
    )


class UserSecurity(db.Model):
    __tablename__ = "user_security"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    two_factor_auth = db.Column(db.Boolean, default=False, nullable=False)
    session_timeout = db.Column(db.Integer, default=30)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    shop = db.relationship("Shop", backref="user_security", lazy=True)