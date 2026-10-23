'use client';

import React, { useState, useEffect, useCallback } from 'react';
import NotificationPreviewHeader from './NotificationPreviewHeader';
import NotificationChannelSwitch from './NotificationChannelSwitch';
import WhatsAppMessageBubble from './WhatsAppMessageBubble';
import SMSMessageBubble from './SMSMessageBubble';
import NotificationDispatchFooter from './NotificationDispatchFooter';
import { NotificationChannelType, NotificationPreviewProduct } from './types';

const defaultProduct: NotificationPreviewProduct = {
  id: 'boj-dynasty',
  name: 'Beauty of Joseon Dynasty Cream',
  brand: 'BEAUTY OF JOSEON',
  price: 1850,
  batchNumber: 'KR-BOJ-88',
  hub: 'Fast Home Delivery',
  image: '/images/categories/Skincare.png',
  stockCount: 42,
};

export default function NotificationPreviewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<NotificationChannelType>('whatsapp');
  const [phone] = useState('+880 1712-345678');
  const [product, setProduct] = useState<NotificationPreviewProduct>(defaultProduct);

  const handleOpen = useCallback((e: Event) => {
    const customEvent = e as CustomEvent<{
      channel?: NotificationChannelType;
      product?: NotificationPreviewProduct;
    }>;
    if (customEvent.detail?.channel) {
      setChannel(customEvent.detail.channel);
    }
    if (customEvent.detail?.product) {
      setProduct(customEvent.detail.product);
    }
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('minsah:open-notification-preview', handleOpen);
    return () => {
      window.removeEventListener('minsah:open-notification-preview', handleOpen);
    };
  }, [handleOpen]);

  const handleSendTest = () => {
    const channelName = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
    alert(`Test notification successfully dispatched to ${phone} via ${channelName}!`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 md:p-10 select-none overflow-y-auto overflow-x-hidden no-scrollbar"
    >
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-[#062402]/70 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Sheet / Dialog Container */}
      <div className="relative w-full sm:max-w-md max-h-[88vh] sm:max-h-[min(85vh,640px)] bg-[#FAF9F6] rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-[#E2DED8] shadow-2xl p-4 sm:p-5 pb-6 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-3.5 z-10 my-auto shrink-0 transition-all duration-300">
        {/* Grab Handle for mobile */}
        <div className="flex justify-center pb-0.5 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[#E2DED8]" />
        </div>

        {/* Header */}
        <NotificationPreviewHeader phone={phone} onClose={handleClose} />

        {/* Segmented Switcher */}
        <NotificationChannelSwitch
          activeChannel={channel}
          onChange={setChannel}
        />

        {/* Preview Message Shell */}
        {channel === 'whatsapp' ? (
          <WhatsAppMessageBubble
            product={product}
            onQuickCheckout={() => {
              alert('Redirecting to 1-Tap Checkout...');
            }}
            onViewWishlist={() => {
              alert('Opening product details...');
            }}
          />
        ) : (
          <SMSMessageBubble product={product} />
        )}

        {/* Dispatch Action Footer */}
        <NotificationDispatchFooter
          activeChannel={channel}
          phone={phone}
          onSendTest={handleSendTest}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
