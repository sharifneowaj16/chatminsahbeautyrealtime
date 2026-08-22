'use client';



import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import AdminNotificationBell from '@/components/admin/AdminNotificationBell';
import {
  Home,
  AlertTriangle,
  ShoppingBag,
  Truck,
  Users,
  BarChart,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  Globe,
  MessageSquare,
  Smartphone,
  Mail,
  Megaphone,
  Sparkles,
  Minus,
  ShieldCheck,
  PanelRightOpen,
} from 'lucide-react';

// Simple clsx alternative
const clsx = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Type definitions for menu items
interface MenuChild {
  title: string;
  href: string;
  permission?: string;
  superAdminOnly?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  superAdminOnly?: boolean;
  badge?: number;
  children?: MenuChild[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: Home,
    permission: PERMISSIONS.DASHBOARD,
  },
  {
    title: 'Products',
    href: '/admin/products',
    icon: ShoppingBag,
    permission: PERMISSIONS.PRODUCTS_VIEW,
    children: [
      { title: 'All Products', href: '/admin/products' },
      { title: 'Categories', href: '/admin/categories', permission: PERMISSIONS.CONTENT_MANAGE },
      { title: 'Inventory', href: '/admin/inventory' },
      { title: 'Inventory Shortlist', href: '/admin/inventory?tab=shortlist' },
      // ✨ নতুন যুক্ত - Purchase Shortlist
      { 
        title: '📋 Purchase Shortlist', 
        href: '/admin/shortlist',
        permission: PERMISSIONS.SHORTLIST_VIEW,
      },
    ],
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    icon: Truck,
    permission: PERMISSIONS.ORDERS_VIEW,
    children: [
      { title: 'All Orders', href: '/admin/orders' },
      { title: 'Create Order', href: '/admin/orders/new', permission: PERMISSIONS.ORDERS_VIEW },
      { title: 'Processing', href: '/admin/orders?status=processing', permission: PERMISSIONS.ORDERS_PROCESS },
      { title: 'Returns', href: '/admin/orders/returns', permission: PERMISSIONS.ORDERS_REFUND },
      {
        title: 'Courier webhooks',
        href: '/admin/shipping/steadfast-webhooks',
        permission: PERMISSIONS.ORDERS_VIEW,
      },
      {
        title: 'Pathao webhooks',
        href: '/admin/shipping/pathao-webhooks',
        permission: PERMISSIONS.ORDERS_VIEW,
      },
    ],
  },
  {
    title: 'Customers',
    href: '/admin/customers',
    icon: Users,
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    children: [
      { title: 'All Customers', href: '/admin/customers' },
      { title: 'Top Customers', href: '/admin/top-customers' },
    ],
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart,
    permission: PERMISSIONS.ANALYTICS_VIEW,
    children: [
      { title: 'Overview', href: '/admin/analytics' },
      { title: 'Sales by Region', href: '/admin/sales-by-region' },
      { title: 'Tracking & Pixels', href: '/admin/tracking' },
      { title: 'Tracking Health', href: '/admin/tracking-health', icon: AlertTriangle, superAdminOnly: true },
      { title: 'Production QA', href: '/admin/production-qa', icon: ShieldCheck, superAdminOnly: true },
      { title: 'Retargeting Audiences', href: '/admin/retargeting' },
      { title: 'Campaign Targeting', href: '/admin/campaign-targeting' },
    ],
  },
  {
    title: 'Marketing',
    href: '/admin/marketing',
    icon: Megaphone,
    permission: PERMISSIONS.CONTENT_MANAGE,
    children: [
      { title: 'Overview', href: '/admin/marketing' },
      { title: 'Meta Operations', href: '/admin/meta', icon: ShieldCheck, permission: PERMISSIONS.META_OPS_VIEW },
      { title: 'Meta Business (legacy)', href: '/admin/meta-business', icon: Megaphone, superAdminOnly: true },
      { title: 'Social Media', href: '/admin/marketing?tab=social', icon: Globe },
      { title: 'WhatsApp Business', href: '/admin/marketing?tab=whatsapp', icon: Smartphone },
      { title: 'Email Marketing', href: '/admin/marketing?tab=email', icon: Mail },
      { title: 'SMS Marketing', href: '/admin/marketing?tab=sms', icon: Smartphone },
      { title: 'Google Services', href: '/admin/marketing?tab=google', icon: Sparkles },
      { title: 'Coupons', href: '/admin/coupons' },
      { title: 'Promotions', href: '/admin/promotions' },
    ],
  },
  {
    title: 'Inbox',
    href: '/admin/inbox',
    icon: MessageSquare,
    permission: PERMISSIONS.CONTENT_MANAGE,
  },
  {
    title: 'Content',
    href: '/admin/content',
    icon: FileText,
    permission: PERMISSIONS.CONTENT_MANAGE,
    children: [
      { title: 'Home Sections', href: '/admin/home-sections' },
      { title: 'Blog Posts', href: '/admin/blog' },
      { title: 'FAQ', href: '/admin/faq' },
      { title: 'Reviews', href: '/admin/reviews' },
      { title: 'Banners', href: '/admin/banners' },
      { title: 'Pages', href: '/admin/pages' },
      { title: 'Media Library', href: '/admin/media' },
      { title: 'Contact Submissions', href: '/admin/contact' },
    ],
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: PERMISSIONS.USERS_MANAGE,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
];

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
}

export default function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasPermission, isLoading } = useAdminAuth();
  const isInboxPage = pathname.startsWith('/admin/inbox');
  const [inboxChromeHidden, setInboxChromeHidden] = useState(false);

  useEffect(() => {
    if (isInboxPage) {
      setInboxChromeHidden(true);
      setSidebarOpen(false);
      return;
    }

    setInboxChromeHidden(false);
  }, [isInboxPage]);

  // Redirect to login if not authenticated and not already on login page
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [user, isLoading, router, pathname]);

  // Auto-expand active menu items
  useEffect(() => {
    if (!user || isLoading) return; // Skip if not ready

    const activeItem = menuItems.find(item => {
      if (pathname === item.href) return true;
      if (item.children) {
        return item.children.some(child => pathname === child.href);
      }
      return false;
    });
    if (activeItem && activeItem.children) {
      setExpandedItems([activeItem.title]);
    }
  }, [pathname, user, isLoading]);

  useEffect(() => {
    if (!user || isLoading) {
      return;
    }

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
  }, [isLoading, pathname, user]);

  const filteredMenuItems = useMemo(
    () =>
      menuItems
        .filter(item => {
          if (item.superAdminOnly && user?.role !== 'SUPER_ADMIN') return false;
          return !item.permission || hasPermission(item.permission);
        })
        .map(item => ({
          ...item,
          children: item.children?.filter(child => {
            if (child.superAdminOnly && user?.role !== 'SUPER_ADMIN') return false;
            return !child.permission || hasPermission(child.permission);
          }),
        })),
    [hasPermission, user?.role]
  );
  const resolvedMenuItems = useMemo(
    () =>
      filteredMenuItems.map((item) =>
        item.title === 'Inbox'
          ? { ...item, badge: inboxUnreadCount || undefined }
          : item
      ),
    [filteredMenuItems, inboxUnreadCount]
  );

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div lang="en" className="min-h-screen flex items-center justify-center bg-[#14141A]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D07A60] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9A9691] text-sm">Loading admin workspace...</p>
        </div>
      </div>
    );
  }

  // Don't render layout if user is not authenticated
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const navSectionId = (title: string) =>
    `admin-nav-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;


  const renderSidebarContent = (instance: 'desktop' | 'mobile') => (
    <div className="flex h-full flex-col bg-[#14141A] text-[#F5F3F0]">
      {/* Logo Header */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-[#2A2A32] bg-[#14141A]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#1E1E24] border border-[#2A2A32] rounded-xl flex items-center justify-center shadow-md">
            <span className="text-[#D07A60] font-black text-lg">MB</span>
          </div>
          <div>
            <h2 className="text-[#F5F3F0] font-bold text-lg leading-tight">Minsah Beauty</h2>
            <p className="text-[#9A9691] text-xs font-medium tracking-wide">Admin Workspace</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 rounded-md text-[#9A9691] hover:text-[#F5F3F0] hover:bg-[#1E1E24]"
          aria-label="Close admin sidebar"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-[#2A2A32] bg-[#1E1E24]/60">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[#D07A60] to-[#E08D70] rounded-xl flex items-center justify-center shadow-md">
            <span className="text-[#14141A] font-bold text-lg">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#F5F3F0] truncate">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-[#9A9691] truncate capitalize">
              {user?.role?.replace('_', ' ') || 'Super Admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {resolvedMenuItems.map((item) => {
          const isExpanded = expandedItems.includes(item.title);
          const hasChildren = item.children && item.children.length > 0;
          const active = isActive(item.href);

          return (
            <div key={item.title}>
              <Link
                href={item.href}
                aria-expanded={hasChildren ? isExpanded : undefined}
                aria-controls={hasChildren ? `${navSectionId(item.title)}-${instance}` : undefined}
                onClick={(e: React.MouseEvent) => {
                  if (hasChildren) {
                    e.preventDefault();
                    toggleExpanded(item.title);
                  }
                }}
                className={clsx(
                  'group flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-150',
                  active
                    ? 'bg-[#1E1E24] text-[#D07A60] border-l-4 border-[#D07A60] shadow-sm font-semibold'
                    : 'text-[#9A9691] hover:bg-[#1E1E24]/80 hover:text-[#F5F3F0]'
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon
                    className={clsx(
                      'w-5 h-5 transition-colors',
                      active ? 'text-[#D07A60]' : 'text-[#9A9691] group-hover:text-[#F5F3F0]'
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span
                      className="px-2 py-0.5 bg-red-950/80 text-red-400 border border-red-800/40 rounded-full text-xs font-semibold"
                      aria-label={`${item.badge} unread ${item.title.toLowerCase()} items`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {hasChildren && (
                    <ChevronDown
                      className={clsx(
                        'w-4 h-4 transform transition-transform duration-200',
                        isExpanded ? 'rotate-180' : '',
                        active ? 'text-[#D07A60]' : 'text-[#9A9691]'
                      )}
                    />
                  )}
                </div>
              </Link>

              {/* Submenu */}
              {hasChildren && isExpanded && (
                <div id={`${navSectionId(item.title)}-${instance}`} className="mt-1 ml-4 space-y-1 border-l-2 border-[#2A2A32] pl-3">
                  {item.children
                    ?.filter(child => !child.permission || hasPermission(child.permission))
                    .map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={clsx(
                            'group flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all duration-150',
                            childActive
                              ? 'bg-[#1E1E24] text-[#D07A60] font-semibold border-l-2 border-[#D07A60]'
                              : 'text-[#9A9691] hover:bg-[#1E1E24]/60 hover:text-[#F5F3F0]'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {child.icon && (
                              <child.icon className="w-3.5 h-3.5 text-[#9A9691]" />
                            )}
                            <span>{child.title}</span>
                          </div>
                          {child.badge && (
                            <span
                              className="px-1.5 py-0.5 bg-[#2A2A32] text-[#D07A60] rounded-full text-[10px] font-bold"
                              aria-label={`${child.badge} ${child.title.toLowerCase()} items`}
                            >
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-[#2A2A32] p-4 bg-[#14141A]">
        <Button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-xl transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div lang="en" className="min-h-screen bg-[#0E0E12] flex">
      {!inboxChromeHidden ? (
        <>
          <aside
            aria-label="Admin navigation"
            className="hidden h-screen w-72 shrink-0 bg-[#14141A] border-r border-[#2A2A32] shadow-2xl lg:block"
          >
            {renderSidebarContent('desktop')}
          </aside>
          <Drawer
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            side="left"
            size="sm"
            ariaLabel="Admin navigation"
            showCloseButton={false}
            bodyClassName="p-0 sm:p-0 bg-[#14141A]"
            panelClassName="max-w-72 bg-[#14141A]"
          >
            {renderSidebarContent('mobile')}
          </Drawer>
        </>
      ) : null}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        {/* Top header */}
        {!inboxChromeHidden && (
          <header className="h-20 bg-[#14141A] border-b border-[#2A2A32] shadow-sm flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-[#9A9691] hover:text-[#F5F3F0] hover:bg-[#1E1E24]"
                aria-label="Open admin sidebar"
              >
                <Menu className="w-6 h-6" />
              </Button>

              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9A9691]" />
                <Input
                  type="text"
                  aria-label="Search products, orders, customers"
                  placeholder="Search products, orders, customers..."
                  className="w-96 pl-9 pr-4 py-2 bg-[#1E1E24] border border-[#2A2A32] text-[#F5F3F0] placeholder:text-[#9A9691] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D07A60] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* System Status */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#1E1E24] border border-[#2A2A32] rounded-xl">
                <div className="w-2 h-2 bg-[#4ADE80] rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-[#4ADE80]">Systems Operational</span>
                <Minus className="w-3 h-3 text-[#9A9691] rotate-90" />
                <span className="text-xs text-[#9A9691]">Live Sync</span>
              </div>

              {/* Notification Bell */}
              <AdminNotificationBell />

              {/* User menu */}
              <div className="flex items-center space-x-3 pl-4 border-l border-[#2A2A32]">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-[#F5F3F0]">{user?.name || 'Admin User'}</p>
                  <p className="text-xs text-[#9A9691] capitalize">{user?.role?.replace('_', ' ') || 'Super Admin'}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-[#D07A60] to-[#E08D70] rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-[#14141A] font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main
          className={clsx(
            'flex-1 overflow-y-auto bg-[#0E0E12] text-[#F5F3F0]',
            inboxChromeHidden && 'bg-transparent'
          )}
        >
          {children}
        </main>
      </div>

      {isInboxPage && inboxChromeHidden && (
        <Button
          type="button"
          onClick={() => setInboxChromeHidden(false)}
          className="fixed right-4 top-1/2 z-[60] -translate-y-1/2 rounded-full bg-white/95 border border-gray-200 p-3 text-gray-700 shadow-lg hover:bg-white"
          title="Show admin panel"
          aria-label="Show admin panel"
        >
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
