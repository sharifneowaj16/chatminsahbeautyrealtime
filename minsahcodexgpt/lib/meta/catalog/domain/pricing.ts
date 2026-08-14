import type { Money } from './types';

export function toFiniteMoneyAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

export function money(amount: unknown, currency = 'BDT'): Money {
  return { amount: toFiniteMoneyAmount(amount), currency: currency.trim().toUpperCase() };
}

export function formatCatalogMoney(value: Money): string {
  return `${value.amount.toFixed(2)} ${value.currency.toUpperCase()}`;
}
