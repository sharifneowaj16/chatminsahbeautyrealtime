export interface StockProductSummary {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  price: number;
  regularPrice: number;
  discountPercent?: number;
  image: string;
  expectedDate?: string;
  batchInfo?: string;
}

export interface AlternativeProduct {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  image: string;
  tag: string;
}

export interface OutOfStockDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: StockProductSummary;
  alternative?: AlternativeProduct;
  onDelete?: () => void;
  onSaveToWishlist?: () => void;
  onSwap?: (alt: AlternativeProduct) => void;
}

export interface NotificationChannels {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
}

export interface BackInStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: StockProductSummary;
  userPhone?: string;
  userName?: string;
  onConfirmAlert?: (channels: NotificationChannels, contact: string) => void;
}
