'use client';

import React, { useState } from 'react';
import {
  Gift,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Heart,
  Package,
  DollarSign,
  Copy,
  Printer,
  ChevronRight,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface GiftRequest {
  id: string;
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  occasion: string;
  message: string;
  boxStyle: string;
  status: 'Pending Packaging' | 'Packed' | 'Dispatched';
}

interface IssuedCard {
  code: string;
  purchaser: string;
  recipientEmail: string;
  initialValue: number;
  balance: number;
  status: 'Active' | 'Redeemed' | 'Expired';
  expiryDate: string;
}

const INITIAL_REQUESTS: GiftRequest[] = [
  {
    id: 'GFT-01',
    orderId: '#ORD-2850',
    recipientName: 'Anika Tabassum',
    recipientPhone: '01819-334455',
    occasion: 'Birthday',
    message: 'Happy 22nd Birthday dearest sister! Wishing you timeless Korean glass skin. Love, Tania 💕',
    boxStyle: 'Luxury Velvet Rose Box with Gold Foil Ribbon',
    status: 'Pending Packaging'
  },
  {
    id: 'GFT-02',
    orderId: '#ORD-2844',
    recipientName: 'Sadia Jahan',
    recipientPhone: '01712-998877',
    occasion: 'Anniversary',
    message: 'Happy 1st Anniversary my love! Enjoy your skincare glow.',
    boxStyle: 'Minimalist Ivory Box with Silk Lavender Ribbon',
    status: 'Packed'
  },
  {
    id: 'GFT-03',
    orderId: '#ORD-2838',
    recipientName: 'Farhana Akhter',
    recipientPhone: '01611-223344',
    occasion: 'Graduation Gift',
    message: 'Congratulations on your MBBS graduation! So proud of you.',
    boxStyle: 'Emerald Green Festive Packaging Box',
    status: 'Pending Packaging'
  }
];

const INITIAL_CARDS: IssuedCard[] = [
  { code: 'MINSAH-GLOW-8821', purchaser: 'Tahmina Islam', recipientEmail: 'anika@gmail.com', initialValue: 3000, balance: 1850, status: 'Active', expiryDate: '2025-10-21' },
  { code: 'MINSAH-GIFT-5540', purchaser: 'Rashedul Karim', recipientEmail: 'nila.karim@yahoo.com', initialValue: 5000, balance: 0, status: 'Redeemed', expiryDate: '2025-06-30' },
  { code: 'MINSAH-FEST-9912', purchaser: 'Farhana Haque', recipientEmail: 'mehnaz@hotmail.com', initialValue: 2000, balance: 2000, status: 'Active', expiryDate: '2025-11-15' },
];

export default function GiftCardsPage() {
  const [requests, setRequests] = useState<GiftRequest[]>(INITIAL_REQUESTS);
  const [cards, setCards] = useState<IssuedCard[]>(INITIAL_CARDS);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadGiftRequests = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/gifts');
      if (res.ok) {
        const data = await res.json();
        if (data.requests && data.requests.length > 0) {
          setRequests(data.requests);
        }
      }
    } catch (err) {
      console.warn('Failed to load gift requests from DB, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadGiftRequests();
  }, []);

  const markPacked = async (id: string) => {
    const target = requests.find((r) => r.id === id);
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Packed' } : r))
    );
    showToast('Gift marked as packed & custom card attached!');

    if ((target as any)?.dbId) {
      try {
        await fetch('/api/admin/gifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_STATUS',
            id: (target as any).dbId,
            status: 'ACCEPTED',
          }),
        });
      } catch (e) {
        console.warn('Failed to update gift status on backend', e);
      }
    }
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
          <div className="flex items-center gap-2 text-xs font-mono text-[#ffb690] uppercase tracking-wider mb-1">
            <Gift className="w-4 h-4" />
            <span>Minsah Delight // Gift Packaging & Card Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Gift Cards & Custom Packaging
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Manage personalized customer gift notes, luxury packaging orders, and digital voucher balances.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast('Gift wrap pricing updated')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Package className="w-4 h-4 text-[#c0c1ff]" />
            <span>Packaging Materials Stock</span>
          </button>

          <button
            onClick={() => setIssueModalOpen(true)}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Gift Card</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Active Gift Cards</span>
            <Gift className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">148</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">Digital Vouchers Issued</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Outstanding Balance</span>
            <DollarSign className="w-4 h-4 text-[#ffb690]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb690] font-mono">৳ 1,84,500</div>
          <div className="text-[11px] text-[#908fa0] mt-1">Pending user redemption</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Pending Gift Wraps</span>
            <Package className="w-4 h-4 text-[#ec6a06]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">
            {requests.filter((r) => r.status === 'Pending Packaging').length}
          </div>
          <div className="text-[11px] text-[#ec6a06] mt-1 font-semibold">Requires gift box packing</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Gift Card Revenue</span>
            <Heart className="w-4 h-4 text-[#ffb4ab]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">৳ 6,40,000</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">+38% holiday surge</div>
        </div>
      </div>

      {/* Main Grid: Left 60% Custom Gift Packaging Orders, Right 40% Issued Cards Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Custom Packaging Orders */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#c0c1ff]" />
              <span>Pending Customer Gift Packaging Requests</span>
            </h2>
            <span className="text-xs font-mono text-[#908fa0]">{requests.length} Requests</span>
          </div>

          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#c0c1ff]">{req.orderId}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ec6a06]/20 text-[#ffb690]">
                        {req.occasion}
                      </span>
                    </div>
                    <div className="text-xs text-[#ffffff] font-bold mt-1">
                      Recipient: {req.recipientName} ({req.recipientPhone})
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      req.status === 'Packed'
                        ? 'bg-[#00a572]/20 text-[#4edea3]'
                        : 'bg-[#ec6a06]/20 text-[#ffb690]'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {/* Custom Note Quote */}
                <div className="p-3 bg-[#051424] rounded-lg border border-[#273647] text-xs font-sans italic text-[#ffb690] leading-relaxed">
                  "{req.message}"
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#273647] text-xs">
                  <div className="text-[11px] text-[#908fa0]">
                    Box: <span className="text-[#ffffff] font-medium">{req.boxStyle}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => showToast(`Greeting card for ${req.recipientName} printed!`)}
                      className="px-3 py-1.5 bg-[#051424] hover:bg-[#1c2b3c] border border-[#273647] text-[#c0c1ff] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Note</span>
                    </button>

                    {req.status !== 'Packed' && (
                      <button
                        onClick={() => markPacked(req.id)}
                        className="px-3 py-1.5 bg-[#4edea3] hover:bg-[#00a572] text-[#002113] rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        Mark Packed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Issued Cards Ledger */}
        <div className="lg:col-span-5 bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#273647]">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#4edea3]" />
              <span>Digital Gift Voucher Ledger</span>
            </h3>
            <span className="text-xs font-mono text-[#4edea3]">100% Redeemable</span>
          </div>

          <div className="space-y-3">
            {cards.map((c) => (
              <div
                key={c.code}
                className="p-3.5 rounded-xl bg-[#051424] border border-[#273647] space-y-2 hover:border-[#c0c1ff]/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#ffffff]">{c.code}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      c.status === 'Active'
                        ? 'bg-[#00a572]/20 text-[#4edea3]'
                        : 'bg-[#464554]/20 text-[#908fa0]'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div>
                    <div className="text-[10px] text-[#908fa0]">Remaining Balance</div>
                    <div className="font-mono font-extrabold text-sm text-[#4edea3]">৳ {c.balance}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#908fa0]">Initial Value</div>
                    <div className="font-mono text-xs text-[#ffffff]">৳ {c.initialValue}</div>
                  </div>
                </div>

                <div className="text-[11px] text-[#908fa0] pt-1 border-t border-[#273647] flex justify-between">
                  <span>Owner: {c.recipientEmail}</span>
                  <span className="font-mono">Exp: {c.expiryDate}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Packaging Inventory Stock */}
          <div className="pt-3 border-t border-[#273647] space-y-2 text-xs">
            <span className="font-bold text-[#ffffff] block">Packaging Material Stock:</span>
            <div className="flex justify-between text-[#908fa0]">
              <span>Luxury Velvet Boxes</span>
              <span className="font-mono text-[#ffffff]">48 units left</span>
            </div>
            <div className="flex justify-between text-[#908fa0]">
              <span>Handwritten Greeting Cards</span>
              <span className="font-mono text-[#ffffff]">120 cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Gift Card Modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#273647] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#273647]">
              <h3 className="text-base font-bold text-[#ffffff] flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#c0c1ff]" />
                <span>Issue Customer Digital Gift Card</span>
              </h3>
              <button onClick={() => setIssueModalOpen(false)} className="text-[#908fa0] hover:text-[#ffffff] text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">Recipient Email</label>
                <input
                  type="email"
                  placeholder="customer@gmail.com"
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#c0c1ff]"
                />
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Gift Card Amount (৳ BDT)</label>
                <input
                  type="number"
                  defaultValue={2000}
                  step={500}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono font-bold text-[#4edea3] focus:outline-none focus:border-[#c0c1ff]"
                />
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Expiry Period</label>
                <select className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#c0c1ff]">
                  <option>1 Year (365 Days)</option>
                  <option>6 Months (180 Days)</option>
                  <option>Never Expires</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIssueModalOpen(false)}
                className="flex-1 py-2 bg-[#1c2b3c] hover:bg-[#273647] text-[#d4e4fa] rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIssueModalOpen(false);
                  showToast('Gift card code generated and emailed to recipient!');
                }}
                className="flex-1 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold shadow-md"
              >
                Issue & Send Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
