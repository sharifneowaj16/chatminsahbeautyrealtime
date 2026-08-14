'use client';

import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/Badge';

export default function CartNavBadge() {
  const { items } = useCart();

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (totalQuantity === 0) {
    return null;
  }

  return (
    <Badge
      tone="danger"
      aria-label={`${totalQuantity} item${totalQuantity === 1 ? '' : 's'} in cart`}
      className="absolute -top-1 -right-2 min-h-5 w-5 justify-center px-0 py-0"
    >
      {totalQuantity}
    </Badge>
  );
}
