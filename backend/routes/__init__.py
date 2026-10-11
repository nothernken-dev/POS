from routes.auth import init_auth_routes
from routes.shop import init_shop_routes
from routes.inventory import init_inventory_routes
from routes.sales import init_sales_routes
from routes.expense import init_expense_routes
from routes.customer import init_customer_routes
from routes.supplier import init_supplier_routes
from routes.staff import init_staff_routes
from routes.finance import init_finance_routes
from routes.settings import init_settings_routes
from routes.userguide import init_userguide_routes
from routes.payment import init_payment_routes


def init_routes(app):
    init_auth_routes(app)
    init_shop_routes(app)
    init_inventory_routes(app)
    init_sales_routes(app)
    init_expense_routes(app)
    init_customer_routes(app)
    init_supplier_routes(app)
    init_staff_routes(app)
    init_finance_routes(app)
    init_settings_routes(app)
    init_userguide_routes(app)
    init_payment_routes(app)