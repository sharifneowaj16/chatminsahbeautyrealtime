'use client';

// components/admin/ProductFaqSection.tsx
// ─── Reusable FAQ section for new + edit product admin forms ─────────────────
// Usage:
//   import ProductFaqSection from '@/components/admin/ProductFaqSection';
//   <ProductFaqSection faqs={formData.faqs} onChange={(faqs) => setFormData(p => ({...p, faqs}))} />

import { Plus, Trash2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

interface ProductFaqSectionProps {
  faqs: FaqItem[];
  onChange: (faqs: FaqItem[]) => void;
}

const SUGGESTED_FAQS = [
  'এই পণ্যটি কোন ধরনের ত্বকের জন্য উপযুক্ত?',
  'পণ্যটি কীভাবে ব্যবহার করতে হয়?',
  'পণ্যটি কি অথেনটিক?',
  'ডেলিভারি কতদিনে পাবো?',
  'Cash on Delivery আছে?',
  'পণ্যটি কি রিটার্ন করা যাবে?',
  'এই পণ্যটি কি sensitive skin এর জন্য safe?',
  'পণ্যটির shelf life কতদিন?',
];

export default function ProductFaqSection({ faqs, onChange }: ProductFaqSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addFaq = () => {
    onChange([...faqs, { question: '', answer: '' }]);
  };

  const removeFaq = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = faqs.map((faq, i) =>
      i === index ? { ...faq, [field]: value } : faq
    );
    onChange(updated);
  };

  const addSuggestedFaq = (question: string) => {
    // Don't add if already exists
    if (faqs.some((f) => f.question === question)) return;
    onChange([...faqs, { question, answer: '' }]);
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-600" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-gray-900">FAQ Section</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {faqs.length > 0
                ? `${faqs.length}টি প্রশ্ন — Google এ FAQ rich snippet পাবে`
                : 'প্রশ্ন যোগ করলে Google search এ FAQ snippet দেখাবে'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {faqs.length > 0 && (
            <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-1 rounded-full">
              {faqs.length} FAQ
            </span>
          )}
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-4">

          {/* SEO tip */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            💡 <strong>SEO Tip:</strong> ৫–৮টা FAQ add করলে Google search result এ <strong>FAQ rich snippet</strong> দেখায় — click rate ৩০–৫০% বাড়ে।
          </div>

          {/* FAQ list */}
          {faqs.length > 0 && (
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      Q{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove FAQ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        প্রশ্ন (Question)
                      </label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => updateFaq(index, 'question', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="যেমন: এই serum কি oily skin এর জন্য উপযুক্ত?"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        উত্তর (Answer)
                      </label>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                        placeholder="বিস্তারিত উত্তর লিখুন..."
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">
                        {faq.answer.length} chars
                        {faq.answer.length < 50 && faq.answer.length > 0 && (
                          <span className="text-amber-500 ml-2">একটু বিস্তারিত লিখলে ভালো হয়</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addFaq}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-1" />
              FAQ যোগ করো
            </button>

            <button
              type="button"
              onClick={() => setShowSuggestions((v) => !v)}
              className="inline-flex items-center px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 text-sm font-medium"
            >
              {showSuggestions ? 'Suggestions লুকাও' : '✨ Suggested Questions'}
            </button>
          </div>

          {/* Suggested questions */}
          {showSuggestions && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <p className="text-xs font-semibold text-purple-800 mb-3">
                ক্লিক করলে automatically add হবে:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_FAQS.map((q) => {
                  const alreadyAdded = faqs.some((f) => f.question === q);
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => addSuggestedFaq(q)}
                      disabled={alreadyAdded}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        alreadyAdded
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white hover:border-purple-600'
                      }`}
                    >
                      {alreadyAdded ? '✓ ' : '+ '}{q}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {faqs.length === 0 && (
            <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">এখনো কোনো FAQ নেই</p>
              <p className="text-xs mt-1">উপরের বাটন দিয়ে FAQ যোগ করো</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
