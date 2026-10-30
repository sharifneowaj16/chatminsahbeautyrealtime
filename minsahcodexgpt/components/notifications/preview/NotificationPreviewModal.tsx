'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import NotificationChannelSwitch from './NotificationChannelSwitch';
import WhatsAppMessageBubble from './WhatsAppMessageBubble';
import SMSMessageBubble from './SMSMessageBubble';
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
    if (customEvent.detail?.channel) setChannel(customEvent.detail.channel);
    if (customEvent.detail?.product) setProduct(customEvent.detail.product);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    window.addEventListener('minsah:open-notification-preview', handleOpen);
    return () => window.removeEventListener('minsah:open-notification-preview', handleOpen);
  }, [handleOpen]);

  const handleSendTest = () => {
    const channelName = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
    alert(`Test notification successfully dispatched to ${phone} via ${channelName}!`);
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      badge={
        <>
          <MailCheck className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>Live Sample Dispatch</span>
        </>
      }
      title="Restock Notification Preview"
      description={`Simulated customer dispatch to ${phone}`}
      closeLabel="Close notification preview"
      footer={
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={handleSendTest}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] active:scale-[0.98]"
          >
            <Send className="h-4 w-4 text-[#D4F6A2]" />
            <span>
              {channel === 'whatsapp'
                ? 'Send Live Test Message to WhatsApp'
                : `Send Live Test SMS to ${phone}`}
            </span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-full items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] font-semibold text-[#5A615D] hover:text-[#181C1A]"
          >
            Close Preview
          </button>
        </div>
      }
    >
      <NotificationChannelSwitch activeChannel={channel} onChange={setChannel} />
      {channel === 'whatsapp' ? (
        <WhatsAppMessageBubble
          product={product}
          onQuickCheckout={() => alert('Redirecting to 1-Tap Checkout...')}
          onViewWishlist={() => alert('Opening product details...')}
        />
      ) : (
        <SMSMessageBubble product={product} />
      )}
    </Modal>
  );
}
