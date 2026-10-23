export type ConciergeTopicKey = 'unlock' | 'delivery' | 'routine' | 'authenticity';

export interface ConciergeTopic {
  key: ConciergeTopicKey;
  label: string;
  iconName: string;
  incomingMessage: string;
  suggestedDraft: string;
}

export interface WhatsAppConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  userPhone?: string;
  userName?: string;
  initialTopic?: ConciergeTopicKey;
}
