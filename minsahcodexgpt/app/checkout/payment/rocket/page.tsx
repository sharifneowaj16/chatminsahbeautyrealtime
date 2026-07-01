import { redirect } from 'next/navigation';

export default function LegacyRocketPaymentPage() {
  redirect('/checkout');
}
