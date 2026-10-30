'use client';

import { useState, useEffect } from 'react';
import { WhatsAppConciergeModal } from './WhatsAppConciergeModal';
import { ConciergeTopicKey } from './types';

export function ConciergeModalCoordinator() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTopic, setInitialTopic] = useState<ConciergeTopicKey>('unlock');
  const [caseId, setCaseId] = useState('DH-9482');

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const custom = e as CustomEvent<{ topic?: ConciergeTopicKey; caseId?: string }>;
      if (custom.detail?.topic) setInitialTopic(custom.detail.topic);
      if (custom.detail?.caseId) setCaseId(custom.detail.caseId);
      setIsOpen(true);
    };

    const events = [
      'minsah:open-concierge',
      'minsah:open-concierge-modal',
      'minsah:open-concierge-mobile',
    ];
    events.forEach((evt) => window.addEventListener(evt, handleOpen));
    return () => events.forEach((evt) => window.removeEventListener(evt, handleOpen));
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
