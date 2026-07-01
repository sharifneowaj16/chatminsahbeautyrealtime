'use client';

import Script from 'next/script';

interface ClarityPixelProps {
  projectId: string;
  enabled?: boolean;
  maskSensitiveFields?: boolean;
}

export default function ClarityPixel({
  projectId,
  enabled = true,
  maskSensitiveFields = true,
}: ClarityPixelProps) {
  if (!enabled || !projectId) return null;

  return (
    <>
      <Script
        id="microsoft-clarity"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${projectId}");
          `,
        }}
      />
      {maskSensitiveFields ? (
        <Script
          id="microsoft-clarity-sensitive-field-masker"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var selectors = [
                  'input[type="password"]',
                  'input[type="email"]',
                  'input[type="tel"]',
                  'input[type="number"]',
                  'input[name*="phone" i]',
                  'input[name*="mobile" i]',
                  'input[name*="email" i]',
                  'input[name*="address" i]',
                  'input[name*="city" i]',
                  'input[name*="zip" i]',
                  'input[name*="postal" i]',
                  'input[name*="otp" i]',
                  'textarea[name*="address" i]',
                  '[autocomplete="email"]',
                  '[autocomplete="tel"]',
                  '[autocomplete="street-address"]',
                  '[data-sensitive="true"]',
                  '[data-clarity-mask="true"]'
                ];
                function markSensitiveFields(){
                  try {
                    document.querySelectorAll(selectors.join(',')).forEach(function(el){
                      el.setAttribute('data-clarity-mask', 'true');
                      el.classList.add('clarity-mask');
                    });
                    document.querySelectorAll('form[action*="checkout"], [data-checkout-form="true"]').forEach(function(el){
                      el.setAttribute('data-clarity-mask', 'true');
                    });
                  } catch (_) {}
                }
                markSensitiveFields();
                if ('MutationObserver' in window) {
                  new MutationObserver(markSensitiveFields).observe(document.documentElement, {
                    childList: true,
                    subtree: true
                  });
                }
              })();
            `,
          }}
        />
      ) : null}
    </>
  );
}
