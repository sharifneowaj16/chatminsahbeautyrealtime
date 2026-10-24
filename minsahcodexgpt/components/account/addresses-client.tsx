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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]">
              <MapPin className="w-3 h-3 text-[#062402]" />
              Address Book
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#062402]">Saved Addresses</h1>
          <p className="text-sm text-stone-500 mt-1">Manage verified delivery hubs and billing locations for seamless checkout.</p>
        </div>
        {!showAddForm && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add New Hub
          </Button>
        )}
      </div>

      {/* Add/Edit Address Form */}
      {showAddForm && (
        <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
          <div className="flex items-center justify-between pb-6 border-b border-stone-100 mb-6">
            <h2 className="font-serif text-xl font-bold text-[#062402]">
              {editingAddress ? 'Update Saved Address' : 'Add New Delivery Hub'}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs font-semibold text-stone-400 hover:text-stone-700"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address Type */}
            <div className="flex items-center space-x-6 p-4 rounded-xl bg-[#FAF9F6] border border-stone-200/60">
              <Radio
                name="type"
                value="shipping"
                checked={formData.type === 'shipping'}
                onChange={handleInputChange}
                label="Delivery Address"
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
              label="Company or Landmark (Optional)"
            />

            {/* Address Lines */}
            <Input
              type="text"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleInputChange}
              required
              label="Street Address / House / Road"
            />
            <Input
              type="text"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleInputChange}
              label="Apartment, Suite, Unit, Building (Optional)"
            />

            {/* City, State, Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                label="City / District"
              />
              <Select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                label="Division / State"
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
                label="Recipient Contact Phone"
              />
            </div>

            {/* Default Address */}
            <div className="pt-2">
              <Checkbox
                name="isDefault"
                id="isDefault"
                checked={formData.isDefault}
                onChange={handleInputChange}
                label={`Set as primary ${formData.type} destination`}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                className="text-xs font-semibold px-5 py-2.5 rounded-xl border border-stone-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm"
              >
                {saving ? 'Saving...' : editingAddress ? 'Update Hub Details' : 'Save Address'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses Lists */}
      <div className="space-y-8">
        {/* Shipping Addresses Section */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200/80">
            <Home className="w-4 h-4 text-[#062402]" aria-hidden="true" />
            <h2 className="font-serif text-lg font-bold text-[#062402]">
              Delivery Addresses
            </h2>
            <span className="text-xs text-stone-400 ml-auto">
              {addresses.filter(addr => addr.type === 'shipping').length} Saved
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {addresses.filter(addr => addr.type === 'shipping').map(address => (
              <div
                key={address.id}
                className={`relative rounded-[22px] bg-white p-6 transition-all ${
                  address.isDefault
                    ? 'border-2 border-[#062402] shadow-[0_6px_24px_rgba(6,36,2,0.06)]'
                    : 'border border-[#EFECE6] shadow-sm hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF9F6] border border-stone-200/80 text-[#062402]">
                        <MapPin className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h3 className="font-serif font-bold text-sm text-[#062402]">
                        {address.firstName} {address.lastName}
                      </h3>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]">
                          <StarSolidIcon className="w-2.5 h-2.5 text-[#062402]" aria-hidden="true" />
                          Primary Hub
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-600 space-y-1 leading-relaxed pl-1">
                      {address.company && <p className="font-medium text-stone-800">{address.company}</p>}
                      <p>{address.addressLine1}</p>
                      {address.addressLine2 && <p>{address.addressLine2}</p>}
                      <p>
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-stone-400 font-medium">{address.country}</p>
                      <p className="font-mono text-[#062402] font-semibold pt-1">{address.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address.id, 'shipping')}
                        className="p-2 rounded-xl text-stone-400 hover:text-[#062402] hover:bg-[#FAF9F6] transition-colors"
                        title="Set as Primary Hub"
                        aria-label={`Set ${address.firstName} ${address.lastName}'s shipping address as default`}
                      >
                        <Star className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-[#FAF9F6] transition-colors"
                      title="Edit Address"
                      aria-label={`Edit ${address.firstName} ${address.lastName}'s shipping address`}
                    >
                      <Edit className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Address"
                      aria-label={`Delete ${address.firstName} ${address.lastName}'s shipping address`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Addresses Section */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200/80">
            <CreditCard className="w-4 h-4 text-[#062402]" aria-hidden="true" />
            <h2 className="font-serif text-lg font-bold text-[#062402]">
              Billing Addresses
            </h2>
            <span className="text-xs text-stone-400 ml-auto">
              {addresses.filter(addr => addr.type === 'billing').length} Saved
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {addresses.filter(addr => addr.type === 'billing').map(address => (
              <div
                key={address.id}
                className={`relative rounded-[22px] bg-white p-6 transition-all ${
                  address.isDefault
                    ? 'border-2 border-[#062402] shadow-[0_6px_24px_rgba(6,36,2,0.06)]'
                    : 'border border-[#EFECE6] shadow-sm hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF9F6] border border-stone-200/80 text-[#062402]">
                        <CreditCard className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h3 className="font-serif font-bold text-sm text-[#062402]">
                        {address.firstName} {address.lastName}
                      </h3>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]">
                          <StarSolidIcon className="w-2.5 h-2.5 text-[#062402]" aria-hidden="true" />
                          Default Billing
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-600 space-y-1 leading-relaxed pl-1">
                      {address.company && <p className="font-medium text-stone-800">{address.company}</p>}
                      <p>{address.addressLine1}</p>
                      {address.addressLine2 && <p>{address.addressLine2}</p>}
                      <p>
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-stone-400 font-medium">{address.country}</p>
                      <p className="font-mono text-[#062402] font-semibold pt-1">{address.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address.id, 'billing')}
                        className="p-2 rounded-xl text-stone-400 hover:text-[#062402] hover:bg-[#FAF9F6] transition-colors"
                        title="Set as Default Billing"
                        aria-label={`Set ${address.firstName} ${address.lastName}'s billing address as default`}
                      >
                        <Star className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-[#FAF9F6] transition-colors"
                      title="Edit Address"
                      aria-label={`Edit ${address.firstName} ${address.lastName}'s billing address`}
                    >
                      <Edit className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Address"
                      aria-label={`Delete ${address.firstName} ${address.lastName}'s billing address`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
