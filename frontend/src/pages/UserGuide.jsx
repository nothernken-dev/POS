// src/pages/UserGuide.jsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen,
  Search,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Users,
  Truck,
  UserCog,
  Building2,
  Settings,
  HelpCircle,
  Star,
  Video,
  FileText,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  MessageCircle,
  Send,
  Bot,
  X,
  Minimize2,
  Maximize2,
  Download,
  Play,
  Globe
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { userGuideService, authService } from '../service/api';

const UserGuide = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState('getting-started');
  const [selectedArticle, setSelectedArticle] = useState('welcome');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      message: 'Hello! I\'m your AI POS assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [userRole, setUserRole] = useState('shop_admin');
  const articleRef = useRef(null);

  // Get user role
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserRole(user.role || 'shop_admin');
    }
  }, []);

  // Sections data
  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Star,
      articles: [
        { id: 'welcome', title: 'Welcome to Tirsi POS' },
        { id: 'setup', title: 'Initial Setup Guide' },
        { id: 'navigation', title: 'Navigating the Dashboard' },
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      articles: [
        { id: 'overview', title: 'Dashboard Overview' },
        { id: 'sales', title: 'Sales Overview' },
        { id: 'customers', title: 'Customer Contacts' },
        { id: 'purchase-history', title: 'Purchase History' },
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: Package,
      articles: [
        { id: 'add-product', title: 'Adding Products' },
        { id: 'manage-stock', title: 'Managing Stock' },
        { id: 'categories', title: 'Product Categories' },
        { id: 'low-stock', title: 'Low Stock Alerts' },
      ]
    },
    {
      id: 'sales',
      title: 'Sales Management',
      icon: ShoppingCart,
      articles: [
        { id: 'create-order', title: 'Creating Orders' },
        { id: 'process-payment', title: 'Processing Payments' },
        { id: 'invoices', title: 'Managing Invoices' },
        { id: 'returns', title: 'Handling Returns' },
      ]
    },
    {
      id: 'expense',
      title: 'Expense Tracking',
      icon: Wallet,
      articles: [
        { id: 'add-expense', title: 'Adding Expenses' },
        { id: 'categories-expense', title: 'Expense Categories' },
        { id: 'reports', title: 'Expense Reports' },
      ]
    },
    {
      id: 'customers',
      title: 'Customer Management',
      icon: Users,
      articles: [
        { id: 'add-customer', title: 'Adding Customers' },
        { id: 'customer-profiles', title: 'Customer Profiles' },
        { id: 'loyalty', title: 'Loyalty Programs' },
      ]
    },
    {
      id: 'suppliers',
      title: 'Supplier Management',
      icon: Truck,
      articles: [
        { id: 'add-supplier', title: 'Adding Suppliers' },
        { id: 'supplier-orders', title: 'Supplier Orders' },
        { id: 'supplier-ratings', title: 'Supplier Ratings' },
      ]
    },
    {
      id: 'staff',
      title: 'Staff Management',
      icon: UserCog,
      articles: [
        { id: 'add-staff', title: 'Adding Staff Members' },
        { id: 'roles', title: 'Roles & Permissions' },
        { id: 'attendance', title: 'Staff Attendance' },
      ]
    },
    {
      id: 'finance',
      title: 'Finance & Analytics',
      icon: Building2,
      articles: [
        { id: 'reports-finance', title: 'Financial Reports' },
        { id: 'profit-loss', title: 'Profit & Loss' },
        { id: 'analytics', title: 'Analytics Dashboard' },
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      articles: [
        { id: 'general-settings', title: 'General Settings' },
        { id: 'security-settings', title: 'Security Settings' },
        { id: 'notifications-settings', title: 'Notification Settings' },
      ]
    },
  ];

  // Video tutorials data
  const videoTutorials = [
    {
      id: 1,
      title: 'Getting Started with Tirsi POS',
      description: 'Learn the basics of navigating the Tirsi POS system',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duration: '5:30'
    },
    {
      id: 2,
      title: 'Inventory Management Tutorial',
      description: 'How to add products, manage stock, and set up categories',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duration: '8:15'
    },
    {
      id: 3,
      title: 'Sales and Payment Processing',
      description: 'Complete guide to processing sales and payments',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duration: '10:20'
    },
    {
      id: 4,
      title: 'Customer Management & Loyalty Programs',
      description: 'Manage customers and set up loyalty programs',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duration: '7:45'
    }
  ];

  // Article content
  const articleContent = {
    'welcome': {
      title: 'Welcome to Tirsi POS',
      content: [
        'Welcome to the Tirsi POS Dashboard! This comprehensive guide will help you navigate and make the most of your point of sale system.',
        'The dashboard provides you with a complete overview of your business operations, including real-time sales data, inventory management, customer relationships, and detailed financial analytics.',
        'Use the sidebar navigation to access different modules of the system. Each module is designed to help you manage specific aspects of your business efficiently and effectively.'
      ],
      tips: [
        'Start by exploring the Dashboard to get an overview of your business performance',
        'Add your products in the Inventory section to begin selling',
        'Set up your staff and their permissions for secure access',
        'Configure your settings to match your specific business needs',
        'Use the AI chat assistant for instant help and guidance'
      ]
    },
    'setup': {
      title: 'Initial Setup Guide',
      content: [
        'Setting up your Tirsi POS system is straightforward. Follow these steps to get started:',
        '1. Configure your business information including name, address, and contact details.',
        '2. Set up your tax rates and payment methods.',
        '3. Create user accounts for your staff members with appropriate permissions.',
        '4. Import or add your product catalog with pricing and stock levels.'
      ],
      tips: [
        'Keep your business license and tax information handy',
        'Create a backup of your initial configuration',
        'Test the system with sample transactions before going live'
      ]
    },
    'navigation': {
      title: 'Navigating the Dashboard',
      content: [
        'The dashboard is designed for intuitive navigation and quick access to all features.',
        'The main sidebar contains all modules grouped by function. Click on any module to expand and view its sub-sections.',
        'The top bar displays key metrics, notifications, and quick action buttons.',
        'Use the search bar to quickly find specific features or articles.'
      ],
      tips: [
        'Pin frequently used modules for quick access',
        'Use keyboard shortcuts for common actions',
        'Customize your dashboard view based on your role'
      ]
    },
    'overview': {
      title: 'Dashboard Overview',
      content: [
        'The Dashboard is your central hub for monitoring your business performance in real-time.',
        'At the top, you\'ll see key metrics including total sales, customer contacts, and recent purchase history.',
        'The dashboard provides quick access to your most important business data, allowing you to make informed decisions.',
        'Interactive charts and graphs help visualize trends and patterns in your business data.'
      ],
      tips: [
        'Monitor your sales trends daily to identify patterns',
        'Keep an eye on customer activity for retention opportunities',
        'Check recent transactions regularly for discrepancies',
        'Use the data to identify business growth opportunities'
      ]
    },
    'add-product': {
      title: 'Adding Products',
      content: [
        'The Inventory module allows you to manage your product catalog efficiently and effectively.',
        'To add a new product, navigate to Inventory and click the "Add Product" button.',
        'Fill in the product details including name, SKU, category, price, and initial stock quantity.',
        'You can also add product images and set up variants for products with multiple options like size or color.',
        'Set minimum stock levels to receive automated alerts when inventory is low.'
      ],
      tips: [
        'Use descriptive names and SKUs for easy searching',
        'Set appropriate stock levels based on sales velocity',
        'Categorize products for better organization and reporting',
        'Regularly update product information and pricing'
      ]
    },
    'create-order': {
      title: 'Creating Orders',
      content: [
        'The Sales module enables you to process customer orders quickly and efficiently.',
        'To create a new order, navigate to Sales and click the "New Sale" button.',
        'Select the customer from the dropdown or create a new customer profile.',
        'Add products to the cart by searching or scanning barcodes.',
        'Process the payment using your preferred payment method (cash, card, mobile money, etc.).'
      ],
      tips: [
        'Verify customer information before processing',
        'Double-check product quantities and prices',
        'Offer multiple payment options to customers',
        'Print or email receipts to customers for their records'
      ]
    },
    'manage-stock': {
      title: 'Managing Stock',
      content: [
        'Effective stock management is crucial for business operations.',
        'The system tracks inventory levels in real-time and updates automatically with each sale.',
        'You can perform stock counts to verify physical inventory against system records.',
        'Receive alerts when stock levels fall below minimum thresholds.'
      ],
      tips: [
        'Perform regular stock audits to maintain accuracy',
        'Set reorder points based on historical sales data',
        'Track stock movements for better inventory control'
      ]
    },
    'process-payment': {
      title: 'Processing Payments',
      content: [
        'Tirsi POS supports multiple payment methods including cash, credit/debit cards, mobile money, and bank transfers.',
        'To process a payment, select the payment method, enter the amount, and complete the transaction.',
        'The system automatically updates inventory and generates receipts for customers.'
      ],
      tips: [
        'Always verify the payment amount before processing',
        'Keep the payment terminal ready for card transactions',
        'Print or email receipts for customer records'
      ]
    },
    'invoices': {
      title: 'Managing Invoices',
      content: [
        'Invoices are generated automatically after each sale.',
        'You can customize invoice templates with your business logo, tax information, and payment terms.',
        'Invoices can be printed, emailed to customers, or downloaded as PDF.'
      ],
      tips: [
        'Customize your invoice template with your branding',
        'Include clear payment terms and due dates',
        'Send invoices promptly to improve cash flow'
      ]
    },
    'returns': {
      title: 'Handling Returns',
      content: [
        'The Returns module allows you to process customer returns efficiently.',
        'You can issue refunds, exchange products, or provide store credit.',
        'The system automatically updates inventory and tracks return history.'
      ],
      tips: [
        'Verify the original purchase before processing returns',
        'Have a clear return policy displayed',
        'Track return reasons to identify product issues'
      ]
    },
    'add-expense': {
      title: 'Adding Expenses',
      content: [
        'Track your business expenses in the Expense Tracking module.',
        'Add expenses manually or import them from bank statements.',
        'Categorize expenses for better financial reporting and tax preparation.'
      ],
      tips: [
        'Categorize expenses properly for accurate reporting',
        'Attach receipts for documentation',
        'Review expenses regularly to identify cost-saving opportunities'
      ]
    },
    'categories-expense': {
      title: 'Expense Categories',
      content: [
        'Create and manage expense categories to organize your spending.',
        'Common categories include Utilities, Rent, Salaries, Marketing, and Supplies.',
        'Use categories to generate detailed expense reports.'
      ],
      tips: [
        'Create categories that match your business structure',
        'Use subcategories for more detailed tracking',
        'Review categories periodically and adjust as needed'
      ]
    },
    'reports': {
      title: 'Expense Reports',
      content: [
        'Generate comprehensive expense reports to analyze your spending.',
        'Filter reports by date range, category, or payment method.',
        'Export reports in PDF, Excel, or CSV format for further analysis.'
      ],
      tips: [
        'Run monthly expense reports to track spending trends',
        'Compare actual vs budgeted expenses',
        'Use expense data for tax preparation and financial planning'
      ]
    },
    'add-customer': {
      title: 'Adding Customers',
      content: [
        'Build your customer database in the Customer Management module.',
        'Add customer details including name, contact information, and preferences.',
        'Track customer purchase history and interactions.'
      ],
      tips: [
        'Collect email addresses for marketing purposes',
        'Note customer preferences for personalized service',
        'Keep customer data secure and private'
      ]
    },
    'customer-profiles': {
      title: 'Customer Profiles',
      content: [
        'View and manage detailed customer profiles.',
        'Access purchase history, contact information, and loyalty program status.',
        'Use customer data for targeted marketing and personalized service.'
      ],
      tips: [
        'Keep customer profiles updated',
        'Use customer data to identify your best customers',
        'Personalize communication based on customer preferences'
      ]
    },
    'loyalty': {
      title: 'Loyalty Programs',
      content: [
        'Set up loyalty programs to reward your best customers.',
        'Create points-based systems, tiered rewards, or discount programs.',
        'Track customer engagement and program effectiveness.'
      ],
      tips: [
        'Make rewards achievable and appealing',
        'Promote your loyalty program to all customers',
        'Monitor program performance and adjust as needed'
      ]
    },
    'add-supplier': {
      title: 'Adding Suppliers',
      content: [
        'Manage your supplier relationships in the Supplier Management module.',
        'Add supplier details including contact information, payment terms, and product offerings.',
        'Track supplier performance and ratings.'
      ],
      tips: [
        'Maintain accurate supplier contact information',
        'Note supplier payment terms and lead times',
        'Evaluate supplier performance regularly'
      ]
    },
    'supplier-orders': {
      title: 'Supplier Orders',
      content: [
        'Create and manage purchase orders for your suppliers.',
        'Track order status, delivery dates, and received quantities.',
        'Set up automatic reordering for frequently purchased items.'
      ],
      tips: [
        'Plan orders based on inventory levels and sales forecasts',
        'Negotiate favorable payment terms with suppliers',
        'Track supplier performance and delivery reliability'
      ]
    },
    'supplier-ratings': {
      title: 'Supplier Ratings',
      content: [
        'Rate suppliers based on product quality, delivery performance, and pricing.',
        'Use ratings to make informed purchasing decisions.',
        'Identify top-performing suppliers and areas for improvement.'
      ],
      tips: [
        'Rate suppliers consistently for fair comparisons',
        'Consider multiple factors including price and quality',
        'Use ratings to negotiate better terms'
      ]
    },
    'add-staff': {
      title: 'Adding Staff Members',
      content: [
        'Build your team in the Staff Management module.',
        'Add staff details including name, contact information, role, and permissions.',
        'Set up attendance tracking and payroll settings.'
      ],
      tips: [
        'Assign appropriate roles and permissions',
        'Keep staff information up to date',
        'Provide training on system usage'
      ]
    },
    'roles': {
      title: 'Roles & Permissions',
      content: [
        'Create and manage user roles with specific permissions.',
        'Control access to modules and features based on role.',
        'Ensure security and proper segregation of duties.'
      ],
      tips: [
        'Create roles that match your organizational structure',
        'Review permissions regularly for security',
        'Provide minimum required permissions for each role'
      ]
    },
    'attendance': {
      title: 'Staff Attendance',
      content: [
        'Track staff attendance and working hours.',
        'Record check-in and check-out times.',
        'Generate attendance reports for payroll and performance management.'
      ],
      tips: [
        'Set clear attendance policies',
        'Use attendance data for performance reviews',
        'Integrate attendance with payroll for accurate calculations'
      ]
    },
    'reports-finance': {
      title: 'Financial Reports',
      content: [
        'Access comprehensive financial reports in the Finance module.',
        'View profit & loss statements, balance sheets, and cash flow reports.',
        'Filter reports by date range and department.'
      ],
      tips: [
        'Run monthly financial reports for review',
        'Compare performance against previous periods',
        'Use reports for strategic planning'
      ]
    },
    'profit-loss': {
      title: 'Profit & Loss',
      content: [
        'Generate profit and loss statements to assess business performance.',
        'View revenue, expenses, and net profit/loss.',
        'Analyze trends and identify areas for improvement.'
      ],
      tips: [
        'Review P&L statements monthly',
        'Compare actual vs budgeted figures',
        'Identify cost-saving opportunities'
      ]
    },
    'analytics': {
      title: 'Analytics Dashboard',
      content: [
        'Get real-time business insights from the Analytics Dashboard.',
        'View key performance indicators, trends, and patterns.',
        'Make data-driven decisions for business growth.'
      ],
      tips: [
        'Monitor KPIs regularly',
        'Set up custom dashboards for your needs',
        'Share insights with your team'
      ]
    },
    'general-settings': {
      title: 'General Settings',
      content: [
        'Configure your business settings in the Settings module.',
        'Set up business information, tax rates, and payment methods.',
        'Customize system preferences to match your workflow.'
      ],
      tips: [
        'Keep business information accurate and up to date',
        'Configure settings that match your business operations',
        'Review settings periodically'
      ]
    },
    'security-settings': {
      title: 'Security Settings',
      content: [
        'Manage security settings to protect your business data.',
        'Set up password policies, two-factor authentication, and session management.',
        'Control access to sensitive information.'
      ],
      tips: [
        'Use strong password policies',
        'Enable two-factor authentication for sensitive actions',
        'Regularly review access logs and security settings'
      ]
    },
    'notifications-settings': {
      title: 'Notification Settings',
      content: [
        'Configure system notifications for important events.',
        'Set up email alerts for low stock, new orders, and customer activity.',
        'Customize notification preferences for different users.'
      ],
      tips: [
        'Set up alerts for critical business events',
        'Avoid notification overload',
        'Configure notifications that improve operational efficiency'
      ]
    }
  };

  const getArticleContent = (articleId) => {
    return articleContent[articleId] || articleContent['welcome'];
  };

  const filteredSections = sections.filter(section => 
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.articles.some(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const currentArticle = getArticleContent(selectedArticle);

  // PDF Generation Function
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Create a temporary div for PDF content
      const pdfContent = document.createElement('div');
      pdfContent.style.width = '800px';
      pdfContent.style.padding = '40px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.backgroundColor = 'white';
      pdfContent.style.color = 'black';
      
      // Add title
      const title = document.createElement('h1');
      title.style.fontSize = '28px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '10px';
      title.style.color = '#1a1a1a';
      title.textContent = currentArticle.title;
      pdfContent.appendChild(title);
      
      // Add date
      const date = document.createElement('p');
      date.style.fontSize = '14px';
      date.style.color = '#666';
      date.style.marginBottom = '30px';
      date.textContent = `Generated: ${new Date().toLocaleDateString()}`;
      pdfContent.appendChild(date);
      
      // Add content
      const contentDiv = document.createElement('div');
      contentDiv.style.fontSize = '16px';
      contentDiv.style.lineHeight = '1.8';
      contentDiv.style.color = '#333';
      contentDiv.style.marginBottom = '30px';
      
      currentArticle.content.forEach(paragraph => {
        const p = document.createElement('p');
        p.style.marginBottom = '15px';
        p.textContent = paragraph;
        contentDiv.appendChild(p);
      });
      
      pdfContent.appendChild(contentDiv);
      
      // Add tips if they exist
      if (currentArticle.tips && currentArticle.tips.length > 0) {
        const tipsTitle = document.createElement('h2');
        tipsTitle.style.fontSize = '20px';
        tipsTitle.style.fontWeight = 'bold';
        tipsTitle.style.marginTop = '30px';
        tipsTitle.style.marginBottom = '15px';
        tipsTitle.style.color = '#1a1a1a';
        tipsTitle.textContent = 'Pro Tips';
        pdfContent.appendChild(tipsTitle);
        
        const tipsList = document.createElement('ul');
        tipsList.style.paddingLeft = '20px';
        tipsList.style.marginBottom = '30px';
        
        currentArticle.tips.forEach(tip => {
          const li = document.createElement('li');
          li.style.marginBottom = '10px';
          li.style.fontSize = '16px';
          li.style.color = '#333';
          li.textContent = tip;
          tipsList.appendChild(li);
        });
        
        pdfContent.appendChild(tipsList);
      }
      
      // Add footer
      const footer = document.createElement('div');
      footer.style.marginTop = '40px';
      footer.style.paddingTop = '20px';
      footer.style.borderTop = '2px solid #e5e7eb';
      footer.style.fontSize = '12px';
      footer.style.color = '#999';
      footer.style.textAlign = 'center';
      footer.textContent = 'Tirsi POS User Guide - All Rights Reserved';
      pdfContent.appendChild(footer);
      
      // Append to body temporarily
      document.body.appendChild(pdfContent);
      
      // Generate PDF using html2canvas
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Remove temporary div
      document.body.removeChild(pdfContent);
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Download PDF
      const fileName = `${currentArticle.title.toLowerCase().replace(/\s+/g, '-')}-guide.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Functions for other features
  const handleViewDocumentation = () => {
    const docUrl = `https://docs.tirsi.com/${selectedArticle}`;
    window.open(docUrl, '_blank');
  };

  const handleVideoTutorial = () => {
    setShowVideoModal(true);
  };

  // Video Modal Component
  const VideoModal = () => {
    if (!showVideoModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
            <h3 className="text-xl font-bold text-gray-900">Video Tutorials</h3>
            <button
              onClick={() => setShowVideoModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videoTutorials.map((video) => (
                <div key={video.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 hover:bg-opacity-30 transition-opacity">
                      <button
                        onClick={() => window.open(video.url, '_blank')}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Play className="w-8 h-8 text-blue-600 ml-1" />
                      </button>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-1">{video.title}</h4>
                    <p className="text-sm text-gray-600">{video.description}</p>
                    <button
                      onClick={() => window.open(video.url, '_blank')}
                      className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
                    >
                      Watch Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // AI Chat Functions
  const sendMessageToAI = async (message) => {
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Use the chat endpoint directly with the current article context
      const response = await userGuideService.chat(message, selectedArticle);
      
      setIsTyping(false);
      
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        message: response.response || "I'm here to help! What would you like to know?",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      // Fallback response
      const fallbackResponse = "I'm here to help you with any questions about the Tirsi POS system. You can ask me about products, sales, customers, reports, staff management, settings, expenses, suppliers, returns, invoices, or loyalty programs. What would you like to know more about?";
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        message: fallbackResponse,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      message: userMessage,
      timestamp: new Date().toLocaleTimeString()
    }]);
    
    setChatInput('');
    await sendMessageToAI(userMessage);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setChatOpen(!chatOpen);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen]);

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Video Modal */}
      <VideoModal />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <BookOpen className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Guide</h2>
            <p className="text-sm text-gray-500">Learn how to use the POS system effectively</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleVideoTutorial}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Video className="w-4 h-4" />
            Video Tutorials
          </button>
          <button 
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
          >
            <Bot className="w-4 h-4" />
            AI Assistant
            <span className="text-xs bg-blue-400 text-white px-2 py-0.5 rounded-full">Ctrl+K</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search articles, topics, or keywords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4 shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Topics</p>
            </div>
            <div className="p-2 max-h-[600px] overflow-y-auto">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                const isExpanded = expandedSection === section.id;
                return (
                  <div key={section.id} className="mb-1">
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900 flex-1 text-left">
                        {section.title}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-7 space-y-1 mt-1">
                        {section.articles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => setSelectedArticle(article.id)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              selectedArticle === article.id
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {article.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="flex-1">
          <div ref={articleRef} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {currentArticle.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Updated: January 2024</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span>5 min read</span>
              </div>
            </div>

            <div className="space-y-6">
              {currentArticle.content && currentArticle.content.map((paragraph, index) => (
                <p key={index} className="text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}

              {currentArticle.tips && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Star className="w-4 h-4 text-gray-600" />
                    Pro Tips
                  </h4>
                  <ul className="space-y-2">
                    {currentArticle.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={generatePDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF Guide
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleViewDocumentation}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    View Online Documentation
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Previous Article
                </button>
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Next Article
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Was this article helpful?</h4>
            <div className="flex gap-3 flex-wrap">
              <button 
                onClick={async () => {
                  try {
                    await fetch('/api/userguide/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        article_id: selectedArticle,
                        helpful: true,
                        comment: 'Helpful article'
                      })
                    });
                    alert('Thank you for your feedback!');
                  } catch (error) {
                    console.error('Error submitting feedback:', error);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
              >
                <CheckCircle className="w-4 h-4" />
                Yes
              </button>
              <button 
                onClick={async () => {
                  try {
                    await fetch('/api/userguide/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        article_id: selectedArticle,
                        helpful: false,
                        comment: 'Not helpful'
                      })
                    });
                    alert('Thank you for your feedback!');
                  } catch (error) {
                    console.error('Error submitting feedback:', error);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              >
                <AlertCircle className="w-4 h-4" />
                No
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 ml-auto">
                <HelpCircle className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-50 group"
      >
        <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
      </button>

      {/* AI Chat Window */}
      {chatOpen && (
        <div className={`fixed bottom-24 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[550px]'
        }`}>
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">AI Assistant</span>
              <span className="text-xs bg-green-400 text-white px-2 py-0.5 rounded-full">Online</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4 text-white" /> : <Minimize2 className="w-4 h-4 text-white" />}
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto h-[380px] bg-gray-50">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <span className="text-[10px] opacity-70 mt-1 block">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Quick Questions:</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setChatInput('How do I add a product?');
                      handleSendMessage(new Event('submit'));
                    }}
                    className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    Add Product
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('How to create a sale order?');
                      handleSendMessage(new Event('submit'));
                    }}
                    className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    Create Sale
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('How to manage customers?');
                      handleSendMessage(new Event('submit'));
                    }}
                    className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    Manage Customers
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('How to view reports?');
                      handleSendMessage(new Event('submit'));
                    }}
                    className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    View Reports
                  </button>
                </div>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask me anything... (Ctrl+K to toggle)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-400 text-center">
                  Press Enter to send
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserGuide;