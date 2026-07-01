import { redirect } from 'next/navigation';

export default function LegacyCardPaymentPage() {
  redirect('/checkout');
}
