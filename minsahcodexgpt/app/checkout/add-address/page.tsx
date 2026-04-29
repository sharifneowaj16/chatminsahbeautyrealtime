'use client';

import { useCart } from '@/contexts/CartContext';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function AddAddressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    isDefault: false,
    pathao_city_id: null as number | null,
    pathao_zone_id: null as number | null,
    pathao_area_id: null as number | null,
  });
  const [pathaoCities, setPathaoCities] = useState<Array<{ city_id: number; city_name: string }>>([]);
  const [pathaoZones, setPathaoZones] = useState<Array<{ zone_id: number; zone_name: string }>>([]);

  useEffect(() => {
    const fullName = searchParams.get('fullName');
    const phoneNumber = searchParams.get('phoneNumber');
    const landmark = searchParams.get('landmark');
    const provinceRegion = searchParams.get('provinceRegion');
    const city = searchParams.get('city');
    const zone = searchParams.get('zone');
    const address = searchParams.get('address');
    const type = searchParams.get('type');

    if (!fullName && !phoneNumber && !city && !address) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullName: fullName ?? prev.fullName,
      phoneNumber: phoneNumber ?? prev.phoneNumber,
      landmark: landmark ?? prev.landmark,
      provinceRegion: provinceRegion ?? prev.provinceRegion,
      city: city ?? prev.city,
      zone: zone ?? prev.zone,
      address: address ?? prev.address,
      type: type === 'office' ? 'office' : 'home',
    }));
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await fetch('/api/shipping/pathao/cities');
        const data = (await res.json()) as { cities?: Array<{ city_id: number; city_name: string }> };
        setPathaoCities(data.cities ?? []);
      } catch {
        setPathaoCities([]);
      }
    };
    void loadCities();
  }, []);

  useEffect(() => {
    if (!formData.pathao_city_id) {
      setPathaoZones([]);
      setFormData((prev) => ({ ...prev, pathao_zone_id: null }));
      return;
    }
    const loadZones = async () => {
      try {
        const res = await fetch(`/api/shipping/pathao/zones?city_id=${formData.pathao_city_id}`);
        const data = (await res.json()) as { zones?: Array<{ zone_id: number; zone_name: string }> };
        setPathaoZones(data.zones ?? []);
      } catch {
        setPathaoZones([]);
      }
    };
    void loadZones();
  }, [formData.pathao_city_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.fullName ||
      !formData.phoneNumber ||
      !formData.address ||
      !formData.city ||
      !formData.zone ||
      !formData.pathao_city_id ||
      !formData.pathao_zone_id
    ) {
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-minsah-dark mb-2">
                Pathao City *
              </label>
              <select
                value={formData.pathao_city_id ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pathao_city_id: e.target.value ? Number(e.target.value) : null,
                    pathao_zone_id: null,
                  }))
                }
                className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
                required
              >
                <option value="">Select Pathao city</option>
                {pathaoCities.map((city) => (
                  <option key={city.city_id} value={city.city_id}>
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-minsah-dark mb-2">
                Pathao Zone *
              </label>
              <select
                value={formData.pathao_zone_id ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pathao_zone_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
                required
              >
                <option value="">Select Pathao zone</option>
                {pathaoZones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.zone_name}
                  </option>
                ))}
              </select>
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

export default function AddAddressPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-minsah-light flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-minsah-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AddAddressContent />
    </Suspense>
  );
}
