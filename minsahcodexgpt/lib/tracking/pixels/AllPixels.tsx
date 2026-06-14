'use client';

import dynamic from 'next/dynamic';

const FacebookPixel = dynamic(() => import('./FacebookPixel'), { ssr: false });
const GoogleAnalytics = dynamic(() => import('./GoogleAnalytics'), { ssr: false });
const GoogleTagManager = dynamic(() => import('./GoogleTagManager'), { ssr: false });
const TikTokPixel = dynamic(() => import('./TikTokPixel'), { ssr: false });
const SnapchatPixel = dynamic(() => import('./SnapchatPixel'), { ssr: false });
const PinterestPixel = dynamic(() => import('./PinterestPixel'), { ssr: false });
const TwitterPixel = dynamic(() => import('./TwitterPixel'), { ssr: false });
const LinkedInPixel = dynamic(() => import('./LinkedInPixel'), { ssr: false });
const RedditPixel = dynamic(() => import('./RedditPixel'), { ssr: false });
const MicrosoftPixel = dynamic(() => import('./MicrosoftPixel'), { ssr: false });
const HotjarPixel = dynamic(() => import('./HotjarPixel'), { ssr: false });
const ClarityPixel = dynamic(() => import('./ClarityPixel'), { ssr: false });
const MixpanelPixel = dynamic(() => import('./MixpanelPixel'), { ssr: false });

export default function AllPixels() {
  const facebookPixelId =
    process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';
  const facebookPixelEnabled =
    process.env.NEXT_PUBLIC_FB_PIXEL_ENABLED === 'true' ||
    (!!process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID &&
      process.env.NEXT_PUBLIC_FB_PIXEL_ENABLED !== 'false');

  // Read from environment variables
  const config = {
    facebook: {
      enabled: facebookPixelEnabled,
      pixelId: facebookPixelId,
    },
    google: {
      enabled: process.env.NEXT_PUBLIC_GA_ENABLED === 'true',
      measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
      tagManagerId: process.env.NEXT_PUBLIC_GTM_ID || '',
    },
    tiktok: {
      enabled: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true',
      pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
    },
    snapchat: {
      enabled: process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ENABLED === 'true',
      pixelId: process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID || '',
    },
    pinterest: {
      enabled: process.env.NEXT_PUBLIC_PINTEREST_TAG_ENABLED === 'true',
      tagId: process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || '',
    },
    twitter: {
      enabled: process.env.NEXT_PUBLIC_TWITTER_PIXEL_ENABLED === 'true',
      pixelId: process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID || '',
    },
    linkedin: {
      enabled: process.env.NEXT_PUBLIC_LINKEDIN_INSIGHT_ENABLED === 'true',
      partnerId: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || '',
    },
    reddit: {
      enabled: process.env.NEXT_PUBLIC_REDDIT_PIXEL_ENABLED === 'true',
      pixelId: process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID || '',
    },
    microsoft: {
      enabled: process.env.NEXT_PUBLIC_MS_UET_ENABLED === 'true',
      uetTagId: process.env.NEXT_PUBLIC_MS_UET_TAG_ID || '',
    },
    hotjar: {
      enabled: process.env.NEXT_PUBLIC_HOTJAR_ENABLED === 'true',
      siteId: process.env.NEXT_PUBLIC_HOTJAR_SITE_ID || '',
    },
    clarity: {
      enabled: process.env.NEXT_PUBLIC_CLARITY_ENABLED === 'true',
      projectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || '',
    },
    mixpanel: {
      enabled: process.env.NEXT_PUBLIC_MIXPANEL_ENABLED === 'true',
      token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '',
    },
  };

  return (
    <>
      {/* Facebook Pixel */}
      {config.facebook.enabled && config.facebook.pixelId && (
        <FacebookPixel pixelId={config.facebook.pixelId} enabled />
      )}

      {/* Google Analytics 4 */}
      {config.google.enabled && config.google.measurementId && (
        <GoogleAnalytics measurementId={config.google.measurementId} enabled />
      )}

      {/* Google Tag Manager */}
      {config.google.enabled && config.google.tagManagerId && (
        <GoogleTagManager tagManagerId={config.google.tagManagerId} enabled />
      )}

      {/* TikTok Pixel */}
      {config.tiktok.enabled && config.tiktok.pixelId && (
        <TikTokPixel pixelId={config.tiktok.pixelId} enabled />
      )}

      {/* Snapchat Pixel */}
      {config.snapchat.enabled && config.snapchat.pixelId && (
        <SnapchatPixel pixelId={config.snapchat.pixelId} enabled />
      )}

      {/* Pinterest Tag */}
      {config.pinterest.enabled && config.pinterest.tagId && (
        <PinterestPixel tagId={config.pinterest.tagId} enabled />
      )}

      {/* Twitter/X Pixel */}
      {config.twitter.enabled && config.twitter.pixelId && (
        <TwitterPixel pixelId={config.twitter.pixelId} enabled />
      )}

      {/* LinkedIn Insight Tag */}
      {config.linkedin.enabled && config.linkedin.partnerId && (
        <LinkedInPixel partnerId={config.linkedin.partnerId} enabled />
      )}

      {/* Reddit Pixel */}
      {config.reddit.enabled && config.reddit.pixelId && (
        <RedditPixel pixelId={config.reddit.pixelId} enabled />
      )}

      {/* Microsoft/Bing UET */}
      {config.microsoft.enabled && config.microsoft.uetTagId && (
        <MicrosoftPixel uetTagId={config.microsoft.uetTagId} enabled />
      )}

      {/* Hotjar - Heatmaps & Session Recording */}
      {config.hotjar.enabled && config.hotjar.siteId && (
        <HotjarPixel siteId={config.hotjar.siteId} enabled />
      )}

      {/* Microsoft Clarity - Heatmaps & Session Recording */}
      {config.clarity.enabled && config.clarity.projectId && (
        <ClarityPixel projectId={config.clarity.projectId} enabled />
      )}

      {/* Mixpanel - Product Analytics */}
      {config.mixpanel.enabled && config.mixpanel.token && (
        <MixpanelPixel token={config.mixpanel.token} enabled />
      )}
    </>
  );
}
