export type AddressCategory = "Home" | "Office" | "Other";
export type TimingSlot = "anytime" | "work";

export interface DeliveryAddress {
  id?: string;
  category: AddressCategory;
  recipientName: string;
  phone: string;
  division: string;
  area: string;
  streetAddress: string;
  landmark?: string;
  timingSlot: TimingSlot;
  isDefault: boolean;
}
