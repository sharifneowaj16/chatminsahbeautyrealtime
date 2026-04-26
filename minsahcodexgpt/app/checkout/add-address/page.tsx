'use client';

import { useCart, Address } from '@/contexts/CartContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AddAddressPage() {
  const router = useRouter();
  const { addAddress } = useCart();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    landmark: '',
    provinceRegion: 'Dhaka',
    city: '',
    zone: '',
    address: '',
    type: 'home' as 'home' | 'office',
    isDefault: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phoneNumber || !formData.address || !formData.city || !formData.zone) {
      alert('Please fill in all required fields');
      return;
    }

    addAddress(formData);
    router.back();
  };

  return (
    <div className="min-h-screen bg-minsah-light pb-24">
      {/* Header */}
      <header className="bg-minsah-dark text-minsah-light sticky top-0 z-50 shadow-md">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link href="/checkout/select-address" className="p-2 hover:bg-minsah-primary rounded-lg transition">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-semibold">Add Address</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6">
        {/* Form Fields */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4 mb-6">
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold text-minsah-dark mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="+880 1234 567890"
              required
              className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-minsah-dark mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
              className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-minsah-dark mb-2">
              Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="House#123, Street ABC"
              required
              className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
            />
          </div>

          {/* City and Thana */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-minsah-dark mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Dhaka"
                required
                className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-minsah-dark mb-2">
                Thana *
              </label>
              <input
                type="text"
                name="zone"
                value={formData.zone}
                onChange={handleInputChange}
                placeholder="Gulshan"
                required
                className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            href="/checkout/select-address"
            className="flex-1 py-4 rounded-xl font-bold text-center text-minsah-primary bg-white border-2 border-minsah-accent hover:border-minsah-primary transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 py-4 rounded-xl font-bold bg-minsah-primary text-minsah-light hover:bg-minsah-dark transition shadow-lg"
          >
            SAVE
          </button>
        </div>
      </form>
    </div>
  );
}
