'use client';

import { useState, useEffect } from 'react';
import { OutOfStockDeleteModal } from './OutOfStockDeleteModal';
import { BackInStockAlertModal } from './BackInStockAlertModal';
import { StockProductSummary, AlternativeProduct } from './types';

export function StockAlertCoordinator() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<StockProductSummary | undefined>();
  const [activeAlternative, setActiveAlternative] = useState<AlternativeProduct | undefined>();

  useEffect(() => {
    const handleOpenDelete = (e: CustomEvent<{ product?: StockProductSummary; alternative?: AlternativeProduct }>) => {
      setActiveProduct(e.detail?.product);
      setActiveAlternative(e.detail?.alternative);
      setIsDeleteModalOpen(true);
    };

    const handleOpenAlert = (e: CustomEvent<{ product?: StockProductSummary }>) => {
      setActiveProduct(e.detail?.product);
      setIsAlertModalOpen(true);
    };

    window.addEventListener('minsah:open-oos-modal' as any, handleOpenDelete);
    window.addEventListener('minsah:open-stock-alert' as any, handleOpenAlert);

    return () => {
      window.removeEventListener('minsah:open-oos-modal' as any, handleOpenDelete);
      window.removeEventListener('minsah:open-stock-alert' as any, handleOpenAlert);
    };
  }, []);

  return (
    <>
      <OutOfStockDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        product={activeProduct}
        alternative={activeAlternative}
      />
      <BackInStockAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        product={activeProduct}
      />
    </>
  );
}
