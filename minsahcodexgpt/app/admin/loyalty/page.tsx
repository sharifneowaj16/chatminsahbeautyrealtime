'use client';

import React, { useState } from 'react';
import {
  Award,
  Crown,
  Sparkles,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Sliders,
  Save,
  Gift,
  ShieldCheck,
  Plus,
  Minus,
  Edit2
} from 'lucide-react';

interface LoyaltyMember {
  id: string;
  name: string;
  phone: string;
  tier: 'Gold' | 'Silver' | 'Bronze';
  points: number;
  lifetimeSpent: number;
  lastActivity: string;
}

const INITIAL_MEMBERS: LoyaltyMember[] = [
  { id: 'MEM-01', name: 'Fatima Rahman', phone: '01712-345678', tier: 'Gold', points: 3450, lifetimeSpent: 34500, lastActivity: 'Earned +170 pts on #ORD-2847' },
  { id: 'MEM-02', name: 'Nusrat Jahan', phone: '01611-987654', tier: 'Silver', points: 2150, lifetimeSpent: 21500, lastActivity: 'Redeemed -500 pts for ৳50 off' },
  { id: 'MEM-03', name: 'Tamanna Chowdhury', phone: '01819-234567', tier: 'Gold', points: 4850, lifetimeSpent: 48500, lastActivity: 'Earned +240 pts on #ORD-2848' },
  { id: 'MEM-04', name: 'Sumiya Khan', phone: '01912-112233', tier: 'Bronze', points: 850, lifetimeSpent: 8500, lastActivity: 'Earned +85 pts on #ORD-2850' },
  { id: 'MEM-05', name: 'Sadia Akhter', phone: '01715-778899', tier: 'Silver', points: 1950, lifetimeSpent: 19500, lastActivity: 'Earned +195 pts on #ORD-2842' },
];

export default function LoyaltyPage() {
  const [members, setMembers] = useState<LoyaltyMember[]>(INITIAL_MEMBERS);
  const [pointsPer100, setPointsPer100] = useState(10);
  const [minRedemption, setMinRedemption] = useState(500);
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadLoyaltyData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/loyalty');
      if (res.ok) {
        const data = await res.json();
        if (data.members && data.members.length > 0) {
          setMembers(data.members);
        }
        if (data.config) {
          if (data.config.pointsPer100) setPointsPer100(data.config.pointsPer100);
          if (data.config.minRedemption) setMinRedemption(data.config.minRedemption);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch loyalty data from DB, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadLoyaltyData();
  }, []);

  const handleAdjustPoints = async (type: 'add' | 'deduct') => {
    if (!selectedMember) return;
    const delta = type === 'add' ? adjustAmount : -adjustAmount;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === selectedMember.id
          ? {
              ...m,
              points: Math.max(0, m.points + delta),
              lastActivity: `Admin adjusted ${delta > 0 ? '+' : ''}${delta} pts manually`
            }
          : m
      )
    );
    setAdjustModalOpen(false);
    showToast(`Adjusted ${delta > 0 ? '+' : ''}${delta} points for ${selectedMember.name}`);

    if ((selectedMember as any).dbId) {
      try {
        await fetch('/api/admin/loyalty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ADJUST_POINTS',
            userId: (selectedMember as any).dbId,
            delta,
          }),
        });
      } catch (e) {
        console.warn('Failed to adjust points on backend', e);
      }
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tier.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Award className="w-4 h-4" />
            <span>Customer Retention // Loyalty & VIP Tiers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Loyalty & Reward Points Program
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Configure customer VIP tiers, point accrual economics, and manual points adjustments.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast('Loyalty program rules saved to production!')}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Program Rules</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Points in Circulation</span>
            <Sparkles className="w-4 h-4 text-[#4edea3]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">1,450,000</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">Earned by 3,420 members</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Redeemable Value</span>
            <DollarSign className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#c0c1ff] font-mono">৳ 1,45,000</div>
          <div className="text-[11px] text-[#908fa0] mt-1">10 Pts = ৳ 1 discount value</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Enrolled VIP Members</span>
            <Crown className="w-4 h-4 text-[#ffb690]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb690] font-mono">3,420</div>
          <div className="text-[11px] text-[#908fa0] mt-1">48% repeat purchase rate</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Redemption Conversion</span>
            <TrendingUp className="w-4 h-4 text-[#ffb4ab]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">38.4%</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">Strong incentive engagement</div>
        </div>
      </div>

      {/* Two Column Layout: Left 60% Tier Architecture & Rules, Right 40% Members Points Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Tiers & Economic Rules */}
        <div className="lg:col-span-7 space-y-6">
          {/* 3 VIP Tier Cards */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#ffb690]" />
              <span>Customer Tier Hierarchy & Multipliers</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Bronze Tier */}
              <div className="p-4 rounded-xl bg-[#051424] border border-[#cd7f32]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#cd7f32]">Bronze Tier</span>
                  <span className="text-[10px] text-[#908fa0] font-mono">0 - 1,000 pts</span>
                </div>
                <div className="text-lg font-bold text-[#ffffff]">1.0x Rate</div>
                <ul className="text-[10px] text-[#908fa0] space-y-1 pt-1 border-t border-[#273647]">
                  <li>• 1 Point per ৳10 spent</li>
                  <li>• 5% Birthday discount coupon</li>
                  <li>• Standard delivery queue</li>
                </ul>
              </div>

              {/* Silver Tier */}
              <div className="p-4 rounded-xl bg-[#051424] border border-[#c0c1ff]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#c0c1ff]">Silver Tier</span>
                  <span className="text-[10px] text-[#908fa0] font-mono">1,001 - 3,000 pts</span>
                </div>
                <div className="text-lg font-bold text-[#ffffff]">1.25x Rate</div>
                <ul className="text-[10px] text-[#908fa0] space-y-1 pt-1 border-t border-[#273647]">
                  <li>• 1.25 Points multiplier</li>
                  <li>• Free shipping inside Dhaka</li>
                  <li>• Early access to flash sales</li>
                </ul>
              </div>

              {/* Gold Tier */}
              <div className="p-4 rounded-xl bg-[#051424] border border-[#eab308]/50 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#eab308]">Gold VIP</span>
                  <span className="text-[10px] text-[#eab308] font-mono font-bold">3,001+ pts</span>
                </div>
                <div className="text-lg font-bold text-[#eab308]">1.5x Rate</div>
                <ul className="text-[10px] text-[#908fa0] space-y-1 pt-1 border-t border-[#273647]">
                  <li>• 1.5x Points multiplier</li>
                  <li>• Free shipping nationwide</li>
                  <li>• Free deluxe samples in box</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Program Rules Configuration */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#4edea3]" />
              <span>Earning & Redemption Economics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">Points Earned per ৳ 100 Spent</label>
                <input
                  type="number"
                  value={pointsPer100}
                  onChange={(e) => setPointsPer100(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
                <span className="text-[10px] text-[#908fa0] mt-1 block">Equivalent to 10% cash rebate on beauty orders</span>
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Minimum Redemption Threshold</label>
                <input
                  type="number"
                  value={minRedemption}
                  onChange={(e) => setMinRedemption(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
                <span className="text-[10px] text-[#908fa0] mt-1 block">500 Points unlocks ৳ 50 checkout voucher</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Members Points Ledger */}
        <div className="lg:col-span-5 bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#273647]">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#c0c1ff]" />
              <span>Member Points Ledger</span>
            </h3>
            <span className="text-xs font-mono text-[#4edea3]">{members.length} Members</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#908fa0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, phone, tier..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] placeholder-[#908fa0] focus:outline-none focus:border-[#c0c1ff]"
            />
          </div>

          <div className="space-y-3">
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-[#051424] border border-[#273647] space-y-2 hover:border-[#4edea3]/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[#ffffff]">{m.name}</h4>
                    <div className="text-[10px] text-[#908fa0] font-mono">{m.phone}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      m.tier === 'Gold'
                        ? 'bg-[#eab308]/20 text-[#eab308]'
                        : m.tier === 'Silver'
                        ? 'bg-[#c0c1ff]/20 text-[#c0c1ff]'
                        : 'bg-[#cd7f32]/20 text-[#cd7f32]'
                    }`}
                  >
                    {m.tier}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div>
                    <div className="text-[10px] text-[#908fa0]">Current Balance</div>
                    <div className="font-mono font-bold text-[#4edea3]">{m.points} Points</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#908fa0]">Lifetime Spend</div>
                    <div className="font-mono text-xs text-[#ffffff]">৳ {m.lifetimeSpent.toLocaleString()}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#273647] flex justify-between items-center text-[10px]">
                  <span className="text-[#908fa0] truncate">{m.lastActivity}</span>
                  <button
                    onClick={() => {
                      setSelectedMember(m);
                      setAdjustModalOpen(true);
                    }}
                    className="text-[#c0c1ff] hover:underline font-bold shrink-0 ml-2"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Points Adjustment Modal */}
      {adjustModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#273647] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#273647]">
              <div>
                <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#4edea3]" />
                  <span>Manual Points Adjustment</span>
                </h3>
                <span className="text-[11px] text-[#c0c1ff]">
                  Member: {selectedMember.name} (Current: {selectedMember.points} pts)
                </span>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} className="text-[#908fa0] hover:text-[#ffffff] text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">Adjustment Amount (Points)</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono font-bold text-[#4edea3] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Reason for Adjustment</label>
                <select className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#4edea3]">
                  <option>Customer compensation / Delayed shipment</option>
                  <option>Store opening promotional bonus</option>
                  <option>Influencer campaign perk</option>
                  <option>Order return points clawback</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleAdjustPoints('deduct')}
                className="py-2 bg-[#93000a]/30 hover:bg-[#93000a]/50 text-[#ffb4ab] border border-[#ffb4ab]/30 rounded-lg text-xs font-bold"
              >
                Deduct -{adjustAmount} Pts
              </button>
              <button
                onClick={() => handleAdjustPoints('add')}
                className="py-2 bg-[#00a572]/30 hover:bg-[#00a572]/50 text-[#4edea3] border border-[#4edea3]/30 rounded-lg text-xs font-bold"
              >
                Add +{adjustAmount} Pts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
