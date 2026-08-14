/**
 * Approved non-semantic colors.
 *
 * These values are allowed only when the original external brand identity or
 * an external product chart palette must be represented. Application status,
 * text, borders, surfaces and actions must use the semantic design tokens.
 */

import type { HexColor } from '@/lib/design-tokens';

export const SOCIAL_PLATFORM_COLORS = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  pinterest: '#BD081C',
  twitter: '#000000',
  linkedin: '#0077B5',
  whatsapp: '#25D366',
  telegram: '#0088CC',
  discord: '#5865F2',
} as const satisfies Record<string, HexColor>;

export const GOOGLE_PRODUCT_COLORS = {
  primary: '#4285F4',
  success: '#34A853',
  warning: '#FBBC04',
  danger: '#EA4335',
  dark: '#202124',
  secondary: '#5F6368',
  background: '#F8F9FA',
  white: '#FFFFFF',
  border: '#E8EAED',
  light: '#F1F3F4',
  purple: '#9C27B0',
  orange: '#FF9800',
} as const satisfies Record<string, HexColor>;

export const APPROVED_EXTERNAL_COLOR_EXCEPTIONS = {
  socialPlatforms: SOCIAL_PLATFORM_COLORS,
  googleProducts: GOOGLE_PRODUCT_COLORS,
} as const;

export type SocialPlatformColorKey = keyof typeof SOCIAL_PLATFORM_COLORS;
export type GoogleProductColorKey = keyof typeof GOOGLE_PRODUCT_COLORS;
