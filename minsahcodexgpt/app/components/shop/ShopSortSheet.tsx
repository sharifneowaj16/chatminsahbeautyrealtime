'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import type { SortOption } from '@/types/product';

type SortChoice = { id: SortOption | 'featured'; label: string };

type ShopSortSheetProps = {
  open: boolean;
  activeSort: string;
  totalCount: number;
  options: SortChoice[];
  onClose: () => void;
  onSelect: (sort: SortChoice['id']) => void;
};

export default function ShopSortSheet({ open, activeSort, totalCount, options, onClose, onSelect }: ShopSortSheetProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Choose sorting"
      description={`Apply to ${totalCount} products`}
      side="bottom"
      size="full"
      closeLabel="Close sort sheet"
      className="md:hidden"
      panelClassName="max-h-[80dvh]"
      footer={
        <Button type="button" variant="secondary" onClick={onClose} fullWidth>
          Cancel
        </Button>
      }
    >
      <div className="grid gap-2" role="listbox" aria-label="Sort products">
        {options.map((option) => {
          const selected = activeSort === option.id;
          return (
            <Button
              key={option.id}
              type="button"
              variant={selected ? 'primary' : 'secondary'}
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(option.id)}
              className="min-h-12 w-full justify-between rounded-2xl px-4 py-3 text-left text-sm"
            >
              <span>{option.label}</span>
              {selected && <Check size={17} aria-hidden="true" />}
            </Button>
          );
        })}
      </div>
    </Drawer>
  );
}
