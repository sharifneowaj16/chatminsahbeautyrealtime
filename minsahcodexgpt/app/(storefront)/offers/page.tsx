import { OffersMobileView } from '@/components/offers/mobile/OffersMobileView';
import { OffersDesktopView } from '@/components/offers/OffersDesktopView';

export const metadata = {
  title: 'Offers & Promotions | Minsah Beauty',
  description: 'Exclusive vouchers, flash sales, and bundle savings on 100% authentic worldwide skincare.',
};

export default function OffersPage() {
  return (
    <>
      <OffersMobileView />
      <OffersDesktopView />
    </>
  );
}
