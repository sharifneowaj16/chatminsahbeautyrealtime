'use client';

import React, { useState } from 'react';
import type {
  AccountUserProfile,
  AccountSettingsSecurity,
  AccountDefaultAddress,
  AccountNotificationSettings,
  AccountRegionalProfile,
} from './types';
import AccountSettingsHeader from './AccountSettingsHeader';
import AccountProfileHeaderCard from './AccountProfileHeaderCard';
import AccountSecurityCard from './AccountSecurityCard';
import AccountDeliveryPreferencesCard from './AccountDeliveryPreferencesCard';
import AccountNotificationChannelsCard from './AccountNotificationChannelsCard';
import AccountRegionalSkinProfileCard from './AccountRegionalSkinProfileCard';
import AccountPrivacyDangerCard from './AccountPrivacyDangerCard';

interface AccountSettingsMobileViewProps {
  initialProfile?: Partial<AccountUserProfile>;
  initialAddress?: AccountDefaultAddress | null;
  onLogout?: () => void;
  onEditProfile?: () => void;
  onChangePassword?: () => void;
}

const DEFAULT_NOTIFICATIONS: AccountNotificationSettings = {
  courierTracking: true,
  restockAlerts: true,
  promotions: false,
};

const DEFAULT_REGIONAL: AccountRegionalProfile = {
  currency: 'BDT (৳)',
  language: 'English (US)',
  skinDiagnostic: 'Profile Synced',
};

export default function AccountSettingsMobileView({
  initialProfile,
  initialAddress,
  onLogout,
  onEditProfile,
  onChangePassword,
}: AccountSettingsMobileViewProps) {
  const profile: AccountUserProfile = {
    name: initialProfile?.name || 'Member',
    vipTier: initialProfile?.vipTier || 'Member',
    email: initialProfile?.email || '',
    phone: initialProfile?.phone || '',
    isKycVerified: Boolean(initialProfile?.isKycVerified),
    avatarUrl: initialProfile?.avatarUrl || '',
    stats: {
      glowPoints: initialProfile?.stats?.glowPoints ?? 0,
      ordersCount: initialProfile?.stats?.ordersCount ?? 0,
      walletBalance: initialProfile?.stats?.walletBalance ?? 0,
    },
  };

  const [security, setSecurity] = useState<AccountSettingsSecurity>({
    twoFactorEnabled: false,
    passwordLastUpdated: 'Recently',
    activeDevice: {
      model: 'Current Device',
      location: 'Active Session',
    },
  });

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
    downloadAnchor.setAttribute('download', `minsah-account-data-${profile.email || 'export'}.json`);
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

        {/* Delivery Preferences (Real user address or clean empty state) */}
        <AccountDeliveryPreferencesCard address={initialAddress || null} />

        {/* Notification Channels */}
        <AccountNotificationChannelsCard
          notifications={notifications}
          onToggleChannel={handleToggleNotification}
        />

        {/* Regional & Skin Profile */}
        <AccountRegionalSkinProfileCard regional={DEFAULT_REGIONAL} />

        {/* Privacy & Account Logout */}
        <AccountPrivacyDangerCard
          onDownloadData={handleDownloadData}
          onLogout={onLogout}
        />
      </main>
    </div>
  );
}
