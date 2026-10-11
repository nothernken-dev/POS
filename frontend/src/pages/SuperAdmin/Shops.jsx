// src/pages/SuperAdmin/Shops.jsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Store,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { shopService, authService } from '../../service/api';

const Shops = () => {
  const [shops, setShops] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    premium: 0,
    totalRevenue: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubscription, setFilterSubscription] = useState('all');
  const [showAddShop, setShowAddShop] = useState(false);
  const [showEditShop, setShowEditShop] = useState(null);
  const [showShopDetails, setShowShopDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authService.isSuperAdmin()) {
      setError('Access denied. Super admin privileges required.');
      return;
    }
    loadShops();
  }, []);

  const loadShops = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await shopService.getAllShops();
      const allShops = response?.shops || response || [];

      let filteredShops = allShops;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredShops = filteredShops.filter(shop =>
          shop.name?.toLowerCase().includes(term) ||
          shop.email?.toLowerCase().includes(term) ||
          shop.owner?.toLowerCase().includes(term)
        );
      }

      if (filterStatus !== 'all') {
        filteredShops = filteredShops.filter(shop => shop.status === filterStatus);
      }

      if (filterSubscription !== 'all') {
        filteredShops = filteredShops.filter(shop => shop.subscription === filterSubscription);
      }

      setShops(filteredShops);
      calculateStats(allShops);
    } catch (err) {
      console.error('Error loading shops:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load shops. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (shopsData) => {
    const total = shopsData.length;
    const active = shopsData.filter(s => s.status === 'active').length;
    const inactive = shopsData.filter(s => s.status === 'inactive').length;
    const premium = shopsData.filter(s => s.subscription === 'premium').length;
    const totalRevenue = shopsData.reduce((sum, shop) => sum + (shop.revenue || 0), 0);

    setStats({ total, active, inactive, premium, totalRevenue });
  };

  const handleStatusToggle = async (shopId) => {
    try {
      const shop = shops.find(s => s.id === shopId);
      if (!shop) return;

      const newStatus = shop.status === 'active' ? 'inactive' : 'active';

      await shopService.updateShop(shopId, { status: newStatus });

      setShops(shops.map(s => (s.id === shopId ? { ...s, status: newStatus } : s)));

      const response = await shopService.getAllShops();
      const allShops = response?.shops || response || [];
      calculateStats(allShops);
    } catch (err) {
      console.error('Error toggling status:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update shop status.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteShop = async (shopId) => {
    if (!window.confirm('Are you sure you want to delete this shop? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await shopService.deleteShop(shopId);

      setShops(shops.filter(s => s.id !== shopId));

      const response = await shopService.getAllShops();
      const allShops = response?.shops || response || [];
      calculateStats(allShops);

      if (showShopDetails && showShopDetails.id === shopId) {
        setShowShopDetails(null);
      }
    } catch (err) {
      console.error('Error deleting shop:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete shop.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      loadShops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus, filterSubscription]);

  const subscriptionTypes = ['basic', 'standard', 'premium'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Shop Management</h1>
          <p className="text-gray-600 mt-1">Manage all registered shops and their subscriptions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadShops}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddShop(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Register New Shop
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Shops</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total || 0}</p>
            </div>
            <Store className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactive || 0}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Premium Shops</p>
              <p className="text-2xl font-bold text-purple-600">{stats.premium || 0}</p>
            </div>
            <Store className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, email or owner..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterSubscription}
            onChange={(e) => setFilterSubscription(e.target.value)}
          >
            <option value="all">All Plans</option>
            {subscriptionTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500 self-center">
            Showing {shops.length} shops
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-red-500 hover:text-red-700 self-center text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{shop.name}</div>
                          <div className="text-sm text-gray-500">ID: #{String(shop.id).padStart(4, '0')}</div>
                          <div className="text-xs text-gray-400">
                            {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}
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
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                            shop.status === 'active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : shop.status === 'inactive'
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {shop.status === 'active' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {shop.status
                            ? shop.status.charAt(0).toUpperCase() + shop.status.slice(1)
                            : 'Unknown'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            shop.subscription === 'premium'
                              ? 'bg-purple-100 text-purple-800'
                              : shop.subscription === 'standard'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {shop.subscription
                            ? shop.subscription.charAt(0).toUpperCase() + shop.subscription.slice(1)
                            : 'Basic'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          ${shop.revenue ? shop.revenue.toFixed(2) : '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowShopDetails(shop)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setShowEditShop(shop)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Shop"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteShop(shop.id)}
                            disabled={isDeleting}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Shop"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {shops.length === 0 && (
              <div className="text-center py-12">
                <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No shops found</h3>
                <p className="text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterSubscription('all');
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Shop Modal */}
      {showAddShop && (
        <AddShopModal
          onClose={() => setShowAddShop(false)}
          onSuccess={() => {
            loadShops();
          }}
        />
      )}

      {/* Edit Shop Modal */}
      {showEditShop && (
        <EditShopModal
          shop={showEditShop}
          onClose={() => setShowEditShop(null)}
          onSuccess={() => {
            loadShops();
          }}
        />
      )}

      {/* Shop Details Modal */}
      {showShopDetails && (
        <ShopDetailsModal
          shop={showShopDetails}
          onClose={() => setShowShopDetails(null)}
          onEdit={() => {
            setShowShopDetails(null);
            setShowEditShop(showShopDetails);
          }}
          onDelete={handleDeleteShop}
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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

    setIsSubmitting(true);

    try {
      await shopService.createShop(formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating shop:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to register shop. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Register New Shop</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter shop name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="shop@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Min 6 characters"
                minLength="6"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                required
                placeholder="Full name of shop owner"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Physical address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
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
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Registering...
                </>
              ) : (
                'Register Shop'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
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
// EDIT SHOP MODAL
// ============================================================
const EditShopModal = ({ shop, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: shop.name || '',
    email: shop.email || '',
    phone: shop.phone || '',
    address: shop.address || '',
    owner: shop.owner || '',
    subscription: shop.subscription || 'basic',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      await shopService.updateShop(shop.id, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating shop:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to update shop. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Shop</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password (optional)
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
                minLength="6"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Updating...
                </>
              ) : (
                'Update Shop'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
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
const ShopDetailsModal = ({ shop, onClose, onEdit, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete this shop? This action cannot be undone.'
      )
    ) {
      setIsDeleting(true);
      await onDelete(shop.id);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Shop Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Shop ID</p>
            <p className="font-medium">#{String(shop.id).padStart(4, '0')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                shop.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : shop.status === 'inactive'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {shop.status === 'active' ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {shop.status
                ? shop.status.charAt(0).toUpperCase() + shop.status.slice(1)
                : 'Unknown'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Shop Name</p>
            <p className="font-medium">{shop.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Owner</p>
            <p className="font-medium">{shop.owner}</p>
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
            <p className="text-sm text-gray-500">Subscription</p>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                shop.subscription === 'premium'
                  ? 'bg-purple-100 text-purple-800'
                  : shop.subscription === 'standard'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {shop.subscription
                ? shop.subscription.charAt(0).toUpperCase() + shop.subscription.slice(1)
                : 'Basic'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="font-bold text-lg text-gray-900">
              ${shop.revenue ? shop.revenue.toFixed(2) : '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Users</p>
            <p className="font-medium">{shop.users || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">
              {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Active</p>
            <p className="font-medium">{shop.lastActive || 'N/A'}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3 border-t pt-6">
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Shop
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Shop'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Shops;