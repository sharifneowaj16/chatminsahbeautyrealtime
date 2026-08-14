'use client';

import Link from 'next/link';
import { formatPrice } from '@/utils/currency';

// Combo data organized by price range
const comboRanges = [
  {
    title: '1001-1500 Taka Combos',
    priceRange: 'Tk 1001-1500',
    combos: [
      { id: 'c1', name: 'Makeup Combo', price: 1200, image: '💄' },
      { id: 'c2', name: 'Skincare Combo', price: 1350, image: '🧴' },
      { id: 'c3', name: 'Haircare Combo', price: 1400, image: '💆‍♀️' },
      { id: 'c4', name: 'Body Care Combo', price: 1450, image: '✨' },
    ]
  },
  {
    title: '1501-2000 Taka Combos',
    priceRange: 'Tk 1501-2000',
    combos: [
      { id: 'c5', name: 'Premium Makeup Set', price: 1800, image: '💎' },
      { id: 'c6', name: 'Facial Kit Combo', price: 1650, image: '🌸' },
      { id: 'c7', name: 'Hair Treatment Set', price: 1900, image: '💇‍♀️' },
      { id: 'c8', name: 'Spa Collection', price: 1750, image: '🧖‍♀️' },
    ]
  },
  {
    title: '2001-2500 Taka Combos',
    priceRange: 'Tk 2001-2500',
    combos: [
      { id: 'c9', name: 'Luxury Beauty Box', price: 2200, image: '👑' },
      { id: 'c10', name: 'Complete Skincare Set', price: 2400, image: '✨' },
      { id: 'c11', name: 'Professional Makeup Kit', price: 2300, image: '💅' },
      { id: 'c12', name: 'Pamper Package', price: 2150, image: '🎁' },
    ]
  },
  {
    title: '2501-3000 Taka Combos',
    priceRange: 'Tk 2501-3000',
    combos: [
      { id: 'c13', name: 'Deluxe Beauty Set', price: 2800, image: '🌟' },
      { id: 'c14', name: 'Ultimate Skincare', price: 2900, image: '💧' },
      { id: 'c15', name: 'Pro Makeup Collection', price: 2750, image: '🎨' },
      { id: 'c16', name: 'Total Body Care', price: 2650, image: '🧴' },
    ]
  },
  {
    title: '3001-3500 Taka Combos',
    priceRange: 'Tk 3001-3500',
    combos: [
      { id: 'c17', name: 'Elite Beauty Bundle', price: 3200, image: '💎' },
      { id: 'c18', name: 'Premium Spa Set', price: 3400, image: '🧖‍♀️' },
      { id: 'c19', name: 'Master Makeup Kit', price: 3300, image: '💄' },
      { id: 'c20', name: 'Complete Wellness', price: 3150, image: '🌺' },
    ]
  },
  {
    title: '3501-5000 Taka Combos',
    priceRange: 'Tk 3501-5000',
    combos: [
      { id: 'c21', name: 'Ultimate Beauty Collection', price: 4500, image: '👑' },
      { id: 'c22', name: 'Luxury Spa Experience', price: 4200, image: '✨' },
      { id: 'c23', name: 'Professional Beauty Kit', price: 3800, image: '💅' },
      { id: 'c24', name: 'Complete Makeover Set', price: 4800, image: '🎀' },
    ]
  },
];

export default function CombosPage() {

  return (
    <div className="min-h-screen bg-minsah-light">
      <section className="border-b border-minsah-accent bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black text-minsah-dark sm:text-3xl">Combo Deals</h1>
          <p className="mt-1 text-sm text-minsah-secondary">Browse beauty bundles grouped by budget.</p>
        </div>
      </section>

      {/* Combo Sections */}
      {comboRanges.map((range, rangeIndex) => (
        <section key={rangeIndex} className="mb-6">
          {/* Range Header */}
          <div className="bg-minsah-dark text-minsah-light px-4 py-3">
            <h2 className="text-base font-bold">{range.title}</h2>
          </div>

          {/* Combo Grid */}
          <div className="px-4 py-4 grid grid-cols-2 gap-3">
            {range.combos.map((combo) => (
              <Link
                key={combo.id}
                href={`/shop?q=${encodeURIComponent(combo.name)}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
              >
                {/* Combo Image */}
                <div className="w-full aspect-square bg-gradient-to-br from-minsah-accent to-minsah-light/50 flex items-center justify-center text-6xl p-4">
                  {combo.image}
                </div>

                {/* Combo Info */}
                <div className="p-3 bg-minsah-accent/30">
                  <h3 className="font-semibold text-sm text-minsah-dark mb-1 text-center">
                    {combo.name}
                  </h3>
                  <p className="text-xs text-center font-bold text-minsah-primary">
                    {formatPrice(combo.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
