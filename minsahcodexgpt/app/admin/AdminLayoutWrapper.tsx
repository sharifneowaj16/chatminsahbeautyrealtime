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
  MoreHorizontal,
  SquarePen,
  Send,
  Clock,
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

  const currentPageTitle = useMemo(() => {
    if (pathname === '/admin') return 'Dashboard';
    for (const item of menuItems) {
      if (item.href === pathname) return item.title;
      if (item.children) {
        const found = item.children.find(c => c.href === pathname || pathname.startsWith(c.href + '/'));
        if (found) return `${item.title} / ${found.title}`;
      }
    }
    const segment = pathname.split('/').filter(Boolean).pop();
    if (!segment) return 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  }, [pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div lang="en" className="min-h-screen flex items-center justify-center bg-[#0b0d14]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#5e6ad2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8a8f98] text-sm">Loading admin workspace...</p>
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

  const renderNavItem = (item: MenuItem, instance: 'desktop' | 'mobile') => {
    const isExpanded = expandedItems.includes(item.title);
    const hasChildren = Boolean(item.children && item.children.length > 0);
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
            } else if (instance === 'mobile') {
              setSidebarOpen(false);
            }
          }}
          className={clsx(
            'group flex items-center justify-between rounded-md transition-all select-none',
            instance === 'mobile' ? 'h-9 px-2.5 text-[14px]' : 'h-7 px-2 text-[13px] font-normal',
            active
              ? 'bg-[#5e6ad2]/15 text-[#f7f8f8] font-medium border border-[#5e6ad2]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-[#8a8f98] hover:bg-white/[0.05] hover:text-[#f7f8f8]'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <item.icon
              className={clsx(
                'shrink-0 transition-colors',
                instance === 'mobile' ? 'w-4 h-4' : 'w-3.5 h-3.5',
                active ? 'text-[#5e6ad2]' : 'text-[#8a8f98] group-hover:text-[#f7f8f8]'
              )}
            />
            <span className="truncate">{item.title}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {item.badge !== undefined && item.badge > 0 && (
              <span className="text-[11px] font-mono text-[#8a8f98] bg-[#5e6ad2]/20 border border-[#5e6ad2]/30 px-1 rounded">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronDown
                className={clsx(
                  'w-3 h-3 transition-transform duration-150',
                  isExpanded ? 'rotate-180 text-white/60' : 'text-[#8a8f98]/60 group-hover:text-[#8a8f98]'
                )}
              />
            )}
          </div>
        </Link>

        {/* Submenu */}
        {hasChildren && isExpanded && (
          <div id={`${navSectionId(item.title)}-${instance}`} className="mt-0.5 ml-4 pl-2 space-y-0.5 border-l border-[#232636]">
            {item.children
              ?.filter(child => !child.permission || hasPermission(child.permission))
              .map((child) => {
                const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => {
                      if (instance === 'mobile') setSidebarOpen(false);
                    }}
                    className={clsx(
                      'group flex items-center justify-between rounded-md transition-all',
                      instance === 'mobile' ? 'h-8 px-2.5 text-[13px]' : 'h-6 px-2 text-[12px]',
                      childActive
                        ? 'bg-white/[0.08] text-[#f7f8f8] font-medium'
                        : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-[#f7f8f8]'
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {child.icon && (
                        <child.icon className="w-3 h-3 text-[#8a8f98] shrink-0" />
                      )}
                      <span className="truncate">{child.title}</span>
                    </div>
                    {child.badge !== undefined && child.badge > 0 && (
                      <span className="text-[10px] font-mono text-[#8a8f98]">
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
  };

  const renderSidebarContent = (instance: 'desktop' | 'mobile') => {
    const pinned = resolvedMenuItems.filter(item => ['Dashboard', 'Inbox', 'Analytics'].includes(item.title));
    const workspace = resolvedMenuItems.filter(item => ['Products', 'Orders', 'Customers', 'Content'].includes(item.title));
    const marketing = resolvedMenuItems.filter(item => ['Marketing'].includes(item.title));
    const system = resolvedMenuItems.filter(item => ['Users', 'Settings'].includes(item.title));

    return (
      <div className="flex h-full flex-col bg-[#090a0f] text-[#f7f8f8]">
        {/* Workspace Switcher Header */}
        <div className="h-11 px-3 flex items-center justify-between border-b border-[#232636] bg-[#090a0f] shrink-0">
          <div className="flex items-center gap-2 group cursor-pointer select-none">
            <div className="w-5 h-5 rounded-[5px] bg-[#5e6ad2] flex items-center justify-center font-bold text-white text-[10px] select-none shadow-xs shrink-0">
              MI
            </div>
            <span className="text-[13px] font-medium text-[#f7f8f8] group-hover:text-white tracking-tight">
              Minsahadmin
            </span>
            <ChevronDown className="w-3 h-3 text-[#8a8f98] group-hover:text-[#f7f8f8]" />
          </div>
          <div className="flex items-center gap-1 text-[#8a8f98]">
            <button
              type="button"
              title="Search"
              aria-label="Search"
              className="p-1 hover:text-[#f7f8f8] transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="New"
              aria-label="New"
              className="p-1 hover:text-[#f7f8f8] transition-colors cursor-pointer"
            >
              <SquarePen className="w-3.5 h-3.5" />
            </button>
            <Button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-[#8a8f98] hover:text-[#f7f8f8] transition-all ml-1"
              aria-label="Close admin sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {/* Pinned top items */}
          <div className="space-y-0.5 mb-2">
            {pinned.map(item => renderNavItem(item, instance))}
          </div>

          {/* Workspace section */}
          {workspace.length > 0 && (
            <div className="mb-2">
              <div className="px-2 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-medium text-[#8a8f98]/60 uppercase tracking-tight">
                <span>Workspace</span>
                <ChevronDown className="w-3 h-3 text-[#8a8f98]/40" />
              </div>
              <div className="space-y-0.5">
                {workspace.map(item => renderNavItem(item, instance))}
              </div>
            </div>
          )}

          {/* Marketing section */}
          {marketing.length > 0 && (
            <div className="mb-2">
              <div className="px-2 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-medium text-[#8a8f98]/60 uppercase tracking-tight">
                <span>Growth</span>
                <ChevronDown className="w-3 h-3 text-[#8a8f98]/40" />
              </div>
              <div className="space-y-0.5">
                {marketing.map(item => renderNavItem(item, instance))}
              </div>
            </div>
          )}

          {/* System section */}
          {system.length > 0 && (
            <div className="mb-2">
              <div className="px-2 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-medium text-[#8a8f98]/60 uppercase tracking-tight">
                <span>System</span>
                <ChevronDown className="w-3 h-3 text-[#8a8f98]/40" />
              </div>
              <div className="space-y-0.5">
                {system.map(item => renderNavItem(item, instance))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Bar: Help Circle & Logout */}
        <div className="h-11 px-3 border-t border-[#232636] flex items-center justify-between bg-[#090a0f] shrink-0">
          <button
            type="button"
            title="Help & Feedback"
            aria-label="Help and feedback"
            className="w-5 h-5 rounded-full border border-white/20 text-[11px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] hover:border-white/40 flex items-center justify-center transition-colors cursor-pointer"
          >
            ?
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      lang="en"
      className="admin-workspace min-h-screen bg-[#0b0d14] flex"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {!inboxChromeHidden ? (
        <>
          <aside
            aria-label="Admin navigation"
            className="hidden h-screen w-[240px] shrink-0 bg-[#090a0f] border-r border-[#232636] lg:block select-none"
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
            bodyClassName="p-0 sm:p-0 bg-[#090a0f]"
            panelClassName="max-w-[260px] w-[80vw] bg-[#090a0f] border-r border-[#232636]"
          >
            {renderSidebarContent('mobile')}
          </Drawer>
        </>
      ) : null}

      {/* Main workspace container with Linear's signature rounded-tl frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#10121b] lg:rounded-tl-xl lg:border-t lg:border-l lg:border-[#232636] overflow-hidden">
        {/* Top Header / Toolbar */}
        {!inboxChromeHidden && (
          <header className="h-11 bg-[#10121b] border-b border-[#232636] px-3 sm:px-4 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] active:bg-white/[0.10]"
                aria-label="Open admin sidebar"
              >
                <Menu className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-[#f7f8f8] tracking-tight truncate max-w-[160px] sm:max-w-none">
                  {currentPageTitle}
                </span>
                <button
                  type="button"
                  title="More actions"
                  className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs px-1.5 py-0.5 rounded hover:bg-white/[0.06] transition-colors ml-1 hidden sm:inline-flex"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-2.5">
              {/* Quick Search Shortcut */}
              <div className="hidden sm:flex items-center gap-2 h-7 px-2.5 rounded-md bg-white/[0.04] border border-[#232636] hover:border-[#5e6ad2]/50 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors cursor-pointer">
                <Search className="w-3 h-3" />
                <span>Search or jump to...</span>
                <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.08] text-[#8a8f98]">⌘K</kbd>
              </div>

              {/* Mobile Search Icon Trigger */}
              <button
                type="button"
                title="Search"
                aria-label="Search"
                className="sm:hidden p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded-md transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* System Status */}
              <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.03] border border-[#232636] rounded text-[11px] text-[#8a8f98] font-mono">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span>Operational</span>
              </div>

              {/* Notification Bell */}
              <AdminNotificationBell />

              {/* User Avatar */}
              <div className="w-6 h-6 rounded-full bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 text-[#f7f8f8] text-[11px] font-medium flex items-center justify-center cursor-pointer hover:bg-[#5e6ad2]/30">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main
          className={clsx(
            'flex-1 overflow-y-auto bg-[#10121b] text-[#f7f8f8]',
            inboxChromeHidden && 'bg-transparent'
          )}
        >
          {children}
        </main>

        {/* Bottom Status Bar (matching Linear) */}
        {!inboxChromeHidden && (
          <div className="h-7 border-t border-[#232636] bg-[#10121b] px-3.5 flex items-center justify-between text-[11px] text-[#8a8f98]/60 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span>Minsah Admin</span>
              <span>•</span>
              <span className="text-emerald-400/80">● Connected</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-[#8a8f98] transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3 -rotate-45" />
                <span>Agent</span>
              </button>
              <Clock className="w-3 h-3 hover:text-[#8a8f98] cursor-pointer transition-colors" />
            </div>
          </div>
        )}
      </div>

      {isInboxPage && inboxChromeHidden && (
        <Button
          type="button"
          onClick={() => setInboxChromeHidden(false)}
          className="fixed right-4 top-1/2 z-[60] -translate-y-1/2 rounded-full bg-[#161824] border border-[#232636] p-3 text-[#f7f8f8] shadow-xl hover:bg-[#1c1f2e]"
          title="Show admin panel"
          aria-label="Show admin panel"
        >
          <PanelRightOpen className="h-5 w-5 text-white" />
        </Button>
      )}
    </div>
  );
}
