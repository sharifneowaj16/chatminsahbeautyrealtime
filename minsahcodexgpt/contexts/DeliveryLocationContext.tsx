'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'minsah_delivery_location';

export interface SavedDeliveryLocation {
  fullName: string;
  phoneNumber: string;
  city: string;
  zone: string;
  area: string;
  streetAddress: string;
  pathao_city_id: number | null;
  pathao_zone_id: number | null;
  pathao_area_id: number | null;
}

interface DeliveryLocationContextValue {
  savedLocation: SavedDeliveryLocation | null;
  saveLocation: (location: SavedDeliveryLocation) => void;
  clearLocation: () => void;
}

const DeliveryLocationContext = createContext<DeliveryLocationContextValue>({
  savedLocation: null,
  saveLocation: () => {},
  clearLocation: () => {},
});

function readFromStorage(): SavedDeliveryLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedDeliveryLocation>;
    if (typeof parsed.city === 'string') {
      return parsed as SavedDeliveryLocation;
    }
    return null;
  } catch {
    return null;
  }
}

export function DeliveryLocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [savedLocation, setSavedLocation] =
    useState<SavedDeliveryLocation | null>(null);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    setSavedLocation(readFromStorage());
  }, []);

  const saveLocation = useCallback((location: SavedDeliveryLocation) => {
    setSavedLocation(location);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    } catch {
      // localStorage not available — fail silently
    }
  }, []);

  const clearLocation = useCallback(() => {
    setSavedLocation(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // fail silently
    }
  }, []);

  return (
    <DeliveryLocationContext.Provider
      value={{ savedLocation, saveLocation, clearLocation }}
    >
      {children}
    </DeliveryLocationContext.Provider>
  );
}

export function useDeliveryLocation() {
  return useContext(DeliveryLocationContext);
}
