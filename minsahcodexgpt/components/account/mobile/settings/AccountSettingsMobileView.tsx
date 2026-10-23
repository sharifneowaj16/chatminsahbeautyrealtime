'use client';

import React, { useState } from 'react';
import type {
  AccountUserProfile,
  AccountSettingsSecurity,
  AccountDefaultAddress,
  AccountPaymentItem,
  AccountNotificationSettings,
  AccountRegionalProfile,
} from './types';
import AccountSettingsHeader from './AccountSettingsHeader';
import AccountProfileHeaderCard from './AccountProfileHeaderCard';
import AccountSecurityCard from './AccountSecurityCard';
import AccountDeliveryPreferencesCard from './AccountDeliveryPreferencesCard';
import AccountPaymentMethodsCard from './AccountPaymentMethodsCard';
import AccountNotificationChannelsCard from './AccountNotificationChannelsCard';
import AccountRegionalSkinProfileCard from './AccountRegionalSkinProfileCard';
import AccountPrivacyDangerCard from './AccountPrivacyDangerCard';

interface AccountSettingsMobileViewProps {
  initialProfile?: Partial<AccountUserProfile>;
  onLogout?: () => void;
  onEditProfile?: () => void;
  onChangePassword?: () => void;
}

const DEFAULT_PROFILE: AccountUserProfile = {
  name: 'Tasneem Ahmed',
  vipTier: 'Glow VIP',
  email: 'tasneem.ahmed@example.com',
  phone: '+880 1712-345678',
  isKycVerified: true,
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  stats: {
    glowPoints: 850,
    ordersCount: 5,
    walletBalance: 400,
  },
};

const DEFAULT_SECURITY: AccountSettingsSecurity = {
  twoFactorEnabled: true,
  passwordLastUpdated: '30 days ago',
  activeDevice: {
    model: 'iPhone 15 Pro',
    location: 'Banani, Dhaka',
  },
};

const DEFAULT_ADDRESS: AccountDefaultAddress = {
  label: 'Default Address',
  speedTier: 'Banani Express • Same Day',
  fullAddress: 'House 14, Road 7, Block E, Banani, Dhaka - 1213',
  deliveryInstruction: 'Leave at reception / Ring bell',
};

const DEFAULT_PAYMENTS: AccountPaymentItem[] = [
  {
    id: 'p1',
    type: 'bkash',
    title: 'bKash Wallet',
    detail: 'Connected: 01712***678',
  },
  {
    id: 'p2',
    type: 'card',
    title: 'Visa Platinum',
    detail: 'Ending in 4028',
  },
];

const DEFAULT_NOTIFICATIONS: AccountNotificationSettings = {
  courierTracking: true,
  restockAlerts: true,
  promotions: false,
};

const DEFAULT_REGIONAL: AccountRegionalProfile = {
  currency: 'BDT (৳)',
  language: 'English (US)',
  skinDiagnostic: 'Combination • Barrier Repair',
};

export default function AccountSettingsMobileView({
  initialProfile,
  onLogout,
  onEditProfile,
  onChangePassword,
}: AccountSettingsMobileViewProps) {
  const profile: AccountUserProfile = {
    ...DEFAULT_PROFILE,
    ...initialProfile,
    stats: {
      ...DEFAULT_PROFILE.stats,
      ...(initialProfile?.stats || {}),
    },
  };

  const [security, setSecurity] = useState<AccountSettingsSecurity>(DEFAULT_SECURITY);
  const [instantCheckout, setInstantCheckout] = useState(true);
  const [notifications, setNotifications] = useState<AccountNotificationSettings>(DEFAULT_NOTIFICATIONS);

  const handleToggle2FA = () => {
    setSecurity((prev) => ({
      ...prev,
      twoFactorEnabled: !prev.twoFactorEnabled,
    }));
  };

  const handleToggleNotification = (channel: keyof AccountNotificationSettings) => {
    setNotifications((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const handleDownloadData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `minsah-account-data-${profile.email}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col font-sans">
      {/* 1. Fixed Top Header */}
      <AccountSettingsHeader />

      {/* 2. Scrollable Bento Tiles Container */}
      <main className="flex-1 flex flex-col px-4 pt-20 pb-28 gap-4 max-w-lg mx-auto w-full">
        {/* User Profile Header Bento Card */}
        <AccountProfileHeaderCard
          profile={profile}
          onEditProfile={onEditProfile}
        />

        {/* Security & Credentials */}
        <AccountSecurityCard
          security={security}
          onToggle2FA={handleToggle2FA}
          onChangePassword={onChangePassword}
        />

        {/* Delivery Preferences */}
        <AccountDeliveryPreferencesCard address={DEFAULT_ADDRESS} />

        {/* Payment Methods */}
        <AccountPaymentMethodsCard
          methods={DEFAULT_PAYMENTS}
          instantCheckoutEnabled={instantCheckout}
          onToggleInstantCheckout={() => setInstantCheckout((prev) => !prev)}
        />

        {/* Notification Channels */}
        <AccountNotificationChannelsCard
          notifications={notifications}
          onToggleChannel={handleToggleNotification}
        />

        {/* Regional & Skin Profile */}
        <AccountRegionalSkinProfileCard regional={DEFAULT_REGIONAL} />

        {/* Privacy & Account Destruction */}
        <AccountPrivacyDangerCard
          onDownloadData={handleDownloadData}
          onLogout={onLogout}
        />
      </main>
    </div>
  );
}
