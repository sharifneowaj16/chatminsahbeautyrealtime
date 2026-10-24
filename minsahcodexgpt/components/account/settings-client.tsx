'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AccountSettingsMobileView from '@/components/account/mobile/settings/AccountSettingsMobileView';
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
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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

  // Form data
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: ''
  });

  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: UserIcon },
    { id: 'preferences', name: 'Preferences', icon: Bell },
    { id: 'security', name: 'Security', icon: ShieldCheck }
  ];

  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    if (requestedSection === 'profile' || requestedSection === 'preferences' || requestedSection === 'security') {
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

  const mobileProfile = useMemo(
    () => ({
      name:
        [profileData.firstName || user?.firstName, profileData.lastName || user?.lastName]
          .filter(Boolean)
          .join(' ') || 'Tasneem Ahmed',
      email: user?.email || 'tasneem.ahmed@example.com',
      phone: profileData.phone || user?.phone || '+880 1712-345678',
      avatarUrl:
        user?.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      isKycVerified: true,
      vipTier: 'Glow VIP',
      stats: {
        glowPoints: user?.loyaltyPoints || 850,
        ordersCount: 5,
        walletBalance: 400,
      },
    }),
    [profileData, user]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center p-4">
        <div className="rounded-[24px] border border-[#EFECE6] bg-white p-8 max-w-md w-full text-center shadow-[0_4px_24px_rgba(6,36,2,0.03)] text-stone-600 text-sm font-medium">
          Loading your account settings...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center p-4">
        <div className="rounded-[24px] border border-[#EFECE6] bg-white p-8 max-w-md w-full text-center shadow-[0_4px_24px_rgba(6,36,2,0.03)] text-stone-600 text-sm font-medium">
          Unable to load your account. Please sign in again.
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
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setErrorMessage('Failed to update profile. Please try again.');
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
      setSuccessMessage('Preferences updated successfully!');
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

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      setTimeout(() => setErrorMessage(''), 3000);
      setSavingSection(null);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      setTimeout(() => setErrorMessage(''), 3000);
      setSavingSection(null);
      return;
    }

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (!result.success) {
        throw new Error(result.error || 'Password update failed');
      }

      setSuccessMessage('Password changed successfully!');
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
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
        setSuccessMessage('Avatar updated successfully!');
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
    <>
      <AccountSettingsMobileView
        initialProfile={mobileProfile}
        onEditProfile={() => setActiveTab('profile')}
        onChangePassword={() => {
          setActiveTab('security');
          setShowPasswordForm(true);
        }}
      />
      <div className="hidden lg:block min-h-screen bg-[#FBF9F6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]">
                <ShieldCheck className="w-3 h-3 text-[#062402]" />
                Account Security & Preferences
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#062402]">Account Settings</h1>
            <p className="text-sm text-stone-500 mt-1">Manage your luxury membership profile, communication channels, and security credentials.</p>
          </div>

          {/* Success/Error Alerts */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-3.5 rounded-[18px] flex items-center text-xs font-semibold shadow-sm">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-900 px-5 py-3.5 rounded-[18px] flex items-center text-xs font-semibold shadow-sm">
              <AlertTriangle className="w-4 h-4 mr-2 text-rose-600 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Luxury Segmented Tabs */}
          <div className="mb-8 flex items-center">
            <nav className="inline-flex rounded-[18px] bg-stone-100/90 p-1.5 border border-stone-200/60 shadow-inner gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-[#062402] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-stone-200/50'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[#062402]' : 'text-stone-400'}`} aria-hidden="true" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content Bento Card */}
          <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 md:p-10 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="pb-6 border-b border-stone-100 mb-8">
                  <h2 className="font-serif text-xl font-bold text-[#062402]">Personal Information</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Your official name and verified contact details for expedited shipping</p>
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 rounded-[20px] bg-[#FAF9F6] border border-stone-200/70 mb-8">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#062402] via-[#0d2e08] to-[#153410] rounded-2xl flex items-center justify-center text-[#D4F6A2] font-serif text-2xl font-bold shadow-md border border-[#234c1b]">
                      {user.firstName?.charAt(0) ?? ''}{user.lastName?.charAt(0) ?? ''}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={savingSection === 'avatar'}
                      className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-lg bg-[#D4F6A2] hover:bg-[#c2ed83] text-[#062402] flex items-center justify-center shadow-md transition-all border border-[#062402]/20"
                      aria-label="Upload a new profile photo"
                    >
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
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
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-bold text-[#062402]">{user.firstName} {user.lastName}</h3>
                    <p className="text-xs text-stone-500 font-medium">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        user.emailVerified
                          ? 'bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {user.emailVerified ? 'Email Verified' : 'Unverified'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 capitalize">
                        {user.status || 'Active Member'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      label="First Name"
                    />
                    <Input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      label="Last Name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        type="email"
                        value={user.email}
                        disabled
                        label="Email Address"
                        trailing={<Mail className="w-4 h-4 text-stone-400" aria-hidden="true" />}
                        className="bg-stone-50 text-stone-500 cursor-not-allowed"
                      />
                      <p className="text-[11px] text-stone-400 mt-1">Verified email account (cannot be modified)</p>
                    </div>
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      label="Phone Number"
                      trailing={<Phone className="w-4 h-4 text-stone-400" aria-hidden="true" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      label="Date of Birth"
                    />
                    <Select
                      value={profileData.gender}
                      onChange={(e) => setProfileData(prev => ({ ...prev, gender: e.target.value as any }))}
                      label="Gender"
                      placeholder="Select Gender"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-stone-100">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingSection === 'profile'}
                      className="bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      {savingSection === 'profile' ? 'Saving...' : 'Save Profile Changes'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div id="communication-preferences" className="scroll-mt-28">
                <div className="pb-6 border-b border-stone-100 mb-8">
                  <h2 className="font-serif text-xl font-bold text-[#062402]">Communication & Alert Preferences</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Control how and when Minsah Beauty communicates order updates and promotions</p>
                </div>

                <form onSubmit={handlePreferencesSubmit} className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="font-serif text-base font-bold text-[#062402]">Email Notifications</h3>
                    <div className="space-y-3 rounded-[20px] bg-[#FAF9F6] border border-stone-200/70 p-5">
                      <Checkbox
                        checked={preferences.newsletter}
                        onChange={(e) => setPreferences(prev => ({ ...prev, newsletter: e.target.checked }))}
                        label="Exclusive VIP newsletters & skincare rituals"
                      />
                      <Checkbox
                        checked={preferences.promotions}
                        onChange={(e) => setPreferences(prev => ({ ...prev, promotions: e.target.checked }))}
                        label="Promotional campaign alerts & seasonal sales"
                      />
                      <Checkbox
                        checked={preferences.newProducts}
                        onChange={(e) => setPreferences(prev => ({ ...prev, newProducts: e.target.checked }))}
                        label="New brand arrivals and genuine import restocks"
                      />
                      <Checkbox
                        checked={preferences.orderUpdates}
                        onChange={(e) => setPreferences(prev => ({ ...prev, orderUpdates: e.target.checked }))}
                        label="Real-time order confirmation & receipt delivery"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-serif text-base font-bold text-[#062402]">SMS Express Notifications</h3>
                    <div className="rounded-[20px] bg-[#FAF9F6] border border-stone-200/70 p-5">
                      <Checkbox
                        checked={preferences.smsNotifications}
                        onChange={(e) => setPreferences(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                        label="Urgent courier dispatch and OTP delivery verification via SMS"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-stone-100">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingSection === 'preferences'}
                      className="bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      {savingSection === 'preferences' ? 'Saving...' : 'Save Communication Preferences'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <div className="pb-6 border-b border-stone-100 mb-8">
                  <h2 className="font-serif text-xl font-bold text-[#062402]">Security & Authentication</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Manage your password, verification settings, and active sessions</p>
                </div>

                <div className="space-y-8">
                  {/* Password Section */}
                  <div className="rounded-[20px] bg-[#FAF9F6] border border-stone-200/70 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#062402]">Account Password</h3>
                        <p className="text-xs text-stone-500 mt-0.5">Encrypted with bcrypt standards for maximum security</p>
                      </div>
                      {!showPasswordForm && (
                        <button
                          type="button"
                          onClick={() => setShowPasswordForm(true)}
                          className="inline-flex items-center gap-2 bg-white border border-stone-200 hover:border-stone-400 text-[#062402] text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                        >
                          <Key className="w-3.5 h-3.5" aria-hidden="true" />
                          Change Password
                        </button>
                      )}
                    </div>

                    {showPasswordForm && (
                      <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4 border-t border-stone-200/60">
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          required
                          label="Current Password"
                          trailing={
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="p-1 text-stone-400 hover:text-stone-700"
                              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="w-4 h-4" aria-hidden="true" />
                              ) : (
                                <Eye className="w-4 h-4" aria-hidden="true" />
                              )}
                            </button>
                          }
                        />

                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          required
                          minLength={8}
                          label="New Password (minimum 8 characters)"
                          trailing={
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="p-1 text-stone-400 hover:text-stone-700"
                              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-4 h-4" aria-hidden="true" />
                              ) : (
                                <Eye className="w-4 h-4" aria-hidden="true" />
                              )}
                            </button>
                          }
                        />

                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          required
                          minLength={8}
                          label="Confirm New Password"
                          trailing={
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="p-1 text-stone-400 hover:text-stone-700"
                              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4" aria-hidden="true" />
                              ) : (
                                <Eye className="w-4 h-4" aria-hidden="true" />
                              )}
                            </button>
                          }
                        />

                        <div className="flex justify-end gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordData({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: ''
                              });
                            }}
                            className="text-xs font-semibold px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={savingSection === 'password'}
                            className="bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-sm"
                          >
                            {savingSection === 'password' ? 'Updating...' : 'Save New Password'}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="rounded-[20px] bg-[#FAF9F6] border border-stone-200/70 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <h3 className="font-serif text-base font-bold text-[#062402]">Two-Factor Verification</h3>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          Secure your VIP account using SMS OTP authentication on login.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]">
                        SMS OTP Active
                      </span>
                    </div>
                  </div>

                  {/* Login History */}
                  <div className="rounded-[20px] bg-[#FAF9F6] border border-stone-200/70 p-6">
                    <h3 className="font-serif text-base font-bold text-[#062402] mb-3">Active Authenticated Session</h3>
                    <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-stone-200/70">
                      <div className="flex items-center space-x-3">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <div>
                          <p className="font-semibold text-xs text-[#062402]">Current Browser Session</p>
                          <p className="text-[11px] text-stone-400">Dhaka, Bangladesh • Next.js Secure Cookie</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">Online Now</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
