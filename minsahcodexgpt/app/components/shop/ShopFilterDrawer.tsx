'use client';

import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';

type ShopFilterDrawerProps = {
  open: boolean;
  totalCount: number;
  children: ReactNode;
  onClose: () => void;
  onClear: () => void;
  applyPending?: boolean;
};

export default function ShopFilterDrawer({
  open,
  totalCount,
  children,
  onClose,
  onClear,
  applyPending = false,
}: ShopFilterDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filter Products"
      description={`Narrow down ${totalCount} products`}
      side="bottom"
      size="full"
      closeLabel="Close filter drawer"
      className="md:hidden"
      panelClassName="max-h-[90dvh]"
      footer={
        <div className="grid w-full grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={onClear}>
            <RotateCcw size={15} aria-hidden="true" />
            Clear
          </Button>
          <Button type="button" variant="primary" onClick={onClose} disabled={applyPending} aria-live="polite">
            {applyPending ? 'Updating results…' : `Show ${totalCount} Products`}
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
}
