'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Check, Gift, MapPin, Share2, ShoppingBag } from 'lucide-react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { SOCIAL_PLATFORM_COLORS } from '@/lib/design-token-exceptions';

const SocialLoginModal = dynamic(() => import('./SocialLoginModal'), {
  ssr: false,
  loading: () => null,
});

interface GiftResult {
  giftUrl: string;
  waUrl: string;
  fbUrl: string;
  giftType: 'SEND_GIFT' | 'GET_GIFT';
}

interface LoggedInUser {
  id: string;
  name: string;
}

const DISTRICTS = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ'];

function GiftLinkResult({ result }: { result: GiftResult }) {
  const { pushToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.giftUrl);
      pushToast({ tone: 'success', title: 'লিংক কপি হয়েছে' });
    } catch {
      pushToast({ tone: 'danger', title: 'লিংক কপি করা যায়নি' });
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({ url: result.giftUrl });
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError') {
        pushToast({ tone: 'danger', title: 'শেয়ার করা যায়নি' });
      }
    }
  };

  return (
    <div className="space-y-4" lang="bn">
      <Alert tone="success" announcement="polite" title="গিফট লিংক তৈরি হয়েছে">
        <span className="break-all text-xs">{result.giftUrl}</span>
      </Alert>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={result.waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="minsah-control flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-minsah-text-inverse hover:brightness-95"
          style={{ backgroundColor: SOCIAL_PLATFORM_COLORS.whatsapp }}
        >
          WhatsApp
        </a>
        <a
          href={result.fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="minsah-control flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-minsah-text-inverse hover:brightness-95"
          style={{ backgroundColor: SOCIAL_PLATFORM_COLORS.facebook }}
        >
          Facebook
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleNativeShare}>
          <Share2 className="h-4 w-4" /> শেয়ার করুন
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
          <Check className="h-4 w-4" /> লিংক কপি
        </Button>
      </div>
    </div>
  );
}

function UserSummary({ user, action }: { user: LoggedInUser; action: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-minsah-surface-soft px-3 py-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-minsah-action-primary text-xs font-bold text-minsah-text-inverse" aria-hidden="true">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-minsah-text-primary">{user.name}</p>
        <p className="text-xs text-minsah-text-muted">{action}</p>
      </div>
      <Check className="h-4 w-4 text-minsah-status-success-text" aria-hidden="true" />
    </div>
  );
}

function SendGiftForm({
  user,
  productId,
  variantId,
}: {
  user: LoggedInUser;
  productId: string;
  variantId?: string | null;
}) {
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GiftResult | null>(null);

  const handleCreate = async () => {
    if (!recipientName.trim()) {
      setError('যাকে উপহার দেবেন তার নাম দিন।');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/gift/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId,
          giftType: 'SEND_GIFT',
          senderName: user.name,
          senderId: user.id,
          recipientName,
          message,
        }),
      });
      const data = await response.json();
      if (response.ok) setResult(data);
      else setError(data.error || 'গিফট লিংক তৈরি করা যায়নি।');
    } catch {
      setError('নেটওয়ার্কে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  if (result) return <GiftLinkResult result={result} />;

  return (
    <div className="space-y-4" lang="bn">
      <UserSummary user={user} action="আপনি উপহার পাঠাচ্ছেন" />
      {error ? <Alert tone="danger" announcement="assertive">{error}</Alert> : null}
      <Input
        id="send-gift-recipient"
        label="প্রাপকের নাম"
        required
        value={recipientName}
        onChange={(event) => setRecipientName(event.target.value)}
        placeholder="বন্ধুর নাম"
      />
      <Textarea
        id="send-gift-message"
        label="শুভেচ্ছা বার্তা"
        description="ঐচ্ছিক"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="আপনার শুভেচ্ছা লিখুন"
        rows={3}
      />
      <Button type="button" fullWidth size="lg" onClick={handleCreate} disabled={loading} aria-busy={loading || undefined}>
        {loading ? <Spinner size="sm" decorative /> : <Gift className="h-4 w-4" />}
        {loading ? 'লিংক তৈরি হচ্ছে…' : 'উপহার পাঠানোর লিংক তৈরি করুন'}
      </Button>
    </div>
  );
}

function GetGiftForm({
  user,
  productId,
  variantId,
}: {
  user: LoggedInUser;
  productId: string;
  variantId?: string | null;
}) {
  const [step, setStep] = useState<'form' | 'address'>('form');
  const [payerName, setPayerName] = useState('');
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState({ name: user.name, phone: '', street: '', city: 'ঢাকা' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GiftResult | null>(null);

  const goToAddress = () => {
    if (!payerName.trim()) {
      setError('যার কাছে উপহার চাইবেন তার নাম দিন।');
      return;
    }
    setError('');
    setStep('address');
  };

  const handleCreate = async () => {
    if (!address.phone.trim() || !address.street.trim()) {
      setError('ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিন।');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/gift/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId,
          giftType: 'GET_GIFT',
          requesterName: user.name,
          requesterId: user.id,
          payerName,
          message,
          requesterAddress: address,
        }),
      });
      const data = await response.json();
      if (response.ok) setResult(data);
      else setError(data.error || 'গিফট লিংক তৈরি করা যায়নি।');
    } catch {
      setError('নেটওয়ার্কে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  if (result) return <GiftLinkResult result={result} />;

  return (
    <div className="space-y-4" lang="bn">
      <UserSummary user={user} action="আপনি উপহার চাইছেন" />
      {error ? <Alert tone="danger" announcement="assertive">{error}</Alert> : null}

      {step === 'form' ? (
        <>
          <Input
            id="get-gift-payer"
            label="যার কাছে উপহার চাইবেন"
            required
            value={payerName}
            onChange={(event) => setPayerName(event.target.value)}
            placeholder="বন্ধু বা পরিবারের সদস্যের নাম"
          />
          <Textarea
            id="get-gift-message"
            label="বার্তা"
            description="ঐচ্ছিক"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="কেন পণ্যটি চান তা লিখুন"
            rows={3}
          />
          <Button type="button" fullWidth size="lg" onClick={goToAddress}>
            পরের ধাপ
          </Button>
        </>
      ) : (
        <>
          <h4 className="flex items-center gap-2 text-sm font-bold text-minsah-text-primary">
            <MapPin className="h-4 w-4" /> আপনার ডেলিভারি ঠিকানা
          </h4>
          <Input
            id="get-gift-phone"
            type="tel"
            inputMode="tel"
            label="ফোন নম্বর"
            required
            value={address.phone}
            onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value }))}
            placeholder="01XXXXXXXXX"
          />
          <Input
            id="get-gift-street"
            label="বাড়ি ও রাস্তার ঠিকানা"
            required
            value={address.street}
            onChange={(event) => setAddress((current) => ({ ...current, street: event.target.value }))}
            placeholder="বাড়ি, রাস্তা ও এলাকার নাম"
          />
          <Select
            id="get-gift-city"
            label="জেলা"
            value={address.city}
            onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))}
          >
            {DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep('form')} disabled={loading}>
              পেছনে
            </Button>
            <Button type="button" onClick={handleCreate} disabled={loading} aria-busy={loading || undefined}>
              {loading ? <Spinner size="sm" decorative /> : <ShoppingBag className="h-4 w-4" />}
              {loading ? 'তৈরি হচ্ছে…' : 'লিংক তৈরি করুন'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface GiftButtonsProps {
  productId: string;
  productName: string;
  variantId?: string | null;
}

export function GiftButtons({ productId, productName, variantId }: GiftButtonsProps) {
  const { data: session } = useSession();
  const [modal, setModal] = useState<'send' | 'get' | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);

  const handleOpen = (type: 'send' | 'get') => {
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (session?.user && userId) {
      setLoggedInUser({
        id: userId,
        name: session.user.name || session.user.email || 'User',
      });
    } else {
      setLoggedInUser(null);
    }
    setModal(type);
  };

  const handleClose = () => setModal(null);
  const handleLoginSuccess = (userId: string, userName: string) => setLoggedInUser({ id: userId, name: userName });

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={() => handleOpen('send')}>
          <Gift className="h-4 w-4" /> উপহার পাঠান
        </Button>
        <Button type="button" onClick={() => handleOpen('get')}>
          <ShoppingBag className="h-4 w-4" /> উপহার চান
        </Button>
      </div>

      <Drawer
        open={modal !== null}
        onClose={handleClose}
        side="bottom"
        title={modal === 'send' ? 'উপহার পাঠান' : 'উপহার চান'}
        description={
          modal === 'send'
            ? `${productName} উপহার দিতে একটি নিরাপদ লিংক তৈরি করুন।`
            : `${productName} উপহার হিসেবে চাইতে একটি নিরাপদ লিংক তৈরি করুন।`
        }
        closeLabel="গিফট প্যানেল বন্ধ করুন"
        bodyClassName="mx-auto w-full max-w-md"
      >
        {!loggedInUser && modal ? (
          <SocialLoginModal
            purpose={modal === 'send' ? 'send_gift' : 'get_gift'}
            onSuccess={handleLoginSuccess}
            onClose={handleClose}
          />
        ) : loggedInUser && modal === 'send' ? (
          <SendGiftForm user={loggedInUser} productId={productId} variantId={variantId} />
        ) : loggedInUser && modal === 'get' ? (
          <GetGiftForm user={loggedInUser} productId={productId} variantId={variantId} />
        ) : null}
      </Drawer>
    </>
  );
}

interface ShareButtonProps {
  productName: string;
  productUrl: string;
}

export function ShareButton({ productName, productUrl }: ShareButtonProps) {
  const { pushToast } = useToast();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url: productUrl });
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          pushToast({ tone: 'danger', title: 'শেয়ার করা যায়নি' });
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      pushToast({ tone: 'success', title: 'পণ্যের লিংক কপি হয়েছে' });
    } catch {
      pushToast({ tone: 'danger', title: 'লিংক কপি করা যায়নি' });
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleShare}>
      <Share2 className="h-4 w-4" /> শেয়ার
    </Button>
  );
}

export function GiftRequestButton(props: GiftButtonsProps) {
  return <GiftButtons {...props} />;
}
