import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv(override=True)


def _build_database_url():
    explicit = os.getenv("DATABASE_URL", "").strip()
    if explicit:
        if explicit.startswith("postgres://"):
            explicit = explicit.replace("postgres://", "postgresql://", 1)
        return explicit
    user = os.getenv("DB_USER", "tirsi_user")
    password = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "tirsi_pos_db")
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key")
    SQLALCHEMY_DATABASE_URI = _build_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
    }

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "superadmin@system.com").strip().lower()
    ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "").strip()
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

    SESSION_TYPE = "filesystem"
    SESSION_PERMANENT = True
    SESSION_USE_SIGNER = True
    SESSION_KEY_PREFIX = "tirsi_"
    SESSION_COOKIE_NAME = "session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_REFRESH_EACH_REQUEST = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = "Lax"

    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://pos-frontend-j0hd.onrender.com",
    ]
    CORS_SUPPORTS_CREDENTIALS = True

    APP_NAME = os.getenv("APP_NAME", "Tirsi POS")
    API_PREFIX = "/api"
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    ENV = os.getenv("ENV", "development")


class DevelopmentConfig(Config):
    DEBUG = True
    ENV = "development"
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = "Lax"


class ProductionConfig(Config):
    DEBUG = False
    ENV = "production"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "None"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}