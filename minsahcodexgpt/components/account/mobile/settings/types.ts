export interface AccountUserProfile {
  name: string;
  vipTier: string;
  email: string;
  phone: string;
  isKycVerified: boolean;
  avatarUrl: string;
  stats: {
    glowPoints: number;
    ordersCount: number;
    walletBalance: number;
  };
}

export interface AccountSettingsSecurity {
  twoFactorEnabled: boolean;
  passwordLastUpdated: string;
  activeDevice: {
    model: string;
    location: string;
  };
}

export interface AccountDefaultAddress {
  label: string;
  speedTier: string;
  fullAddress: string;
  deliveryInstruction: string;
}

export interface AccountPaymentItem {
  id: string;
  type: 'bkash' | 'card';
  title: string;
  detail: string;
}

export interface AccountNotificationSettings {
  courierTracking: boolean;
  restockAlerts: boolean;
  promotions: boolean;
}

export interface AccountRegionalProfile {
  currency: string;
  language: string;
  skinDiagnostic: string;
}
