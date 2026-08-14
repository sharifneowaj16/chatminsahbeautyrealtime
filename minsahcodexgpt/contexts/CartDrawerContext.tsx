'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { CartItem } from './CartContext';

export type LastAddedCartItem = CartItem & {
  addedQuantity: number;
  addedAt: number;
};

interface CartDrawerContextValue {
  isOpen: boolean;
  lastAddedItem: LastAddedCartItem | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  registerAddIntent: () => number;
  openForSuccessfulAdd: (intentId: number, item: CartItem, addedQuantity?: number) => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | undefined>(undefined);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lastPathnameRef = useRef(pathname);
  const nextIntentIdRef = useRef(0);
  const latestDisplayedSuccessRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<LastAddedCartItem | null>(null);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const registerAddIntent = useCallback(() => {
    nextIntentIdRef.current += 1;
    return nextIntentIdRef.current;
  }, []);

  const openForSuccessfulAdd = useCallback(
    (intentId: number, item: CartItem, addedQuantity = item.quantity) => {
      if (intentId < latestDisplayedSuccessRef.current) return;

      latestDisplayedSuccessRef.current = intentId;
      setLastAddedItem({
        ...item,
        addedQuantity,
        addedAt: Date.now(),
      });
      setIsOpen(true);
    },
    []
  );

  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      closeDrawer();
      lastPathnameRef.current = pathname;
    }
  }, [closeDrawer, pathname]);

  const contextValue = useMemo<CartDrawerContextValue>(
    () => ({
      isOpen,
      lastAddedItem,
      openDrawer,
      closeDrawer,
      registerAddIntent,
      openForSuccessfulAdd,
    }),
    [closeDrawer, isOpen, lastAddedItem, openDrawer, openForSuccessfulAdd, registerAddIntent],
  );

  return (
    <CartDrawerContext.Provider value={contextValue}>
      {children}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  if (!context) {
    throw new Error('useCartDrawer must be used inside CartDrawerProvider');
  }
  return context;
}
