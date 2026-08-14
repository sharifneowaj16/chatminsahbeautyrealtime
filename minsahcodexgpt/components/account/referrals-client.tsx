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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

// ✅ Icon map — string থেকে component
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Referral Program</h1>
        <p className="text-gray-600">Share the love and earn rewards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <Users className="w-7 h-7 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Total Referrals</p>
              <p className="text-2xl font-bold">{referralData.totalReferrals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Successful</p>
              <p className="text-2xl font-bold">{referralData.successfulReferrals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-7 h-7 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Points Earned</p>
              <p className="text-2xl font-bold">{formatPoints(referralData.totalEarned)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <Clock className="w-7 h-7 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-2xl font-bold">{referralData.pendingReferrals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Share Your Referral Code</h2>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-600 mb-2">Your referral code</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-purple-600">{referralData.referralCode}</p>
            <Button
              type="button"
              variant="primary"
              onClick={handleCopyCode}
              className="bg-purple-600 text-sm hover:bg-purple-700"
            >
              {copied ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3 break-all">{referralData.referralLink}</p>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shareOptions.map((option) => (
            <Button
              key={option.name}
              type="button"
              variant="secondary"
              onClick={() => handleShare(option.action)}
              className="flex-col p-4 hover:border-purple-300 hover:bg-purple-50"
            >
              {/* ✅ icon string → component */}
              <DynamicIcon name={option.icon} className="w-6 h-6 mb-2 text-purple-600" />
              <span className="text-sm text-gray-700">{option.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Referral List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Referrals</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {referrals.map((referral) => (
            <div key={referral.id} className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{referral.referredName}</p>
                <p className="text-sm text-gray-500">{referral.referredEmail}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(referral.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${statusColors[referral.status] || 'bg-gray-100 text-gray-600'}`}>
                  {referral.status.replace('_', ' ')}
                </span>
                {referral.rewardPoints > 0 && (
                  <p className="text-sm font-semibold text-purple-600">+{formatPoints(referral.rewardPoints)} pts</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Modal */}
      <Modal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Send Referral Email"
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowEmailModal(false)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Send Email
            </Button>
          </>
        }
      >
        {/* Template Selector */}
        <div className="flex gap-2 mb-4">
          {emailTemplates.map((tmpl) => (
            <Button
              key={tmpl.id}
              type="button"
              variant={selectedTemplate.id === tmpl.id ? 'primary' : 'secondary'}
              onClick={() => setSelectedTemplate(tmpl)}
              className={`rounded-full px-3 py-1 text-sm ${selectedTemplate.id === tmpl.id ? 'bg-purple-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {tmpl.name}
            </Button>
          ))}
        </div>

        <Input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="friend@example.com"
          label="Recipient email"
          hideLabel
          containerClassName="mb-4"
          className="focus:ring-purple-500"
        />

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {selectedTemplate.body
            .replace('{referralCode}', referralData.referralCode)
            .replace('{referralLink}', referralData.referralLink)}
        </div>
      </Modal>
    </div>
  );
}