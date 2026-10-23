"use client";

import React, { useState } from "react";
import { AddressRoutingHeader } from "./AddressRoutingHeader";
import { InteractiveMapPinpoint } from "./InteractiveMapPinpoint";
import { AddressCategorySelector } from "./AddressCategorySelector";
import { RecipientContactFields } from "./RecipientContactFields";
import { DeliveryCoordinatesFields } from "./DeliveryCoordinatesFields";
import { DeliveryTimingPreferences } from "./DeliveryTimingPreferences";
import { AddressActionFooterBar } from "./AddressActionFooterBar";
import { AddressCategory, TimingSlot } from "./types";

export function AddNewAddressMobileView() {
  const [category, setCategory] = useState<AddressCategory>("Home");
  const [name, setName] = useState("Tasneem Ahmed");
  const [phone, setPhone] = useState("1712 345678");
  const [division, setDivision] = useState("Dhaka");
  const [area, setArea] = useState("Banani (Zone 1)");
  const [streetAddress, setStreetAddress] = useState("House 14, Road 7, Block E, Apt 4B");
  const [landmark, setLandmark] = useState("Opposite Banani Club entrance, ring bell 4B");
  const [timingSlot, setTimingSlot] = useState<TimingSlot>("anytime");
  const [isDefault, setIsDefault] = useState(true);
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      window.location.href = "/account/settings";
    }, 1800);
  };

  const handleLocationDetected = (detectedAddress: string) => {
    setStreetAddress(detectedAddress);
  };

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#1a1c1a] antialiased">
      <div className="max-w-lg mx-auto flex flex-col pb-6">
        {/* Step 2 Header */}
        <AddressRoutingHeader />

        {/* Map Pinpoint with GPS Auto-detect */}
        <InteractiveMapPinpoint onLocationDetected={handleLocationDetected} />

        {/* Form Container */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="px-4 py-2 flex flex-col gap-3"
        >
          {/* Category Selector */}
          <AddressCategorySelector
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          {/* Recipient Contact Card */}
          <RecipientContactFields
            name={name}
            phone={phone}
            onChangeName={setName}
            onChangePhone={setPhone}
          />

          {/* Coordinates Card */}
          <DeliveryCoordinatesFields
            division={division}
            area={area}
            streetAddress={streetAddress}
            landmark={landmark}
            onChangeDivision={setDivision}
            onChangeArea={setArea}
            onChangeStreetAddress={setStreetAddress}
            onChangeLandmark={setLandmark}
          />

          {/* Timing & Default */}
          <DeliveryTimingPreferences
            timingSlot={timingSlot}
            isDefault={isDefault}
            onSelectTimingSlot={setTimingSlot}
            onToggleDefault={setIsDefault}
          />

          {/* Security & Quality Seal Card */}
          <div className="p-3 rounded-2xl bg-[#efeeeb] flex items-center gap-3 border border-[#E2DED8]/60 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs text-[#4b6723]">
              <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#062402]">
                Minsah Authenticity Hologram
              </span>
              <span className="text-[11px] text-[#43483f] leading-snug">
                Every parcel is thermally protected and dispatched with serialized tamper-evident seal.
              </span>
            </div>
          </div>
        </form>

        {/* Sticky Action Footer & Toast */}
        <AddressActionFooterBar onSave={handleSave} showToast={showToast} />
      </div>
    </div>
  );
}
export default AddNewAddressMobileView;
