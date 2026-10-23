'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LocationModalHeader from './LocationModalHeader';
import LocationSearchInput from './LocationSearchInput';
import SavedAddressOptionList from './SavedAddressOptionList';
import QuickDhakaZonePills from './QuickDhakaZonePills';
import ConfirmLocationButton from './ConfirmLocationButton';
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

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('minsah:open-location-modal', handleOpen);
    return () => {
      window.removeEventListener('minsah:open-location-modal', handleOpen);
    };
  }, [handleOpen]);

  const handleSelectAddress = (addr: SavedAddressItem) => {
    setSelectedAddressId(item => (item === addr.id ? item : addr.id));
    setSelectedLocationName(addr.area);
    saveLocation({
      fullName: savedLocation?.fullName || 'Valued Customer',
      phoneNumber: savedLocation?.phoneNumber || '+8801700000000',
      city: 'Dhaka',
      zone: 'Dhaka Metro',
      area: addr.area,
      streetAddress: addr.address,
      pathao_city_id: 1,
      pathao_zone_id: 1,
      pathao_area_id: null,
    });
    handleClose();
  };

  const handleSelectZone = (zone: DeliveryZoneItem) => {
    setSelectedLocationName(zone.name);
    saveLocation({
      fullName: savedLocation?.fullName || 'Valued Customer',
      phoneNumber: savedLocation?.phoneNumber || '+8801700000000',
      city: 'Dhaka',
      zone: 'Dhaka Metro',
      area: zone.name,
      streetAddress: `${zone.name}, Dhaka`,
      pathao_city_id: 1,
      pathao_zone_id: 1,
      pathao_area_id: null,
    });
    handleClose();
  };

  const handleConfirm = () => {
    const locName = searchQuery.trim() || selectedLocationName;
    saveLocation({
      fullName: savedLocation?.fullName || 'Valued Customer',
      phoneNumber: savedLocation?.phoneNumber || '+8801700000000',
      city: 'Dhaka',
      zone: 'Dhaka Metro',
      area: locName,
      streetAddress: `${locName}, Dhaka`,
      pathao_city_id: 1,
      pathao_zone_id: 1,
      pathao_area_id: null,
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6 md:p-10 select-none overflow-y-auto overflow-x-hidden no-scrollbar"
    >
      {/* Semi-transparent Dark Backdrop */}
      <div
        className="fixed inset-0 bg-[#062402]/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Bottom Sheet on Mobile / Centered Card with Balanced Space on Desktop */}
      <div className="relative w-full sm:max-w-md max-h-[88vh] sm:max-h-[min(85vh,640px)] bg-white rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-[#E2DED8]/60 shadow-2xl p-4 sm:p-5 pb-6 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-3.5 z-10 my-auto shrink-0 transition-transform duration-300">
        {/* Grab Handle */}
        <div className="flex justify-center pt-1 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[#E2DED8]" />
        </div>

        {/* Header */}
        <LocationModalHeader onClose={handleClose} />

        {/* Search */}
        <LocationSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Saved Addresses */}
        <SavedAddressOptionList
          addresses={defaultSavedAddresses}
          selectedAddressId={selectedAddressId}
          onSelect={handleSelectAddress}
          onAddNew={() => {
            alert('Add New Address flow');
          }}
        />

        {/* Quick Zones */}
        <QuickDhakaZonePills
          selectedZoneName={selectedLocationName}
          onSelectZone={handleSelectZone}
        />

        {/* Confirm CTA */}
        <ConfirmLocationButton
          selectedLocationName={searchQuery.trim() || selectedLocationName}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
}
