'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available?: boolean | number;
}

export interface PathaoLocationValue {
  cityId?: number;
  zoneId?: number;
  areaId?: number;
  cityName?: string;
  zoneName?: string;
  areaName?: string;
}

export interface PathaoLocationSelectorProps {
  value: PathaoLocationValue;
  onChange: (updated: PathaoLocationValue) => void;
  disabled?: boolean;
  className?: string;
}

export const PathaoLocationSelector: React.FC<PathaoLocationSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [cities, setCities] = useState<PathaoCity[]>([]);
  const [zones, setZones] = useState<PathaoZone[]>([]);
  const [areas, setAreas] = useState<PathaoArea[]>([]);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // 1. Fetch cities on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingCities(true);
    fetch('/api/shipping/pathao/cities', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!isMounted) return;
        // Normalize array
        const list = Array.isArray(data)
          ? data.map((c: any) => ({
              city_id: Number(c.city_id || c.id),
              city_name: String(c.city_name || c.name),
            }))
          : [];
        setCities(list);
      })
      .catch((err) => console.error('Error fetching Pathao cities:', err))
      .finally(() => {
        if (isMounted) setLoadingCities(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch zones when cityId changes
  useEffect(() => {
    if (!value.cityId) {
      setZones([]);
      setAreas([]);
      return;
    }

    let isMounted = true;
    setLoadingZones(true);
    fetch(`/api/shipping/pathao/zones?city_id=${value.cityId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data)
          ? data.map((z: any) => ({
              zone_id: Number(z.zone_id || z.id),
              zone_name: String(z.zone_name || z.name),
            }))
          : [];
        setZones(list);
      })
      .catch((err) => console.error('Error fetching Pathao zones:', err))
      .finally(() => {
        if (isMounted) setLoadingZones(false);
      });

    return () => {
      isMounted = false;
    };
  }, [value.cityId]);

  // 3. Fetch areas when zoneId changes
  useEffect(() => {
    if (!value.zoneId) {
      setAreas([]);
      return;
    }

    let isMounted = true;
    setLoadingAreas(true);
    fetch(`/api/shipping/pathao/areas?zone_id=${value.zoneId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data)
          ? data.map((a: any) => ({
              area_id: Number(a.area_id || a.id),
              area_name: String(a.area_name || a.name),
              home_delivery_available: a.home_delivery_available,
            }))
          : [];
        setAreas(list);
      })
      .catch((err) => console.error('Error fetching Pathao areas:', err))
      .finally(() => {
        if (isMounted) setLoadingAreas(false);
      });

    return () => {
      isMounted = false;
    };
  }, [value.zoneId]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const selectedCity = cities.find((c) => c.city_id === id);
    onChange({
      cityId: id || undefined,
      cityName: selectedCity?.city_name,
      zoneId: undefined,
      zoneName: undefined,
      areaId: undefined,
      areaName: undefined,
    });
  };

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const selectedZone = zones.find((z) => z.zone_id === id);
    onChange({
      ...value,
      zoneId: id || undefined,
      zoneName: selectedZone?.zone_name,
      areaId: undefined,
      areaName: undefined,
    });
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const selectedArea = areas.find((a) => a.area_id === id);
    onChange({
      ...value,
      areaId: id || undefined,
      areaName: selectedArea?.area_name,
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          Pathao City, Zone & Delivery Area
        </span>
        <span className="text-[10px] text-slate-500 font-normal">Cascading API resolution</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* City Select */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">
            Pathao City {loadingCities && <Loader2 className="w-3 h-3 inline animate-spin ml-1 text-rose-400" />}
          </label>
          <select
            value={value.cityId || ''}
            disabled={disabled || loadingCities}
            onChange={handleCityChange}
            className="w-full h-9 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 disabled:opacity-50"
          >
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.city_id} value={c.city_id}>
                {c.city_name}
              </option>
            ))}
          </select>
        </div>

        {/* Zone Select */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">
            Pathao Zone {loadingZones && <Loader2 className="w-3 h-3 inline animate-spin ml-1 text-rose-400" />}
          </label>
          <select
            value={value.zoneId || ''}
            disabled={disabled || !value.cityId || loadingZones}
            onChange={handleZoneChange}
            className="w-full h-9 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 disabled:opacity-50"
          >
            <option value="">{value.cityId ? 'Select Zone' : 'Select City first'}</option>
            {zones.map((z) => (
              <option key={z.zone_id} value={z.zone_id}>
                {z.zone_name}
              </option>
            ))}
          </select>
        </div>

        {/* Area Select */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">
            Pathao Area {loadingAreas && <Loader2 className="w-3 h-3 inline animate-spin ml-1 text-rose-400" />}
          </label>
          <select
            value={value.areaId || ''}
            disabled={disabled || !value.zoneId || loadingAreas}
            onChange={handleAreaChange}
            className="w-full h-9 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 disabled:opacity-50"
          >
            <option value="">{value.zoneId ? 'Select Area' : 'Select Zone first'}</option>
            {areas.map((a) => {
              const isUnavailable = a.home_delivery_available === false || a.home_delivery_available === 0;
              return (
                <option key={a.area_id} value={a.area_id} disabled={isUnavailable}>
                  {a.area_name} {isUnavailable ? '(Home Delivery Unavailable)' : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PathaoLocationSelector;
