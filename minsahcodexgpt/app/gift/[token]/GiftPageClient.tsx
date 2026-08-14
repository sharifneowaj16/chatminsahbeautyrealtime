'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Gift,
  Heart,
  MapPin,
  Phone,
  ShoppingBag,
  User,
  Zap,
} from 'lucide-react';

import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { SuccessState } from '@/components/ui/SuccessState';
import { Textarea } from '@/components/ui/Textarea';

interface DeliveryAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  note?: string;
}

interface GiftData {
  gift: {
    token: string;
    giftType: 'SEND_GIFT' | 'GET_GIFT';
    senderName: string;
    recipientName: string;
    message: string | null;
    status: string;
    expiresAt: string;
    requesterAddress?: DeliveryAddress | null;
    requesterPhone?: string | null;
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
const DISTRICTS = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ'];

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
    city: 'ঢাকা',
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
      setError('নাম, ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিন।');
      return;
    }

    if (!isSendGift && !prefilledAddress) {
      setError('ডেলিভারির ঠিকানা পাওয়া যায়নি। অনুগ্রহ করে নতুন গিফট লিংক নিন।');
      return;
    }

    if (!isSendGift && !session?.user && !guestPayer.name.trim()) {
      setError('আপনার নাম দিন।');
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
        setError(responseData.error || 'অর্ডার তৈরি করা যায়নি। আবার চেষ্টা করুন।');
        return;
      }

      const deliveryAddress = isSendGift
        ? { name: form.name, phone: form.phone, street: form.street, city: form.city }
        : prefilledAddress;
      if (!deliveryAddress) return;

      const payerLabel = session?.user?.name ?? guestPayer.name;
      const message = encodeURIComponent(
        isSendGift
          ? `🎁 GIFT ORDER (Send Gift)\n\nপণ্য: ${product.name}\nমূল্য: ৳${product.price.toLocaleString()}\n\nপ্রাপক: ${deliveryAddress.name}\nফোন: ${deliveryAddress.phone}\nঠিকানা: ${deliveryAddress.street}, ${deliveryAddress.city}\n\nউপহার: ${gift.senderName} এর পক্ষ থেকে\nOrder: #${responseData.orderNumber}\nGift Token: ${gift.token}`
          : `🎁 GIFT ORDER (Get Gift)\n\nপণ্য: ${product.name}\nমূল্য: ৳${product.price.toLocaleString()}\n\nPayer: ${payerLabel}\nDelivery to: ${deliveryAddress.name}\nফোন: ${deliveryAddress.phone}\nঠিকানা: ${deliveryAddress.street}, ${deliveryAddress.city}\n\nOrder: #${responseData.orderNumber}\nGift Token: ${gift.token}`,
      );

      window.open(`https://wa.me/${WHATSAPP}?text=${message}`, '_blank', 'noopener,noreferrer');
      setDone(true);
    } catch {
      setError('নেটওয়ার্কে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-5" lang="bn-BD">
        <SuccessState
          title="অর্ডার নিশ্চিত হয়েছে"
          description={
            <>
              <p>আমরা শিগগিরই WhatsApp-এ যোগাযোগ করব।</p>
              <p className="mt-1">
                {isSendGift
                  ? `${gift.senderName} জানতে পারবেন যে আপনি উপহারটি গ্রহণ করেছেন।`
                  : `${gift.senderName}-কে এই সুন্দর উপহারের জন্য ধন্যবাদ।`}
              </p>
            </>
          }
          icon={<Heart className="h-8 w-8 fill-current" />}
          action={
            <Link
              href="/shop"
              className="minsah-touch-target inline-flex items-center rounded-xl font-bold text-minsah-text-link hover:underline"
            >
              আরও পণ্য দেখুন
            </Link>
          }
          className="w-full max-w-md"
        />
      </main>
    );
  }

  if (step === 'reveal') {
    return (
      <main className="min-h-screen bg-minsah-surface-page" lang="bn-BD">
        <header className="flex items-center justify-between bg-minsah-surface-inverse px-4 py-2 text-minsah-text-inverse">
          <Link href="/" className="minsah-icon-control inline-flex items-center justify-center rounded-full" aria-label="হোমে ফিরুন">
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
            {isSendGift ? 'আপনার জন্য বিশেষ উপহার' : 'আপনার কাছে একটি উপহারের অনুরোধ এসেছে'}
          </p>
          <h1 className="mt-1 text-center text-2xl font-black text-minsah-text-primary">{gift.recipientName}</h1>
          <p className="mb-6 mt-1 text-center text-sm leading-6 text-minsah-text-muted">
            <strong className="text-minsah-text-primary">{gift.senderName}</strong>{' '}
            {isSendGift ? 'আপনাকে এই উপহারটি দিতে চান।' : 'আপনার কাছে এই পণ্যটি চেয়েছেন।'}
          </p>

          {gift.message ? (
            <blockquote className="mb-6 w-full rounded-2xl border-l-4 border-minsah-border-strong bg-minsah-surface-soft px-4 py-3 text-sm italic leading-6 text-minsah-text-primary">
              “{gift.message}”
            </blockquote>
          ) : null}

          {!isSendGift && prefilledAddress ? (
            <section className="mb-6 w-full rounded-2xl bg-minsah-surface-soft p-4">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-minsah-text-primary">
                <MapPin className="h-4 w-4" aria-hidden="true" /> পাঠানোর ঠিকানা
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
                <span className="text-lg font-black text-minsah-text-primary">৳{product.price.toLocaleString('bn-BD')}</span>
                {product.compareAtPrice ? (
                  <span className="text-sm text-minsah-text-subtle line-through">৳{product.compareAtPrice.toLocaleString('bn-BD')}</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-minsah-text-muted">
                {isSendGift
                  ? `${gift.senderName} সম্পূর্ণ মূল্য পরিশোধ করবেন।`
                  : `আপনি মূল্য পরিশোধ করবেন, পণ্যটি ${gift.senderName}-এর কাছে পৌঁছাবে।`}
              </p>
            </div>
          </article>

          <Button type="button" fullWidth size="lg" onClick={() => setStep('checkout')}>
            {isSendGift ? <Gift className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
            {isSendGift ? 'উপহারটি গ্রহণ করুন' : 'উপহারটি দিতে চাই'}
          </Button>

          <p className="mt-3 text-center text-xs text-minsah-text-subtle">
            লিংকটি {new Date(gift.expiresAt).toLocaleDateString('bn-BD')} পর্যন্ত কার্যকর।
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-minsah-surface-page pb-32" lang="bn-BD">
      <header className="flex items-center gap-3 bg-minsah-surface-inverse px-4 py-2 text-minsah-text-inverse">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setStep('reveal')}
          aria-label="আগের ধাপে ফিরুন"
          className="text-minsah-text-inverse hover:bg-minsah-surface-panel/10 hover:text-minsah-text-inverse"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-black">
          {isSendGift ? 'ডেলিভারির তথ্য দিন' : 'মূল্য পরিশোধ করে উপহার দিন'}
        </h1>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-5">
        <section className="minsah-panel flex gap-3 p-3">
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-minsah-surface-soft">
            <CatalogProductImage src={product.image} alt={product.name} sizes="56px" padding="sm" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-minsah-text-muted">
              {isSendGift ? `${gift.senderName}-এর পক্ষ থেকে উপহার` : `${gift.senderName}-এর অনুরোধ`}
            </p>
            <p className="text-sm font-black leading-snug text-minsah-text-primary">{product.name}</p>
            <p className="text-sm font-black text-minsah-action-primary">৳{product.price.toLocaleString('bn-BD')}</p>
          </div>
        </section>

        {isSendGift ? (
          <section className="minsah-panel space-y-4 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-minsah-text-primary">
              <MapPin className="h-4 w-4" /> আপনার ঠিকানা
            </h2>
            <Input
              id="gift-recipient-name"
              label="আপনার নাম"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="পুরো নাম"
              leading={<User className="h-5 w-5" />}
            />
            <Input
              id="gift-recipient-phone"
              type="tel"
              inputMode="tel"
              label="ফোন নম্বর"
              required
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="01XXXXXXXXX"
              leading={<Phone className="h-5 w-5" />}
            />
            <Input
              id="gift-recipient-street"
              label="বাড়ি ও রাস্তার ঠিকানা"
              required
              value={form.street}
              onChange={(event) => setForm((current) => ({ ...current, street: event.target.value }))}
              placeholder="বাড়ি, রাস্তা ও এলাকার নাম"
              leading={<MapPin className="h-5 w-5" />}
            />
            <Select
              id="gift-recipient-city"
              label="জেলা"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            >
              {DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
            </Select>
            <Textarea
              id="gift-recipient-note"
              label="বিশেষ নির্দেশনা"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="যেমন: সন্ধ্যার পরে পৌঁছে দিন"
              rows={3}
            />
          </section>
        ) : (
          <>
            {prefilledAddress ? (
              <section className="minsah-panel p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-minsah-text-primary">
                  <MapPin className="h-4 w-4" /> ডেলিভারির ঠিকানা
                </h2>
                <div className="rounded-xl bg-minsah-surface-soft p-3">
                  <p className="text-sm font-black text-minsah-text-primary">{prefilledAddress.name}</p>
                  <p className="text-xs text-minsah-text-muted">{prefilledAddress.phone}</p>
                  <p className="text-xs text-minsah-text-muted">{prefilledAddress.street}, {prefilledAddress.city}</p>
                </div>
                <p className="mt-2 flex items-center gap-2 text-xs text-minsah-status-success-text">
                  <Check className="h-4 w-4" /> {gift.senderName} ঠিকানাটি আগে দিয়েছেন।
                </p>
              </section>
            ) : null}

            {!session?.user ? (
              <section className="minsah-panel space-y-4 p-4">
                <h2 className="flex items-center gap-2 text-sm font-black text-minsah-text-primary">
                  <User className="h-4 w-4" /> আপনার পরিচয়
                </h2>
                <Input
                  id="gift-payer-name"
                  label="আপনার নাম"
                  required
                  value={guestPayer.name}
                  onChange={(event) => setGuestPayer((current) => ({ ...current, name: event.target.value }))}
                  placeholder="পুরো নাম"
                  leading={<User className="h-5 w-5" />}
                />
                <Input
                  id="gift-payer-phone"
                  type="tel"
                  inputMode="tel"
                  label="ফোন নম্বর"
                  value={guestPayer.phone}
                  onChange={(event) => setGuestPayer((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="01XXXXXXXXX"
                  leading={<Phone className="h-5 w-5" />}
                />
              </section>
            ) : (
              <Alert tone="success" icon={<Check className="h-5 w-5" />}>
                আপনি <strong>{session.user.name}</strong> হিসেবে মূল্য পরিশোধ করবেন।
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
              ? 'অর্ডার তৈরি হচ্ছে…'
              : isSendGift
                ? 'উপহারের অর্ডার নিশ্চিত করুন'
                : `উপহার দিন — ৳${product.price.toLocaleString('bn-BD')}`}
          </Button>
          <p className="mt-1.5 text-center text-xs text-minsah-text-subtle">
            {isSendGift
              ? `${gift.senderName} সম্পূর্ণ মূল্য পরিশোধ করবেন।`
              : `আপনি মূল্য পরিশোধ করবেন; পণ্যটি ${gift.senderName}-এর কাছে যাবে।`}
          </p>
        </div>
      </div>
    </main>
  );
}
