import { getBusinessProfile } from '@/lib/businessProfile';

export const SITE_IDENTITY = {
  name: 'Minsah Beauty',
  shortName: 'Minsah',
  tagline: 'Authentic beauty, delivered',
  description:
    'Authentic skincare, makeup and everyday beauty essentials with nationwide delivery across Bangladesh.',
  locale: 'bn-BD',
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
} as const;

export const SITE_SHOP_LINKS = [
  { href: '/shop', label: 'All products' },
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/flash-sale', label: 'Offers' },
  { href: '/new-arrivals', label: 'New arrivals' },
] as const;

export const SITE_HELP_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
  { href: '/track', label: 'Track order' },
  { href: '/privacy-policy', label: 'Privacy policy' },
] as const;

export type PublicSocialLink = {
  id: 'facebook' | 'instagram' | 'youtube' | 'telegram';
  label: string;
  href: string;
};

export const SITE_ACCOUNT_LINKS = {
  signIn: '/login',
  register: '/register',
  settings: '/account/settings',
  communicationPreferences: '/account/settings?section=preferences#communication-preferences',
} as const;

export function getSiteConfig() {
  const business = getBusinessProfile();
  const socialLinks: Array<PublicSocialLink | null> = [
    business.facebookUrl ? { id: 'facebook', label: 'Facebook', href: business.facebookUrl } : null,
    business.instagramUrl ? { id: 'instagram', label: 'Instagram', href: business.instagramUrl } : null,
    business.youtubeUrl ? { id: 'youtube', label: 'YouTube', href: business.youtubeUrl } : null,
    business.telegramUrl ? { id: 'telegram', label: 'Telegram', href: business.telegramUrl } : null,
  ];
  const configuredSocialLinks = socialLinks.filter((item): item is PublicSocialLink => item !== null);

  return {
    identity: SITE_IDENTITY,
    shopLinks: SITE_SHOP_LINKS,
    helpLinks: SITE_HELP_LINKS,
    accountLinks: SITE_ACCOUNT_LINKS,
    business,
    socialLinks: configuredSocialLinks,
  };
}
