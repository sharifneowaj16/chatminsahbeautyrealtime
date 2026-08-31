export type CanonicalDeliveryMessageType =
  | 'PRODUCT_FREE'
  | 'NEW_CUSTOMER'
  | 'RETURNING_CUSTOMER';

export type DeliveryMessageType =
  | 'message1'
  | 'message2'
  | 'message3'
  | 'product_free_delivery'
  | 'new_customer'
  | 'returning_customer'
  | CanonicalDeliveryMessageType;

export interface DeliveryMessageItemConfig {
  text: string;
  backgroundColor: string;
  textColor: string;
  active: boolean;
  /** Backward compatibility aliases */
  messageText?: string;
  bgColor?: string;
  enabled?: boolean;
  ctaText?: string;
  ctaHref?: string;
}

export interface DeliveryMessageConfig {
  enabled?: boolean;
  height?: string;
  message1: DeliveryMessageItemConfig;
  message2: DeliveryMessageItemConfig;
  message3: DeliveryMessageItemConfig;
  /** Named message structure for backward compatibility */
  messages?: {
    productFreeDelivery: DeliveryMessageItemConfig;
    newCustomer: DeliveryMessageItemConfig;
    returningCustomer: DeliveryMessageItemConfig;
  };
}

export interface DeliveryMessageResponse {
  messageType: CanonicalDeliveryMessageType | null;
  messageText: string;
  backgroundColor: string;
  textColor: string;
  active?: boolean;
}

export const DEFAULT_DELIVERY_MESSAGE_CONFIG: DeliveryMessageConfig = {
  enabled: true,
  height: '40px',
  message1: {
    text: '✨ এই প্রোডাক্টে সারা বাংলাদেশে ফ্রি ডেলিভারি।',
    backgroundColor: '#d3fa99',
    textColor: '#1c3a13',
    active: true,
    messageText: '✨ এই প্রোডাক্টে সারা বাংলাদেশে ফ্রি ডেলিভারি।',
    bgColor: '#d3fa99',
    enabled: true,
    ctaText: '',
    ctaHref: '',
  },
  message2: {
    text: '🎁 New customer delivery offer: ঢাকার ভিতরে ফ্রি, ঢাকার বাইরে ৳60 (৳500+ order), ৳1100+ হলে সারা বাংলাদেশে ফ্রি।',
    backgroundColor: '#d3fa99',
    textColor: '#1c3a13',
    active: true,
    messageText: '🎁 New customer delivery offer: ঢাকার ভিতরে ফ্রি, ঢাকার বাইরে ৳60 (৳500+ order), ৳1100+ হলে সারা বাংলাদেশে ফ্রি।',
    bgColor: '#d3fa99',
    enabled: true,
    ctaText: '',
    ctaHref: '',
  },
  message3: {
    text: '👑 Welcome Back! আপনার জন্য প্রতিটি অর্ডারে ডেলিভারি চার্জে ৫০% বিশেষ ছাড়।',
    backgroundColor: '#d3fa99',
    textColor: '#1c3a13',
    active: true,
    messageText: '👑 Welcome Back! আপনার জন্য প্রতিটি অর্ডারে ডেলিভারি চার্জে ৫০% বিশেষ ছাড়।',
    bgColor: '#d3fa99',
    enabled: true,
    ctaText: '',
    ctaHref: '',
  },
};
