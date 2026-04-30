'use client';

import { useCart } from '@/contexts/CartContext';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function AddAddressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addAddress, updateAddress } = useCart();
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

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
  const [pathaoCities, setPathaoCities] = useState<Array<{ id: number; name: string }>>([]);
  const [pathaoZones, setPathaoZones] = useState<Array<{ id: number; name: string }>>([]);
  const [pathaoAreas, setPathaoAreas] = useState<
    Array<{ id: number; name: string; homeDeliveryAvailable: boolean; pickupAvailable: boolean }>
  >([]);

  const parsePathaoOptions = (value: unknown): Array<{ id: number; name: string }> => {
    if (Array.isArray(value)) {
      return value.filter((item): item is { id: number; name: string } => {
        return !!item && typeof item === 'object' && !Array.isArray(item) &&
          typeof (item as { id?: unknown }).id === 'number' &&
          typeof (item as { name?: unknown }).name === 'string';
      });
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Array.isArray((value as { data?: unknown }).data)
    ) {
      return parsePathaoOptions((value as { data: unknown }).data);
    }

    return [];
  };

  useEffect(() => {
    const addressId = searchParams.get('id');
    const fullName = searchParams.get('fullName');
    const phoneNumber = searchParams.get('phoneNumber');
    const landmark = searchParams.get('landmark');
    const provinceRegion = searchParams.get('provinceRegion');
    const city = searchParams.get('city');
    const zone = searchParams.get('zone');
    const address = searchParams.get('address');
    const type = searchParams.get('type');
    const pathaoCityId = Number(searchParams.get('pathao_city_id'));
    const pathaoZoneId = Number(searchParams.get('pathao_zone_id'));
    const pathaoAreaId = Number(searchParams.get('pathao_area_id'));

    if (!fullName && !phoneNumber && !city && !address) {
      return;
    }

    setEditingAddressId(addressId || null);
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
      pathao_city_id: Number.isFinite(pathaoCityId) && pathaoCityId > 0 ? pathaoCityId : prev.pathao_city_id,
      pathao_zone_id: Number.isFinite(pathaoZoneId) && pathaoZoneId > 0 ? pathaoZoneId : prev.pathao_zone_id,
      pathao_area_id: Number.isFinite(pathaoAreaId) && pathaoAreaId > 0 ? pathaoAreaId : prev.pathao_area_id,
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
      setIsLoadingCities(true);
      setCitiesError(null);
      try {
        const res = await fetch('/api/shipping/pathao/cities');
        const data = (await res.json()) as unknown;

        if (!res.ok) {
          const message =
            data &&
            typeof data === 'object' &&
            !Array.isArray(data) &&
            typeof (data as { message?: unknown }).message === 'string'
              ? (data as { message: string }).message
              : 'Pathao cities could not be loaded. Please try again.';
          throw new Error(message);
        }

        const cities = parsePathaoOptions(data);
        setPathaoCities(cities);

        if (process.env.NODE_ENV === 'development') {
          console.log('[Checkout add-address] Pathao cities loaded', { count: cities.length });
        }

        if (cities.length === 0) {
          setCitiesError('Pathao cities could not be loaded. Please try again.');
        }
      } catch (error) {
        setPathaoCities([]);
        setCitiesError(
          error instanceof Error
            ? error.message
            : 'Pathao cities could not be loaded. Please try again.'
        );
      } finally {
        setIsLoadingCities(false);
      }
    };
    void loadCities();
  }, []);

  useEffect(() => {
    if (!formData.pathao_city_id) {
      setPathaoZones([]);
      setPathaoAreas([]);
      setZonesError(null);
      setAreasError(null);
      setFormData((prev) => ({ ...prev, pathao_zone_id: null, pathao_area_id: null }));
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Checkout add-address] Pathao city selected', {
        city_id: formData.pathao_city_id,
      });
    }

    const loadZones = async () => {
      setIsLoadingZones(true);
      setZonesError(null);
      try {
        const res = await fetch(`/api/shipping/pathao/zones?city_id=${formData.pathao_city_id}`);
        const data = (await res.json()) as unknown;

        if (!res.ok) {
          const message =
            data &&
            typeof data === 'object' &&
            !Array.isArray(data) &&
            typeof (data as { message?: unknown }).message === 'string'
              ? (data as { message: string }).message
              : 'Pathao zones could not be loaded. Please try again.';
          throw new Error(message);
        }

        const zones = parsePathaoOptions(data);
        setPathaoZones(zones);

        if (process.env.NODE_ENV === 'development') {
          console.log('[Checkout add-address] Pathao zones loaded', {
            city_id: formData.pathao_city_id,
            count: zones.length,
          });
        }
      } catch (error) {
        setPathaoZones([]);
        setZonesError(
          error instanceof Error
            ? error.message
            : 'Pathao zones could not be loaded. Please try again.'
        );
      } finally {
        setIsLoadingZones(false);
      }
    };
    void loadZones();
  }, [formData.pathao_city_id]);

  useEffect(() => {
    if (!formData.pathao_zone_id) {
      setPathaoAreas([]);
      setAreasError(null);
      setFormData((prev) => ({ ...prev, pathao_area_id: null }));
      return;
    }

    const loadAreas = async () => {
      setIsLoadingAreas(true);
      setAreasError(null);
      try {
        const res = await fetch(`/api/shipping/pathao/areas?zone_id=${formData.pathao_zone_id}`);
        const data = (await res.json()) as unknown;

        if (!res.ok) {
          const message =
            data &&
            typeof data === 'object' &&
            !Array.isArray(data) &&
            typeof (data as { message?: unknown }).message === 'string'
              ? (data as { message: string }).message
              : 'Pathao areas could not be loaded. Please try again.';
          throw new Error(message);
        }

        const areas = parsePathaoOptions(data).map((area) => {
          const source = area as { id: number; name: string; homeDeliveryAvailable?: boolean; pickupAvailable?: boolean };
          return {
            id: source.id,
            name: source.name,
            homeDeliveryAvailable: Boolean(source.homeDeliveryAvailable),
            pickupAvailable: Boolean(source.pickupAvailable),
          };
        });
        setPathaoAreas(areas);

        if (process.env.NODE_ENV === 'development') {
          console.log('[Checkout add-address] Pathao areas loaded', {
            zone_id: formData.pathao_zone_id,
            count: areas.length,
          });
        }
      } catch (error) {
        setPathaoAreas([]);
        setAreasError(
          error instanceof Error
            ? error.message
            : 'Pathao areas could not be loaded. Please try again.'
        );
      } finally {
        setIsLoadingAreas(false);
      }
    };

    void loadAreas();
  }, [formData.pathao_zone_id]);

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

    if (editingAddressId) {
      updateAddress(editingAddressId, formData);
    } else {
      addAddress(formData);
    }
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
                  setFormData((prev) => {
                    const nextCityId = e.target.value ? Number(e.target.value) : null;
                    return {
                      ...prev,
                      pathao_city_id: nextCityId,
                      pathao_zone_id: null,
                      pathao_area_id: null,
                    };
                  })
                }
                className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
                required
              >
                <option value="">
                  {isLoadingCities ? 'Loading Pathao cities...' : 'Select Pathao city'}
                </option>
                {pathaoCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {citiesError && (
                <p className="mt-2 text-sm text-red-600">{citiesError}</p>
              )}
              {!isLoadingCities && !citiesError && pathaoCities.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  Pathao cities could not be loaded. Please try again.
                </p>
              )}
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
                    pathao_area_id: null,
                  }))
                }
                className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
                disabled={!formData.pathao_city_id || isLoadingZones}
                required
              >
                <option value="">
                  {!formData.pathao_city_id
                    ? 'Select Pathao city first'
                    : isLoadingZones
                      ? 'Loading Pathao zones...'
                      : 'Select Pathao zone'}
                </option>
                {pathaoZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
              {zonesError && (
                <p className="mt-2 text-sm text-red-600">{zonesError}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-minsah-dark mb-2">
              Pathao Area
            </label>
            <select
              value={formData.pathao_area_id ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  pathao_area_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full px-4 py-3 border border-minsah-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-minsah-primary"
              disabled={!formData.pathao_zone_id || isLoadingAreas}
            >
              <option value="">
                {!formData.pathao_zone_id
                  ? 'Select Pathao zone first'
                  : isLoadingAreas
                    ? 'Loading Pathao areas...'
                    : 'Select Pathao area'}
              </option>
              {pathaoAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {areasError && (
              <p className="mt-2 text-sm text-red-600">{areasError}</p>
            )}
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
