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
      <div lang="en" className="min-h-screen flex items-center justify-center bg-[#08090A]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8A8F98] text-sm">Loading admin workspace...</p>
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
    <div className="flex h-full flex-col bg-[#08090A] text-[#F7F8F8]">
      {/* Logo Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.08] bg-[#08090A]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#151516] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-wider">MB</span>
          </div>
          <div>
            <h2 className="text-[#F7F8F8] font-bold text-sm leading-tight tracking-tight">Minsah Beauty</h2>
            <p className="text-white/40 text-[11px] font-medium tracking-wide">Workspace</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-white/60 hover:text-white hover:bg-[#151516] transition-all"
          aria-label="Close admin sidebar"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* User info */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#151516]/40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-white/[0.08] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#F7F8F8] truncate tracking-tight">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-[11px] text-white/50 truncate capitalize">
              {user?.role?.replace('_', ' ') || 'Super Admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
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
                  'group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all duration-120 active:scale-[0.98]',
                  active
                    ? 'bg-white/[0.08] text-white border-l-2 border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-medium'
                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                )}
              >
                <div className="flex items-center space-x-2.5">
                  <item.icon
                    className={clsx(
                      'w-4 h-4 transition-colors',
                      active ? 'text-white' : 'text-white/50 group-hover:text-white'
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className="px-1.5 py-0.2 text-[10px] font-semibold bg-white/[0.10] text-white border border-white/[0.15] rounded-full"
                      aria-label={`${item.badge} unread ${item.title.toLowerCase()} items`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {hasChildren && (
                    <ChevronDown
                      className={clsx(
                        'w-3.5 h-3.5 transform transition-transform duration-150',
                        isExpanded ? 'rotate-180' : '',
                        active ? 'text-white' : 'text-white/50'
                      )}
                    />
                  )}
                </div>
              </Link>

              {/* Submenu */}
              {hasChildren && isExpanded && (
                <div id={`${navSectionId(item.title)}-${instance}`} className="mt-0.5 ml-3.5 space-y-0.5 border-l border-white/[0.08] pl-2.5">
                  {item.children
                    ?.filter(child => !child.permission || hasPermission(child.permission))
                    .map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={clsx(
                            'group flex items-center justify-between px-2.5 py-1.5 text-[11px] rounded-md transition-all duration-120 active:scale-[0.98]',
                            childActive
                              ? 'bg-white/[0.08] text-white font-medium border-l-2 border-white'
                              : 'text-white/50 hover:bg-white/[0.04] hover:text-white'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {child.icon && (
                              <child.icon className="w-3 h-3 text-white/50" />
                            )}
                            <span>{child.title}</span>
                          </div>
                          {child.badge && (
                            <span
                              className="px-1.5 py-0.2 bg-white/[0.10] text-white border border-white/[0.15] rounded-full text-[9px] font-bold"
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
      <div className="border-t border-white/[0.08] p-3 bg-[#08090A]">
        <Button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.06] hover:text-white rounded-lg transition-all duration-120 active:scale-[0.98]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div lang="en" className="admin-workspace min-h-screen bg-[#08090A] flex">
      {!inboxChromeHidden ? (
        <>
          <aside
            aria-label="Admin navigation"
            className="hidden h-screen w-64 shrink-0 bg-[#08090A] border-r border-white/[0.08] shadow-2xl lg:block"
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
            bodyClassName="p-0 sm:p-0 bg-[#08090A]"
            panelClassName="max-w-64 bg-[#08090A]"
          >
            {renderSidebarContent('mobile')}
          </Drawer>
        </>
      ) : null}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        {/* Top header */}
        {!inboxChromeHidden && (
          <header className="h-16 bg-[#08090A]/80 backdrop-blur-md border-b border-white/[0.08] shadow-xs flex items-center justify-between px-6 sticky top-0 z-30 transition-all">
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-white/60 hover:text-white hover:bg-[#151516]"
                aria-label="Open admin sidebar"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                <Input
                  type="text"
                  aria-label="Search products, orders, customers"
                  placeholder="Search products, orders, customers..."
                  className="w-80 h-8.5 pl-8.5 pr-4 py-1 bg-[#151516] border border-white/[0.08] text-[#F7F8F8] placeholder:text-white/35 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* System Status */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#151516] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] rounded-md">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                <span className="text-[11px] font-medium text-white/90">Operational</span>
                <Minus className="w-2.5 h-2.5 text-white/30 rotate-90" />
                <span className="text-[11px] text-white/50 font-mono">Sync</span>
              </div>

              {/* Notification Bell */}
              <AdminNotificationBell />

              {/* User menu */}
              <div className="flex items-center space-x-2.5 pl-3 border-l border-white/[0.08]">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-semibold text-[#F7F8F8] tracking-tight">{user?.name || 'Admin User'}</p>
                  <p className="text-[10px] text-white/50 capitalize">{user?.role?.replace('_', ' ') || 'Super Admin'}</p>
                </div>
                <div className="w-8 h-8 bg-white/[0.08] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">
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
            'flex-1 overflow-y-auto bg-[#08090A] text-[#F7F8F8]',
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
          className="fixed right-4 top-1/2 z-[60] -translate-y-1/2 rounded-full bg-[#151516] border border-white/[0.08] p-3 text-[#F7F8F8] shadow-xl hover:bg-[#1C1D1F]"
          title="Show admin panel"
          aria-label="Show admin panel"
        >
          <PanelRightOpen className="h-5 w-5 text-white" />
        </Button>
      )}
    </div>
  );
}
