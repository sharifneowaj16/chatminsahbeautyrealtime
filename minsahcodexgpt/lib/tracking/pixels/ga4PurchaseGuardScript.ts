export function createGa4PurchaseGuardScript(options?: { blockDataLayerPurchase?: boolean }) {
  const blockDataLayerPurchase = options?.blockDataLayerPurchase !== false;

  return `
    (function(w) {
      w.__MB_GA4_PURCHASE_SOURCE__ = 'server_measurement_protocol';
      w.__MB_GA4_PURCHASE_MP_ONLY__ = true;
      w.__MB_GTM_BLOCK_PURCHASE_EVENTS__ = ${blockDataLayerPurchase ? 'true' : 'false'};
      w.dataLayer = w.dataLayer || [];

      function isPurchaseEvent(item) {
        if (!item) return false;
        if (Array.isArray(item) || Object.prototype.toString.call(item) === '[object Arguments]') {
          return item[0] === 'event' && String(item[1] || '').toLowerCase() === 'purchase';
        }
        if (typeof item === 'object') {
          var eventName = String(item.event || item.event_name || '').toLowerCase();
          if (eventName === 'purchase' || eventName === 'ga4_purchase') return true;
          if (item.ecommerce && (item.ecommerce.transaction_id || item.ecommerce.purchase)) return true;
        }
        return false;
      }

      function blockedNotice(original) {
        return {
          event: 'mb_ga4_purchase_blocked',
          mb_reason: 'ga4_purchase_is_server_side_measurement_protocol_only',
          mb_original_event: original && typeof original === 'object' ? (original.event || original.event_name || 'purchase') : 'purchase'
        };
      }

      w.__MB_IS_BLOCKED_GA4_PURCHASE_EVENT__ = isPurchaseEvent;

      if (${blockDataLayerPurchase ? 'true' : 'false'} && !w.dataLayer.__mbPurchaseGuardInstalled) {
        var originalPush = w.dataLayer.push.bind(w.dataLayer);
        w.dataLayer.push = function() {
          var accepted = [];
          for (var i = 0; i < arguments.length; i++) {
            var item = arguments[i];
            if (isPurchaseEvent(item)) {
              originalPush(blockedNotice(item));
            } else {
              accepted.push(item);
            }
          }
          if (accepted.length) return originalPush.apply(w.dataLayer, accepted);
          return w.dataLayer.length;
        };
        w.dataLayer.__mbPurchaseGuardInstalled = true;
      }

      w.dataLayer.push({
        event: 'mb_tracking_policy',
        mb_ga4_purchase_source: 'server_measurement_protocol',
        mb_ga4_purchase_client_blocked: true
      });
    })(window);
  `;
}
