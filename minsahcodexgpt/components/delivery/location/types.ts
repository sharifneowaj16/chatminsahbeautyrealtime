export interface DeliveryZoneItem {
  id: string;
  name: string;
  deliveryTime: string;
  hub: string;
  isExpressAvailable: boolean;
}

export interface SavedAddressItem {
  id: string;
  label: string;
  area: string;
  address: string;
  isDefault?: boolean;
}

export interface DeliveryLocationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelect?: (locationName: string) => void;
}
