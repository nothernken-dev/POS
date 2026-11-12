// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Users,
  Truck,
  UserCog,
  Building2,
  Settings,
  BookOpen,
  ChevronDown,
  LogOut,
  Store,
  X
} from 'lucide-react';

import logo from '../assets/logo1.jpeg';

const Sidebar = ({ isMobile, onClose }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    const shopData = localStorage.getItem('shop');
    if (shopData) {
      try {
        setShop(JSON.parse(shopData));
      } catch (error) {
        console.error('Error parsing shop data:', error);
      }
    }
  }, []);

  const navItems = [
    { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory', path: '/inventory', icon: Package, label: 'Inventory' },
    { id: 'sales', path: '/sales', icon: ShoppingCart, label: 'Sales' },
    { id: 'expense', path: '/expense', icon: Wallet, label: 'Expense' },
    { id: 'customers', path: '/customers', icon: Users, label: 'Customers' },
    { id: 'suppliers', path: '/suppliers', icon: Truck, label: 'Suppliers' },
    { id: 'staff', path: '/staff', icon: UserCog, label: 'Staff' },
    { id: 'finance', path: '/finance', icon: Building2, label: 'Finance' },
    { id: 'settings', path: '/settings', icon: Settings, label: 'Settings' },
    { id: 'userguide', path: '/userguide', icon: BookOpen, label: 'User Guide' },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/shop/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('shop');
    localStorage.removeItem('shopToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('shopId');
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const getUserInitials = () => {
    if (user) {
      const name = user.name || user.username || 'User';
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (shop) {
      const name = shop.name || 'Shop';
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return 'JD';
  };

  const getDisplayName = () => {
    if (user) {
      return user.name || user.username || user.email || 'User';
    }
    if (shop) {
      return shop.owner || shop.name || 'Shop Owner';
    }
    return 'Guest';
  };

  const getUserRole = () => {
    if (user) {
      return user.role || user.user_type || 'User';
    }
    if (shop) {
      return 'Shop Owner';
    }
    return 'User';
  };

  const getShopName = () => {
    if (shop) {
      return shop.name;
    }
    return null;
  };

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div className="w-[260px] h-full bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 sm:py-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0">
            <img 
              src={logo} 
              alt="Tirsi POS Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center">
            <span className="font-bold text-lg sm:text-xl text-gray-900">Tirsi</span>
            <span className="text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-0.5 rounded-full ml-1.5 sm:ml-2">POS</span>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 sm:py-4 px-2 sm:px-3">
        <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-0.5 ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="flex-1 text-sm">{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-6 sm:h-8 bg-purple-600 rounded-full"></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom - User Profile & Logout */}
      <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50/30">
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 px-2 sm:px-3 py-2 sm:py-2.5 w-full rounded-xl hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-md flex-shrink-0">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900 truncate">{getDisplayName()}</p>
              <p className="text-xs text-gray-500 truncate">{getUserRole()}</p>
              {getShopName() && (
                <p className="text-xs text-purple-600 truncate flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {getShopName()}
                </p>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
              isProfileOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/userguide');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <span>User Guide</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;