import prisma from '@/lib/prisma';
import {
  DEFAULT_MOBILE_NAV_CONFIG,
  DEFAULT_NAV_BUTTONS,
  DEFAULT_MOBILE_HEADER_CONFIG,
  MobileNavigationConfig,
  MobileHeaderConfig,
  NavBarStyleId,
  SearchBarStyleId,
  NavButtonItem,
} from '@/types/navigation-config';

const CONFIG_KEY = 'mobile_navigation_config';
let memoryConfigCache: MobileNavigationConfig = DEFAULT_MOBILE_NAV_CONFIG;

/**
 * Sanitizes raw SVG string to eliminate any XSS vectors (scripts, on* handlers, foreignObjects, javascript URIs).
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  let sanitized = rawSvg
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove foreignObject and contents
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
    // Remove on* event handlers (onload, onerror, onclick, etc.)
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: pseudo-protocols
    .replace(/href\s*=\s*["']?javascript:[^"'>]*/gi, 'href="#"')
    // Remove xlink:href="javascript:..."
    .replace(/xlink:href\s*=\s*["']?javascript:[^"'>]*/gi, '')
    .trim();

  // Validate that it begins with <svg and ends with </svg>
  if (!sanitized.startsWith('<svg') || !sanitized.endsWith('</svg>')) {
    if (sanitized.includes('<path') || sanitized.includes('<g') || sanitized.includes('<circle')) {
      sanitized = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sanitized}</svg>`;
    } else {
      return '';
    }
  }

  // Cap size at 50KB to preserve bandwidth and prevent memory bloat
  if (sanitized.length > 51200) {
    return '';
  }

  return sanitized;
}

/**
 * Normalizes input config ensuring all required fields are valid and safe.
 */
export function normalizeMobileNavConfig(raw: any): MobileNavigationConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_MOBILE_NAV_CONFIG;
  }

  const validNavStyles: NavBarStyleId[] = ['style-05', 'style-09', 'style-10'];
  const validSearchStyles: SearchBarStyleId[] = ['style-01', 'style-03', 'style-07'];

  const navBarStyle: NavBarStyleId = validNavStyles.includes(raw.navBarStyle)
    ? raw.navBarStyle
    : DEFAULT_MOBILE_NAV_CONFIG.navBarStyle;

  const searchBarStyle: SearchBarStyleId = validSearchStyles.includes(raw.searchBarStyle)
    ? raw.searchBarStyle
    : DEFAULT_MOBILE_NAV_CONFIG.searchBarStyle;

  let buttons: NavButtonItem[] = [];
  if (Array.isArray(raw.buttons) && raw.buttons.length > 0) {
    buttons = raw.buttons.map((b: any, index: number) => ({
      key: b.key,
      label: typeof b.label === 'string' && b.label.trim() ? b.label.trim().slice(0, 20) : 'Item',
      iconType: b.iconType === 'custom_svg' ? 'custom_svg' : 'system',
      customSvg: b.customSvg ? sanitizeSvg(b.customSvg) : undefined,
      isVisible: Boolean(b.isVisible),
      order: typeof b.order === 'number' ? b.order : index + 1,
    }));
  } else {
    buttons = DEFAULT_NAV_BUTTONS;
  }

  const rawHeader = raw.mobileHeader || {};
  const mobileHeader: MobileHeaderConfig = {
    showLogo: rawHeader.showLogo !== undefined ? Boolean(rawHeader.showLogo) : DEFAULT_MOBILE_HEADER_CONFIG.showLogo,
    showDeliverTo: rawHeader.showDeliverTo !== undefined ? Boolean(rawHeader.showDeliverTo) : DEFAULT_MOBILE_HEADER_CONFIG.showDeliverTo,
    showWishlist: rawHeader.showWishlist !== undefined ? Boolean(rawHeader.showWishlist) : DEFAULT_MOBILE_HEADER_CONFIG.showWishlist,
    showCart: rawHeader.showCart !== undefined ? Boolean(rawHeader.showCart) : DEFAULT_MOBILE_HEADER_CONFIG.showCart,
    showAccount: rawHeader.showAccount !== undefined ? Boolean(rawHeader.showAccount) : DEFAULT_MOBILE_HEADER_CONFIG.showAccount,
    showMenu: rawHeader.showMenu !== undefined ? Boolean(rawHeader.showMenu) : DEFAULT_MOBILE_HEADER_CONFIG.showMenu,
  };

  return {
    navBarStyle,
    searchBarStyle,
    buttons,
    mobileHeader,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the current mobile navigation & search configuration from DB with timeout fallback.
 */
export async function getMobileNavigationConfig(): Promise<MobileNavigationConfig> {
  try {
    const fetchPromise = prisma.siteConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1500)
    );

    const record = await Promise.race([fetchPromise, timeoutPromise]);

    if (!record || !record.value) {
      return memoryConfigCache;
    }

    const parsed = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
    const normalized = normalizeMobileNavConfig(parsed);
    memoryConfigCache = normalized;
    return normalized;
  } catch (error) {
    console.warn('[getMobileNavigationConfig] DB connection slow/unavailable, serving cache:', error);
    return memoryConfigCache;
  }
}

/**
 * Saves updated mobile navigation & search configuration to DB and memory cache.
 */
export async function saveMobileNavigationConfig(
  config: Partial<MobileNavigationConfig>
): Promise<MobileNavigationConfig> {
  const normalized = normalizeMobileNavConfig(config);
  memoryConfigCache = normalized;

  try {
    await prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key: CONFIG_KEY,
        value: JSON.stringify(normalized),
      },
      update: {
        value: JSON.stringify(normalized),
      },
    });
  } catch (err) {
    console.warn('[saveMobileNavigationConfig] DB update failed, preserved in memory cache:', err);
  }

  return normalized;
}
