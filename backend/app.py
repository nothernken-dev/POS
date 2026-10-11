import os
import traceback
import tempfile
from datetime import timedelta, datetime, timezone

from dotenv import load_dotenv

from flask import Flask, jsonify, request, session, current_app

from flask_cors import CORS
from flask_session import Session
from flask_login import LoginManager, current_user

from sqlalchemy import text

from extensions import db, migrate, bcrypt
from models.shop import Shop
from routes.auth import AdminUser
from routes import init_routes


load_dotenv(override=True)


def utcnow():
    return datetime.now(timezone.utc)


login_manager = LoginManager()
login_manager.login_view = None

DEFAULT_FRONTEND_URL = "https://pos-frontend-j0hd.onrender.com"
LOCAL_FRONTEND_URLS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def get_allowed_origins():
    configured = os.getenv("CORS_ORIGINS", "").strip()
    if configured:
        origins = [o.strip().rstrip("/") for o in configured.split(",") if o.strip()]
    else:
        origins = [DEFAULT_FRONTEND_URL, *LOCAL_FRONTEND_URLS]
    return list(dict.fromkeys(origins))


def get_request_origin():
    origin = request.headers.get("Origin")
    return origin.rstrip("/") if origin else None


def add_cors_headers(response):
    origin = get_request_origin()
    allowed = current_app.config.get("CORS_ORIGINS", [])
    if origin and origin in allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Vary"] = "Origin"
    return response


def create_app(config_name="development"):
    app = Flask(__name__)

    environment = os.getenv("ENV", config_name).strip().lower()
    app.config["ENV"] = environment
    app.config["DEBUG"] = os.getenv("DEBUG", "False").strip().lower() == "true"

    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        if environment == "production":
            raise RuntimeError("SECRET_KEY is required in production.")
        secret_key = "development-secret-key-change-me"
    app.config["SECRET_KEY"] = secret_key

    app.config["ADMIN_EMAIL"] = os.getenv("ADMIN_EMAIL", "superadmin@system.com").strip().lower()
    app.config["ADMIN_PASSWORD_HASH"] = os.getenv("ADMIN_PASSWORD_HASH", "").strip()

    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "tirsi_pos_db")
    db_user = os.getenv("DB_USER", "tirsi_user")
    db_password = os.getenv("DB_PASSWORD", "tirsi123")
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = (
            f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        )

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_timeout": 30,
        "pool_size": 5,
        "max_overflow": 10,
    }

    aiven_ca = os.getenv("AIVEN_CA_PATH")
    if aiven_ca and os.path.exists(aiven_ca):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"]["connect_args"] = {"ssl": {"ca": aiven_ca}}

    allowed_origins = get_allowed_origins()
    app.config["CORS_ORIGINS"] = allowed_origins

    session_dir = os.path.join(os.getcwd(), "flask_session")
    try:
        os.makedirs(session_dir, exist_ok=True)
    except Exception:
        session_dir = tempfile.gettempdir()

    app.config.update({
        "SESSION_TYPE": "filesystem",
        "SESSION_FILE_DIR": session_dir,
        "SESSION_FILE_THRESHOLD": 500,
        "SESSION_PERMANENT": True,
        "SESSION_USE_SIGNER": True,
        "SESSION_KEY_PREFIX": "tirsi_",
        "SESSION_COOKIE_NAME": "tirsi_session",
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_DOMAIN": None,
        "SESSION_REFRESH_EACH_REQUEST": True,
        "PERMANENT_SESSION_LIFETIME": timedelta(days=1),
    })

    if environment == "production":
        app.config["SESSION_COOKIE_SAMESITE"] = "None"
        app.config["SESSION_COOKIE_SECURE"] = True
        app.config["REMEMBER_COOKIE_SAMESITE"] = "None"
        app.config["REMEMBER_COOKIE_SECURE"] = True
    else:
        app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
        app.config["SESSION_COOKIE_SECURE"] = False
        app.config["REMEMBER_COOKIE_SAMESITE"] = "Lax"
        app.config["REMEMBER_COOKIE_SECURE"] = False

    app.config["REMEMBER_COOKIE_HTTPONLY"] = True
    app.config["REMEMBER_COOKIE_DOMAIN"] = None
    app.config["REMEMBER_COOKIE_DURATION"] = timedelta(days=1)

    print("=" * 70)
    print("🚀 STARTING TIRSI POS API (PostgreSQL)")
    print("=" * 70)
    print(f"Environment: {environment}")
    print(f"Debug: {app.config['DEBUG']}")
    print(f"Admin email: {app.config['ADMIN_EMAIL']}")
    print(f"DB host: {db_host}")
    print(f"DB port: {db_port}")
    print(f"DB name: {db_name}")
    print(f"DB user: {db_user}")
    print(f"DB source: {'DATABASE_URL' if database_url else 'DB_* variables'}")
    print(f"CORS origins: {allowed_origins}")
    print(f"Session dir: {session_dir}")
    print("=" * 70)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)

    CORS(
        app,
        resources={r"/api/*": {
            "origins": allowed_origins,
            "supports_credentials": True,
            "allow_headers": [
                "Content-Type", "Authorization", "X-Shop-ID",
                "X-Requested-With", "Accept", "Origin", "Cookie",
            ],
            "expose_headers": ["Content-Type", "Set-Cookie"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }},
        supports_credentials=True,
        allow_headers=[
            "Content-Type", "Authorization", "X-Shop-ID",
            "X-Requested-With", "Accept", "Origin", "Cookie",
        ],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        expose_headers=["Content-Type", "Set-Cookie"],
        max_age=86400,
    )

    Session(app)
    login_manager.init_app(app)
    login_manager.session_protection = "strong"

    @login_manager.user_loader
    def load_user(user_id):
        try:
            if not user_id:
                return None
            user_id = str(user_id)

            if user_id == "admin:1":
                return AdminUser(app.config["ADMIN_EMAIL"])

            try:
                shop_id = int(user_id)
            except (ValueError, TypeError):
                return None

            return db.session.get(Shop, shop_id)
        except Exception as e:
            app.logger.exception(f"User loader error: {e}")
            return None

    @login_manager.unauthorized_handler
    def unauthorized():
        response = jsonify({
            "success": False,
            "authenticated": False,
            "error": "Authentication required",
        })
        return add_cors_headers(response), 401

    init_routes(app)

    @app.route("/api/test", methods=["GET", "OPTIONS"])
    def api_test():
        if request.method == "OPTIONS":
            return add_cors_headers(jsonify({"success": True})), 204
        response = jsonify({
            "success": True,
            "message": "Tirsi POS API is working",
            "timestamp": utcnow().isoformat(),
            "environment": app.config["ENV"],
        })
        return add_cors_headers(response), 200

    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "name": "Tirsi POS API",
            "version": "1.0.0",
            "status": "running",
            "environment": app.config["ENV"],
        }), 200

    @app.route("/health", methods=["GET"])
    def health():
        try:
            with db.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return jsonify({
                "status": "healthy",
                "database": "connected",
                "environment": app.config["ENV"],
                "timestamp": utcnow().isoformat(),
            }), 200
        except Exception as e:
            app.logger.exception(f"Health check error: {e}")
            return jsonify({
                "status": "unhealthy",
                "database": "disconnected",
                "environment": app.config["ENV"],
                "error": str(e),
            }), 500

    @app.route("/api/auth/debug-session", methods=["GET"])
    def debug_session():
        return jsonify({
            "session_id": session.sid if hasattr(session, "sid") else None,
            "session_data": {k: str(v) for k, v in dict(session).items()},
            "cookies_received": request.cookies.to_dict(),
            "is_authenticated": current_user.is_authenticated,
            "user": {
                "id": current_user.get_id() if current_user.is_authenticated else None,
                "email": getattr(current_user, "email", None),
                "is_admin": getattr(current_user, "is_admin", False),
            },
            "session_cookie_name": app.config["SESSION_COOKIE_NAME"],
            "session_cookie_domain": app.config["SESSION_COOKIE_DOMAIN"],
            "session_cookie_samesite": app.config["SESSION_COOKIE_SAMESITE"],
            "session_cookie_secure": app.config["SESSION_COOKIE_SECURE"],
        }), 200

    @app.errorhandler(400)
    def handle_400(error):
        return add_cors_headers(jsonify({"success": False, "error": "Bad request"})), 400

    @app.errorhandler(401)
    def handle_401(error):
        return add_cors_headers(jsonify({
            "success": False, "authenticated": False, "error": "Unauthorized"
        })), 401

    @app.errorhandler(403)
    def handle_403(error):
        return add_cors_headers(jsonify({"success": False, "error": "Forbidden"})), 403

    @app.errorhandler(404)
    def handle_404(error):
        return add_cors_headers(jsonify({
            "success": False, "error": "Endpoint not found", "path": request.path
        })), 404

    @app.errorhandler(405)
    def handle_405(error):
        return add_cors_headers(jsonify({
            "success": False, "error": "Method not allowed",
            "method": request.method, "path": request.path
        })), 405

    @app.errorhandler(500)
    def handle_500(error):
        app.logger.exception("Unhandled server error")
        return add_cors_headers(jsonify({"success": False, "error": "Internal server error"})), 500

    test_database_connection(app)

    print("=" * 70)
    print("✅ TIRSI POS API READY")
    print("=" * 70)

    return app


def test_database_connection(app):
    print("=" * 70)
    print("🔍 TESTING DATABASE CONNECTION")
    print("=" * 70)
    try:
        with app.app_context():
            db.session.execute(text("SELECT 1")).scalar()
            print("✅ Database connected successfully")

            try:
                version = db.session.execute(text("SELECT version()")).scalar()
                print(f"✅ PostgreSQL version: {version[:80]}")
            except Exception:
                pass
    except Exception as e:
        print("❌ DATABASE CONNECTION FAILED")
        print(f"Error: {str(e)}")
        traceback.print_exc()
    print("=" * 70)


app = create_app(os.getenv("ENV", "development"))


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("DEBUG", "False").strip().lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)