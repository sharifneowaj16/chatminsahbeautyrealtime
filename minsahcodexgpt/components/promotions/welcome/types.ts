export interface WelcomeCollageProduct {
  id: string;
  name: string;
  image: string;
  tag: string;
  tagColor?: string;
  isCenterHighlight?: boolean;
}

export interface WelcomeDiscountModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onClaim?: (contact: string) => void;
}
