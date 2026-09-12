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

const DISTRICTS = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh'];

function GiftLinkResult({ result }: { result: GiftResult }) {
  const { pushToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.giftUrl);
      pushToast({ tone: 'success', title: 'Link copied' });
    } catch {
      pushToast({ tone: 'danger', title: 'Failed to copy link' });
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
        pushToast({ tone: 'danger', title: 'Failed to share' });
      }
    }
  };

  return (
    <div className="space-y-4" lang="en">
      <Alert tone="success" announcement="polite" title="Gift Link Created">
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
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
          <Check className="h-4 w-4" /> Copy Link
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
      setError('Please enter the recipient name.');
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
      else setError(data.error || 'Failed to create gift link.');
    } catch {
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) return <GiftLinkResult result={result} />;

  return (
    <div className="space-y-4" lang="en">
      <UserSummary user={user} action="You are sending a gift" />
      {error ? <Alert tone="danger" announcement="assertive">{error}</Alert> : null}
      <Input
        id="send-gift-recipient"
        label="Recipient Name"
        required
        value={recipientName}
        onChange={(event) => setRecipientName(event.target.value)}
        placeholder="Friend's name"
      />
      <Textarea
        id="send-gift-message"
        label="Greeting Message"
        description="Optional"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Write your greeting"
        rows={3}
      />
      <Button type="button" fullWidth size="lg" onClick={handleCreate} disabled={loading} aria-busy={loading || undefined}>
        {loading ? <Spinner size="sm" decorative /> : <Gift className="h-4 w-4" />}
        {loading ? 'Creating link…' : 'Create Gift Link'}
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
  const [address, setAddress] = useState({ name: user.name, phone: '', street: '', city: 'Dhaka' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GiftResult | null>(null);

  const goToAddress = () => {
    if (!payerName.trim()) {
      setError('Please enter the name of the person you are requesting a gift from.');
      return;
    }
    setError('');
    setStep('address');
  };

  const handleCreate = async () => {
    if (!address.phone.trim() || !address.street.trim()) {
      setError('Please enter your phone number and complete delivery address.');
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
      else setError(data.error || 'Failed to create gift link.');
    } catch {
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) return <GiftLinkResult result={result} />;

  return (
    <div className="space-y-4" lang="en">
      <UserSummary user={user} action="You are requesting a gift" />
      {error ? <Alert tone="danger" announcement="assertive">{error}</Alert> : null}

      {step === 'form' ? (
        <>
          <Input
            id="get-gift-payer"
            label="Request Gift From"
            required
            value={payerName}
            onChange={(event) => setPayerName(event.target.value)}
            placeholder="Friend or family member's name"
          />
          <Textarea
            id="get-gift-message"
            label="Message"
            description="Optional"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Why you would like this product"
            rows={3}
          />
          <Button type="button" fullWidth size="lg" onClick={goToAddress}>
            Next Step
          </Button>
        </>
      ) : (
        <>
          <h4 className="flex items-center gap-2 text-sm font-bold text-minsah-text-primary">
            <MapPin className="h-4 w-4" /> Your Delivery Address
          </h4>
          <Input
            id="get-gift-phone"
            type="tel"
            inputMode="tel"
            label="Phone Number"
            required
            value={address.phone}
            onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value }))}
            placeholder="01XXXXXXXXX"
          />
          <Input
            id="get-gift-street"
            label="House & Street Address"
            required
            value={address.street}
            onChange={(event) => setAddress((current) => ({ ...current, street: event.target.value }))}
            placeholder="House, street, and area name"
          />
          <Select
            id="get-gift-city"
            label="District"
            value={address.city}
            onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))}
          >
            {DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep('form')} disabled={loading}>
              Back
            </Button>
            <Button type="button" onClick={handleCreate} disabled={loading} aria-busy={loading || undefined}>
              {loading ? <Spinner size="sm" decorative /> : <ShoppingBag className="h-4 w-4" />}
              {loading ? 'Creating…' : 'Create Link'}
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
          <Gift className="h-4 w-4" /> Send Gift
        </Button>
        <Button type="button" onClick={() => handleOpen('get')}>
          <ShoppingBag className="h-4 w-4" /> Ask for Gift
        </Button>
      </div>

      <Drawer
        open={modal !== null}
        onClose={handleClose}
        side="bottom"
        title={modal === 'send' ? 'Send a Gift' : 'Ask for a Gift'}
        description={
          modal === 'send'
            ? `Create a secure link to gift ${productName}.`
            : `Create a secure link to request ${productName} as a gift.`
        }
        closeLabel="Close gift panel"
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
          pushToast({ tone: 'danger', title: 'Failed to share' });
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      pushToast({ tone: 'success', title: 'Product link copied' });
    } catch {
      pushToast({ tone: 'danger', title: 'Failed to copy link' });
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleShare}>
      <Share2 className="h-4 w-4" /> Share
    </Button>
  );
}

export function GiftRequestButton(props: GiftButtonsProps) {
  return <GiftButtons {...props} />;
}
