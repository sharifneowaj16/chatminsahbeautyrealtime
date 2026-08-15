import { redirect } from 'next/navigation';
import { noindexMetadata } from '@/lib/metadata/noindex';

export const metadata = noindexMetadata;

export default function CartPage() {
  redirect('/checkout');
}
