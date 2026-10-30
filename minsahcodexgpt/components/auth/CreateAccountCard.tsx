'use client';

import React, { useState, useMemo } from 'react';
import { AlertCircle, Eye, EyeOff, Gift, Loader2, MapPin, Search, X } from 'lucide-react';

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
  { city: 'Dhaka', zone: 'Dhaka North', area: 'Banani' },
  { city: 'Dhaka', zone: 'Dhaka North', area: 'Gulshan-2' },
  { city: 'Dhaka', zone: 'Dhaka South', area: 'Dhanmondi' },
  { city: 'Dhaka', zone: 'Dhaka North', area: 'Uttara' },
  { city: 'Dhaka', zone: 'Dhaka North', area: 'Bashundhara R/A' },
  { city: 'Dhaka', zone: 'Dhaka North', area: 'Mirpur' },
];

const CITIES = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna'];

const ZONES: Record<string, string[]> = {
  Dhaka: ['Dhaka North', 'Dhaka South', 'Central Dhaka'],
  Chittagong: ['Agrabad', 'Nasirabad', 'GEC Circle', 'Halishahar'],
  Sylhet: ['Zindabazar', 'Upashahar', 'Amberkhana'],
  Rajshahi: ['Boalia', 'Motihar', 'Rajpara'],
  Khulna: ['Sonadanga', 'Khalishpur', 'Daulatpur'],
};

const AREAS: Record<string, string[]> = {
  'Dhaka North': ['Banani', 'Gulshan-1', 'Gulshan-2', 'Uttara', 'Mirpur', 'Bashundhara R/A', 'Mohakhali', 'Baridhara'],
  'Dhaka South': ['Dhanmondi', 'Lalmatia', 'Wari', 'Shantinagar', 'Baily Road', 'Motijheel'],
  'Central Dhaka': ['Tejgaon', 'Farmgate', 'Panthapath', 'Moghbazar'],
};

export function CreateAccountCard({
  onSwitchToSignIn,
  onSubmitSuccess,
  isLoading = false,
}: CreateAccountCardProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [zone, setZone] = useState('Dhaka North');
  const [area, setArea] = useState('Banani');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableZones = useMemo(() => ZONES[city] || ['General Zone'], [city]);
  const availableAreas = useMemo(() => AREAS[zone] || ['Central Area', 'Sub Area'], [zone]);

  const handleSearchFilter = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;
    const lower = query.toLowerCase();
    const matched = POPULAR_AREAS.find(
      (p) =>
        p.area.toLowerCase().includes(lower) ||
        p.zone.toLowerCase().includes(lower) ||
        p.city.toLowerCase().includes(lower),
    );
    if (matched) {
      setCity(matched.city);
      setZone(matched.zone);
      setArea(matched.area);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim()) return setErrorMsg('Please enter your full name.');
    if (phone.length < 9) return setErrorMsg('Please enter a valid mobile number.');
    if (!email.trim() || !email.includes('@')) return setErrorMsg('Please enter a valid email.');
    if (password.length < 8) return setErrorMsg('Password must be at least 8 characters.');
    if (!agreedToTerms) return setErrorMsg('Please agree to the terms to continue.');

    onSubmitSuccess?.({ fullName, phone, email, password, city, zone, area, agreedToTerms });
  };

  return (
    <div className="space-y-3">
      {errorMsg ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-[#181C1A]">Full Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Tasneem Ahmed"
            className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 text-[#181C1A] focus:border-[#1c3a13] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-[#181C1A]">Mobile Number</label>
          <div className="flex h-11 items-center overflow-hidden rounded-2xl border border-[#E2DED8] bg-white focus-within:border-[#1c3a13]">
            <span className="border-r border-[#E2DED8] bg-[#F2F6F0] px-3 py-2.5 text-xs font-bold text-[#1c3a13]">
              +880
            </span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="17XXXXXXXX"
              maxLength={11}
              className="h-full w-full bg-transparent px-3 text-[#181C1A] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-[#181C1A]">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tasneem@example.com"
            className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 text-[#181C1A] focus:border-[#1c3a13] focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-bold text-[#181C1A]">Create Password</label>
            <span className="text-xs text-[#5A615D]">Min. 8 characters</span>
          </div>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 pr-11 text-[#181C1A] focus:border-[#1c3a13] focus:outline-none"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-[#5A615D] hover:text-[#062402]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2.5 rounded-2xl border border-[#E2DED8] bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#181C1A]">
              <MapPin className="h-4 w-4 text-[#4b6723]" />
              Delivery Destination
            </span>
            <span className="rounded-full bg-[#EAF7D8] px-2.5 py-0.5 text-xs font-semibold text-[#1c3a13]">
              Fast Home Delivery
            </span>
          </div>

          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#5A615D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchFilter(e.target.value)}
              placeholder="Search Dhaka, Banani, Dhanmondi..."
              className="h-10 w-full rounded-full border border-[#E2DED8] bg-[#FAF9F6] pl-9 pr-8 text-[#181C1A] focus:border-[#1c3a13] focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear location search"
                onClick={() => handleSearchFilter('')}
                className="absolute right-3 text-[#5A615D]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={city}
              onChange={(e) => {
                const newCity = e.target.value;
                setCity(newCity);
                const firstZone = ZONES[newCity]?.[0] || 'General Zone';
                setZone(firstZone);
                setArea(AREAS[firstZone]?.[0] || 'Main Area');
              }}
              className="h-10 rounded-xl border border-[#E2DED8] bg-[#FAF9F6] px-2 font-semibold text-[#181C1A]"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={zone}
              onChange={(e) => {
                const newZone = e.target.value;
                setZone(newZone);
                setArea(AREAS[newZone]?.[0] || 'Main Area');
              }}
              className="h-10 rounded-xl border border-[#E2DED8] bg-[#FAF9F6] px-2 font-semibold text-[#181C1A]"
            >
              {availableZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-10 rounded-xl border border-[#E2DED8] bg-[#FAF9F6] px-2 font-semibold text-[#181C1A]"
            >
              {availableAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {POPULAR_AREAS.map((item) => {
              const isSelected = city === item.city && zone === item.zone && area === item.area;
              return (
                <button
                  key={`${item.city}-${item.area}`}
                  type="button"
                  onClick={() => {
                    setCity(item.city);
                    setZone(item.zone);
                    setArea(item.area);
                  }}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-[#062402] text-white'
                      : 'border border-[#E2DED8] bg-[#FAF9F6] text-[#181C1A]'
                  }`}
                >
                  {item.area}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-start gap-2 pt-1 text-xs text-[#5A615D] cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 rounded accent-[#062402]"
          />
          <span>I agree to Minsah&apos;s 100% Authenticity Guarantee and Delivery Terms.</span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] active:scale-[0.98] disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
              <span>Creating Your Account...</span>
            </>
          ) : (
            <>
              <Gift className="h-4 w-4 text-[#D4F6A2]" />
              <span>Create Account &amp; Claim ৳200</span>
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-[#5A615D]">
        Already a member?{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="ml-1 font-bold text-[#1c3a13] hover:underline"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}

export default CreateAccountCard;
