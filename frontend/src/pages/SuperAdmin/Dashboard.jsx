// src/pages/SuperAdmin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  LogOut,
  CreditCard,
  Clock,
  TrendingDown
} from 'lucide-react';
import { shopService, authService, paymentService } from '../../service/api';

const SuperAdminDashboard = () => {
  const [shops, setShops] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalShops: 0,
    activeShops: 0,
    inactiveShops: 0,
    totalRevenue: 0,
    growth: 0,
    totalPayments: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    monthlyRevenue: 0,
    monthlyGrowth: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddShop, setShowAddShop] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = authService.getCurrentUser();

        if (!user || !user.is_admin) {
          navigate('/superadmin/login');
          return;
        }

        try {
          const session = await authService.checkSession();

          if (!session || !session.authenticated) {
            localStorage.removeItem('user');
            navigate('/superadmin/login');
            return;
          }
        } catch (sessionError) {
          if (!user || !user.is_admin) {
            navigate('/superadmin/login');
            return;
          }
        }

        fetchData();
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/superadmin/login');
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch all shops and payment data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const user = authService.getCurrentUser();

      if (!user || !user.is_admin) {
        navigate('/superadmin/login');
        return;
      }

      // Fetch shops
      const shopsResponse = await shopService.getAllShops();
      const shopsData = shopsResponse?.shops || shopsResponse || [];
      setShops(shopsData);

      // Fetch payments
      let paymentsData = [];
      try {
        const paymentsResponse = await paymentService.getAllPayments();
        paymentsData = paymentsResponse?.payments || paymentsResponse || [];
        setPayments(paymentsData);
      } catch (paymentError) {
        console.warn('Payments fetch failed:', paymentError);
        paymentsData = [];
      }

      // Fetch payment stats
      let paymentStatsData = {};
      try {
        const statsResponse = await paymentService.getPaymentStats();
        paymentStatsData = statsResponse?.stats || {};
        setPaymentStats(paymentStatsData);
      } catch (statsError) {
        console.warn('Payment stats fetch failed:', statsError);
        paymentStatsData = {};
      }

      // Calculate shop stats
      const activeShops = shopsData.filter(s => s.status === 'active').length || 0;
      const inactiveShops = shopsData.filter(s => s.status === 'inactive').length || 0;
      const totalShopRevenue = shopsData.reduce((acc, shop) => acc + (shop.revenue || 0), 0) || 0;

      // Payment stats
      const totalRevenue = paymentStatsData.totalRevenue || 0;
      const totalPayments = paymentStatsData.totalPayments || 0;
      const pendingPayments = paymentStatsData.pendingPayments || 0;
      const completedPayments = paymentStatsData.completedPayments || 0;
      const failedPayments = paymentStatsData.failedPayments || 0;
      const monthlyRevenue = paymentStatsData.recentRevenue || 0;

      // Monthly growth from completed payments
      let monthlyGrowth = 0;
      if (paymentsData.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const recentPayments = paymentsData.filter(p => {
          const date = new Date(p.payment_date);
          return date >= thirtyDaysAgo && p.status === 'completed';
        });
        const previousPayments = paymentsData.filter(p => {
          const date = new Date(p.payment_date);
          return date >= sixtyDaysAgo && date < thirtyDaysAgo && p.status === 'completed';
        });

        const recentTotal = recentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const previousTotal = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        monthlyGrowth = previousTotal > 0
          ? ((recentTotal - previousTotal) / previousTotal * 100)
          : 0;
      }

      setStats({
        totalShops: shopsData.length || 0,
        activeShops,
        inactiveShops,
        totalRevenue: totalShopRevenue + totalRevenue,
        growth: 12,
        totalPayments,
        pendingPayments,
        completedPayments,
        failedPayments,
        monthlyRevenue,
        monthlyGrowth
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      if (error.response?.status === 401) {
        authService.logout();
        navigate('/superadmin/login');
        return;
      }

      setError(
        error.response?.data?.error ||
        error.message ||
        'Failed to load dashboard data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/superadmin/login');
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (shopId) => {
    try {
      const shop = shops.find(s => s.id === shopId);
      if (!shop) return;

      const newStatus = shop.status === 'active' ? 'inactive' : 'active';
      await shopService.updateShop(shopId, { status: newStatus });

      setShops(shops.map(s => (s.id === shopId ? { ...s, status: newStatus } : s)));
      await fetchData();
    } catch (error) {
      console.error('Error toggling shop status:', error);
      setError('Failed to update shop status. Please try again.');
    }
  };

  // Handle delete shop
  const handleDeleteShop = async (shopId) => {
    if (!window.confirm('Are you sure you want to delete this shop? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await shopService.deleteShop(shopId);
      setShops(shops.filter(s => s.id !== shopId));
      await fetchData();
      setSelectedShop(null);
    } catch (error) {
      console.error('Error deleting shop:', error);
      setError('Failed to delete shop. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter shops based on search term
  const filteredShops = shops.filter(shop =>
    shop.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error loading dashboard</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
          <p className="text-gray-600">Overview of all shops, payments, and performance</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Shop Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Shops</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalShops}</p>
            </div>
            <Store className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Shops</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeShops}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive Shops</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactiveShops}</p>
            </div>
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Growth</p>
              <p className="text-2xl font-bold text-indigo-600">+{stats.growth}%</p>
            </div>
            <TrendingUp className="h-10 w-10 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Payment Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalPayments}</p>
            </div>
            <CreditCard className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedPayments}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
            </div>
            <Clock className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failedPayments}</p>
            </div>
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-purple-500" />
          </div>
          <div className={`text-sm ${stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
            {stats.monthlyGrowth >= 0 ? (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.monthlyGrowth.toFixed(1)}% from last month
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {stats.monthlyGrowth.toFixed(1)}% from last month
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search shops..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowAddShop(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Register New Shop
          </button>
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No shops found. Register your first shop!
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop) => {
                  const shopPayments = payments.filter(p => p.shop_id === shop.id);
                  const totalShopRevenue = shopPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                  const shopPaymentCount = shopPayments.length;

                  return (
                    <tr key={shop.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{shop.name}</div>
                          <div className="text-sm text-gray-500">ID: #{shop.id}</div>
                          <div className="text-xs text-gray-400">
                            {shopPaymentCount} payments · {formatCurrency(totalShopRevenue)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{shop.email}</div>
                        <div className="text-sm text-gray-500">{shop.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{shop.owner}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleStatusToggle(shop.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            shop.status === 'active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {shop.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(shop.revenue || totalShopRevenue)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedShop(shop)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Edit Shop"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteShop(shop.id)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            title="Delete Shop"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
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

      {/* Add Shop Modal */}
      {showAddShop && (
        <AddShopModal
          onClose={() => setShowAddShop(false)}
          onSuccess={() => {
            setShowAddShop(false);
            fetchData();
          }}
        />
      )}

      {/* Shop Details Modal */}
      {selectedShop && (
        <ShopDetailsModal
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
          onDelete={handleDeleteShop}
          payments={payments.filter(p => p.shop_id === selectedShop.id)}
        />
      )}
    </div>
  );
};

// ============================================================
// ADD SHOP MODAL
// ============================================================
const AddShopModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    owner: '',
    password: '',
    subscription: 'basic'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Shop name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.owner.trim()) {
      setError('Owner name is required');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await shopService.createShop(formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating shop:', error);
      setError(
        error.response?.data?.error ||
        error.message ||
        'Failed to create shop. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Register New Shop</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be the shop owner's login password.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Plan
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.subscription}
                onChange={(e) => setFormData({ ...formData, subscription: e.target.value })}
              >
                <option value="basic">Basic - $99/month</option>
                <option value="standard">Standard - $199/month</option>
                <option value="premium">Premium - $299/month</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Register Shop'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// SHOP DETAILS MODAL
// ============================================================
const ShopDetailsModal = ({ shop, onClose, onDelete, payments = [] }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const totalPayments = payments.length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedPayments = payments.filter(p => p.status === 'completed').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">{shop.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Shop ID</p>
            <p className="font-medium">#{shop.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className={`font-medium ${shop.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
              {shop.status || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{shop.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium">{shop.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium">{shop.address || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Owner</p>
            <p className="font-medium">{shop.owner}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Subscription</p>
            <p className="font-medium capitalize">{shop.subscription || 'Basic'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="font-medium">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">
              {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold mb-3">Payment Summary</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500">Total Payments</p>
              <p className="text-xl font-bold text-gray-800">{totalPayments}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-bold text-green-600">{completedPayments}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{pendingPayments}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Edit Shop
          </button>
          <button
            onClick={() => onDelete(shop.id)}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Shop
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;