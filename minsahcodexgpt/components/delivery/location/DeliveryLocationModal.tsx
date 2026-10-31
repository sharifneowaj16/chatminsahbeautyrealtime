'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import LocationSearchInput from './LocationSearchInput';
import SavedAddressOptionList from './SavedAddressOptionList';
import QuickDhakaZonePills from './QuickDhakaZonePills';
import { SavedAddressItem, DeliveryZoneItem } from './types';
import { useDeliveryLocation } from '@/contexts/DeliveryLocationContext';

export default function DeliveryLocationModal() {
  const { savedLocation, saveLocation } = useDeliveryLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState(
    savedLocation?.area || savedLocation?.city || 'Dhaka'
  );

  useEffect(() => {
    async function loadAddresses() {
      try {
        const res = await fetch('/api/addresses');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.addresses) ? data.addresses : [];
          const mapped: SavedAddressItem[] = list.map((a: any) => ({
            id: a.id,
            label: a.type || 'Saved Address',
            area: a.city || a.state || 'Dhaka',
            address: [a.street1, a.street2, a.city, a.state].filter(Boolean).join(', '),
            isDefault: !!a.isDefault,
          }));
          setSavedAddresses(mapped);
          const defaultAddr = mapped.find(a => a.isDefault) || mapped[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            setSelectedLocationName(defaultAddr.area);
          }
        }
      } catch (err) {
        console.warn('Failed to load user addresses', err);
      }
    }
    loadAddresses();
  }, []);

  useEffect(() => {
    if (savedLocation?.area) {
      setSelectedLocationName(savedLocation.area);
    } else if (savedLocation?.city) {
      setSelectedLocationName(savedLocation.city);
    }
  }, [savedLocation]);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    window.addEventListener('minsah:open-location-modal', handleOpen);
    return () => window.removeEventListener('minsah:open-location-modal', handleOpen);
  }, [handleOpen]);

  const commitLocation = (areaName: string, street: string) => {
    saveLocation({
      fullName: savedLocation?.fullName || 'Valued Customer',
      phoneNumber: savedLocation?.phoneNumber || '+8801700000000',
      city: 'Dhaka',
      zone: 'Dhaka Metro',
      area: areaName,
      streetAddress: street,
      pathao_city_id: 1,
      pathao_zone_id: 1,
      pathao_area_id: null,
    });
    handleClose();
  };

  const handleSelectAddress = (addr: SavedAddressItem) => {
    setSelectedAddressId(addr.id);
    setSelectedLocationName(addr.area);
    commitLocation(addr.area, addr.address);
  };

  const handleSelectZone = (zone: DeliveryZoneItem) => {
    setSelectedLocationName(zone.name);
    commitLocation(zone.name, `${zone.name}, Dhaka`);
  };

  const handleConfirm = () => {
    const locName = searchQuery.trim() || selectedLocationName;
    commitLocation(locName, `${locName}, Dhaka`);
  };

  const effectiveLocation = searchQuery.trim() || selectedLocationName;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      badge={
        <>
          <ShieldCheck className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>Steadfast &amp; Pathao Express</span>
        </>
      }
      title="Select Delivery Location"
      description="Fast doorstep delivery across all 64 districts in Bangladesh"
      closeLabel="Close location selector"
      footer={
        <button
          type="button"
          onClick={handleConfirm}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] active:scale-[0.98]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#D4F6A2]" />
          <span>Confirm Location ({effectiveLocation})</span>
        </button>
      }
    >
      <LocationSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />
      {savedAddresses.length > 0 && (
        <SavedAddressOptionList
          addresses={savedAddresses}
          selectedAddressId={selectedAddressId}
          onSelect={handleSelectAddress}
          onAddNew={() => {
            window.location.href = '/account/addresses';
          }}
        />
      )}
      <QuickDhakaZonePills
        selectedZoneName={selectedLocationName}
        onSelectZone={handleSelectZone}
      />
    </Modal>
  );
}
