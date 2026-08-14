import { noindexMetadata } from '@/lib/metadata/noindex';
import CartPageClient from './CartPageClient';

export const metadata = noindexMetadata;

export default function CartPage() {
  return (
    <>
      <CartPageClient />
    </>
  );
}
