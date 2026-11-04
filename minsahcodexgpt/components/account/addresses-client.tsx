'use client';

import { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Home,
  CreditCard,
  CheckCircle2,
  X,
} from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
    } catch {
      /* ignore */
    }

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
      description: 'Are you sure you want to delete this delivery address?',
      confirmLabel: 'Delete Address',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    if (!confirmed) return;
    setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
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
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === addressId && addr.type === type,
      }))
    );
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
    setFormData(BLANK_FORM);
  };

  const divisions = [
    'Dhaka',
    'Chattogram',
    'Rajshahi',
    'Khulna',
    'Barishal',
    'Sylhet',
    'Rangpur',
    'Mymensingh',
  ];

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
              <MapPin className="w-3 h-3 text-[#828fff]" />
              Address Book
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f8f8]">
            Saved Addresses
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Manage verified delivery hubs and billing locations for instant checkout
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 sm:h-9 px-4 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Hub</span>
          </button>
        )}
      </div>

      {/* ── Add / Edit Address Form ───────────────────────────────────────────── */}
      {showAddForm && (
        <div className="rounded-2xl border border-[#5e6ad2]/40 bg-[#0f1011] p-5 sm:p-6 shadow-2xl transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-[#23252a] mb-5">
            <h2 className="text-sm sm:text-base font-semibold text-[#f7f8f8]">
              {editingAddress ? 'Update Saved Address' : 'Add New Delivery Hub'}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-[#8a8f98] hover:text-[#f7f8f8] flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Address Type Selector */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#141516] border border-[#23252a]">
              <label className="flex items-center gap-2 text-xs font-medium text-[#f7f8f8] cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="shipping"
                  checked={formData.type === 'shipping'}
                  onChange={handleInputChange}
                  className="accent-[#5e6ad2]"
                />
                <span>Delivery Hub</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-[#f7f8f8] cursor-pointer ml-4">
                <input
                  type="radio"
                  name="type"
                  value="billing"
                  checked={formData.type === 'billing'}
                  onChange={handleInputChange}
                  className="accent-[#5e6ad2]"
                />
                <span>Billing Address</span>
              </label>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Sara"
                  className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Khan"
                  className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
            </div>

            {/* Landmark / Company */}
            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Landmark or Building Name (Optional)</label>
              <input
                type="text"
                name="company"
                value={formData.company || ''}
                onChange={handleInputChange}
                placeholder="e.g. Near Banani 11 Park"
                className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
              />
            </div>

            {/* Street Address Lines */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Street Address / House / Road *</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1 || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="House #12, Road #4, Block #B"
                  className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2 || ''}
                  onChange={handleInputChange}
                  placeholder="Apartment, Floor, Flat # (Optional)"
                  className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
            </div>

            {/* City, Division, Postal Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">City / Area *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Dhaka"
                  className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Division *</label>
                <select
                  name="state"
                  value={formData.state || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors cursor-pointer"
                >
                  <option value="">Select Division</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Postal Code</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. 1213"
                  className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors font-mono"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">Recipient Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                required
                placeholder="017XXXXXXXX"
                className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-base sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors font-mono"
              />
            </div>

            {/* Default Hub Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-[#8a8f98] cursor-pointer">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={Boolean(formData.isDefault)}
                  onChange={handleInputChange}
                  className="accent-[#5e6ad2] rounded w-4 h-4 cursor-pointer"
                />
                <span>Set as primary {formData.type === 'billing' ? 'billing' : 'delivery'} hub</span>
              </label>
            </div>

            {/* Form Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-[#23252a]">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto h-11 px-4 rounded-xl border border-[#23252a] bg-[#141516] text-[#8a8f98] hover:text-[#f7f8f8] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingAddress ? 'Update Hub Details' : 'Save Address Hub'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Saved Addresses Grid ─────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Delivery Hubs */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#23252a]">
            <Home className="w-4 h-4 text-[#828fff]" />
            <h2 className="text-sm font-semibold text-[#f7f8f8]">Delivery Hubs</h2>
            <span className="text-xs text-[#8a8f98] ml-auto font-mono">
              {addresses.filter((addr) => addr.type === 'shipping').length} Saved
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {addresses
              .filter((addr) => addr.type === 'shipping')
              .map((address) => (
                <div
                  key={address.id}
                  className={`rounded-2xl bg-[#0f1011] p-4 sm:p-5 transition-all shadow-xl flex flex-col justify-between ${
                    address.isDefault
                      ? 'border border-[#5e6ad2]/60 shadow-[0_0_15px_rgba(94,106,210,0.15)]'
                      : 'border border-[#23252a] hover:border-[#3e3e44]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141516] text-[#828fff] border border-[#23252a] shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-xs sm:text-sm text-[#f7f8f8] truncate">
                          {address.firstName} {address.lastName}
                        </h3>
                      </div>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 shrink-0">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Primary Hub
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#8a8f98] space-y-0.5 pl-0.5 leading-relaxed">
                      {address.company && <p className="text-[#f7f8f8]">{address.company}</p>}
                      <p>{address.addressLine1}</p>
                      {address.addressLine2 && <p>{address.addressLine2}</p>}
                      <p>
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="font-mono text-[#828fff] pt-1">{address.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-[#23252a]">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address.id, 'shipping')}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516] transition-colors cursor-pointer"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                      className="p-2 rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516] transition-colors cursor-pointer"
                      title="Edit Hub"
                      aria-label="Edit address"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="p-2 rounded-lg text-[#8a8f98] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Hub"
                      aria-label="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Billing Hubs */}
        {addresses.some((addr) => addr.type === 'billing') && (
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#23252a]">
              <CreditCard className="w-4 h-4 text-[#828fff]" />
              <h2 className="text-sm font-semibold text-[#f7f8f8]">Billing Addresses</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {addresses
                .filter((addr) => addr.type === 'billing')
                .map((address) => (
                  <div
                    key={address.id}
                    className="rounded-2xl bg-[#0f1011] p-4 sm:p-5 border border-[#23252a] shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm text-[#f7f8f8]">
                        {address.firstName} {address.lastName}
                      </h3>
                      <p className="text-xs text-[#8a8f98] mt-1">{address.addressLine1}</p>
                      <p className="text-xs text-[#8a8f98]">
                        {address.city}, {address.state}
                      </p>
                      <p className="font-mono text-[#828fff] text-xs pt-1">{address.phone}</p>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-[#23252a]">
                      <button
                        type="button"
                        onClick={() => handleEdit(address)}
                        className="p-2 rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(address.id)}
                        className="p-2 rounded-lg text-[#8a8f98] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
