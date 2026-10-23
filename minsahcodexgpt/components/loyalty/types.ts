export interface LoyaltyUserStats {
  glowPoints: number;
  glowValueBdt: number;
  walletBalanceBdt: number;
  activeTransitCount: number;
  transitHub: string;
  tierName: string;
  nextTierName: string;
  pointsToNextTier: number;
  tierTargetPoints: number;
  lifetimeTierPoints: number;
}

export interface LoyaltyPerkItem {
  id: string;
  title: string;
  pointsCost: number;
  iconName: string;
  description?: string;
}

export interface PointsLogItem {
  id: string;
  title: string;
  date: string;
  detail: string;
  pointsDelta: number;
  runningBalance: number;
  isPositive: boolean;
}
