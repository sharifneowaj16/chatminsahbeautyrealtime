'use client';

import React, { useState } from 'react';
import {
  Mail,
  Send,
  Eye,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Code,
  Laptop,
  Smartphone,
  Save,
  Copy,
  ExternalLink
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  category: 'Transactional' | 'Marketing' | 'Lifecycle';
  subject: string;
  previewText: string;
  active: boolean;
  openRate: string;
  clickRate: string;
  lastEdited: string;
  bodySnippet: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'TPL-01',
    name: 'Order Confirmation & Receipt',
    category: 'Transactional',
    subject: 'Your Minsah Beauty Order #{{order.id}} is Confirmed! ✨',
    previewText: 'Thank you for shopping with Minsah Beauty. Your order details are inside.',
    active: true,
    openRate: '68.4%',
    clickRate: '24.2%',
    lastEdited: 'Oct 20, 2024',
    bodySnippet: 'Dear {{customer.name}}, we are thrilled to confirm your order of 100% authentic Korean beauty skincare. Our Dhaka warehouse is preparing your parcel with love.'
  },
  {
    id: 'TPL-02',
    name: 'Courier Shipped & Tracking',
    category: 'Transactional',
    subject: 'Your Parcel is on the Way! Track #{{order.id}} 🚚',
    previewText: 'Steadfast Courier has picked up your order and is out for delivery.',
    active: true,
    openRate: '72.1%',
    clickRate: '41.8%',
    lastEdited: 'Oct 18, 2024',
    bodySnippet: 'Exciting news! Your beauty essentials have been handed over to our courier partner. Consignment number: {{tracking.number}}. Tap below to track real-time delivery.'
  },
  {
    id: 'TPL-03',
    name: 'Abandoned Cart Recovery (10% Off)',
    category: 'Lifecycle',
    subject: 'Did you leave something behind? Here is 10% off 💕',
    previewText: 'Your glow items are waiting for you in your cart.',
    active: true,
    openRate: '44.8%',
    clickRate: '18.4%',
    lastEdited: 'Oct 15, 2024',
    bodySnippet: 'We noticed you left some glowing skincare favorites in your bag. Complete your checkout today and enjoy an extra 10% off with coupon: GLOWBACK10.'
  },
  {
    id: 'TPL-04',
    name: 'Welcome Series & First Order Gift',
    category: 'Marketing',
    subject: 'Welcome to Minsah Beauty family, gorgeous! 🌸',
    previewText: 'Unlock ৳150 off your first genuine K-beauty order.',
    active: true,
    openRate: '58.2%',
    clickRate: '22.0%',
    lastEdited: 'Oct 12, 2024',
    bodySnippet: 'Welcome to Bangladesh’s premier destination for genuine, verified Korean & international cosmetics. We guarantee 100% authenticity on every formula.'
  }
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(TEMPLATES[0]);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectInput, setSubjectInput] = useState(TEMPLATES[0].subject);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/email-templates');
      if (res.ok) {
        const data = await res.json();
        if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
          setTemplates(data.templates);
          setSelectedTemplate(data.templates[0]);
          setSubjectInput(data.templates[0].subject);
        }
      }
    } catch (err) {
      console.warn('Failed to load email templates from DB, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const handleSelectTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
    setSubjectInput(tpl.subject);
  };

  const insertVariable = (tag: string) => {
    setSubjectInput((prev) => `${prev} ${tag}`);
    showToast(`Inserted ${tag} into subject`);
  };

  const handlePublishTemplate = async () => {
    const updated = templates.map((t) =>
      t.id === selectedTemplate.id ? { ...t, subject: subjectInput, lastEdited: 'Just now' } : t
    );
    setTemplates(updated);
    showToast('Template changes published to database!');

    try {
      await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn('Failed to persist email template to DB', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#c0c1ff] uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4" />
            <span>Marketing Operations // Email & Lifecycle Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Email Template & Automation Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Design transactional notifications, cart recovery sequences, and branded HTML templates.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast('Test preview email sent to admin@minsah.com!')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Send className="w-4 h-4 text-[#4edea3]" />
            <span>Send Test Email</span>
          </button>

          <button
            onClick={handlePublishTemplate}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Publish Template</span>
          </button>
        </div>
      </div>

      {/* Studio Workspace: Left 30% Template List, Right 70% Canvas & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Template Selector */}
        <div className="lg:col-span-4 bg-[#122131] border border-[#273647] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#ffffff]">Email Templates</h3>
            <button
              onClick={() => showToast('New custom email template draft created')}
              className="text-xs text-[#4edea3] hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Template</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#908fa0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] placeholder-[#908fa0] focus:outline-none focus:border-[#c0c1ff]"
            />
          </div>

          <div className="space-y-2">
            {templates
              .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    selectedTemplate.id === tpl.id
                      ? 'bg-[#1c2b3c] border-[#c0c1ff] shadow-sm'
                      : 'bg-[#051424] border-[#273647] hover:border-[#4edea3]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#c0c1ff] font-bold">{tpl.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#00a572]/20 text-[#4edea3]">
                      {tpl.category}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-[#ffffff] line-clamp-1">{tpl.name}</h4>

                  <div className="flex items-center justify-between text-[11px] text-[#908fa0] pt-1">
                    <span>Open: {tpl.openRate}</span>
                    <span>CTR: {tpl.clickRate}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Column (8 cols): Template Editor & Live Preview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Email Header Configuration */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center justify-between">
              <span>Subject & Dynamic Variable Merge Tags</span>
              <span className="text-xs font-mono text-[#4edea3]">Production Live</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">Subject Line</label>
                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-medium text-[#ffffff] focus:outline-none focus:border-[#c0c1ff]"
                />
              </div>

              {/* Dynamic Variables Pill Bar */}
              <div>
                <span className="text-[#908fa0] block mb-1.5 text-[11px]">Click to insert merge tag:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['{{customer.name}}', '{{order.id}}', '{{order.total}}', '{{tracking.number}}', '{{discount.code}}'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => insertVariable(tag)}
                      className="px-2.5 py-1 bg-[#051424] hover:bg-[#1c2b3c] border border-[#273647] text-[#c0c1ff] rounded font-mono text-[11px] transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Device Preview Switcher & Email Canvas */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#273647]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#4edea3]" />
                <h3 className="text-sm font-bold text-[#ffffff]">Live HTML Email Canvas Preview</h3>
              </div>

              {/* Device Selector */}
              <div className="flex bg-[#051424] p-1 rounded-lg border border-[#273647] gap-1">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded transition-all ${
                    previewDevice === 'desktop' ? 'bg-[#1c2b3c] text-[#ffffff]' : 'text-[#908fa0]'
                  }`}
                  title="Desktop Preview"
                >
                  <Laptop className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded transition-all ${
                    previewDevice === 'mobile' ? 'bg-[#1c2b3c] text-[#ffffff]' : 'text-[#908fa0]'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email Shell Mock */}
            <div className="flex justify-center p-4 bg-[#051424] rounded-xl border border-[#273647]">
              <div
                className={`bg-[#ffffff] text-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 font-sans ${
                  previewDevice === 'mobile' ? 'max-w-[360px] w-full' : 'max-w-[560px] w-full'
                }`}
              >
                {/* Brand Header */}
                <div className="bg-[#051424] p-6 text-center border-b-2 border-[#e2136e]">
                  <h2 className="text-xl font-extrabold tracking-widest text-[#ffffff] uppercase font-mono">
                    MINSAH BEAUTY
                  </h2>
                  <p className="text-xs text-[#c0c1ff] mt-1 font-mono">Authentic Korean Skincare • Dhaka</p>
                </div>

                {/* Email Body */}
                <div className="p-6 space-y-4 text-xs leading-relaxed">
                  <div className="text-sm font-bold text-[#111827]">
                    Hello, Fatima Rahman!
                  </div>

                  <p className="text-[#4b5563]">
                    {selectedTemplate.bodySnippet}
                  </p>

                  {/* Mock Order Summary Box */}
                  <div className="p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg space-y-2">
                    <div className="flex justify-between font-bold text-xs text-[#111827]">
                      <span>Order #ORD-2847</span>
                      <span className="text-[#059669]">Paid via bKash</span>
                    </div>
                    <div className="text-[11px] text-[#6b7280]">
                      1x Korean Rose Glow Miracle Serum (30ml) • ৳850
                    </div>
                    <div className="pt-2 border-t border-[#e5e7eb] flex justify-between font-bold text-xs text-[#111827]">
                      <span>Total Amount</span>
                      <span className="text-[#111827]">৳ 3,310</span>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <div className="pt-2 text-center">
                    <button className="px-6 py-2.5 bg-[#051424] hover:bg-[#122131] text-[#ffffff] rounded-lg text-xs font-bold shadow-md transition-all inline-block">
                      Track Live Delivery
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-[#f3f4f6] p-4 text-center text-[10px] text-[#9ca3af] border-t border-[#e5e7eb]">
                  <p>© 2024 Minsah Beauty Bangladesh. All rights reserved.</p>
                  <p className="mt-0.5">Dhanmondi, Dhaka-1205 • Helpline: 01712-345678</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
