'use client';

// components/admin/ProductFaqSection.tsx
// ─── Reusable FAQ section for new + edit product admin forms ─────────────────
// Usage:
//   import ProductFaqSection from '@/components/admin/ProductFaqSection';
//   <ProductFaqSection faqs={formData.faqs} onChange={(faqs) => setFormData(p => ({...p, faqs}))} />

import { Plus, Trash2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

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
    <div className="bg-[#161824] rounded-lg border border-[#232636] shadow-sm overflow-hidden">
      {/* Header */}
      <Button
        type="button"
        variant="ghost"
        aria-expanded={!collapsed}
        aria-controls="product-faq-panel"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full min-h-0 justify-between rounded-none px-6 py-4 font-normal hover:bg-[#10121b]"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-white" aria-hidden="true" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-[#f7f8f8]">FAQ Section</h2>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              {faqs.length > 0
                ? `${faqs.length} question${faqs.length === 1 ? '' : 's'} — eligible for Google FAQ rich results`
                : 'Add questions to make this product eligible for Google FAQ rich results'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {faqs.length > 0 && (
            <span className="text-xs bg-admin-panel text-white font-semibold px-2 py-1 rounded-full">
              {faqs.length} FAQ
            </span>
          )}
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-[#62666d]" aria-hidden="true" />
            : <ChevronUp className="w-4 h-4 text-[#62666d]" aria-hidden="true" />}
        </div>
      </Button>

      {!collapsed && (
        <div id="product-faq-panel" className="px-6 pb-6 pt-2 border-t border-[#232636] space-y-4">

          {/* SEO tip */}
          <div className="bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 rounded-lg px-4 py-3 text-sm text-[#f7f8f8]">
            💡 <strong>SEO tip:</strong> Add 5–8 useful FAQs to improve search-result coverage. Rich results are controlled by Google and are not guaranteed.
          </div>

          {/* FAQ list */}
          {faqs.length > 0 && (
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-[#232636] rounded-lg p-4 bg-[#10121b]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white bg-admin-panel px-2 py-1 rounded">
                      Q{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFaq(index)}
                      className="text-red-500 hover:text-rose-400"
                      aria-label={`Remove FAQ ${index + 1}`}
                      title="Remove FAQ"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Input
                      type="text"
                      value={faq.question}
                      onChange={(e) => updateFaq(index, 'question', e.target.value)}
                      className="focus:ring-white/20 text-sm"
                      placeholder="Example: Is this serum suitable for oily skin?"
                      label="Question"
                      labelClassName="text-xs font-medium text-[#d0d6e0]"
                    />
                    <div>
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        rows={3}
                        className="focus:ring-white/20 text-sm resize-none"
                        placeholder="Write a clear, detailed answer…"
                        label="Answer"
                        labelClassName="text-xs font-medium text-[#d0d6e0]"
                      />
                      <p className="text-xs text-[#62666d] mt-1 text-right">
                        {faq.answer.length} chars
                        {faq.answer.length < 50 && faq.answer.length > 0 && (
                          <span className="ml-2 text-amber-500">Add a little more detail</span>
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
            <Button
              type="button"
              variant="primary"
              onClick={addFaq}
              className="bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] text-sm hover:bg-white/90"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add FAQ
            </Button>

            <Button
              type="button"
              variant="secondary"
              aria-expanded={showSuggestions}
              aria-controls="product-faq-suggestions"
              onClick={() => setShowSuggestions((v) => !v)}
              className="border-admin-border text-white text-sm hover:bg-admin-panel"
            >
              {showSuggestions ? 'Hide suggestions' : '✨ Suggested questions'}
            </Button>
          </div>

          {/* Suggested questions */}
          {showSuggestions && (
            <div id="product-faq-suggestions" className="border border-admin-border rounded-lg p-4 bg-admin-panel">
              <p className="text-xs font-semibold text-white mb-3">
                Select a question to add it automatically:
              </p>
              <div className="flex flex-wrap gap-2" lang="bn-BD">
                {SUGGESTED_FAQS.map((q) => {
                  const alreadyAdded = faqs.some((f) => f.question === q);
                  return (
                    <Button
                      key={q}
                      type="button"
                      variant="secondary"
                      onClick={() => addSuggestedFaq(q)}
                      disabled={alreadyAdded}
                      className={`rounded-full text-xs ${
                        alreadyAdded
                          ? 'border-[#232636] bg-[#10121b] text-[#62666d]'
                          : 'border-admin-border bg-[#161824] text-white hover:border-admin-primary hover:bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:text-white'
                      }`}
                    >
                      {alreadyAdded ? '✓ ' : '+ '}{q}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {faqs.length === 0 && (
            <div className="text-center py-6 text-[#62666d] border-2 border-dashed border-[#232636] rounded-lg">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p className="text-sm">No FAQs added yet</p>
              <p className="mt-1 text-xs">Use the button above to add a FAQ</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
