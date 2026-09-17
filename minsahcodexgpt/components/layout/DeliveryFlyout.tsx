'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import {
  SavedDeliveryLocation,
  useDeliveryLocation,
} from '@/contexts/DeliveryLocationContext';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type DeliveryOption = { id: number; name: string };
type DeliveryAreaOption = DeliveryOption & { homeDeliveryAvailable?: boolean };

type FormState = {
  fullName: string;
  phoneNumber: string;
  city: string;
  zone: string;
  area: string;
  streetAddress: string;
  pathao_city_id: number | null;
  pathao_zone_id: number | null;
  pathao_area_id: number | null;
};

type FieldKey = keyof Omit<FormState, 'pathao_city_id' | 'pathao_zone_id' | 'pathao_area_id'>;
type DropdownKey = 'city' | 'zone' | 'area';

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function normalizeBdPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length >= 13) return digits.slice(2, 13);
  if (digits.startsWith('01')) return digits.slice(0, 11);
  return digits.slice(0, 11);
}
function isValidBdPhone(value: string) {
  return /^01[3-9]\d{8}$/.test(value);
}
function normalizeOptions(data: unknown): DeliveryOption[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const id = Number(o.id);
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      return Number.isFinite(id) && name ? { id, name } : null;
    })
    .filter(Boolean) as DeliveryOption[];
}
function normalizeAreas(data: unknown): DeliveryAreaOption[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const id = Number(o.id);
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      if (!Number.isFinite(id) || !name) return null;
      return { id, name, homeDeliveryAvailable: Boolean(o.homeDeliveryAvailable) };
    })
    .filter(Boolean) as DeliveryAreaOption[];
}

/* ─── EMPTY FORM ─────────────────────────────────────────────────────────────── */
const EMPTY_FORM: FormState = {
  fullName: '', phoneNumber: '', city: '', zone: '', area: '',
  streetAddress: '', pathao_city_id: null, pathao_zone_id: null, pathao_area_id: null,
};

/* ─── Props ──────────────────────────────────────────────────────────────────── */
interface DeliveryFlyoutProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DeliveryFlyout Component
═══════════════════════════════════════════════════════════════════════════════ */
export default function DeliveryFlyout({ open, onClose, anchorRef }: DeliveryFlyoutProps) {
  const { savedLocation, saveLocation } = useDeliveryLocation();

  /* ── Form State ── */
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ── Dropdown State ── */
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── API Data ── */
  const [cities, setCities] = useState<DeliveryOption[]>([]);
  const [zones, setZones] = useState<DeliveryOption[]>([]);
  const [areas, setAreas] = useState<DeliveryAreaOption[]>([]);
  const [locationLoading, setLocationLoading] = useState<'cities' | 'zones' | 'areas' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  /* ── Visibility animation state ── */
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  /* ─────────────────────────────────────────────────────────────────────────
     Pre-fill from saved location when flyout opens
  ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      if (savedLocation) {
        setForm({
          fullName: savedLocation.fullName || '',
          phoneNumber: savedLocation.phoneNumber || '',
          city: savedLocation.city || '',
          zone: savedLocation.zone || '',
          area: savedLocation.area || '',
          streetAddress: savedLocation.streetAddress || '',
          pathao_city_id: savedLocation.pathao_city_id,
          pathao_zone_id: savedLocation.pathao_zone_id,
          pathao_area_id: savedLocation.pathao_area_id,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setTouchedFields({});
      setSubmitAttempted(false);
      setSaveSuccess(false);
      setOpenDropdown(null);
      setSearchQuery('');
    }
  }, [open, savedLocation]);

  /* ─────────────────────────────────────────────────────────────────────────
     Mount/Unmount animation
  ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next tick for CSS transition
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  /* ─────────────────────────────────────────────────────────────────────────
     Load cities on open
  ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();
    setLocationLoading('cities');
    setLocationError(null);
    fetch('/api/shipping/pathao/cities', { cache: 'no-store', signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject('fail'))
      .then(data => { if (!cancelled) setCities(normalizeOptions(data)); })
      .catch(() => { if (!cancelled && !controller.signal.aborted) setLocationError('Could not load cities. Please retry.'); })
      .finally(() => { if (!cancelled) setLocationLoading(null); });
    return () => { cancelled = true; controller.abort(); };
  }, [open]);

  /* ─────────────────────────────────────────────────────────────────────────
     Load zones on city change
  ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!form.pathao_city_id) { setZones([]); setAreas([]); return; }
    let cancelled = false;
    const controller = new AbortController();
    setLocationLoading('zones');
    setLocationError(null);
    fetch(`/api/shipping/pathao/zones?city_id=${form.pathao_city_id}`, { cache: 'no-store', signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject('fail'))
      .then(data => { if (!cancelled) setZones(normalizeOptions(data)); })
      .catch(() => { if (!cancelled && !controller.signal.aborted) setLocationError('Could not load zones. Please retry.'); })
      .finally(() => { if (!cancelled) setLocationLoading(null); });
    return () => { cancelled = true; controller.abort(); };
  }, [form.pathao_city_id]);

  /* ─────────────────────────────────────────────────────────────────────────
     Load areas on zone change
  ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!form.pathao_zone_id) { setAreas([]); return; }
    let cancelled = false;
    const controller = new AbortController();
    setLocationLoading('areas');
    setLocationError(null);
    fetch(`/api/shipping/pathao/areas?zone_id=${form.pathao_zone_id}`, { cache: 'no-store', signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject('fail'))
      .then(data => { if (!cancelled) setAreas(normalizeAreas(data)); })
      .catch(() => { if (!cancelled && !controller.signal.aborted) setLocationError('Could not load areas. Please retry.'); })
      .finally(() => { if (!cancelled) setLocationLoading(null); });
    return () => { cancelled = true; controller.abort(); };
  }, [form.pathao_zone_id]);

  /* ─────────────────────────────────────────────────────────────────────────
     Escape key + outside click close
  ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  /* Close inner dropdown on outside click */
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  /* ─────────────────────────────────────────────────────────────────────────
     Handlers
  ───────────────────────────────────────────────────────────────────────── */
  const handleCityChange = useCallback((cityId: string) => {
    const selected = cities.find(c => String(c.id) === cityId);
    setForm(f => ({ ...f, city: selected?.name ?? '', zone: '', area: '', pathao_city_id: selected?.id ?? null, pathao_zone_id: null, pathao_area_id: null }));
  }, [cities]);

  const handleZoneChange = useCallback((zoneId: string) => {
    const selected = zones.find(z => String(z.id) === zoneId);
    setForm(f => ({ ...f, zone: selected?.name ?? '', area: '', pathao_zone_id: selected?.id ?? null, pathao_area_id: null }));
  }, [zones]);

  const handleAreaChange = useCallback((areaId: string) => {
    const selected = areas.find(a => String(a.id) === areaId);
    setForm(f => ({ ...f, area: selected?.name ?? '', pathao_area_id: selected?.id ?? null }));
  }, [areas]);

  const markTouched = (field: FieldKey) =>
    setTouchedFields(t => ({ ...t, [field]: true }));

  /* ─────────────────────────────────────────────────────────────────────────
     Validation
  ───────────────────────────────────────────────────────────────────────── */
  const selectedArea = useMemo(() => areas.find(a => a.id === form.pathao_area_id) ?? null, [areas, form.pathao_area_id]);

  const fieldErrors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!form.fullName.trim()) e.fullName = 'Please enter your full name.';
    if (!isValidBdPhone(form.phoneNumber)) e.phoneNumber = 'Valid BD number (01XXXXXXXXX) দিন।';
    if (!form.pathao_city_id) e.city = 'City select করুন।';
    if (!form.pathao_zone_id) e.zone = 'Zone select করুন।';
    if (!form.pathao_area_id) e.area = 'Area select করুন।';
    else if (selectedArea && !selectedArea.homeDeliveryAvailable) e.area = 'এই এলাকায় home delivery নেই।';
    if (!form.streetAddress.trim()) e.streetAddress = 'Street address দিন।';
    return e;
  }, [form, selectedArea]);

  const visibleErrors = useMemo(() => {
    const v: typeof fieldErrors = {};
    (Object.keys(fieldErrors) as FieldKey[]).forEach(f => {
      if (fieldErrors[f] && (submitAttempted || touchedFields[f])) v[f] = fieldErrors[f];
    });
    return v;
  }, [fieldErrors, submitAttempted, touchedFields]);

  const isFormValid = Object.keys(fieldErrors).length === 0;

  /* ─────────────────────────────────────────────────────────────────────────
     Save handler
  ───────────────────────────────────────────────────────────────────────── */
  const handleSave = () => {
    setSubmitAttempted(true);
    if (!isFormValid) return;
    const location: SavedDeliveryLocation = {
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      city: form.city.trim(),
      zone: form.zone.trim(),
      area: form.area.trim(),
      streetAddress: form.streetAddress.trim(),
      pathao_city_id: form.pathao_city_id,
      pathao_zone_id: form.pathao_zone_id,
      pathao_area_id: form.pathao_area_id,
    };
    saveLocation(location);
    setSaveSuccess(true);
    setTimeout(() => onClose(), 800);
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Filtered dropdown lists
  ───────────────────────────────────────────────────────────────────────── */
  const filteredCities = cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredZones = zones.filter(z => z.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAreas = areas.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!mounted) return null;

  /* ═══════════════════════════════════════════════════════════════════════
     SHARED FIELD STYLES (Checkout page-এর exact same design tokens)
  ═══════════════════════════════════════════════════════════════════════ */
  const fieldBorder = (field: FieldKey, isOpen?: boolean) =>
    visibleErrors[field]
      ? 'border-[#8B261D]'
      : isOpen || focusedField === field
        ? 'border-[#984B29]'
        : 'border-[#E2D9CF] hover:border-[#984B29]/60';

  const labelClass = (active: boolean, hasError: boolean, isFocused: boolean, inactiveLeft: string = 'left-4') =>
    `pointer-events-none absolute transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] select-none ${
      active
        ? `top-0 -translate-y-1/2 left-3.5 z-20 bg-[#FAF6F2] px-2 py-0.5 text-xs font-semibold leading-none ${
            hasError ? 'text-[#8B261D]' : isFocused ? 'text-[#984B29]' : 'text-[#7A6E65]'
          }`
        : `${inactiveLeft} top-1/2 -translate-y-1/2 text-sm text-[#8C7E74]`
    }`;

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[190]"
        style={{
          background: 'rgba(0,0,0,0.32)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 250ms cubic-bezier(0.4,0,0.2,1)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Flyout Card ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delivery address"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.97)',
          transition: 'opacity 250ms cubic-bezier(0.4,0,0.2,1), transform 250ms cubic-bezier(0.4,0,0.2,1)',
        }}
        className={[
          /* Desktop: anchored dropdown below button */
          'fixed z-[200] flex flex-col overflow-hidden',
          'bg-[#FAF6F2] rounded-[24px] border border-[#EFE7DE]',
          'shadow-[0_20px_48px_rgba(0,0,0,0.16)]',
          /* Desktop positioning — below topbar (56px header height) */
          'hidden sm:flex',
          'top-[68px] left-1/2 -translate-x-1/2',
          'w-[440px] max-h-[88dvh]',
        ].join(' ')}
      >
        <FlyoutContent
          form={form} setForm={setForm}
          focusedField={focusedField} setFocusedField={setFocusedField}
          visibleErrors={visibleErrors} fieldErrors={fieldErrors}
          touchedFields={touchedFields} markTouched={markTouched}
          openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          dropdownRef={dropdownRef}
          cities={cities} zones={zones} areas={areas}
          filteredCities={filteredCities} filteredZones={filteredZones} filteredAreas={filteredAreas}
          locationLoading={locationLoading} locationError={locationError}
          handleCityChange={handleCityChange} handleZoneChange={handleZoneChange} handleAreaChange={handleAreaChange}
          fieldBorder={fieldBorder} labelClass={labelClass}
          handleSave={handleSave} isFormValid={isFormValid} saveSuccess={saveSuccess}
          onClose={onClose}
        />
      </div>

      {/* ── Mobile Full-screen modal ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delivery address"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'opacity 300ms cubic-bezier(0.4,0,0.2,1), transform 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
        className="fixed inset-0 z-[200] flex flex-col sm:hidden bg-[#FAF6F2] overflow-hidden"
      >
        <FlyoutContent
          form={form} setForm={setForm}
          focusedField={focusedField} setFocusedField={setFocusedField}
          visibleErrors={visibleErrors} fieldErrors={fieldErrors}
          touchedFields={touchedFields} markTouched={markTouched}
          openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          dropdownRef={dropdownRef}
          cities={cities} zones={zones} areas={areas}
          filteredCities={filteredCities} filteredZones={filteredZones} filteredAreas={filteredAreas}
          locationLoading={locationLoading} locationError={locationError}
          handleCityChange={handleCityChange} handleZoneChange={handleZoneChange} handleAreaChange={handleAreaChange}
          fieldBorder={fieldBorder} labelClass={labelClass}
          handleSave={handleSave} isFormValid={isFormValid} saveSuccess={saveSuccess}
          onClose={onClose}
        />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Shared inner content (used by both desktop card & mobile modal)
═══════════════════════════════════════════════════════════════════════════════ */
interface FlyoutContentProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  focusedField: FieldKey | null;
  setFocusedField: (f: FieldKey | null) => void;
  visibleErrors: Partial<Record<FieldKey, string>>;
  fieldErrors: Partial<Record<FieldKey, string>>;
  touchedFields: Partial<Record<FieldKey, boolean>>;
  markTouched: (f: FieldKey) => void;
  openDropdown: DropdownKey | null;
  setOpenDropdown: (d: DropdownKey | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  cities: DeliveryOption[];
  zones: DeliveryOption[];
  areas: DeliveryAreaOption[];
  filteredCities: DeliveryOption[];
  filteredZones: DeliveryOption[];
  filteredAreas: DeliveryAreaOption[];
  locationLoading: 'cities' | 'zones' | 'areas' | null;
  locationError: string | null;
  handleCityChange: (id: string) => void;
  handleZoneChange: (id: string) => void;
  handleAreaChange: (id: string) => void;
  fieldBorder: (field: FieldKey, isOpen?: boolean) => string;
  labelClass: (active: boolean, hasError: boolean, isFocused: boolean, inactiveLeft?: string) => string;
  handleSave: () => void;
  isFormValid: boolean;
  saveSuccess: boolean;
  onClose: () => void;
}

function FlyoutContent({
  form, setForm, focusedField, setFocusedField,
  visibleErrors, touchedFields, markTouched,
  openDropdown, setOpenDropdown, searchQuery, setSearchQuery,
  dropdownRef, cities, zones, areas,
  filteredCities, filteredZones, filteredAreas,
  locationLoading, locationError,
  handleCityChange, handleZoneChange, handleAreaChange,
  fieldBorder, labelClass,
  handleSave, isFormValid, saveSuccess, onClose,
}: FlyoutContentProps) {
  return (
    <>
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between bg-[#FAF6F2] px-6 pt-6 pb-4 border-b border-[#EFE7DE]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF6F2] border border-[#EFE7DE] text-[#984B29]">
            <MapPin size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-[17px] font-[500] text-[#2D1F18] tracking-tight">Delivery Address</h2>
            <p className="text-xs text-[#7A6E65] mt-0.5">আপনার ডেলিভারি ঠিকানা দিন</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close delivery flyout"
          className="w-9 h-9 rounded-full bg-[#EFE7DE] hover:bg-[#E2D9CF] flex items-center justify-center text-[#7A6E65] transition-colors cursor-pointer shrink-0"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-4" ref={dropdownRef}>

        {/* Scoped style overrides for clean inputs */}
        <style dangerouslySetInnerHTML={{ __html: `
          .dlv-input { outline: none !important; box-shadow: none !important; border: none !important; }
          .dlv-input:focus, .dlv-input:focus-visible { outline: none !important; box-shadow: none !important; border: none !important; }
        ` }} />

        {/* 1. Full Name */}
        <div className="relative">
          <div className={`relative rounded-2xl border transition-all duration-200 bg-[#FAF6F2] ${fieldBorder('fullName')}`}>
            <input
              id="dlv-full-name"
              type="text"
              className="dlv-input w-full rounded-2xl bg-transparent px-4 py-3.5 text-sm text-[#2D1F18] placeholder:text-transparent"
              value={form.fullName}
              placeholder="Full name"
              onFocus={() => setFocusedField('fullName')}
              onBlur={() => { setFocusedField(null); markTouched('fullName'); }}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              aria-invalid={Boolean(visibleErrors.fullName)}
            />
            <label
              htmlFor="dlv-full-name"
              className={labelClass(
                focusedField === 'fullName' || Boolean(form.fullName.trim()),
                Boolean(visibleErrors.fullName),
                focusedField === 'fullName',
              )}
            >Full name</label>
          </div>
          {visibleErrors.fullName && (
            <p className="mt-1 text-xs text-[#8B261D] flex items-center gap-1">
              <AlertCircle size={12} />{visibleErrors.fullName}
            </p>
          )}
        </div>

        {/* 2. Phone Number */}
        <div className="relative">
          <div className={`relative flex items-center rounded-2xl border transition-all duration-200 bg-[#FAF6F2] ${fieldBorder('phoneNumber')}`}>
            <div className="flex items-center pl-4 pr-3 text-xs font-bold text-[#7A6E65] border-r border-[#E2D9CF] select-none shrink-0 h-full py-3.5">
              +880
            </div>
            <input
              id="dlv-phone"
              type="tel"
              inputMode="tel"
              maxLength={11}
              className="dlv-input w-full rounded-r-2xl bg-transparent px-3.5 py-3.5 text-sm text-[#2D1F18] placeholder:text-transparent"
              value={form.phoneNumber}
              placeholder="Phone number"
              onFocus={() => setFocusedField('phoneNumber')}
              onBlur={() => { setFocusedField(null); markTouched('phoneNumber'); }}
              onChange={e => setForm(f => ({ ...f, phoneNumber: normalizeBdPhone(e.target.value) }))}
              aria-invalid={Boolean(visibleErrors.phoneNumber)}
            />
            <label
              htmlFor="dlv-phone"
              className={labelClass(
                focusedField === 'phoneNumber' || Boolean(form.phoneNumber.trim()),
                Boolean(visibleErrors.phoneNumber),
                focusedField === 'phoneNumber',
                'left-[4.5rem]',
              )}
            >Phone number</label>
          </div>
          {visibleErrors.phoneNumber && (
            <p className="mt-1 text-xs text-[#8B261D] flex items-center gap-1">
              <AlertCircle size={12} />{visibleErrors.phoneNumber}
            </p>
          )}
        </div>

        {/* 3. City / Zone / Area (Cascading Searchable Selects) */}
        <div className="grid grid-cols-3 gap-3">

          {/* City */}
          <div className="relative col-span-1">
            <div
              onClick={() => { setOpenDropdown(openDropdown === 'city' ? null : 'city'); setSearchQuery(''); }}
              className={`relative flex items-center justify-between cursor-pointer rounded-2xl border px-3 py-3.5 transition-all duration-200 bg-[#FAF6F2] ${fieldBorder('city', openDropdown === 'city')}`}
            >
              <span className={`text-xs truncate ${form.city ? 'font-semibold text-[#2D1F18]' : 'text-transparent'}`}>{form.city || 'City'}</span>
              <ChevronDown size={14} className={`text-[#7A6E65] transition-transform duration-200 shrink-0 ml-1 ${openDropdown === 'city' ? 'rotate-180 text-[#984B29]' : ''}`} />
              <label className={labelClass(openDropdown === 'city' || Boolean(form.city), Boolean(visibleErrors.city), openDropdown === 'city')}>
                {locationLoading === 'cities' ? 'Loading…' : 'City'}
              </label>
            </div>
            {openDropdown === 'city' && (
              <DropdownPopup
                items={filteredCities}
                selectedId={form.pathao_city_id}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholder="Search city…"
                emptyMsg="No city found"
                onSelect={id => { handleCityChange(id); setOpenDropdown(null); setSearchQuery(''); }}
              />
            )}
            {visibleErrors.city && <p className="mt-1 text-[10px] text-[#8B261D]">{visibleErrors.city}</p>}
          </div>

          {/* Zone */}
          <div className="relative col-span-1">
            <div
              onClick={() => { if (!form.pathao_city_id || locationLoading === 'zones') return; setOpenDropdown(openDropdown === 'zone' ? null : 'zone'); setSearchQuery(''); }}
              className={`relative flex items-center justify-between rounded-2xl border px-3 py-3.5 transition-all duration-200 ${
                !form.pathao_city_id
                  ? 'cursor-not-allowed bg-[#F4F0EC] opacity-60 border-[#E2D9CF]'
                  : `cursor-pointer bg-[#FAF6F2] ${fieldBorder('zone', openDropdown === 'zone')}`
              }`}
            >
              <span className={`text-xs truncate ${form.zone ? 'font-semibold text-[#2D1F18]' : 'text-transparent'}`}>{form.zone || 'Zone'}</span>
              <ChevronDown size={14} className={`text-[#7A6E65] transition-transform duration-200 shrink-0 ml-1 ${openDropdown === 'zone' ? 'rotate-180 text-[#984B29]' : ''}`} />
              <label className={labelClass(openDropdown === 'zone' || Boolean(form.zone), Boolean(visibleErrors.zone), openDropdown === 'zone')}>
                {locationLoading === 'zones' ? 'Loading…' : 'Zone'}
              </label>
            </div>
            {openDropdown === 'zone' && (
              <DropdownPopup
                items={filteredZones}
                selectedId={form.pathao_zone_id}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholder="Search zone…"
                emptyMsg="No zone found"
                onSelect={id => { handleZoneChange(id); setOpenDropdown(null); setSearchQuery(''); }}
              />
            )}
            {visibleErrors.zone && <p className="mt-1 text-[10px] text-[#8B261D]">{visibleErrors.zone}</p>}
          </div>

          {/* Area */}
          <div className="relative col-span-1">
            <div
              onClick={() => { if (!form.pathao_zone_id || locationLoading === 'areas') return; setOpenDropdown(openDropdown === 'area' ? null : 'area'); setSearchQuery(''); }}
              className={`relative flex items-center justify-between rounded-2xl border px-3 py-3.5 transition-all duration-200 ${
                !form.pathao_zone_id
                  ? 'cursor-not-allowed bg-[#F4F0EC] opacity-60 border-[#E2D9CF]'
                  : `cursor-pointer bg-[#FAF6F2] ${fieldBorder('area', openDropdown === 'area')}`
              }`}
            >
              <span className={`text-xs truncate ${form.area ? 'font-semibold text-[#2D1F18]' : 'text-transparent'}`}>{form.area || 'Area'}</span>
              <ChevronDown size={14} className={`text-[#7A6E65] transition-transform duration-200 shrink-0 ml-1 ${openDropdown === 'area' ? 'rotate-180 text-[#984B29]' : ''}`} />
              <label className={labelClass(openDropdown === 'area' || Boolean(form.area), Boolean(visibleErrors.area), openDropdown === 'area')}>
                {locationLoading === 'areas' ? 'Loading…' : 'Area'}
              </label>
            </div>
            {openDropdown === 'area' && (
              <AreaDropdownPopup
                areas={filteredAreas}
                selectedId={form.pathao_area_id}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelect={id => { handleAreaChange(id); setOpenDropdown(null); setSearchQuery(''); }}
              />
            )}
            {visibleErrors.area && <p className="mt-1 text-[10px] text-[#8B261D]">{visibleErrors.area}</p>}
          </div>
        </div>

        {/* 4. Street Address */}
        <div className="relative">
          <div className={`relative rounded-2xl border transition-all duration-200 bg-[#FAF6F2] ${fieldBorder('streetAddress')}`}>
            <input
              id="dlv-street"
              type="text"
              className="dlv-input w-full rounded-2xl bg-transparent px-4 py-3.5 text-sm text-[#2D1F18] placeholder:text-transparent"
              value={form.streetAddress}
              placeholder="Street address"
              onFocus={() => setFocusedField('streetAddress')}
              onBlur={() => { setFocusedField(null); markTouched('streetAddress'); }}
              onChange={e => setForm(f => ({ ...f, streetAddress: e.target.value }))}
              aria-invalid={Boolean(visibleErrors.streetAddress)}
            />
            <label
              htmlFor="dlv-street"
              className={labelClass(
                focusedField === 'streetAddress' || Boolean(form.streetAddress.trim()),
                Boolean(visibleErrors.streetAddress),
                focusedField === 'streetAddress',
              )}
            >Road / House / Street address</label>
          </div>
          {visibleErrors.streetAddress && (
            <p className="mt-1 text-xs text-[#8B261D] flex items-center gap-1">
              <AlertCircle size={12} />{visibleErrors.streetAddress}
            </p>
          )}
        </div>

        {/* 5. Location Error Alert */}
        {locationError && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <AlertCircle size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
            <p className="text-xs text-[#DC2626] leading-relaxed">{locationError}</p>
          </div>
        )}
      </div>

      {/* ── Footer (Sticky Save Button) ── */}
      <div className="shrink-0 bg-[#FAF6F2] border-t border-[#EFE7DE] px-6 pt-4 pb-6">
        <button
          type="button"
          onClick={handleSave}
          className={`w-full h-[52px] rounded-full font-[500] text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(27,54,27,0.18)] ${
            saveSuccess
              ? 'bg-emerald-600 text-white'
              : isFormValid
                ? 'bg-[#1B361B] hover:bg-[#254825] text-white active:scale-[0.99]'
                : 'bg-[#1B361B]/50 text-white/70 cursor-not-allowed'
          }`}
        >
          {saveSuccess ? (
            <><Check size={16} /> Address Saved!</>
          ) : (
            <><MapPin size={15} /> Save Delivery Address</>
          )}
        </button>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Reusable Dropdown Popup
═══════════════════════════════════════════════════════════════════════════════ */
function DropdownPopup({
  items, selectedId, searchQuery, setSearchQuery, placeholder, emptyMsg, onSelect,
}: {
  items: DeliveryOption[];
  selectedId: number | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  placeholder: string;
  emptyMsg: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-[#E2D9CF] bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
      <div className="sticky top-0 border-b border-[#F4EFEA] bg-white p-2">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-[#7A6E65]" />
          <input
            type="text"
            autoFocus
            style={{ outline: 'none', boxShadow: 'none' }}
            placeholder={placeholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E2D9CF] bg-[#FDFBF9] py-1.5 pl-8 pr-8 text-xs text-[#2D1F18] outline-none focus:border-[#984B29]"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-1 text-xs">
        {items.length === 0 ? (
          <p className="py-4 text-center text-[#7A6E65]">{emptyMsg}</p>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              onClick={() => onSelect(String(item.id))}
              className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition ${
                selectedId === item.id ? 'bg-[#FAF6F2] font-bold text-[#984B29]' : 'hover:bg-gray-50 text-[#2D1F18]'
              }`}
            >
              <span>{item.name}</span>
              {selectedId === item.id && <Check size={13} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AreaDropdownPopup({
  areas, selectedId, searchQuery, setSearchQuery, onSelect,
}: {
  areas: DeliveryAreaOption[];
  selectedId: number | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-[#E2D9CF] bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
      <div className="sticky top-0 border-b border-[#F4EFEA] bg-white p-2">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-[#7A6E65]" />
          <input
            type="text"
            autoFocus
            style={{ outline: 'none', boxShadow: 'none' }}
            placeholder="Search area…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E2D9CF] bg-[#FDFBF9] py-1.5 pl-8 pr-8 text-xs text-[#2D1F18] outline-none focus:border-[#984B29]"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-1 text-xs">
        {areas.length === 0 ? (
          <p className="py-4 text-center text-[#7A6E65]">No area found</p>
        ) : (
          areas.map(area => (
            <div
              key={area.id}
              onClick={() => onSelect(String(area.id))}
              className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition ${
                selectedId === area.id ? 'bg-[#FAF6F2] font-bold text-[#984B29]' : 'hover:bg-gray-50 text-[#2D1F18]'
              }`}
            >
              <span className="truncate">{area.name}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {!area.homeDeliveryAvailable && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5 border border-amber-200 whitespace-nowrap">
                    Pickup only
                  </span>
                )}
                {selectedId === area.id && <Check size={13} className="text-[#984B29]" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}