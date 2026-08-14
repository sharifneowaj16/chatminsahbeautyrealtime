'use client';

import { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Star,
  Home,
  CreditCard
} from 'lucide-react';
import { Star as StarSolidIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Radio } from '@/components/ui/Radio';
import { useToast } from '@/components/ui/ToastProvider';
import type { UserAddress } from '@/types/user';

interface AddressesClientProps {
  initialAddresses: UserAddress[];
}

const BLANK_FORM: Partial<UserAddress> = {
  type: 'shipping',
  isDefault: false,
  firstName: '',
  lastName: '',
  company: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Bangladesh',
  phone: '',
};

// Map DB record to UserAddress format
function dbToUserAddress(db: Record<string, unknown>): UserAddress {
  return {
    id: db.id as string,
    type: (db.type as string).toLowerCase() as 'shipping' | 'billing',
    isDefault: db.isDefault as boolean,
    firstName: (db.firstName as string) ?? '',
    lastName: (db.lastName as string) ?? '',
    company: (db.company as string) ?? '',
    addressLine1: (db.street1 as string) ?? '',
    addressLine2: (db.street2 as string) ?? '',
    city: (db.city as string) ?? '',
    state: (db.state as string) ?? '',
    postalCode: (db.postalCode as string) ?? '',
    country: (db.country as string) ?? 'Bangladesh',
    phone: (db.phone as string) ?? '',
    pathao_city_id: (db.pathaoCityId as number) ?? undefined,
    pathao_zone_id: (db.pathaoZoneId as number) ?? undefined,
    pathao_area_id: (db.pathaoAreaId as number) ?? undefined,
  };
}

async function refreshAddresses(): Promise<UserAddress[]> {
  const res = await fetch('/api/addresses', { credentials: 'include' });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.addresses ?? []).map(dbToUserAddress);
}

export function AddressesClient({ initialAddresses }: AddressesClientProps) {
  const { requestConfirmation } = useToast();
  const [addresses, setAddresses] = useState<UserAddress[]>(initialAddresses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<UserAddress>>(BLANK_FORM);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const body = {
      type: (formData.type ?? 'shipping').toUpperCase(),
      isDefault: formData.isDefault ?? false,
      firstName: formData.firstName,
      lastName: formData.lastName,
      company: formData.company,
      street1: formData.addressLine1,
      street2: formData.addressLine2,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode ?? '',
      country: formData.country ?? 'Bangladesh',
      phone: formData.phone,
    };

    try {
      if (editingAddress) {
        await fetch(`/api/addresses/${editingAddress.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      }
      const updated = await refreshAddresses();
      setAddresses(updated);
    } catch { /* ignore */ }

    setFormData(BLANK_FORM);
    setShowAddForm(false);
    setEditingAddress(null);
    setSaving(false);
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
    setFormData(address);
    setShowAddForm(true);
  };

  const handleDelete = async (addressId: string) => {
    const confirmed = await requestConfirmation({
      title: 'Delete this address?',
      description: 'Are you sure you want to delete this address?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    try {
      await fetch(`/api/addresses/${addressId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      const updated = await refreshAddresses();
      setAddresses(updated);
    }
  };

  const handleSetDefault = async (addressId: string, type: 'shipping' | 'billing') => {
    // Optimistic update
    setAddresses(prev => prev.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId && addr.type === type,
    })));
    try {
      await fetch(`/api/addresses/${addressId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isDefault: true, type: type.toUpperCase() }),
      });
    } catch {
      const updated = await refreshAddresses();
      setAddresses(updated);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAddress(null);
    setFormData({
      type: 'shipping',
      isDefault: false,
      firstName: '',
      lastName: '',
      company: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
      phone: ''
    });
  };

  const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Italy',
    'Spain',
    'Japan',
    'China'
  ];

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Addresses</h1>
              <p className="text-gray-600">Manage your shipping and billing addresses</p>
            </div>
            {!showAddForm && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowAddForm(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Address
              </Button>
            )}
          </div>
        </div>

        {/* Add/Edit Address Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Address Type */}
              <div className="flex items-center space-x-6">
                <Radio
                  name="type"
                  value="shipping"
                  checked={formData.type === 'shipping'}
                  onChange={handleInputChange}
                  label="Shipping Address"
                  containerClassName="w-auto"
                />
                <Radio
                  name="type"
                  value="billing"
                  checked={formData.type === 'billing'}
                  onChange={handleInputChange}
                  label="Billing Address"
                  containerClassName="w-auto"
                />
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  label="First Name"
                />
                <Input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  label="Last Name"
                />
              </div>

              {/* Company (Optional) */}
              <Input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                label="Company (Optional)"
              />

              {/* Address Lines */}
              <Input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleInputChange}
                required
                label="Address Line 1"
              />
              <Input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
                label="Address Line 2 (Optional)"
              />

              {/* City, State, Postal Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  label="City"
                />
                <Select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  label="State"
                  placeholder="Select State"
                >
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </Select>
                <Input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  required
                  label="Postal Code"
                />
              </div>

              {/* Country and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  label="Country"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </Select>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  label="Phone Number"
                />
              </div>

              {/* Default Address */}
              <Checkbox
                name="isDefault"
                id="isDefault"
                checked={formData.isDefault}
                onChange={handleInputChange}
                label={`Set as default ${formData.type} address`}
              />

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        <div className="space-y-6">
          {/* Shipping Addresses */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2" aria-hidden="true" />
              Shipping Addresses
            </h2>
            <div className="space-y-4">
              {addresses.filter(addr => addr.type === 'shipping').map(address => (
                <div key={address.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <MapPin className="w-5 h-5 text-gray-400 mr-2" aria-hidden="true" />
                        <h3 className="font-medium text-gray-900">
                          {address.firstName} {address.lastName}
                        </h3>
                        {address.isDefault && (
                          <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <StarSolidIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600 space-y-1">
                        {address.company && <p>{address.company}</p>}
                        <p>{address.addressLine1}</p>
                        {address.addressLine2 && <p>{address.addressLine2}</p>}
                        <p>
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                        <p>{address.country}</p>
                        <p>{address.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!address.isDefault && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefault(address.id, 'shipping')}
                          className="text-gray-600 hover:bg-purple-50 hover:text-purple-600"
                          aria-label={`Set ${address.firstName} ${address.lastName}'s shipping address as default`}
                        >
                          <Star className="w-5 h-5" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(address)}
                        className="text-gray-600 hover:bg-purple-50 hover:text-purple-600"
                        aria-label={`Edit ${address.firstName} ${address.lastName}'s shipping address`}
                      >
                        <Edit className="w-5 h-5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(address.id)}
                        className="text-gray-600 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${address.firstName} ${address.lastName}'s shipping address`}
                      >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Addresses */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" aria-hidden="true" />
              Billing Addresses
            </h2>
            <div className="space-y-4">
              {addresses.filter(addr => addr.type === 'billing').map(address => (
                <div key={address.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <CreditCard className="w-5 h-5 text-gray-400 mr-2" aria-hidden="true" />
                        <h3 className="font-medium text-gray-900">
                          {address.firstName} {address.lastName}
                        </h3>
                        {address.isDefault && (
                          <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <StarSolidIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600 space-y-1">
                        {address.company && <p>{address.company}</p>}
                        <p>{address.addressLine1}</p>
                        {address.addressLine2 && <p>{address.addressLine2}</p>}
                        <p>
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                        <p>{address.country}</p>
                        <p>{address.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!address.isDefault && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefault(address.id, 'billing')}
                          className="text-gray-600 hover:bg-purple-50 hover:text-purple-600"
                          aria-label={`Set ${address.firstName} ${address.lastName}'s billing address as default`}
                        >
                          <Star className="w-5 h-5" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(address)}
                        className="text-gray-600 hover:bg-purple-50 hover:text-purple-600"
                        aria-label={`Edit ${address.firstName} ${address.lastName}'s billing address`}
                      >
                        <Edit className="w-5 h-5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(address.id)}
                        className="text-gray-600 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${address.firstName} ${address.lastName}'s billing address`}
                      >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
