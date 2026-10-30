'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import LocationSearchInput from './LocationSearchInput';
import SavedAddressOptionList from './SavedAddressOptionList';
import QuickDhakaZonePills from './QuickDhakaZonePills';
import { SavedAddressItem, DeliveryZoneItem } from './types';
import { useDeliveryLocation } from '@/contexts/DeliveryLocationContext';

const defaultSavedAddresses: SavedAddressItem[] = [
  {
    id: 'addr-1',
    label: 'Home',
    area: 'Banani',
    address: 'House 14, Road 7, Block E, Banani, Dhaka',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Office',
    area: 'Gulshan-2',
    address: 'Plot 68, Avenue 4, Gulshan-2, Dhaka',
  },
];

export default function DeliveryLocationModal() {
  const { savedLocation, saveLocation } = useDeliveryLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('addr-1');
  const [selectedLocationName, setSelectedLocationName] = useState('Banani');

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
      <SavedAddressOptionList
        addresses={defaultSavedAddresses}
        selectedAddressId={selectedAddressId}
        onSelect={handleSelectAddress}
        onAddNew={() => alert('Add New Address flow')}
      />
      <QuickDhakaZonePills
        selectedZoneName={selectedLocationName}
        onSelectZone={handleSelectZone}
      />
    </Modal>
  );
}
