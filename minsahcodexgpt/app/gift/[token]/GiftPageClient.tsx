'use client';

// app/gift/[token]/GiftPageClient.tsx
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Gift,
  Heart,
  ShoppingBag,
  ArrowLeft,
  MapPin,
  Check,
  User,
  Phone,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { SuccessState } from '@/components/ui/SuccessState';
import { Alert } from '@/components/ui/Alert';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

interface DeliveryAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
}

interface GiftData {
  gift: {
    id: string;
    token: string;
    giftType: 'SEND_GIFT' | 'GET_GIFT';
    senderName: string;
    recipientName: string;
    message?: string | null;
    expiresAt: string;
    status: string;
    requesterAddress?: DeliveryAddress | null;
  };
  product: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    image: string;
    brand: string;
    inStock: boolean;
  };
}

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '8801700000000';
const DISTRICTS = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh'];

export default function GiftPageClient({ data }: { data: GiftData }) {
  const { gift, product } = data;
  const { data: session } = useSession();
  const isSendGift = gift.giftType === 'SEND_GIFT';

  const [step, setStep] = useState<'reveal' | 'checkout'>('reveal');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryAddress & { note: string }>({
    name: '',
    phone: '',
    street: '',
    city: 'Dhaka',
    note: '',
  });
  const [guestPayer, setGuestPayer] = useState({ name: '', phone: '' });

  const prefilledAddress = gift.requesterAddress;
  const discountPct =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const handleOrder = async () => {
    setError(null);

    if (isSendGift && (!form.name.trim() || !form.phone.trim() || !form.street.trim())) {
      setError('Please provide your name, phone number, and complete address.');
      return;
    }

    if (!isSendGift && !prefilledAddress) {
      setError('Delivery address not found. Please request a new gift link.');
      return;
    }

    if (!isSendGift && !session?.user && !guestPayer.name.trim()) {
      setError('Please provide your name.');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string | undefined> = {
        payerName: session?.user?.name ?? guestPayer.name,
        payerPhone: guestPayer.phone || undefined,
      };

      if (isSendGift) {
        payload.name = form.name;
        payload.phone = form.phone;
        payload.street = form.street;
        payload.city = form.city;
        payload.note = form.note;
      }

      const response = await fetch(`/api/gift/${gift.token}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || 'Could not create order. Please try again.');
        return;
      }

      const deliveryAddress = isSendGift
        ? { name: form.name, phone: form.phone, street: form.street, city: form.city }
        : prefilledAddress;
      if (!deliveryAddress) return;

      const payerLabel = session?.user?.name ?? guestPayer.name;
      const message = encodeURIComponent(
        isSendGift
          ? `🎁 GIFT ORDER (Send Gift)\n\nProduct: ${product.name}\nPrice: ৳${product.price.toLocaleString('en-US')}\n\nRecipient: ${deliveryAddress.name}\nPhone: ${deliveryAddress.phone}\nAddress: ${deliveryAddress.street}, ${deliveryAddress.city}\n\nGift from: ${gift.senderName}\nOrder: #${responseData.orderNumber}\nGift Token: ${gift.token}`
          : `🎁 GIFT ORDER (Get Gift)\n\nProduct: ${product.name}\nPrice: ৳${product.price.toLocaleString('en-US')}\n\nPayer: ${payerLabel}\nDelivery to: ${deliveryAddress.name}\nPhone: ${deliveryAddress.phone}\nAddress: ${deliveryAddress.street}, ${deliveryAddress.city}\n\nOrder: #${responseData.orderNumber}\nGift Token: ${gift.token}`,
      );

      window.open(`https://wa.me/${WHATSAPP}?text=${message}`, '_blank', 'noopener,noreferrer');
      setDone(true);
    } catch {
      setError('A network issue occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-5" lang="en">
        <SuccessState
          title="Order Confirmed"
          description={
            <>
              <p>We will connect with you on WhatsApp shortly.</p>
              <p className="mt-1">
                {isSendGift
                  ? `${gift.senderName} will be notified that you accepted the gift.`
                  : `Thank you for sending this wonderful gift to ${gift.senderName}.`}
              </p>
            </>
          }
          icon={<Heart className="h-8 w-8 fill-current" />}
          action={
            <Link
              href="/shop"
              className="minsah-touch-target inline-flex items-center rounded-xl font-bold text-minsah-text-link hover:underline"
            >
              Browse More Products
            </Link>
          }
          className="w-full max-w-md"
        />
      </main>
    );
  }

  if (step === 'reveal') {
    return (
      <main className="min-h-screen bg-minsah-surface-page" lang="en">
        <header className="flex items-center justify-between bg-minsah-surface-inverse px-4 py-2 text-minsah-text-inverse">
          <Link href="/" className="minsah-icon-control inline-flex items-center justify-center rounded-full" aria-label="Return to home">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <span className="text-sm font-black uppercase tracking-[0.18em]">Minsah Beauty</span>
          <span className="h-11 w-11" aria-hidden="true" />
        </header>

        <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 pb-12 pt-8">
          <div className="relative mb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-minsah-surface-soft text-minsah-action-primary shadow-[var(--shadow-elevated)]">
              {isSendGift ? <Gift className="h-10 w-10" /> : <ShoppingBag className="h-10 w-10" />}
            </div>
            <div className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-minsah-status-danger-text text-minsah-text-inverse">
              <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
            </div>
          </div>

          <p className="text-sm font-semibold text-minsah-text-muted">
            {isSendGift ? 'A Special Gift for You' : 'You Received a Gift Request'}
          </p>
          <h1 className="mt-1 text-center text-2xl font-black text-minsah-text-primary">{gift.recipientName}</h1>
          <p className="mb-6 mt-1 text-center text-sm leading-6 text-minsah-text-muted">
            <strong className="text-minsah-text-primary">{gift.senderName}</strong>{' '}
            {isSendGift ? 'wants to send you this gift.' : 'requested this gift from you.'}
          </p>

          {gift.message ? (
            <blockquote className="mb-6 w-full rounded-2xl border-l-4 border-minsah-border-strong bg-minsah-surface-soft px-4 py-3 text-sm italic leading-6 text-minsah-text-primary">
              “{gift.message}”
            </blockquote>
          ) : null}

          {!isSendGift && prefilledAddress ? (
            <section className="mb-6 w-full rounded-2xl bg-minsah-surface-soft p-4">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-minsah-text-primary">
                <MapPin className="h-4 w-4" aria-hidden="true" /> Delivery Address
              </h2>
              <p className="text-sm font-bold text-minsah-text-primary">{prefilledAddress.name}</p>
              <p className="text-xs text-minsah-text-muted">{prefilledAddress.phone}</p>
              <p className="text-xs text-minsah-text-muted">{prefilledAddress.street}, {prefilledAddress.city}</p>
            </section>
          ) : null}

          <article className="minsah-panel mb-6 w-full overflow-hidden">
            <div className="relative aspect-[4/3] bg-minsah-surface-soft">
              <CatalogProductImage
                src={product.image}
                alt={product.name}
                sizes="(max-width: 768px) 100vw, 560px"
                priority
                quality={80}
              />
              {discountPct ? (
                <Badge tone="danger" className="absolute right-3 top-3">-{discountPct}%</Badge>
              ) : null}
            </div>
            <div className="p-4">
              {product.brand ? <Badge tone="neutral">{product.brand}</Badge> : null}
              <h2 className="mt-2 text-base font-black text-minsah-text-primary">{product.name}</h2>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-black text-minsah-text-primary">৳{product.price.toLocaleString('en-US')}</span>
                {product.compareAtPrice ? (
                  <span className="text-sm text-minsah-text-subtle line-through">৳{product.compareAtPrice.toLocaleString('en-US')}</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-minsah-text-muted">
                {isSendGift
                  ? `${gift.senderName} will take care of the full payment.`
                  : `You will pay for this item; it will be delivered directly to ${gift.senderName}.`}
              </p>
            </div>
          </article>

          <Button type="button" fullWidth size="lg" onClick={() => setStep('checkout')}>
            {isSendGift ? <Gift className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
            {isSendGift ? 'Accept This Gift' : 'Send This Gift'}
          </Button>

          <p className="mt-3 text-center text-xs text-minsah-text-subtle">
            This gift link is valid until {new Date(gift.expiresAt).toLocaleDateString('en-US')}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-minsah-surface-page pb-32" lang="en">
      <header className="flex items-center gap-3 bg-minsah-surface-inverse px-4 py-2 text-minsah-text-inverse">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setStep('reveal')}
          aria-label="Return to previous step"
          className="text-minsah-text-inverse hover:bg-minsah-surface-panel/10 hover:text-minsah-text-inverse"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-black">
          {isSendGift ? 'Delivery Details' : 'Complete Payment & Send Gift'}
        </h1>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-5">
        <section className="minsah-panel flex gap-3 p-3">
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-minsah-surface-soft">
            <CatalogProductImage src={product.image} alt={product.name} sizes="56px" padding="sm" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-minsah-text-muted">
              {isSendGift ? `Gift from ${gift.senderName}` : `Requested by ${gift.senderName}`}
            </p>
            <p className="text-sm font-black leading-snug text-minsah-text-primary">{product.name}</p>
            <p className="text-sm font-black text-minsah-action-primary">৳{product.price.toLocaleString('en-US')}</p>
          </div>
        </section>

        {isSendGift ? (
          <section className="minsah-panel space-y-4 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-minsah-text-primary">
              <MapPin className="h-4 w-4" /> Your Address
            </h2>
            <Input
              id="gift-recipient-name"
              label="Your Name"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              leading={<User className="h-5 w-5" />}
            />
            <Input
              id="gift-recipient-phone"
              type="tel"
              inputMode="tel"
              label="Phone Number"
              required
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="01XXXXXXXXX"
              leading={<Phone className="h-5 w-5" />}
            />
            <Input
              id="gift-recipient-street"
              label="House & Street Address"
              required
              value={form.street}
              onChange={(event) => setForm((current) => ({ ...current, street: event.target.value }))}
              placeholder="House, road, and area details"
              leading={<MapPin className="h-5 w-5" />}
            />
            <Select
              id="gift-recipient-city"
              label="District"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            >
              {DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
            </Select>
            <Textarea
              id="gift-recipient-note"
              label="Special Instructions"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="e.g., Deliver after 6 PM"
              rows={3}
            />
          </section>
        ) : (
          <>
            {prefilledAddress ? (
              <section className="minsah-panel p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-minsah-text-primary">
                  <MapPin className="h-4 w-4" /> Delivery Address
                </h2>
                <div className="rounded-xl bg-minsah-surface-soft p-3">
                  <p className="text-sm font-black text-minsah-text-primary">{prefilledAddress.name}</p>
                  <p className="text-xs text-minsah-text-muted">{prefilledAddress.phone}</p>
                  <p className="text-xs text-minsah-text-muted">{prefilledAddress.street}, {prefilledAddress.city}</p>
                </div>
                <p className="mt-2 flex items-center gap-2 text-xs text-minsah-status-success-text">
                  <Check className="h-4 w-4" /> {gift.senderName} has provided this delivery address.
                </p>
              </section>
            ) : null}

            {!session?.user ? (
              <section className="minsah-panel space-y-4 p-4">
                <h2 className="flex items-center gap-2 text-sm font-black text-minsah-text-primary">
                  <User className="h-4 w-4" /> Your Information
                </h2>
                <Input
                  id="gift-payer-name"
                  label="Your Name"
                  required
                  value={guestPayer.name}
                  onChange={(event) => setGuestPayer((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Full name"
                  leading={<User className="h-5 w-5" />}
                />
                <Input
                  id="gift-payer-phone"
                  type="tel"
                  inputMode="tel"
                  label="Phone Number"
                  value={guestPayer.phone}
                  onChange={(event) => setGuestPayer((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="01XXXXXXXXX"
                  leading={<Phone className="h-5 w-5" />}
                />
              </section>
            ) : (
              <Alert tone="success" icon={<Check className="h-5 w-5" />}>
                You are paying as <strong>{session.user.name}</strong>.
              </Alert>
            )}
          </>
        )}

        {error ? (
          <Alert tone="danger" announcement="assertive">
            {error}
          </Alert>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-minsah-border-subtle bg-minsah-surface-elevated px-4 pt-3 shadow-[var(--shadow-elevated)]">
        <div className="minsah-sticky-action-safe mx-auto max-w-md">
          <Button type="button" fullWidth size="lg" onClick={handleOrder} disabled={loading} aria-busy={loading || undefined}>
            {loading ? <Spinner size="sm" decorative /> : <Zap className="h-5 w-5" />}
            {loading
              ? 'Creating order…'
              : isSendGift
                ? 'Confirm Gift Order'
                : `Send Gift — ৳${product.price.toLocaleString('en-US')}`}
          </Button>
          <p className="mt-1.5 text-center text-xs text-minsah-text-subtle">
            {isSendGift
              ? `${gift.senderName} will take care of the full payment.`
              : `You will pay for this item; it will be delivered directly to ${gift.senderName}.`}
          </p>
        </div>
      </div>
    </main>
  );
}
