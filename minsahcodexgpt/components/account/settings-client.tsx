'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Mail,
  Phone,
  Bell,
  ShieldCheck,
  Camera,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const EMPTY_PREFERENCES = {
  newsletter: false,
  smsNotifications: false,
  promotions: false,
  newProducts: false,
  orderUpdates: false,
};

export function SettingsClient() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const {
    user,
    loading,
    updateUser,
    updatePreferences,
    changePassword,
    uploadAvatar,
  } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
  });

  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const tabs = [
    { id: 'profile', name: 'Profile Details', shortName: 'Profile', icon: UserIcon },
    { id: 'preferences', name: 'Alerts & Communications', shortName: 'Alerts', icon: Bell },
    { id: 'security', name: 'Credentials & Security', shortName: 'Security', icon: ShieldCheck },
  ];

  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    if (
      requestedSection === 'profile' ||
      requestedSection === 'preferences' ||
      requestedSection === 'security'
    ) {
      setActiveTab(requestedSection);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileData({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      gender: user.gender ?? '',
    });
    setPreferences(user.preferences ?? EMPTY_PREFERENCES);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#010102] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-8 max-w-md w-full text-center shadow-2xl text-[#8a8f98] text-xs">
          Loading account security credentials...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#010102] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-8 max-w-md w-full text-center shadow-2xl text-[#8a8f98] text-xs">
          Unable to authenticate session. Please sign in again.
        </div>
      </div>
    );
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('profile');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const success = await updateUser({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim() || null,
        phone: profileData.phone.trim() || null,
        dateOfBirth: profileData.dateOfBirth || null,
        gender: (profileData.gender || null) as 'male' | 'female' | 'other' | null,
      });

      if (!success) {
        throw new Error('Profile update failed');
      }

      router.refresh();
      setSuccessMessage('Profile information updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setErrorMessage('Failed to update profile. Please verify your input and try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }

    setSavingSection(null);
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('preferences');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const success = await updatePreferences(preferences);
      if (!success) {
        throw new Error('Preferences update failed');
      }

      router.refresh();
      setSuccessMessage('Notification preferences updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setErrorMessage('Failed to update preferences. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }

    setSavingSection(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('password');
    setErrorMessage('');
    setSuccessMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      setTimeout(() => setErrorMessage(''), 3000);
      setSavingSection(null);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setErrorMessage('Password must contain at least 8 characters');
      setTimeout(() => setErrorMessage(''), 3000);
      setSavingSection(null);
      return;
    }

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (!result.success) {
        throw new Error(result.error || 'Password update failed');
      }

      setSuccessMessage('Security password updated successfully!');
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Current password is incorrect');
      setTimeout(() => setErrorMessage(''), 3000);
    }

    setSavingSection(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSavingSection('avatar');
      setErrorMessage('');
      setSuccessMessage('');
      try {
        const success = await uploadAvatar(file);
        if (!success) {
          throw new Error('Avatar upload failed');
        }
        router.refresh();
        setSuccessMessage('Profile photo updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch {
        setErrorMessage('Failed to upload avatar. Please try again.');
        setTimeout(() => setErrorMessage(''), 3000);
      } finally {
        setSavingSection(null);
        e.target.value = '';
      }
    }
  };

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
              <ShieldCheck className="w-3 h-3 text-[#828fff]" />
              Account Settings
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f8f8]">
            Settings & Security
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Manage your personal profile, notification channels, and encrypted credentials
          </p>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="rounded-xl border border-[#27a644]/30 bg-[#27a644]/10 px-4 py-3 text-xs text-[#27a644] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Segmented Navigation Tabs (Zero Horizontal Scroll) ───────────────── */}
      <div className="w-full">
        <nav className="grid grid-cols-3 rounded-xl bg-[#0f1011] p-1.5 border border-[#23252a] gap-1.5 text-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#18191a] text-white border border-[#5e6ad2]/40 shadow-sm font-semibold'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${activeTab === tab.id ? 'text-[#828fff]' : 'text-[#8a8f98]'}`} />
                <span className="hidden sm:inline truncate">{tab.name}</span>
                <span className="sm:hidden truncate">{tab.shortName}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Main Settings Panel ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-5 sm:p-7 shadow-2xl">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-[#23252a]">
              <h2 className="text-sm sm:text-base font-semibold text-[#f7f8f8]">Personal Information</h2>
              <p className="text-xs text-[#8a8f98] mt-0.5">Your official recipient name and verified contact details</p>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[#141516] border border-[#23252a]">
              <div className="relative w-16 h-16 shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-[#18191a] to-[#0f1011] rounded-2xl flex items-center justify-center text-[#f7f8f8] text-xl font-bold border border-[#23252a] shadow-inner">
                  {user.firstName?.charAt(0) ?? ''}{user.lastName?.charAt(0) ?? ''}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={savingSection === 'avatar'}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                  aria-label="Upload profile photo"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={savingSection === 'avatar'}
                  className="hidden"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-[#f7f8f8]">{user.firstName} {user.lastName}</h3>
                <p className="text-xs text-[#8a8f98] font-mono mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      user.emailVerified
                        ? 'bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {user.emailVerified ? 'Verified Account' : 'Verification Pending'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#18191a] text-[#8a8f98] border border-[#23252a] capitalize">
                    {user.role || 'Member'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full h-11 px-3.5 bg-[#18191a] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#62666d] cursor-not-allowed font-mono"
                  />
                  <p className="text-[10px] text-[#62666d] mt-1">Primary authentication email (read-only)</p>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Gender</label>
                  <select
                    value={profileData.gender}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, gender: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#23252a]">
                <button
                  type="submit"
                  disabled={savingSection === 'profile'}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSection === 'profile' ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-[#23252a]">
              <h2 className="text-sm sm:text-base font-semibold text-[#f7f8f8]">Alerts & Notification Channels</h2>
              <p className="text-xs text-[#8a8f98] mt-0.5">Control order status updates and VIP secret promotions</p>
            </div>

            <form onSubmit={handlePreferencesSubmit} className="space-y-5">
              <div className="space-y-3 rounded-xl bg-[#141516] border border-[#23252a] p-4 text-xs">
                <h3 className="font-semibold text-xs text-[#828fff] uppercase tracking-wider mb-2">
                  Email Notifications
                </h3>

                {[
                  { key: 'newsletter', label: 'Exclusive VIP newsletters & skincare rituals' },
                  { key: 'promotions', label: 'Promotional campaign alerts & seasonal flash sales' },
                  { key: 'newProducts', label: 'New luxury brand arrivals and genuine import restocks' },
                  { key: 'orderUpdates', label: 'Real-time order confirmation & digital receipts' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 cursor-pointer text-[#8a8f98] hover:text-[#f7f8f8]">
                    <input
                      type="checkbox"
                      checked={Boolean((preferences as any)[item.key])}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="accent-[#5e6ad2] rounded w-4 h-4"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="rounded-xl bg-[#141516] border border-[#23252a] p-4 text-xs">
                <h3 className="font-semibold text-xs text-[#828fff] uppercase tracking-wider mb-2">
                  SMS Express Notifications
                </h3>
                <label className="flex items-center gap-2.5 cursor-pointer text-[#8a8f98] hover:text-[#f7f8f8]">
                  <input
                    type="checkbox"
                    checked={preferences.smsNotifications}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, smsNotifications: e.target.checked }))
                    }
                    className="accent-[#5e6ad2] rounded w-4 h-4"
                  />
                  <span>Urgent courier dispatch and OTP delivery verification via SMS</span>
                </label>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#23252a]">
                <button
                  type="submit"
                  disabled={savingSection === 'preferences'}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSection === 'preferences' ? 'Updating...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-[#23252a]">
              <h2 className="text-sm sm:text-base font-semibold text-[#f7f8f8]">Security & Credentials</h2>
              <p className="text-xs text-[#8a8f98] mt-0.5">Manage encrypted credentials and active authentication sessions</p>
            </div>

            <div className="rounded-xl bg-[#141516] border border-[#23252a] p-4.5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-[#f7f8f8]">Account Password</h3>
                  <p className="text-xs text-[#8a8f98] mt-0.5">Encrypted with bcrypt standards for maximum protection</p>
                </div>
                {!showPasswordForm && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(true)}
                    className="h-10 px-4 rounded-xl bg-[#18191a] hover:bg-[#23252a] border border-[#23252a] text-[#f7f8f8] text-xs font-semibold transition-all cursor-pointer"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {showPasswordForm && (
                <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-3 border-t border-[#23252a]">
                  <div>
                    <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                        }
                        required
                        className="w-full h-11 pl-3.5 pr-10 bg-[#0f1011] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8f98]"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">New Password (min 8 chars)</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        required
                        minLength={8}
                        className="w-full h-11 pl-3.5 pr-10 bg-[#0f1011] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8f98]"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        required
                        minLength={8}
                        className="w-full h-11 pl-3.5 pr-10 bg-[#0f1011] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8f98]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      className="w-full sm:w-auto h-11 sm:h-9 px-4 rounded-xl border border-[#23252a] bg-[#141516] text-[#8a8f98] text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingSection === 'password'}
                      className="w-full sm:w-auto h-11 sm:h-9 px-5 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold"
                    >
                      {savingSection === 'password' ? 'Updating...' : 'Save New Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Active Session Status */}
            <div className="rounded-xl bg-[#141516] border border-[#23252a] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#27a644] animate-pulse" />
                <div>
                  <p className="text-xs font-semibold text-[#f7f8f8]">Active Authentication Session</p>
                  <p className="text-[11px] text-[#8a8f98]">Secure Next.js session with HTTP-only cookie</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#27a644]">Online</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
