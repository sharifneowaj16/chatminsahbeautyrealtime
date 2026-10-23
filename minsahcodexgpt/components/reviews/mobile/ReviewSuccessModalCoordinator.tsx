'use client';

import { useState } from 'react';
import { ReviewSuccessFloatingToast } from './ReviewSuccessFloatingToast';
import { ReviewRewardSheetModal } from './ReviewRewardSheetModal';
import { ReviewCelebrationData } from './types';

interface ReviewSuccessModalCoordinatorProps {
  initialOpen?: boolean;
  data?: ReviewCelebrationData;
}

export function ReviewSuccessModalCoordinator({
  initialOpen = true,
  data,
}: ReviewSuccessModalCoordinatorProps) {
  const [showToast, setShowToast] = useState(initialOpen);
  const [showSheet, setShowSheet] = useState(initialOpen);

  return (
    <>
      {showToast && (
        <ReviewSuccessFloatingToast
          orderNumber={data?.orderNumber}
          onDismiss={() => setShowToast(false)}
        />
      )}

      <ReviewRewardSheetModal
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        data={data}
      />
    </>
  );
}
