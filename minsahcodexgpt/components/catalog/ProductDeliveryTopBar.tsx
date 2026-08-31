'use client';

import React, { useEffect, useState } from 'react';
import type { DeliveryMessageResponse } from '@/lib/delivery-message/types';
import {
  trackDeliveryMessageViewed,
  trackDeliveryMessageClicked,
} from '@/lib/tracking/events';

export interface ProductDeliveryTopBarProps {
  productId?: string | null;
  slug?: string | null;
  isFreeDelivery?: boolean | null;
  initialMessage?: DeliveryMessageResponse | null;
  className?: string;
}

export default function ProductDeliveryTopBar({
  productId,
  slug,
  isFreeDelivery,
  initialMessage,
  className = '',
}: ProductDeliveryTopBarProps) {
  const [message, setMessage] = useState<DeliveryMessageResponse | null>(initialMessage || null);
  const [loading, setLoading] = useState<boolean>(!initialMessage);

  useEffect(() => {
    let isMounted = true;

    async function fetchDeliveryMessage() {
      try {
        const params = new URLSearchParams();
        if (productId) params.set('productId', productId);
        if (slug) params.set('slug', slug);
        if (isFreeDelivery !== undefined && isFreeDelivery !== null) {
          params.set('isFreeDelivery', String(isFreeDelivery));
        }

        const res = await fetch(`/api/delivery-message?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch delivery message: ${res.status}`);
        }

        const data: DeliveryMessageResponse = await res.json();
        if (isMounted) {
          if (data?.messageType && data?.messageText?.trim() && data.active !== false) {
            setMessage(data);
            trackDeliveryMessageViewed({
              messageType: data.messageType,
              productId,
              productSlug: slug,
            });
          } else {
            setMessage(null);
          }
        }
      } catch (err) {
        console.warn('[ProductDeliveryTopBar] Fetch error; rendering safe fallback:', err);
        if (isMounted) {
          setMessage(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDeliveryMessage();

    return () => {
      isMounted = false;
    };
  }, [productId, slug, isFreeDelivery]);

  if (loading && !message) {
    return (
      <div
        className={`w-full min-h-[40px] flex items-center justify-center bg-[#d3fa99]/20 animate-pulse text-xs text-minsah-text-muted ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (!message || !message.messageType || !message.messageText?.trim()) {
    return null;
  }

  return (
    <aside
      aria-label="Delivery offer notification"
      data-testid="product-delivery-topbar"
      data-message-type={message.messageType}
      onClick={() => {
        if (message?.messageType) {
          trackDeliveryMessageClicked({
            messageType: message.messageType,
            productId,
            productSlug: slug,
          });
        }
      }}
      className={`w-full min-h-[40px] py-2 px-4 flex items-center justify-center text-center transition-colors duration-150 ${className}`}
      style={{
        backgroundColor: message.backgroundColor,
        color: message.textColor,
      }}
    >
      <div className="max-w-6xl mx-auto w-full flex items-center justify-center">
        <p className="text-xs sm:text-sm font-medium tracking-normal leading-snug break-words whitespace-normal text-center m-0">
          {message.messageText}
        </p>
      </div>
    </aside>
  );
}
