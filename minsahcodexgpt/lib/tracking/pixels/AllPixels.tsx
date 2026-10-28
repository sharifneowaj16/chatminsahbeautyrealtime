'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { canRunClientTracking, getClientTrackingBlockReason } from '@/lib/tracking/client-traffic-filter';
import { TRACKING_CONSENT_EVENT } from '@/lib/tracking/tracking-consent';
import { TrackingConsentBanner, TrackingConsentModeScript } from './TrackingConsentManager';

const AttributionCookieCapture = dynamic(() => import('./AttributionCookieCapture'), { ssr: false });
const MetaPixelProvider = dynamic(() => import('@/components/tracking/MetaPixelProvider'), { ssr: false });
const MetaEventBridge = dynamic(
  () => import('@/components/tracking/MetaEventBridge').then((module) => module.MetaEventBridge),
  { ssr: false },
);
const GoogleAnalytics = dynamic(() => import('./GoogleAnalytics'), { ssr: false });
const GoogleTagManager = dynamic(() => import('./GoogleTagManager'), { ssr: false });
const TikTokPixel = dynamic(() => import('./TikTokPixel'), { ssr: false });
const TikTokRouteTracker = dynamic(() => import('./TikTokRouteTracker'), { ssr: false });
const SnapchatPixel = dynamic(() => import('./SnapchatPixel'), { ssr: false });
const PinterestPixel = dynamic(() => import('./PinterestPixel'), { ssr: false });
const TwitterPixel = dynamic(() => import('./TwitterPixel'), { ssr: false });
const LinkedInPixel = dynamic(() => import('./LinkedInPixel'), { ssr: false });
const RedditPixel = dynamic(() => import('./RedditPixel'), { ssr: false });
const MicrosoftPixel = dynamic(() => import('./MicrosoftPixel'), { ssr: false });
const HotjarPixel = dynamic(() => import('./HotjarPixel'), { ssr: false });
const ClarityPixel = dynamic(() => import('./ClarityPixel'), { ssr: false });
const MixpanelPixel = dynamic(() => import('./MixpanelPixel'), { ssr: false });

type IdleTrackingWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function useIdleTrackingReady(enabled: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    const idleWindow = window as IdleTrackingWindow;
    if (typeof idleWindow.requestIdleCallback === 'function') {
      const handle = idleWindow.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => {
        if (typeof idleWindow.cancelIdleCallback === 'function') {
          idleWindow.cancelIdleCallback(handle);
        }
      };
    }
    const timer = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return ready;
}

export default function AllPixels() {
  const [trackingAllowed, setTrackingAllowed] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>('CLIENT_NOT_READY');

  useEffect(() => {
    const updateTrackingPermission = () => {
      const reason = getClientTrackingBlockReason();
      const allowed = !reason && canRunClientTracking();
      setBlockReason(reason);
      setTrackingAllowed(allowed);
    };
    updateTrackingPermission();
    window.addEventListener(TRACKING_CONSENT_EVENT, updateTrackingPermission);
    window.addEventListener('focus', updateTrackingPermission);
    window.addEventListener('pageshow', updateTrackingPermission);
    return () => {
      window.removeEventListener(TRACKING_CONSENT_EVENT, updateTrackingPermission);
      window.removeEventListener('focus', updateTrackingPermission);
      window.removeEventListener('pageshow', updateTrackingPermission);
    };
  }, []);

  const facebookPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
  const facebookPixelEnabled = process.env.NEXT_PUBLIC_FB_PIXEL_ENABLED === 'true' || (!!facebookPixelId && process.env.NEXT_PUBLIC_FB_PIXEL_ENABLED !== 'false');
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '';
  const tiktokPixelEnabled = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true' && !!tiktokPixelId;

  const config = {
    facebook: { enabled: facebookPixelEnabled, pixelId: facebookPixelId },
    google: {
      enabled: process.env.NEXT_PUBLIC_GA_ENABLED === 'true' || !!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
      tagManagerId: process.env.NEXT_PUBLIC_GTM_ID || '',
    },
    tiktok: { enabled: tiktokPixelEnabled, pixelId: tiktokPixelId },
    snapchat: { enabled: process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ENABLED === 'true', pixelId: process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID || '' },
    pinterest: { enabled: process.env.NEXT_PUBLIC_PINTEREST_TAG_ENABLED === 'true', tagId: process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || '' },
    twitter: { enabled: process.env.NEXT_PUBLIC_TWITTER_PIXEL_ENABLED === 'true', pixelId: process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID || '' },
    linkedin: { enabled: process.env.NEXT_PUBLIC_LINKEDIN_INSIGHT_ENABLED === 'true', partnerId: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || '' },
    reddit: { enabled: process.env.NEXT_PUBLIC_REDDIT_PIXEL_ENABLED === 'true', pixelId: process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID || '' },
    microsoft: { enabled: process.env.NEXT_PUBLIC_MS_UET_ENABLED === 'true', uetTagId: process.env.NEXT_PUBLIC_MS_UET_TAG_ID || '' },
    hotjar: { enabled: process.env.NEXT_PUBLIC_HOTJAR_ENABLED === 'true', siteId: process.env.NEXT_PUBLIC_HOTJAR_SITE_ID || '' },
    clarity: { enabled: process.env.NEXT_PUBLIC_CLARITY_ENABLED === 'true', projectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || '' },
    mixpanel: { enabled: process.env.NEXT_PUBLIC_MIXPANEL_ENABLED === 'true', token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '' },
  };
  const gtmEnabled = process.env.NEXT_PUBLIC_GTM_ENABLED === 'true' && !!config.google.tagManagerId;
  const deferredExperienceTrackingReady = useIdleTrackingReady(trackingAllowed && (config.hotjar.enabled || config.clarity.enabled));

  return (
    <>
      <TrackingConsentModeScript />
      <TrackingConsentBanner />
      {trackingAllowed ? (
        <>
          <AttributionCookieCapture />
          <MetaEventBridge />
          {config.facebook.enabled && config.facebook.pixelId && <MetaPixelProvider pixelId={config.facebook.pixelId} enabled />}
          {config.google.enabled && config.google.measurementId && <GoogleAnalytics measurementId={config.google.measurementId} enabled />}
          {gtmEnabled && <GoogleTagManager tagManagerId={config.google.tagManagerId} enabled />}
          {config.tiktok.enabled && config.tiktok.pixelId && <><TikTokPixel pixelId={config.tiktok.pixelId} enabled /><TikTokRouteTracker /></>}
          {config.snapchat.enabled && config.snapchat.pixelId && <SnapchatPixel pixelId={config.snapchat.pixelId} enabled />}
          {config.pinterest.enabled && config.pinterest.tagId && <PinterestPixel tagId={config.pinterest.tagId} enabled />}
          {config.twitter.enabled && config.twitter.pixelId && <TwitterPixel pixelId={config.twitter.pixelId} enabled />}
          {config.linkedin.enabled && config.linkedin.partnerId && <LinkedInPixel partnerId={config.linkedin.partnerId} enabled />}
          {config.reddit.enabled && config.reddit.pixelId && <RedditPixel pixelId={config.reddit.pixelId} enabled />}
          {config.microsoft.enabled && config.microsoft.uetTagId && <MicrosoftPixel uetTagId={config.microsoft.uetTagId} enabled />}
          {deferredExperienceTrackingReady && config.hotjar.enabled && config.hotjar.siteId && <HotjarPixel siteId={config.hotjar.siteId} enabled />}
          {deferredExperienceTrackingReady && config.clarity.enabled && config.clarity.projectId && <ClarityPixel projectId={config.clarity.projectId} enabled />}
          {config.mixpanel.enabled && config.mixpanel.token && <MixpanelPixel token={config.mixpanel.token} enabled />}
        </>
      ) : process.env.NODE_ENV !== 'production' && blockReason ? (
        <span data-mb-tracking-blocked={blockReason} hidden />
      ) : null}
    </>
  );
}
