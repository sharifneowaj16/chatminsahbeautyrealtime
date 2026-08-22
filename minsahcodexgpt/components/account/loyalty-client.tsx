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

// ✅ Icon map — string থেকে component
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
    { id: 'overview', name: 'Overview', icon: 'Star' },
    { id: 'history', name: 'History', icon: 'Clock' },
    { id: 'rewards', name: 'Rewards', icon: 'Gift' },
  ];

  const formatPoints = (points: number) => points.toLocaleString();

  const getTransactionIcon = (type: 'earned' | 'redeemed') =>
    type === 'earned' ? (
      <RefreshCw className="w-5 h-5 text-green-500" />
    ) : (
      <Gift className="w-5 h-5 text-minsah-action-primary" />
    );

  const tierColorMap: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600',
    purple: 'bg-minsah-surface-accent text-minsah-action-primary',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Loyalty Program</h1>
        <p className="text-gray-600">Earn points and unlock exclusive rewards</p>
      </div>

      {/* Points Overview Card */}
      <div className="bg-gradient-to-r from-minsah-action-primary to-minsah-action-secondary rounded-lg shadow-lg p-8 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-5 h-5" />
              <span className="text-sm text-purple-100">Current Points</span>
            </div>
            <p className="text-3xl font-bold">{formatPoints(userLoyalty.currentPoints)}</p>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5" />
              <span className="text-sm text-purple-100">Lifetime Points</span>
            </div>
            <p className="text-3xl font-bold">{formatPoints(userLoyalty.lifetimePoints)}</p>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <RefreshCw className="w-5 h-5" />
              <span className="text-sm text-purple-100">This Month</span>
            </div>
            <p className="text-3xl font-bold">+{formatPoints(userLoyalty.monthlyEarned)}</p>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm text-purple-100">Expiring Soon</span>
            </div>
            <p className="text-3xl font-bold">{formatPoints(userLoyalty.pointsExpiring)}</p>
          </div>
        </div>

        {/* Tier Progress */}
        {nextTier && (
          <div className="mt-6 pt-6 border-t border-minsah-action-primary">
            <div className="flex justify-between text-sm text-purple-100 mb-2">
              <span>{userTier.name} Tier</span>
              <span>{formatPoints(userLoyalty.lifetimePoints)} / {formatPoints(nextTier.minPoints)} → {nextTier.name}</span>
            </div>
            <div className="w-full bg-minsah-surface-subtle0 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${Math.min(userLoyalty.tierProgress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-none border-b-2 px-1 py-4 ${
                activeTab === tab.id
                  ? 'border-minsah-action-primary text-minsah-action-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <DynamicIcon name={tab.icon} className="w-4 h-4" />
              <span>{tab.name}</span>
            </Button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Your {userTier.name} Benefits</h2>
                <div className="space-y-3">
                  {userTier.benefits.map((benefit: string) => (
                    <div key={benefit} className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      </div>
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Earn */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">How to Earn Points</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { action: 'Make a Purchase', points: `${LOYALTY_CONFIG.points_per_bdt} pt per ৳1`, icon: 'Gift' },
                    { action: 'Write a Review', points: `${LOYALTY_CONFIG.points_for_review} pts`, icon: 'Star' },
                    { action: 'Refer a Friend', points: `${LOYALTY_CONFIG.points_for_referral_signup} pts`, icon: 'Heart' },
                    { action: 'Birthday Bonus', points: '100 pts', icon: 'Trophy' },
                  ].map((item) => (
                    <div key={item.action} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-minsah-surface-accent rounded-lg">
                        <DynamicIcon name={item.icon} className="w-5 h-5 text-minsah-action-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.action}</p>
                        <p className="text-minsah-action-primary text-sm font-semibold">{item.points}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${transaction.type === 'earned' ? 'text-green-600' : 'text-minsah-action-primary'}`}>
                      {transaction.type === 'earned' ? '+' : '-'}{formatPoints(transaction.points)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Rewards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rewards.map((reward: any) => (
                  <div key={reward.id} className="border border-gray-200 rounded-lg p-6 hover:border-minsah-border-strong transition">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{reward.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{reward.description}</p>
                      </div>
                      <Ticket className="w-6 h-6 text-minsah-action-primary flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-minsah-action-primary">
                        {formatPoints(reward.points)} pts
                      </span>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setSelectedReward(reward)}
                        disabled={reward.points > userLoyalty.currentPoints}
                        className={
                          reward.points <= userLoyalty.currentPoints
                            ? 'bg-minsah-action-primary hover:bg-minsah-action-primary-hover'
                            : 'bg-gray-200 text-gray-500'
                        }
                      >
                        {reward.points <= userLoyalty.currentPoints ? 'Redeem' : 'Not Enough Points'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Points to ৳1</span>
                <span className="font-medium text-gray-900">{LOYALTY_CONFIG.redemption_rate}:1</span>
              </div>
              <p className="text-xs text-gray-500">
                ৳{Math.floor(userLoyalty.currentPoints / LOYALTY_CONFIG.redemption_rate)} available for redemption
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Points Earned This Year</span>
                <span className="font-medium text-gray-900">{formatPoints(userLoyalty.monthlyEarned * 12)}</span>
              </div>
            </div>
          </div>

          {/* All Tiers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">All Tiers</h3>
            <div className="space-y-3">
              {loyaltyTiers.map((tier: any) => {
                const isActive = tier.name.toLowerCase() === userLoyalty.tier;
                const isCompleted = userLoyalty.lifetimePoints >= tier.minPoints;
                const colors = tierColorMap[tier.color] || tierColorMap.gray;

                return (
                  <div
                    key={tier.name}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      isActive ? 'bg-minsah-surface-subtle border border-purple-200' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      isActive ? 'bg-minsah-action-primary text-white'
                      : isCompleted ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {/* ✅ icon string → component */}
                      <DynamicIcon name={tier.icon} className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{tier.name}</h4>
                      <p className="text-xs text-gray-600">{formatPoints(tier.minPoints)} points</p>
                    </div>
                    {isActive && (
                      <span className="text-xs font-medium text-minsah-action-primary">Current</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Redemption Modal */}
      <Modal
        open={Boolean(selectedReward)}
        onClose={() => setSelectedReward(null)}
        title="Confirm Redemption"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setSelectedReward(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setSelectedReward(null)}
              className="bg-minsah-action-primary hover:bg-minsah-action-primary-hover"
            >
              Redeem Reward
            </Button>
          </>
        }
      >
        {selectedReward && (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900">{selectedReward.name}</h4>
              <p className="text-gray-600 text-sm mt-1">{selectedReward.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Cost</span>
                <span className="font-semibold text-minsah-action-primary">{formatPoints(selectedReward.points)} points</span>
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Balance after redemption</span>
              <span className="font-medium text-gray-900">
                {formatPoints(userLoyalty.currentPoints - selectedReward.points)} points
              </span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}