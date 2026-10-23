"use client";

import React, { useState, useMemo } from "react";

interface CreateAccountCardProps {
  onSwitchToSignIn: () => void;
  onSubmitSuccess?: (data: CreateAccountFormData) => void;
  isLoading?: boolean;
}

export interface CreateAccountFormData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  city: string;
  zone: string;
  area: string;
  agreedToTerms: boolean;
}

const POPULAR_AREAS = [
  { city: "Dhaka", zone: "Dhaka North", area: "Banani" },
  { city: "Dhaka", zone: "Dhaka North", area: "Gulshan-2" },
  { city: "Dhaka", zone: "Dhaka South", area: "Dhanmondi" },
  { city: "Dhaka", zone: "Dhaka North", area: "Uttara" },
  { city: "Dhaka", zone: "Dhaka North", area: "Bashundhara R/A" },
  { city: "Dhaka", zone: "Dhaka North", area: "Mirpur" },
];

const CITIES = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna"];

const ZONES: Record<string, string[]> = {
  Dhaka: ["Dhaka North", "Dhaka South", "Central Dhaka"],
  Chittagong: ["Agrabad", "Nasirabad", "GEC Circle", "Halishahar"],
  Sylhet: ["Zindabazar", "Upashahar", "Amberkhana"],
  Rajshahi: ["Boalia", "Motihar", "Rajpara"],
  Khulna: ["Sonadanga", "Khalishpur", "Daulatpur"],
};

const AREAS: Record<string, string[]> = {
  "Dhaka North": ["Banani", "Gulshan-1", "Gulshan-2", "Uttara", "Mirpur", "Bashundhara R/A", "Mohakhali", "Baridhara"],
  "Dhaka South": ["Dhanmondi", "Lalmatia", "Wari", "Shantinagar", "Baily Road", "Motijheel"],
  "Central Dhaka": ["Tejgaon", "Farmgate", "Panthapath", "Moghbazar"],
};

export function CreateAccountCard({
  onSwitchToSignIn,
  onSubmitSuccess,
  isLoading = false,
}: CreateAccountCardProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Delivery destination state
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [zone, setZone] = useState("Dhaka North");
  const [area, setArea] = useState("Banani");
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic zones based on city
  const availableZones = useMemo(() => {
    return ZONES[city] || ["General Zone"];
  }, [city]);

  // Dynamic areas based on zone
  const availableAreas = useMemo(() => {
    return AREAS[zone] || ["Central Area", "Sub Area"];
  }, [zone]);

  // Quick select an area
  const handleQuickSelect = (selCity: string, selZone: string, selArea: string) => {
    setCity(selCity);
    setZone(selZone);
    setArea(selArea);
  };

  // Filter location search
  const handleSearchFilter = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;

    const lower = query.toLowerCase();
    // Search across popular areas first
    const matchedPopular = POPULAR_AREAS.find(
      (p) =>
        p.area.toLowerCase().includes(lower) ||
        p.zone.toLowerCase().includes(lower) ||
        p.city.toLowerCase().includes(lower)
    );

    if (matchedPopular) {
      setCity(matchedPopular.city);
      setZone(matchedPopular.zone);
      setArea(matchedPopular.area);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (phone.length < 9) {
      setErrorMsg("Please enter a valid 11-digit mobile number.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg("Please agree to Minsah's Authenticity Guarantee & Delivery Terms.");
      return;
    }

    if (onSubmitSuccess) {
      onSubmitSuccess({
        fullName,
        phone,
        email,
        password,
        city,
        zone,
        area,
        agreedToTerms,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Header section with ৳200 voucher badge */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[20px] text-[#062402] leading-tight">
            Create Account
          </h3>
          <span className="text-[10px] font-bold text-[#1c3a13] bg-[#eaf7d8] px-2.5 py-0.5 rounded-full border border-[#ccee9b]/50 shadow-xs">
            ৳200 Welcome Voucher
          </span>
        </div>
        <p className="text-xs text-[#5a615d]">
          Join Minsah Beauty's 100% Authentic Beauty Family
        </p>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-[#181c1a]">Full Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Tasneem Ahmed"
            className="w-full px-4 py-2.5 rounded-full bg-[#f2f6f0] border border-[#e2ded8]/60 text-xs text-[#181c1a] placeholder:text-[#5a615d]/70 focus:outline-none focus:border-[#1c3a13] focus:ring-2 focus:ring-[#1c3a13]/10 transition-all"
          />
        </div>

        {/* Mobile Number with +880 */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-[#181c1a]">Mobile Number</label>
          <div className="flex items-center rounded-full bg-[#f2f6f0] border border-[#e2ded8]/60 focus-within:border-[#1c3a13] focus-within:ring-2 focus-within:ring-[#1c3a13]/10 overflow-hidden transition-all">
            <span className="px-3 py-2.5 text-xs font-bold text-[#1c3a13] border-r border-[#e2ded8]/50 bg-[#e8f0e5]/60 select-none">
              +880
            </span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="17XX-XXXXXX"
              maxLength={11}
              className="w-full px-3 py-2.5 bg-transparent text-xs text-[#181c1a] placeholder:text-[#5a615d]/70 focus:outline-none"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-[#181c1a]">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tasneem@example.com"
            className="w-full px-4 py-2.5 rounded-full bg-[#f2f6f0] border border-[#e2ded8]/60 text-xs text-[#181c1a] placeholder:text-[#5a615d]/70 focus:outline-none focus:border-[#1c3a13] focus:ring-2 focus:ring-[#1c3a13]/10 transition-all"
          />
        </div>

        {/* Create Password with Eye Toggle */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[#181c1a]">Create Password</label>
            <span className="text-[10px] text-[#5a615d] font-medium">Min. 8 characters</span>
          </div>
          <div className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 pr-10 rounded-full bg-[#f2f6f0] border border-[#e2ded8]/60 text-xs text-[#181c1a] placeholder:text-[#5a615d]/70 focus:outline-none focus:border-[#1c3a13] focus:ring-2 focus:ring-[#1c3a13]/20 transition-all"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="material-symbols-outlined absolute right-3 text-[18px] text-[#5a615d]/70 hover:text-[#062402] cursor-pointer transition-colors"
            >
              {showPassword ? "visibility_off" : "visibility"}
            </button>
          </div>
        </div>

        {/* Delivery Destination Section */}
        <div className="flex flex-col gap-2 p-3.5 rounded-[28px] bg-[#f8faf7] border border-[#e2ded8]/60 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[#181c1a] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#1c3a13]">
                pin_drop
              </span>
              Delivery Destination
            </label>
            <span className="text-[10px] font-bold text-[#1c3a13] bg-[#eaf7d8] px-2 py-0.5 rounded-full border border-[#ccee9b]/40">
              Fast Home Delivery
            </span>
          </div>

          {/* Search Location Input */}
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[16px] text-[#5a615d]/70 pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchFilter(e.target.value)}
              placeholder="Search City, Zone, or Area (e.g. Dhaka, Banani)..."
              className="w-full pl-9 pr-8 py-2 rounded-full bg-white border border-[#e2ded8]/60 text-xs text-[#181c1a] placeholder:text-[#5a615d]/70 focus:outline-none focus:border-[#1c3a13] focus:ring-2 focus:ring-[#1c3a13]/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear location search"
                onClick={() => handleSearchFilter("")}
                className="material-symbols-outlined absolute right-2.5 text-[15px] text-[#5a615d]/70 hover:text-[#062402] cursor-pointer"
              >
                cancel
              </button>
            )}
          </div>

          {/* 3-Column Dropdowns: City | Zone | Area */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {/* City */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#5a615d] uppercase tracking-wider">
                City
              </span>
              <select
                value={city}
                onChange={(e) => {
                  const newCity = e.target.value;
                  setCity(newCity);
                  const firstZone = ZONES[newCity]?.[0] || "General Zone";
                  setZone(firstZone);
                  setArea(AREAS[firstZone]?.[0] || "Main Area");
                }}
                className="w-full px-2 py-1.5 rounded-xl bg-white border border-[#e2ded8]/60 text-[11px] font-semibold text-[#181c1a] focus:outline-none focus:border-[#1c3a13] cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#5a615d] uppercase tracking-wider">
                Zone
              </span>
              <select
                value={zone}
                onChange={(e) => {
                  const newZone = e.target.value;
                  setZone(newZone);
                  setArea(AREAS[newZone]?.[0] || "Main Area");
                }}
                className="w-full px-2 py-1.5 rounded-xl bg-white border border-[#e2ded8]/60 text-[11px] font-semibold text-[#181c1a] focus:outline-none focus:border-[#1c3a13] cursor-pointer"
              >
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#5a615d] uppercase tracking-wider">
                Area
              </span>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl bg-white border border-[#e2ded8]/60 text-[11px] font-semibold text-[#181c1a] focus:outline-none focus:border-[#1c3a13] cursor-pointer"
              >
                {availableAreas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Popular Areas Ribbon Header */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-semibold text-[#5a615d]">
              Popular Delivery Areas
            </span>
            <span className="text-[10px] font-bold text-[#1c3a13] truncate max-w-[180px]">
              Selected: {city} • {area}
            </span>
          </div>

          {/* Popular Areas Touch Ribbon */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none touch-pan-x">
            {POPULAR_AREAS.map((item) => {
              const isSelected =
                city === item.city && zone === item.zone && area === item.area;
              return (
                <button
                  key={`${item.city}-${item.area}`}
                  type="button"
                  onClick={() => handleQuickSelect(item.city, item.zone, item.area)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#062402] text-white shadow-xs"
                      : "bg-white hover:bg-[#eaf7d8] text-[#181c1a] border border-[#e2ded8]/60"
                  }`}
                >
                  {item.area}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agreement Checkbox */}
        <label className="flex items-start gap-2 cursor-pointer text-[11px] text-[#5a615d] pt-1 select-none">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            required
            className="accent-[#062402] w-4 h-4 rounded mt-0.5 cursor-pointer"
          />
          <span>
            I agree to Minsah's 100% Authenticity Guarantee and Delivery Terms.
          </span>
        </label>

        {/* Full-width Mobile CTA Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white font-bold text-xs tracking-wide shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin text-[#ccee9b]">
                refresh
              </span>
              <span>Creating Your Account...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px] text-[#ccee9b]">
                card_giftcard
              </span>
              <span>Create Account &amp; Claim ৳200</span>
            </>
          )}
        </button>
      </form>

      {/* Footer Switch to Sign In */}
      <p className="text-center text-xs text-[#5a615d] pt-1">
        Already a member?{" "}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-[#1c3a13] font-bold hover:underline cursor-pointer ml-1"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}

export default CreateAccountCard;
