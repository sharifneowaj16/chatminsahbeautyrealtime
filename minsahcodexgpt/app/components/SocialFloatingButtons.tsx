'use client';

import { MessageCircle, Send } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getSiteConfig } from '@/lib/site-config';

const HIDDEN_ROUTE_PREFIXES = [
  '/admin',
  '/checkout',
  '/cart',
  '/products/',
  '/gift',
  '/login',
  '/register',
  '/account',
];

export default function SocialFloatingButtons() {
  const pathname = usePathname();
  const { business, identity } = getSiteConfig();

  if (HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return null;
  }

  if (!business.whatsappUrl && !business.telegramUrl) return null;

  return (
    <div className="minsah-fixed-action-above-navigation fixed right-4 z-40 mb-4 flex flex-col items-end gap-2 md:right-6 md:mb-6">
      {business.telegramUrl ? (
        <a
          href={business.telegramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Contact ${identity.name} on Telegram`}
          className="minsah-control flex h-12 w-12 items-center justify-center rounded-full bg-minsah-primary text-white shadow-lg hover:bg-minsah-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus focus-visible:ring-offset-2"
        >
          <Send size={20} aria-hidden="true" />
        </a>
      ) : null}
      {business.whatsappUrl ? (
        <a
          href={business.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Contact ${identity.name} on WhatsApp`}
          className="minsah-control flex h-12 w-12 items-center justify-center rounded-full bg-minsah-success text-white shadow-lg hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus focus-visible:ring-offset-2"
        >
          <MessageCircle size={21} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
