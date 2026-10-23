export type NotificationChannelType = 'whatsapp' | 'sms';

export interface NotificationPreviewProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  batchNumber: string;
  hub: string;
  image: string;
  stockCount: number;
}

export interface NotificationPreviewModalProps {
  isOpen?: boolean;
  initialChannel?: NotificationChannelType;
  product?: NotificationPreviewProduct;
  phone?: string;
  onClose?: () => void;
  onSendTest?: (channel: NotificationChannelType) => void;
}
