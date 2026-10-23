'use client';

import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getSiteConfig } from '@/lib/site-config';
import { WhatsAppConciergeModal } from '@/components/concierge/WhatsAppConciergeModal';

const HIDDEN_ROUTE_PREFIXES = [
  '/admin',
  '/checkout',
  '/cart',
  '/gift',
  '/login',
  '/register',
];

export default function SocialFloatingButtons() {
  const pathname = usePathname();
  const { business, identity } = getSiteConfig();
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);

  if (HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <>
      <div className="minsah-fixed-action-above-navigation fixed right-4 z-40 mb-4 flex flex-col items-end gap-2 md:right-6 md:mb-6">
        {business.telegramUrl ? (
          <a
            href={business.telegramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Contact ${identity.name} on Telegram`}
            className="minsah-control flex h-12 w-12 items-center justify-center rounded-full bg-[#1c3a13] text-white shadow-lg hover:bg-[#062402] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] active:scale-95 transition-transform"
          >
            <Send size={20} aria-hidden="true" />
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => setIsConciergeOpen(true)}
          aria-label={`Open WhatsApp Concierge Chat with ${identity.name}`}
          className="minsah-control flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] active:scale-95 transition-transform cursor-pointer relative"
        >
          <MessageCircle size={22} aria-hidden="true" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4F6A2] rounded-full border-2 border-white animate-pulse" />
        </button>
      </div>

      <WhatsAppConciergeModal
        isOpen={isConciergeOpen}
        onClose={() => setIsConciergeOpen(false)}
      />
    </>
  );
}
