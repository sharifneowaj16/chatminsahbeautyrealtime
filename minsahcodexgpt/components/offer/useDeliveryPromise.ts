'use client';

import { useEffect, useState } from 'react';
import {
  resolveDeliveryPromise,
  type DeliveryPromiseConfig,
  type DeliveryPromiseSnapshot,
} from '@/lib/commerce/delivery-promise';

export interface UseDeliveryPromiseOptions {
  config?: Partial<DeliveryPromiseConfig>;
  area?: string | null;
}

export function useDeliveryPromise(options: UseDeliveryPromiseOptions = {}): DeliveryPromiseSnapshot {
  const { config, area } = options;

  // Resolve initial state
  const [promise, setPromise] = useState<DeliveryPromiseSnapshot>(() => {
    return resolveDeliveryPromise({ config, area });
  });

  useEffect(() => {
    const update = () => {
      setPromise(resolveDeliveryPromise({ config, area, now: new Date() }));
    };

    update();
    const interval = setInterval(update, 60_000); // Re-check cutoff every 60s
    return () => clearInterval(interval);
  }, [config, area]);

  return promise;
}

export default useDeliveryPromise;
