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
    text: '✨ Free nationwide delivery on this product.',
    backgroundColor: '#d3fa99',
    textColor: '#1c3a13',
    active: true,
    messageText: '✨ Free nationwide delivery on this product.',
    bgColor: '#d3fa99',
    enabled: true,
    ctaText: '',
    ctaHref: '',
  },
  message2: {
    text: '🎁 New customer delivery offer: Free inside Dhaka, ৳60 outside Dhaka (orders over {{dhakaSubsidizedThreshold}}), and 100% Free Nationwide over {{nationwideThreshold}}.',
    backgroundColor: '#d3fa99',
    textColor: '#1c3a13',
    active: true,
    messageText: '🎁 New customer delivery offer: Free inside Dhaka, ৳60 outside Dhaka (orders over {{dhakaSubsidizedThreshold}}), and 100% Free Nationwide over {{nationwideThreshold}}.',
    bgColor: '#d3fa99',
    enabled: true,
    ctaText: '',
    ctaHref: '',
  },
  message3: {
    text: '👑 Welcome Back! 50% delivery discount applied to your order.',
    backgroundColor: '#d3fa99',
    textColor: '#1c3a13',
    active: true,
    messageText: '👑 Welcome Back! 50% delivery discount applied to your order.',
    bgColor: '#d3fa99',
    enabled: true,
    ctaText: '',
    ctaHref: '',
  },
};

export const FALLBACK_DELIVERY_MESSAGE: DeliveryMessageResponse = {
  messageType: 'NEW_CUSTOMER',
  messageText: '🎁 New customer delivery offer: Free inside Dhaka, ৳60 outside Dhaka (orders over {{dhakaSubsidizedThreshold}}), and 100% Free Nationwide over {{nationwideThreshold}}.',
  backgroundColor: '#d3fa99',
  textColor: '#1c3a13',
  active: true,
};
