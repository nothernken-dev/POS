// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  LogOut, 
  User, 
  Settings as SettingsIcon, 
  HelpCircle,
  Store,
  Home,
  Menu
} from 'lucide-react';

const Navbar = ({ pageTitle, onMenuClick }) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
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

  const getUserEmail = () => {
    if (user) {
      return user.email || 'user@tirsi.com';
    }
    if (shop) {
      return shop.email || 'shop@tirsi.com';
    }
    return 'guest@tirsi.com';
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getGreetingName = () => {
    const name = getDisplayName();
    return name.split(' ')[0];
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 w-full">
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 flex flex-wrap items-center gap-1 sm:gap-2">
            <span>{getGreeting()}, {getGreetingName()}!</span>
            {shop && (
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 sm:px-2 py-0.5 rounded-full truncate max-w-[100px] sm:max-w-none">
                {shop.name}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
        <div className="relative flex-1 sm:flex-none max-w-[120px] sm:max-w-[180px] md:max-w-[200px]">
          <input
            type="text"
            placeholder={isMobile ? "Search..." : "Search..."}
            className="w-full pl-7 sm:pl-9 pr-2.5 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
          />
          <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
        </div>
        <div className="relative">
          <button className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 rounded-full text-white text-[8px] sm:text-[10px] flex items-center justify-center font-bold border-2 border-white">
              3
            </span>
          </button>
        </div>
        
        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-1 sm:gap-2 cursor-pointer hover:bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-md">
              {getUserInitials()}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              />
              
              <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <p className="text-sm font-semibold text-gray-900 truncate">{getDisplayName()}</p>
                  <p className="text-xs text-gray-500 truncate">{getUserEmail()}</p>
                  <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {getUserRole()}
                  </span>
                  {shop && (
                    <div className="mt-1 text-xs text-purple-600 flex items-center gap-1 truncate">
                      <Store className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{shop.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                    <span>Profile Settings</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/userguide');
                    }}
                    className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                    <span>Help & Support</span>
                  </button>
                </div>
                
                <div className="border-t border-gray-100 py-1">
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;