# routes/finance.py

from flask import request, jsonify, current_app
from flask_login import login_required, current_user
from extensions import db
from models.sales import Sale
from models.expense import Expense
from models.inventory import Product
from models.customer import Customer
from datetime import datetime, timedelta, timezone


def utcnow():
    return datetime.now(timezone.utc)


def get_current_shop_id():
    """
    Resolve the current shop from the session.
    Super admin (virtual AdminUser) has id=1 but is not a shop.
    Shop owners are `Shop` model instances whose id is the shop id.
    """
    if not current_user or not current_user.is_authenticated:
        return None
    if getattr(current_user, "is_admin", False):
        # Super admin has no shop; finance endpoints are shop-scoped
        return None
    return getattr(current_user, "id", None)


def _parse_period():
    """
    Parse start/end date query params. Returns (start, end) as tz-aware
    datetimes. Defaults to the current month. Raises ValueError on bad input
    so the caller can return 400 instead of 500.
    """
    now = utcnow()
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if start_date and end_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        )
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, microsecond=999999,
            tzinfo=timezone.utc,
        )
        return start, end

    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, now


def init_finance_routes(app):

    # ========================================================
    # OVERVIEW
    # ========================================================
    @app.route("/api/finance/overview", methods=["GET", "OPTIONS"])
    @login_required
    def get_finance_overview():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            try:
                start, end = _parse_period()
            except (ValueError, TypeError) as e:
                return jsonify({"error": f"Invalid date format: {e}"}), 400

            sales = (
                Sale.query.filter(
                    Sale.shop_id == shop_id,
                    Sale.created_at >= start,
                    Sale.created_at <= end,
                    Sale.status != "Cancelled",
                ).all()
            )
            total_revenue = sum(float(s.total or 0) for s in sales)
            sales_count = len(sales)

            expenses = (
                Expense.query.filter(
                    Expense.shop_id == shop_id,
                    Expense.date >= start.date(),
                    Expense.date <= end.date(),
                ).all()
            )
            total_expenses = sum(float(e.amount or 0) for e in expenses)
            paid_expenses = sum(
                float(e.amount or 0) for e in expenses if e.status == "Paid"
            )
            pending_expenses = sum(
                float(e.amount or 0) for e in expenses if e.status == "Pending"
            )

            net_profit = total_revenue - total_expenses

            products = Product.query.filter_by(shop_id=shop_id).all()
            low_stock = len(
                [p for p in products if p.get_status() == "Low Stock"]
            )
            out_of_stock = len(
                [p for p in products if p.get_status() == "Out of Stock"]
            )

            customers = Customer.query.filter_by(shop_id=shop_id).all()

            return (
                jsonify(
                    {
                        "revenue": {
                            "total": float(total_revenue),
                            "count": sales_count,
                            "average": float(total_revenue / sales_count)
                            if sales_count
                            else 0,
                        },
                        "expenses": {
                            "total": float(total_expenses),
                            "count": len(expenses),
                            "paid": float(paid_expenses),
                            "pending": float(pending_expenses),
                        },
                        "profit": {
                            "net": float(net_profit),
                            "margin": float(
                                (net_profit / total_revenue) * 100
                            )
                            if total_revenue > 0
                            else 0,
                        },
                        "products": {
                            "total": len(products),
                            "low_stock": low_stock,
                            "out_of_stock": out_of_stock,
                        },
                        "customers": {"total": len(customers)},
                        "period": {
                            "start": start.isoformat(),
                            "end": end.isoformat(),
                        },
                    }
                ),
                200,
            )
        except Exception as e:
            current_app.logger.exception("finance overview error")
            return jsonify({"error": str(e)}), 500

    # ========================================================
    # REVENUE LIST
    # ========================================================
    @app.route("/api/finance/revenue", methods=["GET", "OPTIONS"])
    @login_required
    def get_revenue_report():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            limit = request.args.get("limit", 50, type=int)

            query = Sale.query.filter(
                Sale.shop_id == shop_id, Sale.status != "Cancelled"
            )

            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, "%Y-%m-%d").replace(
                        tzinfo=timezone.utc
                    )
                    end = datetime.strptime(end_date, "%Y-%m-%d").replace(
                        hour=23, minute=59, second=59, tzinfo=timezone.utc
                    )
                except (ValueError, TypeError) as e:
                    return jsonify({"error": f"Invalid date format: {e}"}), 400
                query = query.filter(
                    Sale.created_at >= start, Sale.created_at <= end
                )

            sales = query.order_by(Sale.created_at.desc()).limit(limit).all()
            return jsonify(
                [
                    {
                        "id": s.id,
                        "date": s.created_at.isoformat()
                        if s.created_at
                        else None,
                        "total": float(s.total or 0),
                        "status": s.status,
                        "customer_name": s.customer_name,
                        "sale_number": s.sale_number,
                    }
                    for s in sales
                ]
            )
        except Exception as e:
            current_app.logger.exception("finance revenue error")
            return jsonify({"error": str(e)}), 500

    # ========================================================
    # EXPENSE LIST
    # ========================================================
    @app.route("/api/finance/expenses", methods=["GET", "OPTIONS"])
    @login_required
    def get_expense_report():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            limit = request.args.get("limit", 50, type=int)

            query = Expense.query.filter(Expense.shop_id == shop_id)
            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, "%Y-%m-%d")
                    end = datetime.strptime(end_date, "%Y-%m-%d")
                except (ValueError, TypeError) as e:
                    return jsonify({"error": f"Invalid date format: {e}"}), 400
                query = query.filter(
                    Expense.date >= start.date(), Expense.date <= end.date()
                )

            expenses = query.order_by(Expense.date.desc()).limit(limit).all()
            return jsonify(
                [
                    {
                        "id": e.id,
                        "date": e.date.isoformat() if e.date else None,
                        "amount": float(e.amount or 0),
                        "item_name": e.item_name,
                        "category": e.payment_method,
                        "status": e.status,
                        "reference": e.reference or "",
                    }
                    for e in expenses
                ]
            )
        except Exception as e:
            current_app.logger.exception("finance expense error")
            return jsonify({"error": str(e)}), 500

    # ========================================================
    # REVENUE CHART
    # ========================================================
    @app.route("/api/finance/revenue-chart", methods=["GET", "OPTIONS"])
    @login_required
    def get_revenue_chart_data():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            period = request.args.get("period", "month")
            now = utcnow()
            labels, data = [], []

            if period == "today":
                for hour in range(24):
                    start = now.replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    )
                    end = now.replace(
                        hour=hour, minute=59, second=59, microsecond=999999
                    )
                    sales = Sale.query.filter(
                        Sale.shop_id == shop_id,
                        Sale.created_at >= start,
                        Sale.created_at <= end,
                        Sale.status != "Cancelled",
                    ).all()
                    labels.append(f"{hour:02d}:00")
                    data.append(sum(float(s.total or 0) for s in sales))

            elif period == "week":
                for i in range(6, -1, -1):
                    day = now - timedelta(days=i)
                    start = day.replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    end = day.replace(
                        hour=23, minute=59, second=59, microsecond=999999
                    )
                    sales = Sale.query.filter(
                        Sale.shop_id == shop_id,
                        Sale.created_at >= start,
                        Sale.created_at <= end,
                        Sale.status != "Cancelled",
                    ).all()
                    labels.append(day.strftime("%a"))
                    data.append(sum(float(s.total or 0) for s in sales))

            elif period == "month":
                for day_num in range(1, now.day + 1):
                    start = now.replace(
                        day=day_num, hour=0, minute=0, second=0, microsecond=0
                    )
                    end = now.replace(
                        day=day_num,
                        hour=23,
                        minute=59,
                        second=59,
                        microsecond=999999,
                    )
                    sales = Sale.query.filter(
                        Sale.shop_id == shop_id,
                        Sale.created_at >= start,
                        Sale.created_at <= end,
                        Sale.status != "Cancelled",
                    ).all()
                    labels.append(str(day_num))
                    data.append(sum(float(s.total or 0) for s in sales))

            elif period == "quarter":
                quarter_month = (now.month - 1) // 3 * 3 + 1
                for i in range(3):
                    month = quarter_month + i
                    start = now.replace(
                        month=month,
                        day=1,
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
                    if month == 12:
                        end = now.replace(
                            month=12,
                            day=31,
                            hour=23,
                            minute=59,
                            second=59,
                            microsecond=999999,
                        )
                    else:
                        next_month = start.replace(month=month + 1)
                        end = next_month - timedelta(seconds=1)
                    sales = Sale.query.filter(
                        Sale.shop_id == shop_id,
                        Sale.created_at >= start,
                        Sale.created_at <= end,
                        Sale.status != "Cancelled",
                    ).all()
                    labels.append(start.strftime("%b"))
                    data.append(sum(float(s.total or 0) for s in sales))

            elif period == "year":
                for month in range(1, 13):
                    start = now.replace(
                        month=month,
                        day=1,
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
                    if month == 12:
                        end = now.replace(
                            month=12,
                            day=31,
                            hour=23,
                            minute=59,
                            second=59,
                            microsecond=999999,
                        )
                    else:
                        next_month = start.replace(month=month + 1)
                        end = next_month - timedelta(seconds=1)
                    sales = Sale.query.filter(
                        Sale.shop_id == shop_id,
                        Sale.created_at >= start,
                        Sale.created_at <= end,
                        Sale.status != "Cancelled",
                    ).all()
                    labels.append(start.strftime("%b"))
                    data.append(sum(float(s.total or 0) for s in sales))

            else:
                for i in range(11, -1, -1):
                    month = now - timedelta(days=30 * i)
                    start = month.replace(
                        day=1, hour=0, minute=0, second=0, microsecond=0
                    )
                    next_month = start.replace(
                        month=start.month % 12 + 1,
                        year=start.year + (1 if start.month == 12 else 0),
                    )
                    end = next_month - timedelta(seconds=1)
                    sales = Sale.query.filter(
                        Sale.shop_id == shop_id,
                        Sale.created_at >= start,
                        Sale.created_at <= end,
                        Sale.status != "Cancelled",
                    ).all()
                    labels.append(start.strftime("%b"))
                    data.append(sum(float(s.total or 0) for s in sales))

            return jsonify({"labels": labels, "data": data})
        except Exception as e:
            current_app.logger.exception("finance revenue-chart error")
            return jsonify({"error": str(e)}), 500

    # ========================================================
    # EXPENSE CHART
    # ========================================================
    @app.route("/api/finance/expense-chart", methods=["GET", "OPTIONS"])
    @login_required
    def get_expense_chart_data():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            period = request.args.get("period", "month")
            now = utcnow()
            labels, data = [], []

            if period == "today":
                for hour in range(24):
                    start = now.replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    )
                    end = now.replace(
                        hour=hour, minute=59, second=59, microsecond=999999
                    )
                    expenses = Expense.query.filter(
                        Expense.shop_id == shop_id,
                        Expense.created_at >= start,
                        Expense.created_at <= end,
                    ).all()
                    labels.append(f"{hour:02d}:00")
                    data.append(sum(float(e.amount or 0) for e in expenses))

            elif period == "week":
                for i in range(6, -1, -1):
                    day = now - timedelta(days=i)
                    start = day.replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    end = day.replace(
                        hour=23, minute=59, second=59, microsecond=999999
                    )
                    expenses = Expense.query.filter(
                        Expense.shop_id == shop_id,
                        Expense.created_at >= start,
                        Expense.created_at <= end,
                    ).all()
                    labels.append(day.strftime("%a"))
                    data.append(sum(float(e.amount or 0) for e in expenses))

            elif period == "month":
                for day_num in range(1, now.day + 1):
                    start = now.replace(
                        day=day_num, hour=0, minute=0, second=0, microsecond=0
                    )
                    end = now.replace(
                        day=day_num,
                        hour=23,
                        minute=59,
                        second=59,
                        microsecond=999999,
                    )
                    expenses = Expense.query.filter(
                        Expense.shop_id == shop_id,
                        Expense.created_at >= start,
                        Expense.created_at <= end,
                    ).all()
                    labels.append(str(day_num))
                    data.append(sum(float(e.amount or 0) for e in expenses))

            elif period == "quarter":
                quarter_month = (now.month - 1) // 3 * 3 + 1
                for i in range(3):
                    month = quarter_month + i
                    start = now.replace(
                        month=month,
                        day=1,
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
                    if month == 12:
                        end = now.replace(
                            month=12,
                            day=31,
                            hour=23,
                            minute=59,
                            second=59,
                            microsecond=999999,
                        )
                    else:
                        next_month = start.replace(month=month + 1)
                        end = next_month - timedelta(seconds=1)
                    expenses = Expense.query.filter(
                        Expense.shop_id == shop_id,
                        Expense.created_at >= start,
                        Expense.created_at <= end,
                    ).all()
                    labels.append(start.strftime("%b"))
                    data.append(sum(float(e.amount or 0) for e in expenses))

            elif period == "year":
                for month in range(1, 13):
                    start = now.replace(
                        month=month,
                        day=1,
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
                    if month == 12:
                        end = now.replace(
                            month=12,
                            day=31,
                            hour=23,
                            minute=59,
                            second=59,
                            microsecond=999999,
                        )
                    else:
                        next_month = start.replace(month=month + 1)
                        end = next_month - timedelta(seconds=1)
                    expenses = Expense.query.filter(
                        Expense.shop_id == shop_id,
                        Expense.created_at >= start,
                        Expense.created_at <= end,
                    ).all()
                    labels.append(start.strftime("%b"))
                    data.append(sum(float(e.amount or 0) for e in expenses))

            else:
                for i in range(11, -1, -1):
                    month = now - timedelta(days=30 * i)
                    start = month.replace(
                        day=1, hour=0, minute=0, second=0, microsecond=0
                    )
                    next_month = start.replace(
                        month=start.month % 12 + 1,
                        year=start.year + (1 if start.month == 12 else 0),
                    )
                    end = next_month - timedelta(seconds=1)
                    expenses = Expense.query.filter(
                        Expense.shop_id == shop_id,
                        Expense.created_at >= start,
                        Expense.created_at <= end,
                    ).all()
                    labels.append(start.strftime("%b"))
                    data.append(sum(float(e.amount or 0) for e in expenses))

            return jsonify({"labels": labels, "data": data})
        except Exception as e:
            current_app.logger.exception("finance expense-chart error")
            return jsonify({"error": str(e)}), 500

    # ========================================================
    # TRANSACTIONS (combined list)
    # ========================================================
    @app.route("/api/finance/transactions", methods=["GET", "OPTIONS"])
    @login_required
    def get_transactions():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            limit = request.args.get("limit", 20, type=int)

            sales = (
                Sale.query.filter(
                    Sale.shop_id == shop_id, Sale.status != "Cancelled"
                )
                .order_by(Sale.created_at.desc())
                .limit(limit)
                .all()
            )
            expenses = (
                Expense.query.filter(Expense.shop_id == shop_id)
                .order_by(Expense.date.desc())
                .limit(limit)
                .all()
            )

            transactions = []

            for s in sales:
                transactions.append(
                    {
                        "id": f"sale-{s.id}",
                        "numeric_id": s.id,
                        "description": (
                            f"Sale #{s.sale_number} - {s.customer_name}"
                        ),
                        "type": "Revenue",
                        "amount": float(s.total or 0),
                        "date": s.created_at.isoformat()
                        if s.created_at
                        else None,
                        "category": "Sales",
                        "status": s.status,
                        "source": "sale",
                    }
                )

            for e in expenses:
                transactions.append(
                    {
                        "id": f"expense-{e.id}",
                        "numeric_id": e.id,
                        "description": e.item_name,
                        "type": "Expense",
                        "amount": -float(e.amount or 0),
                        "date": e.date.isoformat() if e.date else None,
                        "category": e.payment_method,
                        "status": e.status,
                        "source": "expense",
                    }
                )

            transactions.sort(
                key=lambda x: x["date"] or "", reverse=True
            )
            return jsonify(transactions[:limit])
        except Exception as e:
            current_app.logger.exception("finance transactions error")
            return jsonify({"error": str(e)}), 500

    # ========================================================
    # SUMMARY
    # ========================================================
    @app.route("/api/finance/summary", methods=["GET", "OPTIONS"])
    @login_required
    def get_finance_summary():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            today = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_sales = Sale.query.filter(
                Sale.shop_id == shop_id,
                Sale.created_at >= today,
                Sale.status != "Cancelled",
            ).all()
            today_revenue = sum(float(s.total or 0) for s in today_sales)

            month_start = today.replace(day=1)
            month_sales = Sale.query.filter(
                Sale.shop_id == shop_id,
                Sale.created_at >= month_start,
                Sale.status != "Cancelled",
            ).all()
            month_revenue = sum(float(s.total or 0) for s in month_sales)

            today_expenses = Expense.query.filter(
                Expense.shop_id == shop_id, Expense.date == today.date()
            ).all()
            today_expense_total = sum(
                float(e.amount or 0) for e in today_expenses
            )

            month_expenses = Expense.query.filter(
                Expense.shop_id == shop_id, Expense.date >= month_start.date()
            ).all()
            month_expense_total = sum(
                float(e.amount or 0) for e in month_expenses
            )

            return jsonify(
                {
                    "today": {
                        "revenue": float(today_revenue),
                        "expenses": float(today_expense_total),
                        "profit": float(today_revenue - today_expense_total),
                    },
                    "month": {
                        "revenue": float(month_revenue),
                        "expenses": float(month_expense_total),
                        "profit": float(month_revenue - month_expense_total),
                    },
                }
            )
        except Exception as e:
            current_app.logger.exception("finance summary error")
            return jsonify({"error": str(e)}), 500

    # ========================================================
    # PROFIT / LOSS
    # ========================================================
    @app.route("/api/finance/profit-loss", methods=["GET", "OPTIONS"])
    @login_required
    def get_profit_loss():
        if request.method == "OPTIONS":
            return "", 204
        try:
            shop_id = get_current_shop_id()
            if not shop_id:
                return jsonify({"error": "Shop not found"}), 401

            try:
                start, end = _parse_period()
            except (ValueError, TypeError) as e:
                return jsonify({"error": f"Invalid date format: {e}"}), 400

            sales = Sale.query.filter(
                Sale.shop_id == shop_id,
                Sale.created_at >= start,
                Sale.created_at <= end,
                Sale.status != "Cancelled",
            ).all()
            total_revenue = sum(float(s.total or 0) for s in sales)

            expenses = Expense.query.filter(
                Expense.shop_id == shop_id,
                Expense.date >= start.date(),
                Expense.date <= end.date(),
            ).all()
            total_expenses = sum(float(e.amount or 0) for e in expenses)
            net_profit = total_revenue - total_expenses

            return jsonify(
                {
                    "total_revenue": float(total_revenue),
                    "total_expenses": float(total_expenses),
                    "net_profit": float(net_profit),
                    "profit_margin": float(
                        (net_profit / total_revenue) * 100
                    )
                    if total_revenue > 0
                    else 0,
                    "period": {
                        "start": start.isoformat(),
                        "end": end.isoformat(),
                    },
                }
            )
        except Exception as e:
            current_app.logger.exception("finance profit-loss error")
            return jsonify({"error": str(e)}), 500