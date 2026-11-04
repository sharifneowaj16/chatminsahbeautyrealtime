'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Gift,
  Ticket,
  Clock,
  RefreshCw,
  Heart,
  Crown,
  Trophy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { LOYALTY_CONFIG } from '@/types/user';
import type { LoyaltyTransaction } from '@/types/user';

// Icon map — string to component
const ICON_MAP: Record<string, React.ElementType> = {
  Star,
  Gift,
  Ticket,
  Clock,
  RefreshCw,
  Heart,
  Crown,
  Trophy,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Star;
  return <Icon className={className} />;
}

interface LoyaltyClientProps {
  userLoyalty: any;
  transactions: LoyaltyTransaction[];
  loyaltyTiers: any[];
  rewards: any[];
}

export function LoyaltyClient({
  userLoyalty,
  transactions,
  loyaltyTiers,
  rewards,
}: LoyaltyClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReward, setSelectedReward] = useState<typeof rewards[0] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userTier =
    loyaltyTiers.find((tier) => tier.name.toLowerCase() === userLoyalty.tier) ||
    loyaltyTiers[0];
  const nextTier = loyaltyTiers.find((tier) => tier.minPoints > userTier.minPoints);

  const tabs = [
    { id: 'overview', name: 'Tier & Privileges', icon: 'Star' },
    { id: 'rewards', name: 'Reward Vouchers', icon: 'Gift' },
    { id: 'history', name: 'Points Ledger', icon: 'Clock' },
  ];

  const formatPoints = (points: number) => points?.toLocaleString() || '0';

  const getTransactionIcon = (type: 'earned' | 'redeemed') =>
    type === 'earned' ? (
      <RefreshCw className="w-4 h-4 text-[#27a644]" />
    ) : (
      <Gift className="w-4 h-4 text-[#828fff]" />
    );

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
              <Crown className="w-3 h-3 text-[#828fff]" />
              Minsah Prestige Club
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f8f8]">
            VIP Loyalty & Rewards
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Earn authentic beauty points with every order and unlock bespoke luxury vouchers
          </p>
        </div>
      </div>

      {/* ── Linear Metallic Points Hero Card ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1011] p-5 sm:p-7 text-white shadow-2xl border border-[#23252a]">
        {/* Ambient Linear glow accents */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#5e6ad2]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-[#27a644]/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#23252a]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#18191a] to-[#0f1011] text-[#828fff] border border-[#23252a] shadow-inner">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#8a8f98] font-semibold">Active Tier</p>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight capitalize text-[#f7f8f8]">
                  {userTier.name} Member
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#141516] px-3.5 py-1.5 border border-[#23252a] text-xs font-mono">
              <span className="text-[#8a8f98]">Rate:</span>
              <strong className="text-[#828fff]">{LOYALTY_CONFIG.redemption_rate} pts = ৳1</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
            <div>
              <div className="flex items-center space-x-1.5 mb-1">
                <Star className="w-3.5 h-3.5 text-[#828fff]" />
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">Available Balance</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] font-mono">
                {mounted ? formatPoints(userLoyalty.currentPoints) : '---'}
              </p>
              <p className="text-[11px] text-[#27a644] mt-0.5 font-mono">
                ≈ ৳{Math.floor(userLoyalty.currentPoints / LOYALTY_CONFIG.redemption_rate).toLocaleString()} cash value
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 mb-1">
                <Trophy className="w-3.5 h-3.5 text-[#828fff]" />
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">Lifetime Points</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] font-mono">
                {mounted ? formatPoints(userLoyalty.lifetimePoints) : '---'}
              </p>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">Tier qualification basis</p>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-[#27a644]" />
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">Earned This Month</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[#27a644] font-mono">
                +{mounted ? formatPoints(userLoyalty.monthlyEarned) : '---'}
              </p>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">From recent orders</p>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">Expiring Soon</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-300 font-mono">
                {mounted ? formatPoints(userLoyalty.pointsExpiring) : '---'}
              </p>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">Next 30 calendar days</p>
            </div>
          </div>

          {/* Tier Progress Bar */}
          {nextTier && (
            <div className="mt-6 pt-5 border-t border-[#23252a]">
              <div className="flex justify-between text-xs text-[#8a8f98] mb-2 font-mono">
                <span>
                  Current: <strong className="text-[#f7f8f8] capitalize">{userTier.name}</strong>
                </span>
                <span>
                  Next: <strong className="text-[#828fff] capitalize">{nextTier.name}</strong> (
                  {mounted ? formatPoints(userLoyalty.lifetimePoints) : '0'} / {formatPoints(nextTier.minPoints)} pts)
                </span>
              </div>
              <div className="w-full bg-[#18191a] rounded-full h-2 p-0.5 border border-[#23252a]">
                <div
                  className="bg-gradient-to-r from-[#5e6ad2] to-[#27a644] h-1 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(userLoyalty.tierProgress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Segmented Tab Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center overflow-x-auto no-scrollbar">
        <nav className="inline-flex rounded-xl bg-[#0f1011] p-1 border border-[#23252a] gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#18191a] text-white border border-[#5e6ad2]/40 shadow-sm'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]'
              }`}
            >
              <DynamicIcon
                name={tab.icon}
                className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[#828fff]' : 'text-[#8a8f98]'}`}
              />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content + Right Column ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Tab 1: Overview & Tier Benefits */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-[#23252a] mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-[#f7f8f8]">
                      Your {userTier.name} Privileges
                    </h2>
                    <p className="text-xs text-[#8a8f98] mt-0.5">
                      Exclusive perks unlocked at your current membership tier
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userTier.benefits.map((benefit: string) => (
                    <div
                      key={benefit}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-[#141516] border border-[#23252a]"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#5e6ad2]/15 text-[#828fff] shrink-0 mt-0.5">
                        <Star className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium text-[#f7f8f8] leading-snug">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ways to Earn Points */}
              <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-5 sm:p-6 shadow-xl">
                <h2 className="text-sm font-semibold text-[#f7f8f8] mb-1">How to Accumulate Points</h2>
                <p className="text-xs text-[#8a8f98] mb-4">Effortlessly grow your rewards balance through genuine engagement</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { action: 'Place Authenticated Orders', points: `${LOYALTY_CONFIG.points_per_bdt} pt per ৳1 spent`, icon: 'Gift' },
                    { action: 'Verified Review & Swatches', points: `${LOYALTY_CONFIG.points_for_review} pts per review`, icon: 'Star' },
                    { action: 'Refer a Beauty Enthusiast', points: `${LOYALTY_CONFIG.points_for_referral_signup} pts on signup`, icon: 'Heart' },
                    { action: 'VIP Birthday Celebration', points: '100 bonus pts', icon: 'Trophy' },
                  ].map((item) => (
                    <div
                      key={item.action}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#141516] border border-[#23252a]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#18191a] text-[#828fff] border border-[#23252a] shrink-0">
                        <DynamicIcon name={item.icon} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs text-[#f7f8f8] truncate">{item.action}</p>
                        <p className="text-[11px] font-semibold text-[#27a644] mt-0.5 font-mono">{item.points}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Available Rewards Vouchers */}
          {activeTab === 'rewards' && (
            <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-5 sm:p-6 shadow-xl">
              <div className="pb-4 border-b border-[#23252a] mb-5">
                <h2 className="text-sm font-semibold text-[#f7f8f8]">VIP Rewards & Vouchers</h2>
                <p className="text-xs text-[#8a8f98] mt-0.5">Redeem accumulated points for instant checkout coupon codes</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward: any) => {
                  const canRedeem = reward.points <= userLoyalty.currentPoints;
                  return (
                    <div
                      key={reward.id}
                      className="group relative overflow-hidden rounded-xl border border-[#23252a] bg-[#141516] p-4.5 hover:border-[#5e6ad2]/60 transition-all shadow-md flex flex-col justify-between"
                    >
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#828fff] bg-[#5e6ad2]/15 px-2 py-0.5 rounded-md border border-[#5e6ad2]/30 mb-2">
                          <Ticket className="w-2.5 h-2.5" />
                          Official Voucher
                        </span>
                        <h3 className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">{reward.name}</h3>
                        <p className="text-xs text-[#8a8f98] mt-1 line-clamp-2">{reward.description}</p>
                      </div>

                      <div className="pt-3 border-t border-[#23252a] flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[#8a8f98] block">Required</span>
                          <span className="text-sm font-bold text-[#f7f8f8] font-mono">
                            {formatPoints(reward.points)} <span className="text-xs font-normal text-[#8a8f98]">pts</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedReward(reward)}
                          disabled={!canRedeem}
                          className={`w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold px-4 rounded-xl transition-all cursor-pointer ${
                            canRedeem
                              ? 'bg-[#5e6ad2] hover:bg-[#828fff] text-white shadow-md active:scale-95'
                              : 'bg-[#18191a] text-[#62666d] border border-[#23252a] cursor-not-allowed'
                          }`}
                        >
                          {canRedeem ? 'Redeem Voucher' : 'Need More Points'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Points History / Ledger */}
          {activeTab === 'history' && (
            <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-5 sm:p-6 shadow-xl">
              <div className="pb-4 border-b border-[#23252a] mb-4">
                <h2 className="text-sm font-semibold text-[#f7f8f8]">Points Ledger History</h2>
                <p className="text-xs text-[#8a8f98] mt-0.5">Complete record of points earnings and voucher redemptions</p>
              </div>

              {transactions.length === 0 ? (
                <div className="py-10 text-center text-[#8a8f98] text-xs">
                  No points activity recorded yet. Place an order or write a review to start earning!
                </div>
              ) : (
                <div className="divide-y divide-[#23252a]">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border shrink-0 ${
                            transaction.type === 'earned'
                              ? 'bg-[#27a644]/15 border-[#27a644]/30'
                              : 'bg-[#18191a] border-[#23252a]'
                          }`}
                        >
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-[#f7f8f8]">{transaction.description}</p>
                          <p className="text-[11px] text-[#8a8f98] font-mono">
                            {mounted ? new Date(transaction.createdAt).toLocaleDateString() : '---'}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          transaction.type === 'earned' ? 'text-[#27a644]' : 'text-[#828fff]'
                        }`}
                      >
                        {transaction.type === 'earned' ? '+' : '-'}
                        {formatPoints(transaction.points)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Quick Stats & Tier Progression Ladder */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-5 sm:p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-[#f7f8f8] mb-3 pb-2.5 border-b border-[#23252a]">
              Redemption Value
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-[#8a8f98]">Current Cash Value</span>
                <span className="text-base font-bold text-[#f7f8f8] font-mono">
                  ৳{Math.floor(userLoyalty.currentPoints / LOYALTY_CONFIG.redemption_rate).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#8a8f98] bg-[#141516] p-3 rounded-xl border border-[#23252a] leading-relaxed">
                You can apply your reward vouchers directly during checkout on any order over ৳500.
              </p>
            </div>
          </div>

          {/* All Tiers Ladder */}
          <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-5 sm:p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-[#f7f8f8] mb-3 pb-2.5 border-b border-[#23252a]">
              Tier Ladder
            </h3>
            <div className="space-y-2.5">
              {loyaltyTiers.map((tier: any) => {
                const isActive = tier.name.toLowerCase() === userLoyalty.tier;
                const isCompleted = userLoyalty.lifetimePoints >= tier.minPoints;

                return (
                  <div
                    key={tier.name}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#141516] border border-[#5e6ad2]/50 shadow-md'
                        : isCompleted
                        ? 'bg-[#141516]/60 border border-[#23252a]'
                        : 'border border-dashed border-[#23252a] opacity-50'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        isActive
                          ? 'bg-[#5e6ad2] text-white'
                          : isCompleted
                          ? 'bg-[#27a644]/15 text-[#27a644]'
                          : 'bg-[#18191a] text-[#62666d]'
                      }`}
                    >
                      <DynamicIcon name={tier.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs text-[#f7f8f8] capitalize">{tier.name}</h4>
                      <p className="text-[11px] text-[#8a8f98] font-mono">
                        {formatPoints(tier.minPoints)} pts threshold
                      </p>
                    </div>
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#5e6ad2]/20 text-[#828fff]">
                        Active
                      </span>
                    ) : isCompleted ? (
                      <span className="text-[10px] font-semibold text-[#27a644]">Unlocked</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Redemption Confirmation Modal */}
      <Modal
        open={Boolean(selectedReward)}
        onClose={() => setSelectedReward(null)}
        title="Confirm Voucher Redemption"
        size="sm"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setSelectedReward(null)}
              className="w-full sm:w-auto h-11 px-4 rounded-xl border border-[#23252a] bg-[#141516] text-[#8a8f98] hover:text-[#f7f8f8] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setSelectedReward(null)}
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-md active:scale-95 cursor-pointer"
            >
              Confirm & Unlock Code
            </button>
          </div>
        }
      >
        {selectedReward && (
          <div className="space-y-3.5 text-xs">
            <div className="rounded-xl bg-[#141516] border border-[#23252a] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="w-4 h-4 text-[#828fff]" />
                <h4 className="text-sm font-semibold text-[#f7f8f8]">{selectedReward.name}</h4>
              </div>
              <p className="text-xs text-[#8a8f98] mt-1">{selectedReward.description}</p>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#23252a]">
                <span className="text-[#8a8f98]">Points Cost</span>
                <span className="font-bold text-sm text-[#f7f8f8] font-mono">
                  {formatPoints(selectedReward.points)} pts
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center px-1 text-[#8a8f98]">
              <span>Remaining Balance After:</span>
              <span className="font-bold text-[#f7f8f8] font-mono">
                {formatPoints(userLoyalty.currentPoints - selectedReward.points)} pts
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
