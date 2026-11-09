'use client';

import { useState } from 'react';
import {
  Copy,
  CheckCircle,
  Users,
  DollarSign,
  Clock,
  Mail,
  Facebook,
  Twitter,
  Link as LinkIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

// Icon map — string to component
const ICON_MAP: Record<string, React.ElementType> = {
  Copy,
  Mail,
  Facebook,
  Twitter,
  Users,
  Clock,
  DollarSign,
  Link: LinkIcon,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Copy;
  return <Icon className={className} />;
}

interface ShareOption {
  name: string;
  icon: string; // ✅ string, not component
  action: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface ReferralsClientProps {
  referralData: any;
  referrals: any[];
  shareOptions: ShareOption[];
  emailTemplates: EmailTemplate[];
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  made_purchase: 'bg-blue-100 text-blue-800',
  signed_up: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-600',
};

export function ReferralsClient({ referralData, referrals, shareOptions, emailTemplates }: ReferralsClientProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(emailTemplates[0]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralData.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (action: string) => {
    if (action === 'copy') handleCopyLink();
    else if (action === 'email') setShowEmailModal(true);
    else if (action === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralData.referralLink)}`, '_blank');
    } else if (action === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me at Minsah Beauty! Use code ${referralData.referralCode}`)}&url=${encodeURIComponent(referralData.referralLink)}`, '_blank');
    }
  };

  const formatPoints = (points: number) => points.toLocaleString();

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
              <Users className="w-3 h-3 text-[#828fff]" />
              Referral Program
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f8f8]">
            Invite Friends &amp; Earn Rewards
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Share your unique invite code with friends to unlock exclusive VIP Beauty Glow Points
          </p>
        </div>
      </div>

      {/* ── Stats Cards Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141516] text-[#828fff] border border-[#23252a]">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[#8a8f98] uppercase tracking-wider">Total Invites</p>
              <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] font-mono leading-tight mt-0.5">{referralData.totalReferrals}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141516] text-[#27a644] border border-[#23252a]">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[#8a8f98] uppercase tracking-wider">Successful</p>
              <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] font-mono leading-tight mt-0.5">{referralData.successfulReferrals}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141516] text-amber-400 border border-[#23252a]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[#8a8f98] uppercase tracking-wider">Points Earned</p>
              <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] font-mono leading-tight mt-0.5">{formatPoints(referralData.totalEarned)}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141516] text-sky-400 border border-[#23252a]">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[#8a8f98] uppercase tracking-wider">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] font-mono leading-tight mt-0.5">{referralData.pendingReferrals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share Code Section ──────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 sm:p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-[#f7f8f8]">Share Your Referral Code</h2>
          <p className="text-xs text-[#8a8f98] mt-0.5">Your friends get instant bonus discounts on their first luxury purchase</p>
        </div>

        {/* Linear Code Banner */}
        <div className="relative overflow-hidden rounded-xl bg-[#141516] border border-[#23252a] p-4 sm:p-5">
          <div className="absolute top-0 right-0 h-28 w-28 bg-[#5e6ad2]/10 blur-2xl pointer-events-none" />
          <p className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-semibold">Your Referral Code</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#f7f8f8] font-mono tracking-wider">
              {referralData.referralCode}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-[#D4F6A2]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#18191a] hover:bg-[#202225] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#23252a] text-xs font-medium transition-all active:scale-95 cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#62666d] mt-2.5 font-mono break-all">{referralData.referralLink}</p>
        </div>

        {/* Share Channels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => handleShare(option.action)}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[#141516] border border-[#23252a] hover:border-[#5e6ad2]/50 hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] transition-all cursor-pointer group active:scale-95"
            >
              <DynamicIcon name={option.icon} className="w-5 h-5 mb-1.5 text-[#828fff] group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Your Referrals History ──────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#23252a] flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[#f7f8f8]">Referred Members</h2>
            <p className="text-xs text-[#8a8f98] mt-0.5">Friends who signed up and placed orders using your invitation</p>
          </div>
          <span className="text-xs font-mono text-[#8a8f98]">
            {referrals.length} {referrals.length === 1 ? 'Friend' : 'Friends'}
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-[#62666d] mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-[#f7f8f8]">No referrals recorded yet</p>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-sm mx-auto">
              Share your code or invitation link with your friends to start earning VIP Glow Points on every beauty order they make.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#23252a]/70">
            {referrals.map((referral) => {
              const statusBadgeStyle =
                referral.status === 'completed' || referral.status === 'made_purchase'
                  ? 'bg-[#27a644]/15 text-[#27a644] border-[#27a644]/30'
                  : referral.status === 'signed_up'
                  ? 'bg-[#5e6ad2]/15 text-[#828fff] border-[#5e6ad2]/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
              return (
                <div key={referral.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#141516]/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#f7f8f8] truncate">{referral.referredName}</p>
                    <p className="text-xs text-[#8a8f98] font-mono truncate">{referral.referredEmail}</p>
                    <p className="text-[11px] text-[#62666d] mt-1">
                      Joined {new Date(referral.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${statusBadgeStyle}`}>
                      {referral.status.replace('_', ' ')}
                    </span>
                    {referral.rewardPoints > 0 && (
                      <p className="text-xs font-bold text-[#828fff] font-mono mt-1">
                        +{formatPoints(referral.rewardPoints)} pts
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Modal */}
      <Modal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Send Referral Email"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              className="h-9 px-4 rounded-xl bg-[#141516] hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#23252a] text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              className="h-9 px-4 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-sm transition-all"
            >
              Send Email
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Template Selector */}
          <div className="flex flex-wrap gap-2">
            {emailTemplates.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tmpl)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedTemplate.id === tmpl.id
                    ? 'bg-[#5e6ad2] text-white shadow-sm'
                    : 'bg-[#141516] text-[#8a8f98] border border-[#23252a] hover:text-[#f7f8f8]'
                }`}
              >
                {tmpl.name}
              </button>
            ))}
          </div>

          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="friend@example.com"
            className="w-full h-11 px-3.5 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
          />

          <div className="bg-[#141516] border border-[#23252a] rounded-xl p-4 text-xs text-[#c9cdd4] whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
            {selectedTemplate.body
              .replace('{referralCode}', referralData.referralCode)
              .replace('{referralLink}', referralData.referralLink)}
          </div>
        </div>
      </Modal>
    </div>
  );
}