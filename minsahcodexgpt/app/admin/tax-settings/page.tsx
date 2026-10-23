'use client';

import React, { useState } from 'react';
import {
  FileCheck2,
  Save,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Building,
  ShieldCheck,
  Calendar,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface TaxRule {
  id: string;
  name: string;
  rate: number;
  categories: string;
  active: boolean;
}

const INITIAL_TAX_RULES: TaxRule[] = [
  { id: 'RULE-01', name: 'Standard Cosmetics & Skincare VAT', rate: 15.0, categories: 'All Standard Skincare & Makeup', active: true },
  { id: 'RULE-02', name: 'Imported Luxury Supplementary Duty', rate: 5.0, categories: 'High-end Korean Imported Serums', active: true },
  { id: 'RULE-03', name: 'Medicinal / Dermatological Skincare', rate: 0.0, categories: 'Acne Treatment & Prescribed Cleansers', active: true },
  { id: 'RULE-04', name: 'Gift Cards & Vouchers', rate: 0.0, categories: 'Digital & Physical Gift Cards (Exempt)', active: true },
];

export default function TaxSettingsPage() {
  const [binNumber, setBinNumber] = useState('002948192-0101');
  const [defaultRate, setDefaultRate] = useState(15.0);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [showCheckoutBreakdown, setShowCheckoutBreakdown] = useState(true);
  const [taxRules, setTaxRules] = useState<TaxRule[]>(INITIAL_TAX_RULES);
  const [exemptGiftCards, setExemptGiftCards] = useState(true);
  const [exemptSamples, setExemptSamples] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTaxConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/tax-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          if (data.config.binNumber) setBinNumber(data.config.binNumber);
          if (typeof data.config.defaultRate === 'number') setDefaultRate(data.config.defaultRate);
          if (typeof data.config.taxInclusive === 'boolean') setTaxInclusive(data.config.taxInclusive);
          if (typeof data.config.showCheckoutBreakdown === 'boolean') setShowCheckoutBreakdown(data.config.showCheckoutBreakdown);
          if (data.config.taxRules) setTaxRules(data.config.taxRules);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch tax settings from DB, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadTaxConfig();
  }, []);

  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/admin/tax-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          binNumber,
          defaultRate,
          taxInclusive,
          showCheckoutBreakdown,
          taxRules,
          exemptGiftCards,
          exemptSamples,
        }),
      });
      if (res.ok) {
        showToast('Tax & VAT configuration saved to database!');
      } else {
        showToast('Configuration updated locally.');
      }
    } catch {
      showToast('Configuration updated locally.');
    }
  };

  const toggleRule = (id: string) => {
    setTaxRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
    showToast('Tax rule updated');
  };

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#4edea3] uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>Minsah Compliance // National Board of Revenue (NBR)</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
              Tax & VAT Configuration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00a572]/20 text-[#4edea3] border border-[#00a572]/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> BIN: {binNumber}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            NBR VAT compliance, automated sales tax calculation, and Form 9.1 filing ledger.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast('NBR Tax liability report downloaded!')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-[#c0c1ff]" />
            <span>Download Tax Summary</span>
          </button>

          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Left 60% Form & Rules Table, Right 40% Liability & Exemptions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* General Tax Settings Card */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#4edea3]" />
              <span>General VAT & Enterprise Identification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1 font-medium">Business Identification Number (BIN)</label>
                <input
                  type="text"
                  value={binNumber}
                  onChange={(e) => setBinNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1 font-medium">Standard Default VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
              </div>
            </div>

            {/* Radio: Tax Inclusive vs Exclusive */}
            <div className="pt-2 border-t border-[#273647] space-y-2 text-xs">
              <span className="text-[#908fa0] block font-medium">Product Pricing Tax Policy</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setTaxInclusive(true)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all ${
                    taxInclusive
                      ? 'bg-[#1c2b3c] border-[#4edea3] text-[#ffffff]'
                      : 'bg-[#051424] border-[#273647] text-[#908fa0]'
                  }`}
                >
                  <input
                    type="radio"
                    name="taxPolicy"
                    checked={taxInclusive}
                    onChange={() => setTaxInclusive(true)}
                    className="accent-[#4edea3]"
                  />
                  <div>
                    <div className="font-semibold text-xs">Tax-Inclusive (Recommended in BD)</div>
                    <div className="text-[10px] text-[#908fa0]">Product prices already include 15% VAT</div>
                  </div>
                </label>

                <label
                  onClick={() => setTaxInclusive(false)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all ${
                    !taxInclusive
                      ? 'bg-[#1c2b3c] border-[#4edea3] text-[#ffffff]'
                      : 'bg-[#051424] border-[#273647] text-[#908fa0]'
                  }`}
                >
                  <input
                    type="radio"
                    name="taxPolicy"
                    checked={!taxInclusive}
                    onChange={() => setTaxInclusive(false)}
                    className="accent-[#4edea3]"
                  />
                  <div>
                    <div className="font-semibold text-xs">Tax-Exclusive</div>
                    <div className="text-[10px] text-[#908fa0]">VAT is added at final checkout step</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Toggle: Show on checkout */}
            <div className="flex items-center justify-between pt-2 border-t border-[#273647] text-xs">
              <div>
                <div className="font-semibold text-[#ffffff]">Display VAT Breakdown on Checkout</div>
                <div className="text-[10px] text-[#908fa0]">Shows itemized VAT line in order invoice</div>
              </div>
              <input
                type="checkbox"
                checked={showCheckoutBreakdown}
                onChange={() => setShowCheckoutBreakdown(!showCheckoutBreakdown)}
                className="w-4 h-4 accent-[#4edea3] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Configured Tax Rules Table */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#273647] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#ffffff]">Tax Category Overrides & Rates</h3>
              <button
                onClick={() => showToast('Add Custom Tax Rule form opened')}
                className="text-xs text-[#4edea3] hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tax Rule</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d1c2d] text-[#908fa0] uppercase tracking-wider font-mono text-[10px] border-b border-[#273647]">
                  <tr>
                    <th className="py-3 px-4">Rule Name</th>
                    <th className="py-3 px-4">Rate (%)</th>
                    <th className="py-3 px-4">Applicable Products</th>
                    <th className="py-3 px-4 text-center">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#273647]">
                  {taxRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[#1c2b3c]/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#ffffff]">{rule.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#4edea3]">{rule.rate.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-[#908fa0] text-[11px]">{rule.categories}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.active}
                          onChange={() => toggleRule(rule.id)}
                          className="w-4 h-4 accent-[#4edea3] rounded cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real-time Tax Liability Overview */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#273647]">
              <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#c0c1ff]" />
                <span>Monthly NBR VAT Liability</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00a572]/20 text-[#4edea3] font-bold">
                Due: Nov 15, 2024
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#908fa0]">Gross Output VAT Collected (Sales)</span>
                <span className="font-mono text-[#ffffff] font-bold">৳ 1,42,850</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#908fa0]">Input Tax Rebate (Supplier Purchases)</span>
                <span className="font-mono text-[#4edea3] font-bold">-৳ 38,200</span>
              </div>
              <div className="pt-3 border-t border-[#273647] flex justify-between items-center">
                <div>
                  <div className="text-xs text-[#908fa0]">Net VAT Payable to NBR</div>
                  <div className="text-xl font-mono font-extrabold text-[#ffffff]">৳ 1,04,650</div>
                </div>
                <button
                  onClick={() => showToast('Generated Form 9.1 PDF statement!')}
                  className="px-3 py-1.5 bg-[#1c2b3c] hover:bg-[#273647] text-[#c0c1ff] rounded-lg text-xs font-semibold"
                >
                  Form 9.1 PDF
                </button>
              </div>
            </div>
          </div>

          {/* Tax Exemptions & Schemes */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#4edea3]" />
              <span>Special Tax Schemes & Exemptions</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#051424] border border-[#273647]">
                <div>
                  <div className="font-semibold text-[#ffffff]">Gift Card Value Exemption</div>
                  <div className="text-[10px] text-[#908fa0]">Gift card purchases are exempt from initial VAT</div>
                </div>
                <input
                  type="checkbox"
                  checked={exemptGiftCards}
                  onChange={() => setExemptGiftCards(!exemptGiftCards)}
                  className="w-4 h-4 accent-[#4edea3] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#051424] border border-[#273647]">
                <div>
                  <div className="font-semibold text-[#ffffff]">Promotional Samples & Testers</div>
                  <div className="text-[10px] text-[#908fa0]">0% VAT on zero-price sample giveaways</div>
                </div>
                <input
                  type="checkbox"
                  checked={exemptSamples}
                  onChange={() => setExemptSamples(!exemptSamples)}
                  className="w-4 h-4 accent-[#4edea3] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
