'use client';

import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface RecentlyViewedClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
}

export function RecentlyViewedClearHistoryModal({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
}: RecentlyViewedClearHistoryModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Clear Browsing History?"
      description="Private Locally Tracked History"
      footer={
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] font-bold text-[#181C1A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#ba1a1a] font-bold text-white shadow-sm hover:bg-[#93000a]"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        </div>
      }
    >
      <p className="text-[#5A615D]">
        This will permanently remove all <strong className="text-[#181C1A]">{itemCount}</strong>{' '}
        tracked products from your recently viewed list.
      </p>
    </Modal>
  );
}
