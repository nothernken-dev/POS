
import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Printer,
  ChevronDown,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Wallet,
  X,
  Save,
  Minus,
  Plus as PlusIcon,
  Trash2,
  Package,
  Edit,
  UserPlus,
  Phone,
  Tag,
} from 'lucide-react';

import {
  salesService,
  inventoryService,
  customerService,
  reportService,
  authService,
} from '../service/api';

import { printReceipt } from '../utils/printReceipt';

const Sales = () => {
  // ---------- States ----------

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('Today');

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const [inventoryData, setInventoryData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [salesData, setSalesData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const initialSaleForm = {
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    payment_method: 'Cash',
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    notes: '',
    status: 'Completed',
  };

  const [saleForm, setSaleForm] = useState(initialSaleForm);

  // ---------- Helpers ----------

  const getShopId = () => {
    const user = authService.getCurrentUser();
    return user?.shopId;
  };

  const formatMoney = (amount) => {
    return `KES ${(Number(amount) || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Inventory stores product cost as `cost`. Sale APIs may return the
  // historical snapshot as `cost_price`, `unit_cost`, or `cost`.
  const getItemCost = (item) => {
    const rawCost =
      item?.cost_price ??
      item?.unit_cost ??
      item?.cost ??
      item?.cost_snapshot;

    if (
      rawCost === undefined ||
      rawCost === null ||
      rawCost === '' ||
      !Number.isFinite(Number(rawCost))
    ) {
      return null;
    }

    return Number(rawCost);
  };

  // Use the cost snapshot saved with the sale item, not today's inventory
  // cost. This keeps historical profit correct after product costs change.
  const calculateSaleProfit = (sale) => {
    if (!sale?.items?.length) return null;

    const itemCosts = sale.items.map(getItemCost);
    if (itemCosts.some((cost) => cost === null)) return null;

    const grossProfit = sale.items.reduce((total, item, index) => {
      const sellingPrice = Number(item.price) || 0;
      const buyingPrice = itemCosts[index];
      const qty = Number(item.quantity) || 0;

      return total + (sellingPrice - buyingPrice) * qty;
    }, 0);

    return grossProfit - (Number(sale.discount) || 0);
  };

  // ---------- Data Fetching ----------

  const fetchProducts = async () => {
    try {
      const shopId = getShopId();

      if (!shopId) {
        setError('Shop not found. Please login again.');
        return;
      }

      const data = await inventoryService.getAllProducts(shopId);

      setInventoryData(
        (data || []).filter((product) => Number(product.stock) > 0)
      );
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.error || 'Failed to load products.');
    }
  };

  const fetchCustomers = async () => {
    try {
      const shopId = getShopId();

      if (!shopId) return;

      const data = await customerService.getAllCustomers(shopId);

      setCustomersData(
        (data || []).filter(
          (customer) =>
            customer.status === 'Active' ||
            customer.status === 'active'
        )
      );
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchSales = async () => {
    try {
      const shopId = getShopId();

      if (!shopId) {
        setError('Shop not found. Please login again.');
        return;
      }

      const data = await salesService.getAllSales(shopId);

      setSalesData(data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err.response?.data?.error || 'Failed to load sales.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        fetchProducts(),
        fetchCustomers(),
        fetchSales(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // ---------- Calculate Sale Totals ----------

  useEffect(() => {
    const subtotal = saleForm.items.reduce(
      (sum, item) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    const discount = Number(saleForm.discount) || 0;

    const total = Math.max(0, subtotal - discount);

    setSaleForm((prev) => ({
      ...prev,
      subtotal,
      total,
    }));
  }, [saleForm.items, saleForm.discount]);

  // ---------- Profit Statistics ----------

  const activeSales = salesData.filter(
    (sale) => sale.status !== 'Cancelled'
  );

  const salesWithProfit = activeSales.filter(
    (sale) => calculateSaleProfit(sale) !== null
  );

  const totalProfit = salesWithProfit.reduce(
    (sum, sale) => sum + calculateSaleProfit(sale),
    0
  );

  const totalSales = activeSales.reduce(
    (sum, sale) => sum + (Number(sale.total) || 0),
    0
  );

  const totalDiscount = activeSales.reduce(
    (sum, sale) => sum + (Number(sale.discount) || 0),
    0
  );

  const completedSales = activeSales.filter(
    (sale) => sale.status === 'Completed'
  ).length;

  const totalOrders = activeSales.length;

  const pendingOrders = activeSales.filter(
    (sale) => sale.status === 'Pending'
  ).length;

  const refundedOrders = activeSales.filter(
    (sale) => sale.status === 'Refunded'
  ).length;

  // ---------- Print Receipt ----------

  const handlePrintReceipt = async (sale) => {
    if (!sale) return;

    try {
      const shop = authService.getCurrentUser();
      await printReceipt(sale, shop);
    } catch (err) {
      console.error('Receipt printing error:', err);
      setError('Failed to print receipt.');
    }
  };

  // ---------- Customer Selection ----------

  const handleCustomerSelect = (customerId) => {
    if (!customerId) {
      setSelectedCustomerId('');

      setSaleForm((prev) => ({
        ...prev,
        customer_id: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
      }));

      return;
    }

    const customer = customersData.find(
      (c) => String(c.id) === String(customerId)
    );

    if (customer) {
      setSelectedCustomerId(customerId);

      setSaleForm((prev) => ({
        ...prev,
        customer_id: customer.id,
        customer_name: customer.full_name,
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
      }));
    }
  };

  // ---------- Export Reports ----------

  const handleExport = async (format) => {
    try {
      setLoading(true);
      setError('');

      const shopId = getShopId();

      if (!shopId) {
        setError('Shop not found. Please login again.');
        return;
      }

      const params = {};

      if (selectedStatus !== 'All') {
        params.status = selectedStatus;
      }

      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      };

      const today = new Date();

      if (selectedPeriod === 'Today') {
        const date = formatDate(today);

        params.start_date = date;
        params.end_date = date;
      } else if (selectedPeriod === 'Yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const date = formatDate(yesterday);

        params.start_date = date;
        params.end_date = date;
      } else if (selectedPeriod === 'This Week') {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());

        const end = new Date(today);
        end.setDate(today.getDate() + (6 - today.getDay()));

        params.start_date = formatDate(start);
        params.end_date = formatDate(end);
      } else if (selectedPeriod === 'This Month') {
        const start = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

        const end = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );

        params.start_date = formatDate(start);
        params.end_date = formatDate(end);
      }

      const blob = await reportService.generateSalesReport(
        shopId,
        params
      );

      const link = document.createElement('a');
      const ext =
        format === 'excel'
          ? 'xlsx'
          : format === 'pdf'
            ? 'pdf'
            : 'docx';

      link.download = `sales_report_${formatDate(today)}.${ext}`;
      link.href = URL.createObjectURL(blob);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(link.href);

      setSuccess(
        `Sales report exported as ${format.toUpperCase()} successfully!`
      );

      setShowExportMenu(false);

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Export error:', err);

      setError(
        err.response?.data?.error ||
          'Failed to export sales data.'
      );

      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Cart Management ----------

  const addProductToSale = () => {
    if (!selectedProduct) return;

    if (quantity < 1) {
      return setError('Quantity must be at least 1.');
    }

    const existing = saleForm.items.find(
      (item) => item.product_id === selectedProduct.id
    );

    if (existing) {
      const newQty = existing.quantity + quantity;

      if (newQty > selectedProduct.stock) {
        return setError(
          `Only ${selectedProduct.stock} units available in stock.`
        );
      }

      setSaleForm((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.product_id === selectedProduct.id
            ? { ...item, quantity: newQty }
            : item
        ),
      }));
    } else {
      if (quantity > selectedProduct.stock) {
        return setError(
          `Only ${selectedProduct.stock} units available in stock.`
        );
      }

      setSaleForm((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            product_id: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            price: Number(selectedProduct.price) || 0,
            quantity,
            cost: Number(selectedProduct.cost) || 0,
            stock: selectedProduct.stock,
            image_url: selectedProduct.image_url,
          },
        ],
      }));
    }

    setSelectedProduct(null);
    setQuantity(1);
    setError('');
  };

  const removeItemFromSale = (productId) => {
    setSaleForm((prev) => ({
      ...prev,
      items: prev.items.filter(
        (item) => item.product_id !== productId
      ),
    }));
  };

  const updateItemQuantity = (productId, newQty) => {
    const product = inventoryData.find(
      (item) => item.id === productId
    );

    if (!product) {
      return setError('Product not found.');
    }

    if (newQty > product.stock) {
      return setError(
        `Only ${product.stock} units available in stock.`
      );
    }

    if (newQty < 1) return;

    setSaleForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: newQty }
          : item
      ),
    }));
  };

  // ---------- Reset Form ----------

  const resetForm = () => {
    setSaleForm(initialSaleForm);
    setSelectedCustomerId('');
    setSelectedProduct(null);
    setQuantity(1);
    setError('');
  };

  // ---------- Create Sale ----------

  const handleSubmitSale = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const shopId = getShopId();

    if (!shopId) {
      return setError('Shop not found. Please login again.');
    }

    if (saleForm.items.length === 0) {
      return setError('Please add at least one product to the sale.');
    }

    if (saleForm.discount > saleForm.subtotal) {
      return setError('Discount cannot exceed the subtotal.');
    }

    try {
      const saleData = {
        ...saleForm,
        customer_id: saleForm.customer_id || null,

        items: saleForm.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      // IMPORTANT:
      // The backend must read the product's `cost` from the database and
      // save it on the sale item as a historical cost snapshot (for example
      // `cost_price`). Do not trust a cost value submitted by the browser.

      const result = await salesService.createSale(
        shopId,
        saleData
      );

      setSuccess(
        `Sale #${result.sale_number || result.id} created successfully!`
      );

      setShowSaleModal(false);

      resetForm();

      await Promise.all([
        fetchProducts(),
        fetchSales(),
      ]);

      setTimeout(() => setSuccess(''), 5000);

      handlePrintReceipt(result);
    } catch (err) {
      console.error('Error creating sale:', err);

      setError(
        err.response?.data?.error || 'Failed to create sale.'
      );

      setTimeout(() => setError(''), 5000);
    }
  };

  // ---------- View Sale ----------

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setShowViewModal(true);
  };

  // ---------- Edit Sale ----------

  const handleEditSale = (sale) => {
    setSelectedSale(sale);

    setSaleForm({
      customer_id: sale.customer_id || '',
      customer_name: sale.customer_name || '',
      customer_email: sale.customer_email || '',
      customer_phone: sale.customer_phone || '',
      payment_method: sale.payment_method || 'Cash',
      items: sale.items || [],
      subtotal: sale.subtotal || 0,
      discount: sale.discount || 0,
      total: sale.total || 0,
      notes: sale.notes || '',
      status: sale.status || 'Completed',
    });

    setSelectedCustomerId(sale.customer_id || '');
    setShowEditModal(true);
  };

  const handleUpdateSale = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const shopId = getShopId();

    if (!shopId) {
      return setError('Shop not found. Please login again.');
    }

    try {
      await salesService.updateSale(
        shopId,
        selectedSale.id,
        {
          status: saleForm.status,
          notes: saleForm.notes,
          customer_name: saleForm.customer_name,
          customer_email: saleForm.customer_email,
          customer_phone: saleForm.customer_phone,
          payment_method: saleForm.payment_method,
        }
      );

      setSuccess(
        `Sale #${selectedSale.sale_number || selectedSale.id} updated successfully!`
      );

      setShowEditModal(false);

      await fetchSales();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error updating sale:', err);

      setError(
        err.response?.data?.error || 'Failed to update sale.'
      );

      setTimeout(() => setError(''), 5000);
    }
  };

  // ---------- Cancel Sale ----------

  const handleCancelSale = async (saleId) => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this sale?'
      )
    ) {
      return;
    }

    const shopId = getShopId();

    if (!shopId) {
      return setError('Shop not found. Please login again.');
    }

    try {
      await salesService.deleteSale(shopId, saleId);

      setSuccess('Sale cancelled successfully!');

      await Promise.all([
        fetchSales(),
        fetchProducts(),
      ]);

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error cancelling sale:', err);

      setError(
        err.response?.data?.error || 'Failed to cancel sale.'
      );

      setTimeout(() => setError(''), 5000);
    }
  };

  // ---------- Status Helpers ----------

  const getStatusDot = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500';
      case 'Pending':
        return 'bg-yellow-500';
      case 'Refunded':
        return 'bg-red-500';
      case 'Cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Refunded':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPaymentIcon = (payment) => {
    switch (payment) {
      case 'Credit Card':
      case 'Debit Card':
        return <CreditCard className="w-3.5 h-3.5" />;

      case 'Cash':
        return <DollarSign className="w-3.5 h-3.5" />;

      default:
        return <Wallet className="w-3.5 h-3.5" />;
    }
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-gray-400 to-gray-600',
      'from-gray-500 to-gray-700',
      'from-gray-300 to-gray-500',
      'from-gray-400 to-gray-600',
    ];

    const idx = (name || 'C')
      .split('')
      .reduce((a, c) => a + c.charCodeAt(0), 0);

    return colors[idx % colors.length];
  };

  // ---------- Filters ----------

  const statuses = [
    'All',
    'Completed',
    'Pending',
    'Refunded',
    'Cancelled',
  ];

  const periods = [
    'Today',
    'Yesterday',
    'This Week',
    'This Month',
    'Custom',
  ];

  const paymentMethods = [
    'Cash',
    'Credit Card',
    'Debit Card',
    'M-Pesa',
    'PayPal',
  ];

  const filteredData = salesData.filter((item) => {
    if (!showCancelled && item.status === 'Cancelled') {
      return false;
    }

    const search = searchTerm.toLowerCase();

    const idMatch = String(
      item.sale_number || item.id || ''
    )
      .toLowerCase()
      .includes(search);

    const customerMatch = (
      item.customer_name || ''
    )
      .toLowerCase()
      .includes(search);

    const matchesSearch = idMatch || customerMatch;

    const matchesStatus =
      selectedStatus === 'All' ||
      item.status === selectedStatus;

    const saleDate = item.created_at
      ? new Date(item.created_at)
      : null;

    const now = new Date();

    let matchesPeriod = true;

    if (selectedPeriod !== 'Custom' && saleDate) {
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const saleDay = new Date(
        saleDate.getFullYear(),
        saleDate.getMonth(),
        saleDate.getDate()
      );

      if (selectedPeriod === 'Today') {
        matchesPeriod = saleDay.getTime() === today.getTime();
      } else if (selectedPeriod === 'Yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        matchesPeriod =
          saleDay.getTime() === yesterday.getTime();
      } else if (selectedPeriod === 'This Week') {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());

        const end = new Date(start);
        end.setDate(start.getDate() + 7);

        matchesPeriod =
          saleDay >= start && saleDay < end;
      } else if (selectedPeriod === 'This Month') {
        matchesPeriod =
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  // ---------- UI ----------

  return (
    <div>
      {/* Alerts */}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />

          <span>{error}</span>

          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          {success}

          <button
            onClick={() => setSuccess('')}
            className="ml-2 text-green-500 hover:text-green-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Sales Management
          </h2>

          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage all your sales orders and profits
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] overflow-hidden">
                {[
                  {
                    format: 'excel',
                    title: 'Excel',
                    description: '.xlsx format',
                    icon: '📊',
                  },
                  {
                    format: 'pdf',
                    title: 'PDF',
                    description: '.pdf format',
                    icon: '📄',
                  },
                  {
                    format: 'word',
                    title: 'Word',
                    description: '.docx format',
                    icon: '📝',
                  },
                ].map((item) => (
                  <button
                    key={item.format}
                    onClick={() => handleExport(item.format)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3 border-b last:border-0 border-gray-100"
                  >
                    <span className="text-xl">{item.icon}</span>

                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowSaleModal(true);
            }}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Sale
          </button>
        </div>
      </div>

      {/* Statistics Cards */}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={formatMoney(totalSales)}
          icon={<DollarSign className="w-4 h-4 text-gray-600" />}
          sub="All non-cancelled sales"
        />

        <StatCard
          label="Total Profit"
          value={formatMoney(totalProfit)}
          icon={<TrendingUp className="w-4 h-4 text-green-600" />}
          iconBg="bg-green-100"
          valueColor={
            totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
          }
          sub={`${salesWithProfit.length} sales with cost data`}
        />

        <StatCard
          label="Total Orders"
          value={totalOrders}
          icon={<ShoppingCart className="w-4 h-4 text-gray-600" />}
          sub={`${pendingOrders} pending`}
        />

        <StatCard
          label="Total Discount"
          value={formatMoney(totalDiscount)}
          icon={<Tag className="w-4 h-4 text-orange-600" />}
          iconBg="bg-orange-100"
          valueColor="text-orange-600"
          sub={
            totalSales + totalDiscount > 0
              ? `${(
                  (totalDiscount /
                    (totalSales + totalDiscount)) *
                  100
                ).toFixed(1)}% of gross`
              : '0% of gross'
          }
        />

        <StatCard
          label="Completed"
          value={completedSales}
          icon={<CheckCircle className="w-4 h-4 text-green-600" />}
          valueColor="text-green-600"
          sub={
            totalOrders
              ? `${(
                  (completedSales / totalOrders) *
                  100
                ).toFixed(0)}% completion rate`
              : '0% completion rate'
          }
        />

        <StatCard
          label="Refunded"
          value={refundedOrders}
          icon={<XCircle className="w-4 h-4 text-red-600" />}
          valueColor="text-red-600"
          sub={
            totalOrders
              ? `${(
                  (refundedOrders / totalOrders) *
                  100
                ).toFixed(0)}% refund rate`
              : '0% refund rate'
          }
        />
      </div>

      {/* Filters */}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          <input
            type="text"
            placeholder="Search orders by ID or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50 hover:bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg bg-white"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg bg-white"
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>

            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) =>
                  setShowCancelled(e.target.checked)
                }
                className="rounded border-gray-300 h-4 w-4"
              />

              Show Cancelled
            </label>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedStatus('All');
              setSelectedPeriod('Today');
              setShowCancelled(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  'ID',
                  'Customer',
                  'Date',
                  'Item Names',
                  'Items',
                  'Qty',
                  
                  'Discount',
                  'Profit',
                  'Payment',
                  'Total',
                  'Status',
                  '',
                ].map((heading, index) => (
                  <th
                    key={index}
                    className="text-left py-3.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />

                    <p className="mt-4 text-gray-500">
                      Loading sales...
                    </p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan="13"
                    className="text-center py-12 text-gray-500"
                  >
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />

                    <p className="text-lg font-medium">
                      No orders found
                    </p>

                    <p className="text-sm">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((order) => {
                  const uniqueItems = order.items?.length || 0;

                  const totalQuantity =
                    order.items?.reduce(
                      (sum, item) =>
                        sum + (Number(item.quantity) || 0),
                      0
                    ) || 0;

                  const itemNames =
                    order.items
                      ?.map(
                        (item) =>
                          item.product_name || item.name
                      )
                      .join(', ') || 'No items';

                  const discount =
                    Number(order.discount) || 0;

                  const profit = calculateSaleProfit(order);

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-600 whitespace-nowrap">
                        #{ order.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
                              order.customer_name || 'C'
                            )} flex items-center justify-center text-white font-semibold text-xs`}
                          >
                            {(order.customer_name || 'C')
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span className="text-gray-900 font-medium whitespace-nowrap">
                            {order.customer_name ||
                              'W-i-c'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {order.created_at
                          ? new Date(
                              order.created_at
                            ).toLocaleString()
                          : 'N/A'}
                      </td>

                      <td className="py-3 px-4">
                        <div
                          className="max-w-xs truncate"
                          title={itemNames}
                        >
                          {itemNames}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-100 px-2 py-1 rounded-full text-xs font-medium text-blue-700">
                          {uniqueItems}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center bg-gray-100 px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                          {totalQuantity}
                        </span>
                      </td>

                     

                      <td className="py-3 px-4">
                        {discount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
                            <Tag className="w-3 h-3" />
                            -{formatMoney(discount)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            —
                          </span>
                        )}
                      </td>

                      {/* PROFIT COLUMN */}

                      <td className="py-3 px-4 whitespace-nowrap">
                        {profit !== null ? (
                          <span
                            className={`font-semibold ${
                              profit >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatMoney(profit)}
                          </span>
                        ) : (
                          <span
                            className="text-gray-400 text-xs"
                            title="Cost price is unavailable for one or more items"
                          >
                            N/A
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                          {getPaymentIcon(order.payment_method)}
                          {order.payment_method}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                        {formatMoney(order.total)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBgColor(
                            order.status
                          )}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${getStatusDot(
                              order.status
                            )}`}
                          />

                          {order.status}
                        </span>
                      </td>

                      <td className="py-3 px-2">
                        <div className="flex items-center gap-0.5">
                          <IconBtn
                            title="View"
                            onClick={() => handleViewSale(order)}
                          >
                            <Eye className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                          </IconBtn>

                          <IconBtn
                            title="Print Receipt"
                            onClick={() =>
                              handlePrintReceipt(order)
                            }
                          >
                            <Printer className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                          </IconBtn>

                          <IconBtn
                            title="Edit"
                            onClick={() => handleEditSale(order)}
                          >
                            <Edit className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                          </IconBtn>

                          <IconBtn
                            title="Cancel"
                            onClick={() =>
                              handleCancelSale(order.id)
                            }
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW SALE MODAL */}

      {showSaleModal && (
        <ModalShell
          title="New Sale"
          onClose={() => setShowSaleModal(false)}
          maxWidth="max-w-4xl"
        >
          <form
            onSubmit={handleSubmitSale}
            className="p-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <Label required>Customer</Label>

                <div className="flex gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) =>
                      handleCustomerSelect(e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="">Walk-in Customer</option>

                    {customersData.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.full_name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      (window.location.href = '/customers')
                    }
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    title="Add New Customer"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <Label required>Payment Method</Label>

                <select
                  required
                  value={saleForm.payment_method}
                  onChange={(e) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      payment_method: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Customer Email</Label>

                <input
                  type="email"
                  value={saleForm.customer_email}
                  onChange={(e) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      customer_email: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Enter customer email"
                />
              </div>

              <div>
                <Label>Customer Phone</Label>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />

                  <input
                    type="tel"
                    value={saleForm.customer_phone}
                    onChange={(e) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        customer_phone: e.target.value,
                      }))
                    }
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="Enter customer phone"
                  />
                </div>
              </div>
            </div>

            {/* Add Products */}

            <div className="mb-6">
              <Label>Add Products</Label>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const product = inventoryData.find(
                      (item) =>
                        String(item.id) === e.target.value
                    );

                    setSelectedProduct(product || null);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select a product...</option>

                  {inventoryData.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} (Stock: {product.stock} -{' '}
                      {formatMoney(product.price)})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    )
                  }
                  className="w-full sm:w-24 px-3 py-2 border border-gray-200 rounded-lg"
                />

                <button
                  type="button"
                  onClick={addProductToSale}
                  disabled={!selectedProduct}
                  className={`px-4 py-2 rounded-lg text-white ${
                    selectedProduct
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cart Items */}

            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">
                Cart Items
              </h4>

              {saleForm.items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />

                  <p className="text-gray-500 text-sm">
                    No items added to cart
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {saleForm.items.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-500" />
                          )}
                        </div>

                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            SKU: {item.sku || 'N/A'}
                          </p>

                          <p className="text-xs text-gray-500">
                            Unit price: {formatMoney(item.price)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Unit cost: {formatMoney(item.cost)}
                          </p>
                          <p className={`text-xs font-semibold ${
                            (Number(item.price) - Number(item.cost)) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            Estimated profit: {formatMoney(
                              (Number(item.price) - Number(item.cost)) *
                              Number(item.quantity)
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateItemQuantity(
                                item.product_id,
                                item.quantity - 1
                              )
                            }
                            className="p-1 hover:bg-gray-200 rounded-lg"
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>

                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateItemQuantity(
                                item.product_id,
                                item.quantity + 1
                              )
                            }
                            className="p-1 hover:bg-gray-200 rounded-lg"
                          >
                            <PlusIcon className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        <span className="font-medium text-gray-900 whitespace-nowrap">
                          {formatMoney(
                            item.price * item.quantity
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeItemFromSale(item.product_id)
                          }
                          className="p-1 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}

            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal:
                  </span>

                  <span className="font-medium text-gray-900">
                    {formatMoney(saleForm.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Estimated profit before discount:
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatMoney(
                      saleForm.items.reduce(
                        (sum, item) =>
                          sum +
                          (Number(item.price) - (Number(item.cost) || 0)) *
                            Number(item.quantity),
                        0
                      )
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Discount:
                  </span>

                  <input
                    type="number"
                    min="0"
                    max={saleForm.subtotal}
                    step="0.01"
                    value={saleForm.discount}
                    onChange={(e) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        discount: Math.max(
                          0,
                          parseFloat(e.target.value) || 0
                        ),
                      }))
                    }
                    className="w-28 px-2 py-1 border border-gray-200 rounded text-right"
                  />
                </div>

                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total:</span>

                  <span className="text-blue-600">
                    {formatMoney(saleForm.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}

            <div className="mb-6">
              <Label>Notes</Label>

              <textarea
                value={saleForm.notes}
                onChange={(e) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                rows="2"
                placeholder="Add any notes about this sale..."
              />
            </div>

            {/* Actions */}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saleForm.items.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium shadow-md"
              >
                <Save className="w-4 h-4" />
                Complete Sale
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* VIEW SALE MODAL */}

      {showViewModal && selectedSale && (
        <ModalShell
          title="Sale Details"
          onClose={() => setShowViewModal(false)}
          maxWidth="max-w-3xl"
        >
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Info
                label="Sale Number"
                value={`#${selectedSale.sale_number || selectedSale.id}`}
              />

              <Info
                label="Date"
                value={
                  selectedSale.created_at
                    ? new Date(
                        selectedSale.created_at
                      ).toLocaleString()
                    : 'N/A'
                }
              />

              <Info
                label="Customer"
                value={
                  selectedSale.customer_name ||
                  'Walk-in Customer'
                }
              />

              <Info
                label="Email"
                value={selectedSale.customer_email || 'N/A'}
              />

              <Info
                label="Phone"
                value={selectedSale.customer_phone || 'N/A'}
              />

              <div>
                <p className="text-sm text-gray-500">Status</p>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBgColor(
                    selectedSale.status
                  )}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${getStatusDot(
                      selectedSale.status
                    )}`}
                  />

                  {selectedSale.status}
                </span>
              </div>

              <Info
                label="Payment Method"
                value={selectedSale.payment_method || 'N/A'}
              />

              <Info
                label="Total"
                value={formatMoney(selectedSale.total)}
              />

              {/* Profit Information */}

              <div>
                <p className="text-sm text-gray-500">
                  Sale Profit
                </p>

                {calculateSaleProfit(selectedSale) !== null ? (
                  <p
                    className={`font-bold text-lg ${
                      calculateSaleProfit(selectedSale) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatMoney(
                      calculateSaleProfit(selectedSale)
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">
                    Cost data unavailable
                  </p>
                )}
              </div>
            </div>

            <h4 className="font-medium text-gray-700 mb-3">
              Items Purchased
            </h4>

            <div className="bg-gray-50 rounded-lg overflow-x-auto border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {[
                      '#',
                      'Product',
                      'SKU',
                      'Cost',
                      'Price',
                      'Qty',
                      'Profit',
                      'Total',
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {selectedSale.items?.length > 0 ? (
                    selectedSale.items.map((item, index) => {
                      const costPrice = getItemCost(item);

                      const itemProfit =
                        costPrice !== null
                          ? (Number(item.price) - costPrice) *
                            Number(item.quantity)
                          : null;

                      return (
                        <tr
                          key={item.id || index}
                          className="border-b border-gray-200 last:border-0"
                        >
                          <td className="py-2 px-3 text-gray-500">
                            {index + 1}
                          </td>

                          <td className="py-2 px-3 font-medium text-gray-900">
                            {item.product_name || item.name}
                          </td>

                          <td className="py-2 px-3 text-gray-600">
                            {item.product_sku || item.sku || 'N/A'}
                          </td>

                          <td className="py-2 px-3 whitespace-nowrap">
                            {costPrice !== null
                              ? formatMoney(costPrice)
                              : 'N/A'}
                          </td>

                          <td className="py-2 px-3 whitespace-nowrap">
                            {formatMoney(item.price)}
                          </td>

                          <td className="py-2 px-3 text-center">
                            {item.quantity}
                          </td>

                          <td
                            className={`py-2 px-3 font-medium whitespace-nowrap ${
                              itemProfit === null
                                ? 'text-gray-400'
                                : itemProfit >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {itemProfit !== null
                              ? formatMoney(itemProfit)
                              : 'N/A'}
                          </td>

                          <td className="py-2 px-3 text-right font-medium text-gray-900 whitespace-nowrap">
                            {formatMoney(
                              Number(item.price) *
                                Number(item.quantity)
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-4 text-center text-gray-500"
                      >
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="bg-gray-100">
               

                  <tr>
                    <td
                      colSpan="7"
                      className="py-2 px-3 text-right font-medium text-gray-700"
                    >
                      Discount:
                    </td>

                    <td className="py-2 px-3 text-right font-medium text-orange-600">
                      -{formatMoney(selectedSale.discount)}
                    </td>
                  </tr>

                  <tr>
                    <td
                      colSpan="7"
                      className="py-2 px-3 text-right font-bold text-gray-900"
                    >
                      Total:
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-blue-600">
                      {formatMoney(selectedSale.total)}
                    </td>
                  </tr>

                  <tr>
                    <td
                      colSpan="7"
                      className="py-2 px-3 text-right font-bold text-gray-900"
                    >
                      Profit:
                    </td>

                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        calculateSaleProfit(selectedSale) === null
                          ? 'text-gray-400'
                          : calculateSaleProfit(selectedSale) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                      }`}
                    >
                      {calculateSaleProfit(selectedSale) !== null
                        ? formatMoney(
                            calculateSaleProfit(selectedSale)
                          )
                        : 'N/A'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedSale.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Notes</p>

                <p className="text-gray-700">
                  {selectedSale.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Close
              </button>

              <button
                onClick={() =>
                  handlePrintReceipt(selectedSale)
                }
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>

              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditSale(selectedSale);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                <Edit className="w-4 h-4" />
                Edit Sale
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* EDIT SALE MODAL */}

      {showEditModal && selectedSale && (
        <ModalShell
          title="Edit Sale"
          onClose={() => setShowEditModal(false)}
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={handleUpdateSale}
            className="p-6"
          >
            <div className="mb-4">
              <Label>Sale Number</Label>

              <input
                type="text"
                value={`#${selectedSale.sale_number || selectedSale.id}`}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <EditField
              label="Customer Name"
              value={saleForm.customer_name}
              onChange={(value) =>
                setSaleForm((prev) => ({
                  ...prev,
                  customer_name: value,
                }))
              }
            />

            <EditField
              label="Customer Email"
              type="email"
              value={saleForm.customer_email}
              onChange={(value) =>
                setSaleForm((prev) => ({
                  ...prev,
                  customer_email: value,
                }))
              }
            />

            <EditField
              label="Customer Phone"
              type="tel"
              value={saleForm.customer_phone}
              onChange={(value) =>
                setSaleForm((prev) => ({
                  ...prev,
                  customer_phone: value,
                }))
              }
            />

            <div className="mb-4">
              <Label required>Payment Method</Label>

              <select
                required
                value={saleForm.payment_method}
                onChange={(e) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    payment_method: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <Label required>Status</Label>

              <select
                required
                value={saleForm.status}
                onChange={(e) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option>Completed</option>
                <option>Pending</option>
                <option>Refunded</option>
                <option>Cancelled</option>
              </select>
            </div>

            <div className="mb-4">
              <Label>Notes</Label>

              <textarea
                value={saleForm.notes}
                onChange={(e) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                rows="3"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Update Sale
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

// ---------- Reusable Components ----------

const StatCard = ({
  label,
  value,
  icon,
  iconBg = 'bg-gray-100',
  valueColor = 'text-gray-900',
  sub,
  subColor = 'text-gray-500',
}) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-gray-600">
        {label}
      </p>

      <div className={`p-2 ${iconBg} rounded-lg`}>
        {icon}
      </div>
    </div>

    <p className={`text-xl lg:text-2xl font-bold ${valueColor}`}>
      {value}
    </p>

    {sub && (
      <div className={`flex items-center gap-1 mt-1 text-xs ${subColor}`}>
        <span>{sub}</span>
      </div>
    )}
  </div>
);

const IconBtn = ({ children, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
  >
    {children}
  </button>
);

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {children} {required && '*'}
  </label>
);

const Info = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="font-semibold text-gray-900">
      {value || 'N/A'}
    </p>
  </div>
);

const EditField = ({
  label,
  value,
  onChange,
  type = 'text',
}) => (
  <div className="mb-4">
    <Label>{label}</Label>

    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
    />
  </div>
);

const ModalShell = ({
  title,
  onClose,
  children,
  maxWidth = 'max-w-3xl',
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div
      className={`bg-white rounded-2xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto`}
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h3 className="text-xl font-bold text-gray-900">
          {title}
        </h3>

        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      {children}
    </div>
  </div>
);

export default Sales;
