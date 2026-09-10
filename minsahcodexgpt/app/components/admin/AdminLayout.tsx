'use client';



import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  BarChart,
  ShoppingBag,
  Users,
  Archive,
  Truck,
  DollarSign,
  Megaphone,
  Globe,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  UserCircle,
  Calendar,
  Mail,
  ShieldCheck,
  CreditCard,
  Building,
  Tag,
  CheckCircle,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { Star as StarIconSolid } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
  badge?: number;
  children?: NavigationItem[];
}

interface AdminUser {
  name: string;
  email: string;
  role: string;
  avatar?: string;
  lastLogin?: string;
  notifications?: number;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [adminUser] = useState<AdminUser>({
    name: 'Admin User',
    email: 'admin@minsahbeauty.com',
    role: 'Super Admin',
    lastLogin: new Date().toISOString(),
    notifications: 3,
  });

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const loadInboxUnreadCount = async () => {
      try {
        const response = await fetch('/api/admin/inbox/messages?mode=unread_count&platform=facebook', {
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { unreadCount?: number };
        if (!cancelled) {
          setInboxUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // Ignore badge refresh errors.
      }
    };

    void loadInboxUnreadCount();
    const interval = window.setInterval(() => {
      void loadInboxUnreadCount();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  // Navigation structure
  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: Home,
      current: pathname === '/admin',
    },
    {
      name: 'Products',
      href: '/admin/products',
      icon: ShoppingBag,
      current: pathname.startsWith('/admin/products'),
      badge: 5, // Low stock items
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: Truck,
      current: pathname.startsWith('/admin/orders'),
      badge: 12, // Pending orders
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: Users,
      current: pathname.startsWith('/admin/customers'),
    },
    {
      name: 'Inventory',
      href: '/admin/inventory',
      icon: Archive,
      current: pathname.startsWith('/admin/inventory'),
      badge: 3, // Low stock alerts
    },
    {
      name: 'Inbox',
      href: '/admin/inbox',
      icon: MessageSquare,
      current: pathname.startsWith('/admin/inbox'),
      badge: inboxUnreadCount || undefined,
    },
    {
      name: 'Marketing',
      icon: Megaphone,
      current: pathname.startsWith('/admin/marketing'),
      children: [
        {
          name: 'Overview',
          href: '/admin/marketing',
          icon: BarChart,
          current: pathname === '/admin/marketing',
        },
        {
          name: 'Social Media',
          href: '/admin/marketing/social',
          icon: Globe,
          current: pathname === '/admin/marketing/social',
        },
        {
          name: 'Campaigns',
          href: '/admin/marketing/campaigns',
          icon: Megaphone,
          current: pathname === '/admin/marketing/campaigns',
        },
        {
          name: 'Email Marketing',
          href: '/admin/marketing/email',
          icon: Mail,
          current: pathname === '/admin/marketing/email',
        },
        {
          name: 'Calendar',
          href: '/admin/marketing/calendar',
          icon: Calendar,
          current: pathname === '/admin/marketing/calendar',
        },
      ],
    },
    {
      name: 'Google Services',
      icon: BarChart,
      current: pathname.startsWith('/admin/google'),
      children: [
        {
          name: 'Overview',
          href: '/admin/google',
          icon: Home,
          current: pathname === '/admin/google',
        },
        {
          name: 'Search Console',
          href: '/admin/google/search-console',
          icon: Globe,
          current: pathname === '/admin/google/search-console',
        },
        {
          name: 'Merchant Center',
          href: '/admin/google/merchant-center',
          icon: ShoppingBag,
          current: pathname === '/admin/google/merchant-center',
        },
        {
          name: 'Google Ads',
          href: '/admin/google/ads',
          icon: DollarSign,
          current: pathname === '/admin/google/ads',
        },
        {
          name: 'Analytics',
          href: '/admin/google/analytics',
          icon: BarChart,
          current: pathname === '/admin/google/analytics',
        },
        {
          name: 'Business Profile',
          href: '/admin/google/business-profile',
          icon: Building,
          current: pathname === '/admin/google/business-profile',
        },
        {
          name: 'Tag Manager',
          href: '/admin/google/tag-manager',
          icon: Tag,
          current: pathname === '/admin/google/tag-manager',
        },
        {
          name: 'Remarketing',
          href: '/admin/google/remarketing',
          icon: LogOut,
          current: pathname === '/admin/google/remarketing',
        },
      ],
    },
    {
      name: 'Tracking Health',
      href: '/admin/tracking-health',
      icon: AlertTriangle,
      current: pathname.startsWith('/admin/tracking-health'),
    },
    {
      name: 'Production QA',
      href: '/admin/production-qa',
      icon: ShieldCheck,
      current: pathname.startsWith('/admin/production-qa'),
    },
    {
      name: 'Reports',
      icon: FileText,
      current: pathname.startsWith('/admin/reports'),
      children: [
        {
          name: 'Sales Reports',
          href: '/admin/reports/sales',
          icon: DollarSign,
          current: pathname === '/admin/reports/sales',
        },
        {
          name: 'Inventory Reports',
          href: '/admin/reports/inventory',
          icon: Archive,
          current: pathname === '/admin/reports/inventory',
        },
        {
          name: 'Customer Reports',
          href: '/admin/reports/customers',
          icon: Users,
          current: pathname === '/admin/reports/customers',
        },
        {
          name: 'Marketing Reports',
          href: '/admin/reports/marketing',
          icon: Megaphone,
          current: pathname === '/admin/reports/marketing',
        },
      ],
    },
    {
      name: 'Settings',
      icon: Settings,
      current: pathname.startsWith('/admin/settings'),
      children: [
        {
          name: 'General',
          href: '/admin/settings/general',
          icon: Settings,
          current: pathname === '/admin/settings/general',
        },
        {
          name: 'Users & Roles',
          href: '/admin/settings/users',
          icon: Users,
          current: pathname === '/admin/settings/users',
        },
        {
          name: 'Payment',
          href: '/admin/settings/payment',
          icon: CreditCard,
          current: pathname === '/admin/settings/payment',
        },
        {
          name: 'Shipping',
          href: '/admin/settings/shipping',
          icon: Truck,
          current: pathname === '/admin/settings/shipping',
        },
        {
          name: 'Taxes',
          href: '/admin/settings/taxes',
          icon: FileText,
          current: pathname === '/admin/settings/taxes',
        },
        {
          name: 'Security',
          href: '/admin/settings/security',
          icon: ShieldCheck,
          current: pathname === '/admin/settings/security',
        },
      ],
    },
  ];

  // Secondary navigation (bottom section)
  const secondaryNavigation = [
    {
      name: 'API Keys',
      href: '/admin/api-keys',
      icon: Tag,
    },
    {
      name: 'System Logs',
      href: '/admin/logs',
      icon: FileText,
    },
  ];

  // Mock notifications
  const notifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Low Stock Alert',
      message: '3 products are running low on stock',
      time: '2 minutes ago',
      read: false,
    },
    {
      id: 2,
      type: 'order',
      title: 'New Order',
      message: 'Order 12345 requires attention',
      time: '15 minutes ago',
      read: false,
    },
    {
      id: 3,
      type: 'review',
      title: 'New Review',
      message: 'Customer left a 5-star review',
      time: '1 hour ago',
      read: true,
    },
  ];

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  const handleLogout = async () => {
    try {
      // Simulate logout
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    const diffHours = Math.ceil(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <div className="min-h-screen bg-[#10121b]">
      {/* Mobile navigation drawer */}
      <Drawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        side="left"
        size="sm"
        title="Minsah Beauty"
        description="Admin navigation"
        bodyClassName="p-0 sm:p-0"
      >
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <div>
                    <Button
                      onClick={() => toggleExpanded(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                        item.current
                          ? 'bg-[#5e6ad2]/10 text-blue-700 border-l-4 border-blue-700'
                          : 'text-[#d0d6e0] hover:bg-[#10121b] hover:text-[#f7f8f8]'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-1 bg-red-100 text-rose-300 text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          expandedItems.includes(item.name) ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                    {expandedItems.includes(item.name) && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href || '#'}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                              child.current
                                ? 'bg-[#5e6ad2]/10 text-blue-700 border-l-4 border-blue-700'
                                : 'text-[#8a8f98] hover:bg-[#10121b] hover:text-[#f7f8f8]'
                            }`}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href || '#'}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                      item.current
                        ? 'bg-[#5e6ad2]/10 text-blue-700 border-l-4 border-blue-700'
                        : 'text-[#d0d6e0] hover:bg-[#10121b] hover:text-[#f7f8f8]'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-1 bg-red-100 text-rose-300 text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            ))}

            <div className="pt-6 mt-6 border-t border-[#232636]">
              <div className="px-3 text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-2">
                Advanced
              </div>
              {secondaryNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#d0d6e0] hover:bg-[#10121b] hover:text-[#f7f8f8] transition-colors duration-300"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </nav>
      </Drawer>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-[#161824] border-r border-[#232636] pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MB</span>
                </div>
                <h2 className="text-xl font-bold text-[#f7f8f8]">Minsah Beauty Admin</h2>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.children ? (
                    <div>
                      <Button
                        onClick={() => toggleExpanded(item.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                          item.current
                            ? 'bg-[#5e6ad2]/10 text-blue-700 border-l-4 border-blue-700'
                            : 'text-[#d0d6e0] hover:bg-[#10121b] hover:text-[#f7f8f8]'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.badge && (
                          <span className="px-2 py-1 bg-red-100 text-rose-300 text-xs rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            expandedItems.includes(item.name) ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                      {expandedItems.includes(item.name) && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              href={child.href || '#'}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                                child.current
                                  ? 'bg-[#5e6ad2]/10 text-blue-700 border-l-4 border-blue-700'
                                  : 'text-[#8a8f98] hover:bg-[#10121b] hover:text-[#f7f8f8]'
                              }`}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href || '#'}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                        item.current
                          ? 'bg-[#5e6ad2]/10 text-blue-700 border-l-4 border-blue-700'
                          : 'text-[#d0d6e0] hover:bg-[#10121b] hover:text-[#f7f8f8]'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-1 bg-red-100 text-rose-300 text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              ))}

              <div className="pt-6 mt-6 border-t border-[#232636]">
                <div className="px-3 text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-2">
                  Advanced
                </div>
                {secondaryNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#d0d6e0] hover:bg-[#10121b] hover:text-[#f7f8f8] transition-colors duration-300"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-[#161824] border-b border-[#232636]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#10121b] rounded-lg transition-colors duration-300"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#62666d]" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, orders, customers..."
                  className="w-full pl-10 pr-4 py-2 border border-[#232636] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick Actions */}
              <div className="hidden md:flex items-center gap-2">
                <Button className="px-3 py-1 bg-emerald-500/10 text-emerald-300 text-xs rounded-full hover:bg-green-200 transition-colors">
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  All Systems Operational
                </Button>
                <span className="text-sm text-[#8a8f98]">
                  Last sync: 2 minutes ago
                </span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#10121b] rounded-lg transition-colors duration-300"
                >
                  <Bell className="h-5 w-5" />
                  {adminUser.notifications && adminUser.notifications > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-[#161824] border border-[#232636] rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-[#232636]">
                      <h3 className="font-medium text-[#f7f8f8]">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-[#232636] hover:bg-[#10121b] cursor-pointer ${
                            !notification.read ? 'bg-[#5e6ad2]/10' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              notification.type === 'warning' ? 'bg-amber-500/10' :
                              notification.type === 'order' ? 'bg-[#5e6ad2]/20' :
                              notification.type === 'review' ? 'bg-emerald-500/10' :
                              'bg-[#10121b]'
                            }`}>
                              {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                              {notification.type === 'order' && <ShoppingBag className="h-4 w-4 text-[#5e6ad2]" />}
                              {notification.type === 'review' && <StarIconSolid className="h-4 w-4 text-green-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#f7f8f8]">{notification.title}</p>
                              <p className="text-sm text-[#8a8f98] truncate">{notification.message}</p>
                              <p className="text-xs text-[#62666d] mt-1">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-[#232636]">
                      <Button className="text-sm text-[#5e6ad2] hover:text-blue-700 font-medium">
                        View all notifications →
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <Button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-3 p-2 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#10121b] rounded-lg transition-colors duration-300"
                >
                  <div className="w-8 h-8 bg-white/[0.12] rounded-full flex items-center justify-center">
                    {adminUser.avatar ? (
                      <img src={adminUser.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-[#8a8f98] font-medium">{adminUser.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#f7f8f8]">{adminUser.name}</p>
                    <p className="text-xs text-[#8a8f98]">{adminUser.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {/* Profile Dropdown */}
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#161824] border border-[#232636] rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-[#232636]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/[0.12] rounded-full flex items-center justify-center">
                          {adminUser.avatar ? (
                            <img src={adminUser.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-[#8a8f98] font-medium text-lg">{adminUser.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#f7f8f8]">{adminUser.name}</p>
                          <p className="text-sm text-[#8a8f98]">{adminUser.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/admin/profile"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-[#d0d6e0] hover:bg-[#10121b] rounded-lg"
                      >
                        <UserCircle className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        href="/admin/settings"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-[#d0d6e0] hover:bg-[#10121b] rounded-lg"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <div className="px-3 py-2 text-sm text-[#8a8f98]">
                        Last login: {adminUser.lastLogin ? formatRelativeTime(adminUser.lastLogin) : 'Never'}
                      </div>
                      <Button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-rose-500/10 rounded-lg"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Breadcrumb */}
      <div className="bg-[#161824] border-b border-[#232636] px-6 py-2">
        <nav className="flex items-center space-x-2 text-sm">
          <Link href="/admin" className="text-[#8a8f98] hover:text-[#d0d6e0]">
            Home
          </Link>
          {pathname !== '/admin' && (
            <>
              <span className="text-[#62666d]">/</span>
              <span className="text-[#f7f8f8] capitalize">
                {pathname.split('/').pop()?.replace(/-/g, ' ')}
              </span>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
