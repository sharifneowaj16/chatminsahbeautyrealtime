'use client';

import { useCart } from '@/contexts/CartContext';

export default function CartNavBadge() {
  const { items } = useCart();

  if (items.length === 0) {
    return null;
  }

  return (
    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
      {items.length}
    </span>
  );
}
