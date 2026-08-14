'use client';

import SocialMediaInboxChat, {
  type SocialMediaInboxChatProps,
  type SocialMessage,
} from '@/app/components/admin/SocialMediaInboxChat';

export type { SocialMessage };

export type SocialMediaInboxProps = Pick<
  SocialMediaInboxChatProps,
  'className' | 'initialPlatform' | 'title' | 'description'
>;

/**
 * Embedded admin inbox.
 *
 * The former duplicate inbox implementation now delegates to the shared,
 * accessible full inbox surface so sync, realtime messaging and feedback
 * behavior stay consistent in every admin entry point.
 */
export default function SocialMediaInbox({
  className,
  initialPlatform = 'all',
  title = 'Social media inbox',
  description = 'Read and reply to customer conversations from one place.',
}: SocialMediaInboxProps) {
  return (
    <div className={`minsah-panel min-h-[42rem] overflow-hidden ${className ?? ''}`}>
      <SocialMediaInboxChat
        className="min-h-[42rem]"
        initialPlatform={initialPlatform}
        title={title}
        description={description}
      />
    </div>
  );
}
