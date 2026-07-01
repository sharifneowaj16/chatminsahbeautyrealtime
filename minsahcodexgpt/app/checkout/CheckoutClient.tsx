/**
 * Legacy checkout compatibility wrapper.
 *
 * Production checkout must use app/checkout/page.tsx, which creates a canonical
 * order through /api/orders before any payment or tracking step. This component
 * intentionally performs no payment simulation, no order simulation, and no
 * Purchase tracking.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CheckoutClientProps {
  subtotal: number;
  shipping: number;
  total: number;
  bdtSubtotal: string;
  bdtShipping: string;
  bdtTotal: string;
}

export default function CheckoutClient(props: CheckoutClientProps) {
  void props;
  const router = useRouter();

  useEffect(() => {
    router.replace('/checkout');
  }, [router]);

  return null;
}
