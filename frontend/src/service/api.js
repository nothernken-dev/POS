// service/api.js
import axios from 'axios';

// ✅ Use RELATIVE URL so requests go through the Vite dev proxy.
// In production, nginx (or your reverse proxy) should also forward /api
// to the backend on the same origin — never use a bare IP + port across
// origins with cookies.
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log('🔑 [API]', config.method?.toUpperCase(), config.url);
    }

    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.shopId) {
          config.headers['X-Shop-ID'] = userData.shopId;
        }
      } catch (_) {
        // ignore
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('✅ [API]', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    if (!error.response) {
      console.error('❌ [API] Network error:', error.message);
      return Promise.reject(error);
    }

    // Don't redirect on 401 from login/session-check — those are expected
    if (
      status === 401 &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/session-check') &&
      !url.includes('/shop/login')
    ) {
      localStorage.removeItem('user');
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/superadmin/login')
      ) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// ERROR HELPER
// ============================================================
const handleError = (error) => {
  if (error.response?.data?.error) {
    throw new Error(error.response.data.error);
  }
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  if (error.message) {
    throw error;
  }
  throw new Error('An unexpected error occurred');
};

// ============================================================
// AUTH
// ============================================================
export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const data = response.data;

      if (data?.authenticated && data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, ...data };
      }
      throw new Error(data?.error || data?.message || 'Login failed');
    } catch (error) {
      return handleError(error);
    }
  },

  shopLogin: async (credentials) => {
    try {
      const response = await api.post('/shop/login', credentials);
      const data = response.data;

      if (data?.success && data?.shop) {
        const shopData = {
          ...data.shop,
          role: 'shop_admin',
          shopId: data.shop.id,
        };
        localStorage.setItem('user', JSON.stringify(shopData));
        return { success: true, ...data };
      }
      throw new Error(data?.error || data?.message || 'Login failed');
    } catch (error) {
      return handleError(error);
    }
  },

  checkSession: async () => {
    try {
      const response = await api.get('/auth/session-check');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return { authenticated: false };
      }
      throw error;
    }
  },

  getSessionStatus: async () => {
    try {
      const response = await api.get('/auth/session-status');
      return response.data;
    } catch {
      return null;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // ignore
    }
    localStorage.removeItem('user');
  },

  shopLogout: async () => {
    try {
      await api.post('/shop/logout');
    } catch (_) {
      // ignore
    }
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },

  setCurrentUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  isAuthenticated: () => !!localStorage.getItem('user'),

  getUserRole: () => {
    const user = authService.getCurrentUser();
    if (!user) return null;
    if (user.is_admin === true) return 'super_admin';
    return user?.role || 'shop_admin';
  },

  isSuperAdmin: () => authService.getCurrentUser()?.is_admin === true,

  isShopAdmin: () => {
    const user = authService.getCurrentUser();
    return !!user && user.is_admin !== true;
  },

  getCurrentShopId: () => authService.getCurrentUser()?.shopId || null,

  updateProfile: async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      if (response.data.user) {
        const currentUser = authService.getCurrentUser();
        localStorage.setItem(
          'user',
          JSON.stringify({ ...currentUser, ...response.data.user })
        );
      }
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  requestPasswordReset: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  resetPassword: async (resetData) => {
    try {
      const response = await api.post('/auth/reset-password', resetData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// SHOPS
// ============================================================
export const shopService = {
  getAllShops: async () => {
    try {
      const response = await api.get('/shops');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getShop: async (shopId) => {
    try {
      const response = await api.get(`/shops/${shopId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
 createShop: async (shopData) => {
  const response = await api.post('/shops', shopData);
  return response.data;
},

  updateShop: async (shopId, shopData) => {
    try {
      const response = await api.put(`/shops/${shopId}`, shopData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteShop: async (shopId) => {
    try {
      const response = await api.delete(`/shops/${shopId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getShopSettings: async (shopId) => {
    try {
      const response = await api.get(`/shops/${shopId}/settings`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateShopSettings: async (shopId, settings) => {
    try {
      const response = await api.put(`/shops/${shopId}/settings`, settings);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getShopStats: async (shopId) => {
    try {
      const response = await api.get(`/shops/${shopId}/stats`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// ANALYTICS
// ============================================================
export const analyticsService = {
  getDashboardAnalytics: async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSalesAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/analytics/sales', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getProductAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/analytics/products', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getCustomerAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/analytics/customers', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getStaffPerformance: async (params = {}) => {
    try {
      const response = await api.get('/analytics/staff', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getInventoryAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/analytics/inventory', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// FINANCE
// ============================================================
export const financeService = {
  getFinancialOverview: async (params = {}) => {
    try {
      const response = await api.get('/finance/overview', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getProfitLoss: async (params = {}) => {
    try {
      const response = await api.get('/finance/profit-loss', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getRevenueReport: async (params = {}) => {
    try {
      const response = await api.get('/finance/revenue', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getExpenseReport: async (params = {}) => {
    try {
      const response = await api.get('/finance/expenses', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getTaxReport: async (params = {}) => {
    try {
      const response = await api.get('/finance/tax', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getCashFlow: async (params = {}) => {
    try {
      const response = await api.get('/finance/cash-flow', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// SUPER ADMIN
// ============================================================
export const superAdminService = {
  getAllShopsAnalytics: async () => {
    try {
      const response = await api.get('/super-admin/analytics/all-shops');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getGlobalAnalytics: async () => {
    try {
      const response = await api.get('/super-admin/analytics/global');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getAllPayments: async (params = {}) => {
    try {
      const response = await api.get('/super-admin/payments', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getPaymentDetails: async (paymentId) => {
    try {
      const response = await api.get(`/super-admin/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSystemSettings: async () => {
    try {
      const response = await api.get('/super-admin/settings');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateSystemSettings: async (settings) => {
    try {
      const response = await api.put('/super-admin/settings', settings);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getAllUsers: async (params = {}) => {
    try {
      const response = await api.get('/super-admin/users', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateUserStatus: async (userId, status) => {
    try {
      const response = await api.patch(`/super-admin/users/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSystemHealth: async () => {
    try {
      const response = await api.get('/super-admin/health');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// STAFF
// ============================================================
export const staffService = {
  getAllStaff: async (shopId, params = {}) => {
    try {
      const response = await api.get('/staff', { params: { ...params, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getStaff: async (shopId, staffId) => {
    try {
      const response = await api.get(`/staff/${staffId}`, { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createStaff: async (shopId, staffData) => {
    try {
      const response = await api.post('/staff', { ...staffData, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateStaff: async (shopId, staffId, staffData) => {
    try {
      const response = await api.put(`/staff/${staffId}`, { ...staffData, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteStaff: async (shopId, staffId) => {
    try {
      const response = await api.delete(`/staff/${staffId}`, { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  changeStaffRole: async (shopId, staffId, role) => {
    try {
      const response = await api.patch(`/staff/${staffId}/role`, { role, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getStaffStats: async (shopId) => {
    try {
      const response = await api.get('/staff/stats', { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// INVENTORY
// ============================================================
export const inventoryService = {
  getAllProducts: async (shopId, params = {}) => {
    try {
      const response = await api.get('/products', { params: { ...params, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getProduct: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createProduct: async (productData) => {
    try {
      const response = await api.post('/products', productData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateProduct: async (productId, productData) => {
    try {
      const response = await api.put(`/products/${productId}`, productData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteProduct: async (productId) => {
    try {
      const response = await api.delete(`/products/${productId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateStock: async (productId, quantity) => {
    try {
      const response = await api.patch(`/products/${productId}/stock`, { quantity });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getLowStock: async (shopId) => {
    try {
      const response = await api.get('/products', {
        params: { status: 'Low Stock', shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getCategories: async () => [],
  bulkImport: async (shopId, products) => {
    try {
      const response = await api.post('/products/bulk', { products, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// SALES
// ============================================================
export const salesService = {
  getAllSales: async (shopId, params = {}) => {
    try {
      const response = await api.get('/sales', { params: { ...params, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSale: async (shopId, saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`, { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createSale: async (shopId, saleData) => {
    try {
      const response = await api.post('/sales', { ...saleData, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateSale: async (shopId, saleId, saleData) => {
    try {
      const response = await api.put(`/sales/${saleId}`, { ...saleData, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteSale: async (shopId, saleId) => {
    try {
      const response = await api.delete(`/sales/${saleId}`, { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSalesSummary: async (shopId, params = {}) => {
    try {
      const response = await api.get('/sales/summary', { params: { ...params, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getDailySales: async (shopId, date) => {
    try {
      const response = await api.get('/sales/daily', { params: { date, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSalesByDateRange: async (shopId, startDate, endDate) => {
    try {
      const response = await api.get('/sales/range', {
        params: { startDate, endDate, shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  generateReceipt: async (shopId, saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}/receipt`, {
        params: { shop_id: shopId },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// CUSTOMERS
// ============================================================
export const customerService = {
  getAllCustomers: async (shopId, params = {}) => {
    try {
      const response = await api.get('/customers', { params: { ...params, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getCustomer: async (shopId, customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}`, { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createCustomer: async (shopId, customerData) => {
    try {
      const response = await api.post('/customers', { ...customerData, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateCustomer: async (shopId, customerId, customerData) => {
    try {
      const response = await api.put(`/customers/${customerId}`, {
        ...customerData,
        shop_id: shopId,
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteCustomer: async (shopId, customerId) => {
    try {
      const response = await api.delete(`/customers/${customerId}`, {
        params: { shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getCustomerHistory: async (shopId, customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}/history`, {
        params: { shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getCustomerStats: async (shopId) => {
    try {
      const response = await api.get('/customers/stats', { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// EXPENSES
// ============================================================
export const expenseService = {
  getAllExpenses: async (shopId, params = {}) => {
    try {
      const response = await api.get('/expenses', { params: { ...params, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getExpense: async (shopId, expenseId) => {
    try {
      const response = await api.get(`/expenses/${expenseId}`, { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createExpense: async (shopId, expenseData) => {
    try {
      const response = await api.post('/expenses', { ...expenseData, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateExpense: async (shopId, expenseId, expenseData) => {
    try {
      const response = await api.put(`/expenses/${expenseId}`, {
        ...expenseData,
        shop_id: shopId,
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteExpense: async (shopId, expenseId) => {
    try {
      const response = await api.delete(`/expenses/${expenseId}`, {
        params: { shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getExpenseCategories: async (shopId) => {
    try {
      const response = await api.get('/expenses/categories', { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getExpenseSummary: async (shopId, params = {}) => {
    try {
      const response = await api.get('/expenses/summary', {
        params: { ...params, shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// SUPPLIERS
// ============================================================
export const supplierService = {
  getAllSuppliers: async (shopId, params = {}) => {
    try {
      const response = await api.get('/suppliers', { params: { ...params, shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSupplier: async (shopId, supplierId) => {
    try {
      const response = await api.get(`/suppliers/${supplierId}`, {
        params: { shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createSupplier: async (shopId, supplierData) => {
    try {
      const response = await api.post('/suppliers', { ...supplierData, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateSupplier: async (shopId, supplierId, supplierData) => {
    try {
      const response = await api.put(`/suppliers/${supplierId}`, {
        ...supplierData,
        shop_id: shopId,
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteSupplier: async (shopId, supplierId) => {
    try {
      const response = await api.delete(`/suppliers/${supplierId}`, {
        params: { shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getSupplierStats: async (shopId) => {
    try {
      const response = await api.get('/suppliers/stats', { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// PAYMENTS
// ============================================================
export const paymentService = {
  getAllPayments: async (params = {}) => {
    try {
      const response = await api.get('/payments', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getPayment: async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments', paymentData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updatePayment: async (paymentId, paymentData) => {
    try {
      const response = await api.put(`/payments/${paymentId}`, paymentData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deletePayment: async (paymentId) => {
    try {
      const response = await api.delete(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updatePaymentStatus: async (paymentId, status) => {
    try {
      const response = await api.patch(`/payments/${paymentId}/status`, { status });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getPaymentStats: async (params = {}) => {
    try {
      const response = await api.get('/payments/stats', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// PURCHASE ORDERS
// ============================================================
export const purchaseOrderService = {
  getAllPurchaseOrders: async (params = {}) => {
    try {
      const response = await api.get('/purchase-orders', { params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getPurchaseOrder: async (orderId) => {
    try {
      const response = await api.get(`/purchase-orders/${orderId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  createPurchaseOrder: async (orderData) => {
    try {
      const response = await api.post('/purchase-orders', orderData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updatePurchaseOrderStatus: async (orderId, status) => {
    try {
      const response = await api.patch(`/purchase-orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getOrderHistory: async (orderId) => {
    try {
      const response = await api.get(`/purchase-orders/${orderId}/history`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deletePurchaseOrder: async (orderId) => {
    try {
      const response = await api.delete(`/purchase-orders/${orderId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  exportOrderPDF: async (orderId) => {
    try {
      const response = await api.get(`/purchase-orders/${orderId}/export/pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  exportOrderExcel: async (orderId) => {
    try {
      const response = await api.get(`/purchase-orders/${orderId}/export/excel`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getOrderStats: async () => {
    try {
      const response = await api.get('/purchase-orders/stats');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getStatusTransitions: async () => {
    try {
      const response = await api.get('/order-status-transitions');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  revertOrderStatus: async (orderId, targetStatus) => {
    try {
      const response = await api.post(`/purchase-orders/${orderId}/revert`, {
        target_status: targetStatus,
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// SETTINGS
// ============================================================
export const settingsService = {
  getSettings: async (shopId) => {
    try {
      const response = await api.get('/settings', { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateSettings: async (shopId, settings) => {
    try {
      const response = await api.put('/settings', { ...settings, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateTheme: async (shopId, theme) => {
    try {
      const response = await api.patch('/settings/theme', { theme, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateCurrency: async (shopId, currency) => {
    try {
      const response = await api.patch('/settings/currency', { currency, shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getAllSettings: async (shopId) => {
    try {
      const response = await api.get('/settings/all', { params: { shop_id: shopId } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// USER GUIDE
// ============================================================
export const userGuideService = {
  getUserGuide: async (role) => {
    try {
      const response = await api.get('/userguide', { params: { role } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getAllGuides: async () => {
    try {
      const response = await api.get('/userguide');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateUserGuide: async (role, content) => {
    try {
      const response = await api.put('/userguide', { content, role });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  searchGuide: async (query, role) => {
    try {
      const response = await api.get('/userguide/search', { params: { query, role } });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  submitFeedback: async (feedback) => {
    try {
      const response = await api.post('/userguide/feedback', feedback);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  chat: async (message, context) => {
    try {
      const response = await api.post('/userguide/chat', { message, context });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getQAPairs: async () => {
    try {
      const response = await api.get('/userguide/qa');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  addQAPair: async (qaData) => {
    try {
      const response = await api.post('/userguide/qa', qaData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  updateQAPair: async (qaId, qaData) => {
    try {
      const response = await api.put(`/userguide/qa/${qaId}`, qaData);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteQAPair: async (qaId) => {
    try {
      const response = await api.delete(`/userguide/qa/${qaId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getArticles: async () => {
    try {
      const response = await api.get('/userguide/articles');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getArticle: async (articleId) => {
    try {
      const response = await api.get(`/userguide/articles/${articleId}`);
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getStats: async () => {
    try {
      const response = await api.get('/userguide/stats');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// UPLOADS
// ============================================================
export const uploadService = {
  uploadProductImage: async (shopId, productId, file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('shop_id', shopId);
      formData.append('product_id', productId);
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  uploadShopLogo: async (shopId, file) => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('shop_id', shopId);
      const response = await api.post('/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  uploadBulkProducts: async (shopId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shop_id', shopId);
      const response = await api.post('/products/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  uploadMultipleImages: async (shopId, files, type = 'product') => {
    try {
      const formData = new FormData();
      files.forEach((file, index) => formData.append(`images[${index}]`, file));
      formData.append('type', type);
      formData.append('shop_id', shopId);
      const response = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// REPORTS
// ============================================================
export const reportService = {
  generateSalesReport: async (shopId, params = {}) => {
    try {
      const response = await api.get('/sales/export/excel', {
        params: { ...params, shop_id: shopId },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  generateInventoryReport: async (shopId, params = {}) => {
    try {
      const response = await api.get('/inventory/export/excel', {
        params: { ...params, shop_id: shopId },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  generateFinancialReport: async (shopId, params = {}) => {
    try {
      const response = await api.get('/finance/export/excel', {
        params: { ...params, shop_id: shopId },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  generateExpenseReport: async (shopId, params = {}) => {
    try {
      const response = await api.get('/expenses/export/excel', {
        params: { ...params, shop_id: shopId },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  generateCustomerReport: async (shopId, params = {}) => {
    try {
      const response = await api.get('/customers/export/excel', {
        params: { ...params, shop_id: shopId },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationService = {
  getNotifications: async (shopId, params = {}) => {
    try {
      const response = await api.get('/notifications', {
        params: { ...params, shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  markAsRead: async (shopId, notificationId) => {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`, {
        shop_id: shopId,
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  markAllAsRead: async (shopId) => {
    try {
      const response = await api.patch('/notifications/read-all', { shop_id: shopId });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  deleteNotification: async (shopId, notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`, {
        params: { shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  getUnreadCount: async (shopId) => {
    try {
      const response = await api.get('/notifications/unread-count', {
        params: { shop_id: shopId },
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  sendNotification: async (shopId, notificationData) => {
    try {
      const response = await api.post('/notifications', {
        ...notificationData,
        shop_id: shopId,
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
};

// ============================================================
// EXPORTS
// ============================================================
export { api };

export default {
  auth: authService,
  shops: shopService,
  staff: staffService,
  inventory: inventoryService,
  sales: salesService,
  customers: customerService,
  expenses: expenseService,
  suppliers: supplierService,
  analytics: analyticsService,
  finance: financeService,
  superAdmin: superAdminService,
  payments: paymentService,
  purchaseOrders: purchaseOrderService,
  settings: settingsService,
  userGuide: userGuideService,
  upload: uploadService,
  reports: reportService,
  notifications: notificationService,
};