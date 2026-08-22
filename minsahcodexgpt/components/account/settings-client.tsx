'use client';

import { useEffect, useRef, useState } from 'react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
            Loading your account settings...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
            Unable to load your account. Please sign in again.
          </div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your profile and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-none border-b-2 px-6 py-3 ${
                    activeTab === tab.id
                      ? 'border-minsah-action-primary text-minsah-action-primary'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-5 h-5" aria-hidden="true" />
                  {tab.name}
                </Button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

              {/* Avatar Section */}
              <div className="flex items-center space-x-6 mb-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-minsah-action-primary to-minsah-action-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {user.firstName?.charAt(0) ?? ''}{user.lastName?.charAt(0) ?? ''}
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="icon"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={savingSection === 'avatar'}
                    className="absolute bottom-0 right-0 h-auto min-h-0 w-auto min-w-0 rounded-full bg-minsah-action-primary p-2 hover:bg-minsah-action-primary-hover"
                    aria-label="Upload a new profile photo"
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={savingSection === 'avatar'}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{user.firstName} {user.lastName}</h3>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.emailVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
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
                    className="focus:ring-minsah-focus"
                  />
                  <Input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    label="Last Name"
                    className="focus:ring-minsah-focus"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Input
                      type="email"
                      value={user.email}
                      disabled
                      label="Email Address"
                      trailing={<Mail className="w-5 h-5" aria-hidden="true" />}
                      className="bg-gray-50 text-gray-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <Input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    label="Phone Number"
                    trailing={<Phone className="w-5 h-5" aria-hidden="true" />}
                    className="focus:ring-minsah-focus"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    label="Date of Birth"
                    className="focus:ring-minsah-focus"
                  />
                  <Select
                    value={profileData.gender}
                    onChange={(e) => setProfileData(prev => ({ ...prev, gender: e.target.value as any }))}
                    label="Gender"
                    placeholder="Select Gender"
                    className="focus:ring-minsah-focus"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingSection === 'profile'}
                    className="bg-minsah-action-primary px-6 py-2 hover:bg-minsah-action-primary-hover"
                  >
                    {savingSection === 'profile' ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div id="communication-preferences" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Communication Preferences</h2>

              <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>

                  <Checkbox
                    checked={preferences.newsletter}
                    onChange={(e) => setPreferences(prev => ({ ...prev, newsletter: e.target.checked }))}
                    label="Newsletter and product updates"
                  />

                  <Checkbox
                    checked={preferences.promotions}
                    onChange={(e) => setPreferences(prev => ({ ...prev, promotions: e.target.checked }))}
                    label="Promotions and special offers"
                  />

                  <Checkbox
                    checked={preferences.newProducts}
                    onChange={(e) => setPreferences(prev => ({ ...prev, newProducts: e.target.checked }))}
                    label="New product announcements"
                  />

                  <Checkbox
                    checked={preferences.orderUpdates}
                    onChange={(e) => setPreferences(prev => ({ ...prev, orderUpdates: e.target.checked }))}
                    label="Order status updates"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">SMS Notifications</h3>

                  <Checkbox
                    checked={preferences.smsNotifications}
                    onChange={(e) => setPreferences(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                    label="SMS notifications for order updates"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingSection === 'preferences'}
                    className="bg-minsah-action-primary px-6 py-2 hover:bg-minsah-action-primary-hover"
                  >
                    {savingSection === 'preferences' ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>

              <div className="space-y-8">
                {/* Password Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Password</h3>
                      <p className="text-sm text-gray-600">Last changed 3 months ago</p>
                    </div>
                    {!showPasswordForm && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowPasswordForm(true)}
                      >
                        <Key className="w-4 h-4" aria-hidden="true" />
                        Change Password
                      </Button>
                    )}
                  </div>

                  {showPasswordForm && (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        required
                        label="Current Password"
                        className="focus:ring-minsah-focus"
                        trailing={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="h-auto min-h-0 w-auto min-w-0 p-0 text-gray-400 hover:text-gray-600"
                            aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-5 h-5" aria-hidden="true" />
                            ) : (
                              <Eye className="w-5 h-5" aria-hidden="true" />
                            )}
                          </Button>
                        }
                      />

                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        required
                        minLength={8}
                        label="New Password"
                        className="focus:ring-minsah-focus"
                        trailing={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="h-auto min-h-0 w-auto min-w-0 p-0 text-gray-400 hover:text-gray-600"
                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-5 h-5" aria-hidden="true" />
                            ) : (
                              <Eye className="w-5 h-5" aria-hidden="true" />
                            )}
                          </Button>
                        }
                      />

                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        minLength={8}
                        label="Confirm New Password"
                        className="focus:ring-minsah-focus"
                        trailing={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="h-auto min-h-0 w-auto min-w-0 p-0 text-gray-400 hover:text-gray-600"
                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-5 h-5" aria-hidden="true" />
                            ) : (
                              <Eye className="w-5 h-5" aria-hidden="true" />
                            )}
                          </Button>
                        }
                      />

                      <div className="flex justify-end space-x-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={savingSection === 'password'}
                          className="bg-minsah-action-primary hover:bg-minsah-action-primary-hover"
                        >
                          {savingSection === 'password' ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Two-Factor Authentication */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-800 font-medium">Not Enabled</p>
                        <p className="text-yellow-700 text-sm mt-1">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button type="button" variant="primary" className="bg-yellow-600 hover:bg-yellow-700">
                        Enable
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Login History */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Login Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-gray-900">Current Session</p>
                          <p className="text-sm text-gray-600">New York, NY • Chrome on Windows</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">Now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
