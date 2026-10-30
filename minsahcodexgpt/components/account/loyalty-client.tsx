'use client';

import { useState } from 'react';
import {
  Star,
  Gift,
  Ticket,
  Clock,
  RefreshCw,
  Heart,
  Crown,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LOYALTY_CONFIG } from '@/types/user';
import type { LoyaltyTransaction } from '@/types/user';

// Icon map — string to component
const ICON_MAP: Record<string, React.ElementType> = {
  Star, Gift, Ticket, Clock, RefreshCw, Heart, Crown, Trophy,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Star;
  return <Icon className={className} />;
}

interface LoyaltyClientProps {
  userLoyalty: any;
  transactions: LoyaltyTransaction[];
  loyaltyTiers: any[]; // icon is now a string
  rewards: any[];
}

export function LoyaltyClient({ userLoyalty, transactions, loyaltyTiers, rewards }: LoyaltyClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReward, setSelectedReward] = useState<typeof rewards[0] | null>(null);

  const userTier = loyaltyTiers.find((tier) => tier.name.toLowerCase() === userLoyalty.tier) || loyaltyTiers[0];
  const nextTier = loyaltyTiers.find((tier) => tier.minPoints > userTier.minPoints);

  const tabs = [
    { id: 'overview', name: 'Tier & Benefits', icon: 'Star' },
    { id: 'rewards', name: 'Rewards Vouchers', icon: 'Gift' },
    { id: 'history', name: 'Points Ledger', icon: 'Clock' },
  ];

  const formatPoints = (points: number) => points.toLocaleString();

  const getTransactionIcon = (type: 'earned' | 'redeemed') =>
    type === 'earned' ? (
      <RefreshCw className="w-4 h-4 text-emerald-600" />
    ) : (
      <Gift className="w-4 h-4 text-[#062402]" />
    );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]">
            <Crown className="w-3 h-3 text-[#062402]" />
            Minsah Prestige Club
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#062402]">VIP Loyalty & Rewards</h1>
        <p className="text-sm text-stone-500 mt-1">Earn authentic beauty points with every order and unlock bespoke luxury vouchers.</p>
      </div>

      {/* Luxury Points Hero Card */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#062402] via-[#0d2e08] to-[#153410] p-6 sm:p-8 md:p-10 text-white shadow-[0_12px_40px_rgba(6,36,2,0.18)] border border-[#234c1b]/60">
        {/* Ambient radial lighting */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D4F6A2]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#D4F6A2]/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4F6A2] text-[#062402] shadow-sm">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#D4F6A2] font-semibold">Active Tier</p>
                <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-wide capitalize text-white">
                  {userTier.name} Member
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 border border-white/10 text-xs font-medium text-white/90">
              <span>Redemption Rate:</span>
              <strong className="text-[#D4F6A2] font-bold">{LOYALTY_CONFIG.redemption_rate} pts = ৳1</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <Star className="w-4 h-4 text-[#D4F6A2]" />
                <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Available Balance</span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-white">{formatPoints(userLoyalty.currentPoints)}</p>
              <p className="text-[11px] text-[#D4F6A2] mt-0.5 font-medium">
                ≈ ৳{Math.floor(userLoyalty.currentPoints / LOYALTY_CONFIG.redemption_rate).toLocaleString()} cash value
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <Trophy className="w-4 h-4 text-[#D4F6A2]" />
                <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Lifetime Points</span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-white">{formatPoints(userLoyalty.lifetimePoints)}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Tier qualification basis</p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <RefreshCw className="w-4 h-4 text-[#D4F6A2]" />
                <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Earned This Month</span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#D4F6A2]">+{formatPoints(userLoyalty.monthlyEarned)}</p>
              <p className="text-[11px] text-white/50 mt-0.5">From recent beauty orders</p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <Clock className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Expiring Soon</span>
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-200">{formatPoints(userLoyalty.pointsExpiring)}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Next 30 calendar days</p>
            </div>
          </div>

          {/* Tier Progress Bar */}
          {nextTier && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex justify-between text-xs text-white/80 mb-2.5">
                <span className="font-medium">
                  Current: <strong className="text-white capitalize">{userTier.name}</strong>
                </span>
                <span className="font-medium">
                  Next Milestone: <strong className="text-[#D4F6A2] capitalize">{nextTier.name}</strong> ({formatPoints(userLoyalty.lifetimePoints)} / {formatPoints(nextTier.minPoints)} pts)
                </span>
              </div>
              <div className="w-full bg-black/30 rounded-full h-2.5 p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-[#D4F6A2] to-[#BEEB7A] h-1.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(userLoyalty.tierProgress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center">
        <nav className="inline-flex rounded-[18px] bg-stone-100/90 p-1.5 border border-stone-200/60 shadow-inner gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#062402] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-stone-200/50'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <DynamicIcon name={tab.icon} className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[#062402]' : 'text-stone-400'}`} />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Tab 1: Overview & Tier Benefits */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                <div className="flex items-center justify-between pb-6 border-b border-stone-100 mb-6">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#062402]">Your {userTier.name} Privileges</h2>
                    <p className="text-xs text-stone-500 mt-0.5">Exclusive perks unlocked at your current membership tier</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAF7D8] text-[#062402] border border-[#D4F6A2]">
                    Unlocked
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userTier.benefits.map((benefit: string) => (
                    <div key={benefit} className="flex items-start gap-3 p-4 rounded-[16px] bg-[#FAF9F6] border border-stone-200/60">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF7D8] text-[#062402] flex-shrink-0 mt-0.5">
                        <Star className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-stone-800 leading-snug">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ways to Earn Points */}
              <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                <h2 className="font-serif text-xl font-bold text-[#062402] mb-1">How to Accumulate Points</h2>
                <p className="text-xs text-stone-500 mb-6">Effortlessly grow your rewards balance through genuine engagement</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { action: 'Place Authenticated Orders', points: `${LOYALTY_CONFIG.points_per_bdt} pt per ৳1 spent`, icon: 'Gift' },
                    { action: 'Verified Review & Swatches', points: `${LOYALTY_CONFIG.points_for_review} pts per review`, icon: 'Star' },
                    { action: 'Refer a Beauty Enthusiast', points: `${LOYALTY_CONFIG.points_for_referral_signup} pts on signup`, icon: 'Heart' },
                    { action: 'VIP Birthday Celebration', points: '100 bonus pts', icon: 'Trophy' },
                  ].map((item) => (
                    <div key={item.action} className="flex items-center gap-4 p-4 rounded-[18px] bg-[#FAF9F6] border border-stone-200/60 hover:border-stone-300 transition-colors">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-stone-200/80 text-[#062402] shadow-sm flex-shrink-0">
                        <DynamicIcon name={item.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-[#062402]">{item.action}</p>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5">{item.points}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Available Rewards Vouchers */}
          {activeTab === 'rewards' && (
            <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
              <div className="pb-6 border-b border-stone-100 mb-6">
                <h2 className="font-serif text-xl font-bold text-[#062402]">VIP Rewards & Vouchers</h2>
                <p className="text-xs text-stone-500 mt-0.5">Redeem your accumulated points for instant checkout coupon codes</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rewards.map((reward: any) => {
                  const canRedeem = reward.points <= userLoyalty.currentPoints;
                  return (
                    <div
                      key={reward.id}
                      className="group relative overflow-hidden rounded-[20px] border border-dashed border-stone-300 bg-gradient-to-br from-white to-[#FAF9F6] p-6 hover:border-[#062402] transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#062402] bg-[#EAF7D8] px-2.5 py-0.5 rounded-full border border-[#D4F6A2] mb-2">
                            <Ticket className="w-2.5 h-2.5" />
                            Official Voucher
                          </span>
                          <h3 className="font-serif text-base font-bold text-[#062402]">{reward.name}</h3>
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">{reward.description}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Required</span>
                          <span className="font-serif text-lg font-bold text-[#062402]">
                            {formatPoints(reward.points)} <span className="text-xs font-normal text-stone-500">pts</span>
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant={canRedeem ? 'primary' : 'secondary'}
                          onClick={() => setSelectedReward(reward)}
                          disabled={!canRedeem}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                            canRedeem
                              ? 'bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] shadow-sm'
                              : 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                          }`}
                        >
                          {canRedeem ? 'Redeem Voucher' : 'Need More Points'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Points History / Ledger */}
          {activeTab === 'history' && (
            <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
              <div className="pb-6 border-b border-stone-100 mb-6">
                <h2 className="font-serif text-xl font-bold text-[#062402]">Points Ledger History</h2>
                <p className="text-xs text-stone-500 mt-0.5">Complete record of your points earnings and voucher redemptions</p>
              </div>

              {transactions.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  No points activity recorded yet. Place an order or write a review to start earning!
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0 ${
                          transaction.type === 'earned' ? 'bg-[#EAF7D8] border-[#D4F6A2]' : 'bg-stone-100 border-stone-200'
                        }`}>
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-semibold text-xs sm:text-sm text-[#062402]">{transaction.description}</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className={`font-serif text-base sm:text-lg font-bold ${
                        transaction.type === 'earned' ? 'text-emerald-700' : 'text-[#062402]'
                      }`}>
                        {transaction.type === 'earned' ? '+' : '-'}{formatPoints(transaction.points)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Quick Stats & Tier Progression Ladder */}
        <div className="space-y-8">
          {/* Quick Stats Card */}
          <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
            <h3 className="font-serif text-lg font-bold text-[#062402] mb-4 pb-3 border-b border-stone-100">
              Redemption Value
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline text-xs sm:text-sm">
                <span className="text-stone-500">Current Cash Value</span>
                <span className="font-serif text-lg font-bold text-[#062402]">
                  ৳{Math.floor(userLoyalty.currentPoints / LOYALTY_CONFIG.redemption_rate).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-stone-500 bg-[#FAF9F6] p-3 rounded-xl border border-stone-200/60 leading-relaxed">
                You can apply your reward vouchers directly during checkout on any order over ৳500.
              </p>
              <div className="flex justify-between text-xs sm:text-sm border-t border-stone-100 pt-3">
                <span className="text-stone-500">Earned This Year</span>
                <span className="font-bold text-stone-900">{formatPoints(userLoyalty.monthlyEarned * 12)} pts</span>
              </div>
            </div>
          </div>

          {/* All Tiers Ladder */}
          <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
            <h3 className="font-serif text-lg font-bold text-[#062402] mb-4 pb-3 border-b border-stone-100">
              Tier Ladder
            </h3>
            <div className="space-y-3">
              {loyaltyTiers.map((tier: any) => {
                const isActive = tier.name.toLowerCase() === userLoyalty.tier;
                const isCompleted = userLoyalty.lifetimePoints >= tier.minPoints;

                return (
                  <div
                    key={tier.name}
                    className={`flex items-center gap-3.5 p-3.5 rounded-[18px] transition-all ${
                      isActive
                        ? 'bg-[#FAF9F6] border-2 border-[#062402] shadow-sm'
                        : isCompleted
                        ? 'bg-stone-50/60 border border-stone-200/60 opacity-90'
                        : 'border border-dashed border-stone-200 opacity-60'
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${
                      isActive
                        ? 'bg-[#062402] text-[#D4F6A2]'
                        : isCompleted
                        ? 'bg-[#EAF7D8] text-[#062402]'
                        : 'bg-stone-100 text-stone-400'
                    }`}>
                      <DynamicIcon name={tier.icon} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-[#062402] capitalize">{tier.name}</h4>
                      <p className="text-[11px] text-stone-500">{formatPoints(tier.minPoints)} points requirement</p>
                    </div>
                    {isActive ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#062402] text-[#D4F6A2]">
                        Active
                      </span>
                    ) : isCompleted ? (
                      <span className="text-[11px] font-bold text-emerald-700">Achieved</span>
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
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedReward(null)}
              className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-stone-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setSelectedReward(null)}
              className="text-xs font-bold px-5 py-2.5 rounded-xl bg-[#062402] text-[#D4F6A2] hover:bg-[#153410]"
            >
              Confirm & Unlock Code
            </Button>
          </div>
        }
      >
        {selectedReward && (
          <div className="space-y-4">
            <div className="rounded-[18px] bg-[#FAF9F6] border border-stone-200/80 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="w-4 h-4 text-[#062402]" />
                <h4 className="font-serif text-base font-bold text-[#062402]">{selectedReward.name}</h4>
              </div>
              <p className="text-xs text-stone-500 mt-1">{selectedReward.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-200/60 text-xs">
                <span className="text-stone-500">Points Cost</span>
                <span className="font-serif font-bold text-sm text-[#062402]">{formatPoints(selectedReward.points)} pts</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs px-2 text-stone-600">
              <span>Remaining Balance After:</span>
              <span className="font-bold text-[#062402]">
                {formatPoints(userLoyalty.currentPoints - selectedReward.points)} pts
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}