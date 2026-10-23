'use client';

import { useState, useEffect } from 'react';
import { WhatsAppConciergeModal } from './WhatsAppConciergeModal';
import { ConciergeTopicKey } from './types';

export function ConciergeModalCoordinator() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTopic, setInitialTopic] = useState<ConciergeTopicKey>('unlock');
  const [caseId, setCaseId] = useState('DH-9482');

  useEffect(() => {
    const handleOpen = (e: CustomEvent<{ topic?: ConciergeTopicKey; caseId?: string }>) => {
      if (e.detail?.topic) setInitialTopic(e.detail.topic);
      if (e.detail?.caseId) setCaseId(e.detail.caseId);
      setIsOpen(true);
    };

    window.addEventListener('minsah:open-concierge' as any, handleOpen);
    return () => {
      window.removeEventListener('minsah:open-concierge' as any, handleOpen);
    };
  }, []);

  return (
    <WhatsAppConciergeModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      initialTopic={initialTopic}
      caseId={caseId}
    />
  );
}
