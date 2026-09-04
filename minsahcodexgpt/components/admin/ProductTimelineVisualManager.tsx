'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Eye,
  Edit3,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { TimelineStage } from '@/app/(storefront)/products/[id]/components/benefits/SeedTimelineList';

export interface ProductTimelineVisualManagerProps {
  productName?: string;
  initialStages?: TimelineStage[];
  descriptionSectionsJson?: string;
  onTimelineChange?: (stages: TimelineStage[], jsonStr: string) => void;
  className?: string;
}

// 1-Click Quick Preset Chips
const QUICK_PRESETS = [
  { label: '1st Day', headline: 'Instant Barrier Relief & Fresh Hydration', benefit: 'Immediately cools surface heat and relieves dry tightness' },
  { label: '3rd Day', headline: 'Visible Moisture Balance & Soothing', benefit: 'Noticeably reduces reactive micro-redness and flakiness' },
  { label: '7 Days', headline: 'Immediate Barrier Soothing & Redness Relief', benefit: 'Rapidly calms reactive irritation and strengthens surface hydration' },
  { label: '2 Weeks', headline: 'Pore Clarification & Sebum Balance', benefit: 'Normalizes excess oil production and refines congested pores' },
  { label: '3 Weeks', headline: 'Smoother Texture & Even Tone', benefit: 'Smooths rough patches and promotes a unified skin finish' },
  { label: '4 Weeks', headline: 'Cellular Renewal & Glass-Skin Radiance', benefit: 'Accelerates epidermal turnover for visible luminous clarity' },
  { label: '2 Months', headline: 'Collagen Elasticity & Firmness', benefit: 'Visibly softens the appearance of fine dry lines' },
  { label: '3 Months', headline: 'Long-Term Dermal Barrier Fortification', benefit: 'Builds lasting cellular barrier resilience against daily oxidative stress' },
];

// Pre-packaged Curated Templates
const TEMPLATES: Record<string, { name: string; icon: string; stages: TimelineStage[] }> = {
  soothing: {
    name: '🌿 Calming & Soothing Toner/Serum',
    icon: '🌿',
    stages: [
      {
        id: 'stage-1-day',
        pillLabel: '1st Day',
        headline: 'Instant Surface Soothing & Hydration',
        benefits: [
          'Instantly cools reactive redness and post-cleanse tightness',
          'Floods dehydrated dermal layers with soothing botanical hydration',
        ],
      },
      {
        id: 'stage-7-days',
        pillLabel: '7 Days',
        headline: 'Microbiome Calm & Redness Relief',
        benefits: [
          'Rapidly calms persistent irritation and sensitivity flares',
          'Prevents trans-epidermal moisture loss throughout the day',
        ],
      },
      {
        id: 'stage-2-weeks',
        pillLabel: '2 Weeks',
        headline: 'Pore Clarification & Sebum Balance',
        benefits: [
          'Normalizes excess oil production without stripping moisture',
          'Clears micro-comedones for smoother, refined skin texture',
        ],
      },
      {
        id: 'stage-4-weeks',
        pillLabel: '4 Weeks',
        headline: 'Glass-Skin Clarity & Resilience',
        benefits: [
          'Unlocks light-reflective glass-skin glow and even tone',
          'Sustains permanent moisture barrier defense against environmental stressors',
        ],
      },
    ],
  },
  antiaging: {
    name: '⚡ Anti-Aging & Retinol / Active Serum',
    icon: '⚡',
    stages: [
      {
        id: 'stage-2-weeks',
        pillLabel: '2 Weeks',
        headline: 'Cellular Acclimation & Texture Smoothing',
        benefits: [
          'Skin safely adapts to active retinoid / vitamin complex',
          'Gently polishes away dull surface dead cells',
        ],
      },
      {
        id: 'stage-4-weeks',
        pillLabel: '4 Weeks',
        headline: 'Noticeable Fine Line Softening & Glow',
        benefits: [
          'Visibly softens fine expression lines and dry creases',
          'Fades post-blemish pigmentation and hyperpigmentation spots',
        ],
      },
      {
        id: 'stage-2-months',
        pillLabel: '2 Months',
        headline: 'Dermal Collagen Density & Elasticity',
        benefits: [
          'Firms sagging contours and enhances dermal bounce',
          'Improves structural skin density and pore tightness',
        ],
      },
      {
        id: 'stage-3-months',
        pillLabel: '3 Months',
        headline: 'Permanent Age-Defying Skin Transformation',
        benefits: [
          'Long-term defense against deep wrinkle formation',
          'Sustained youthful elasticity and luminous vitality',
        ],
      },
    ],
  },
  seedSynbiotic: {
    name: '💊 DS-01® Synbiotic / Supplement',
    icon: '💊',
    stages: [
      {
        id: 'stage-7-days',
        pillLabel: '7 Days',
        headline: 'Reduces Bloating + Gas*',
        benefits: [
          'Reduces rumbling in the gut and intestinal discomfort',
          'Alleviates occasional excess gas within the first week',
          'Lessens daily disruption from digestive bloating',
        ],
      },
      {
        id: 'stage-2-weeks',
        pillLabel: '2 Weeks',
        headline: 'Supports Healthy Regularity*††',
        benefits: [
          'Improves stool consistency and bowel regularity',
          'Reduces occasional constipation naturally',
          'Makes daily digestive transit effortless and smooth',
        ],
      },
      {
        id: 'stage-4-weeks',
        pillLabel: '4 Weeks',
        headline: 'Smooths Skin Aging & Radiance*††',
        benefits: [
          'Supports overall luminous skin appearance and clarity',
          'Reduces fine lines by reinforcing gut-skin biological axis',
          'Promotes metabolic and cardiovascular biomarkers',
        ],
      },
      {
        id: 'stage-3-months',
        pillLabel: '3 Months',
        headline: '6 Weeks + Whole Body Fortification*',
        benefits: [
          'Promotes overall digestive quality of life and energy',
          'Supports mucosal and systemic immune system balance',
          'Increases essential micronutrient and short-chain fatty acid synthesis',
        ],
      },
    ],
  },
};

export default function ProductTimelineVisualManager({
  productName = 'This Product',
  initialStages,
  descriptionSectionsJson,
  onTimelineChange,
  className = '',
}: ProductTimelineVisualManagerProps) {
  const [stages, setStages] = useState<TimelineStage[]>(() => {
    if (initialStages && initialStages.length > 0) return initialStages;
    
    // Parse from descriptionSectionsJson if available
    if (descriptionSectionsJson) {
      try {
        const parsed = JSON.parse(descriptionSectionsJson);
        if (parsed.timelineStages && Array.isArray(parsed.timelineStages)) {
          return parsed.timelineStages;
        }
        if (parsed.benefitsTimeline && Array.isArray(parsed.benefitsTimeline)) {
          return parsed.benefitsTimeline;
        }
      } catch (e) {
        // Fallback below
      }
    }

    return TEMPLATES.soothing.stages;
  });

  const [activePreviewStage, setActivePreviewStage] = useState<string>(stages[0]?.id || 'stage-1');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync back to parent
  const notifyChange = (updatedStages: TimelineStage[]) => {
    setStages(updatedStages);
    
    let updatedJsonStr = '';
    try {
      let existingObj: Record<string, unknown> = {};
      if (descriptionSectionsJson) {
        try { existingObj = JSON.parse(descriptionSectionsJson); } catch (e) { existingObj = {}; }
      }
      existingObj.timelineStages = updatedStages;
      updatedJsonStr = JSON.stringify(existingObj);
    } catch (e) {
      updatedJsonStr = JSON.stringify({ timelineStages: updatedStages });
    }

    if (onTimelineChange) {
      onTimelineChange(updatedStages, updatedJsonStr);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Add a new stage
  const handleAddStage = (pillLabel = 'Custom', headline = 'New Routine Milestone', initialBenefit = 'Benefits for this period') => {
    const newStage: TimelineStage = {
      id: `stage-${Date.now()}`,
      pillLabel,
      headline,
      benefits: [initialBenefit],
    };
    const updated = [...stages, newStage];
    notifyChange(updated);
  };

  // Remove a stage
  const handleRemoveStage = (stageId: string) => {
    if (stages.length <= 1) {
      alert('You must have at least 1 milestone stage.');
      return;
    }
    const updated = stages.filter((s) => s.id !== stageId);
    notifyChange(updated);
  };

  // Move stage up / down
  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const updated = [...stages];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    notifyChange(updated);
  };

  // Duplicate a stage
  const handleDuplicateStage = (stage: TimelineStage) => {
    const newStage: TimelineStage = {
      ...stage,
      id: `stage-${Date.now()}`,
      pillLabel: `${stage.pillLabel} (Copy)`,
    };
    const updated = [...stages, newStage];
    notifyChange(updated);
  };

  // Update a stage field
  const handleUpdateStage = (stageId: string, field: 'pillLabel' | 'headline', value: string) => {
    const updated = stages.map((s) => (s.id === stageId ? { ...s, [field]: value } : s));
    notifyChange(updated);
  };

  // Add bullet point
  const handleAddBenefit = (stageId: string) => {
    const updated = stages.map((s) => {
      if (s.id === stageId) {
        return {
          ...s,
          benefits: [...s.benefits, 'New benefit observed during this phase'],
        };
      }
      return s;
    });
    notifyChange(updated);
  };

  // Update bullet point
  const handleUpdateBenefit = (stageId: string, benefitIndex: number, value: string) => {
    const updated = stages.map((s) => {
      if (s.id === stageId) {
        const newBenefits = [...s.benefits];
        newBenefits[benefitIndex] = value;
        return { ...s, benefits: newBenefits };
      }
      return s;
    });
    notifyChange(updated);
  };

  // Remove bullet point
  const handleRemoveBenefit = (stageId: string, benefitIndex: number) => {
    const updated = stages.map((s) => {
      if (s.id === stageId) {
        if (s.benefits.length <= 1) return s;
        const newBenefits = s.benefits.filter((_, i) => i !== benefitIndex);
        return { ...s, benefits: newBenefits };
      }
      return s;
    });
    notifyChange(updated);
  };

  // Apply template
  const handleApplyTemplate = (templateKey: string) => {
    const t = TEMPLATES[templateKey];
    if (!t) return;
    if (confirm(`Apply ${t.name} template? This will replace current milestone stages.`)) {
      notifyChange(t.stages);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      
      {/* Top Controller Header */}
      <div className="bg-[#1C3A13] text-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#A3E635]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold">
                Product Routine &amp; Benefits Timeline Manager
              </h3>
              <span className="bg-[#A3E635] text-[#111A10] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                Phase 2
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              Configure unlimited milestone buttons (1st Day, 7 Days, 2 Weeks, etc.) and benefits for {productName}.
            </p>
          </div>
        </div>

        {/* Action Toggle (Edit / Preview) */}
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#A3E635] bg-white/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Synced
            </span>
          )}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'preview'
                ? 'bg-[#A3E635] text-[#1C3A13]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {viewMode === 'preview' ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {viewMode === 'preview' ? 'Back to Editor' : 'Live Storefront Preview'}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">

        {/* 1. Curated 1-Click Starter Templates */}
        <div className="bg-[#F8F9F7] border border-[#1C3A13]/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#1C3A13] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2F6D20]" /> 1-Click Skincare Starter Templates:
            </span>
            <span className="text-[11px] text-gray-500">Quickly apply standard routine milestones</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyTemplate(key)}
                className="text-left bg-white border border-gray-200 hover:border-[#1C3A13] hover:shadow-sm p-3 rounded-lg text-xs font-semibold text-gray-800 transition-all flex items-center justify-between group"
              >
                <span>{t.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1C3A13] transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* 2. Quick Preset Chips to Add New Period */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            ⚡ Quick-Add Milestone Buttons:
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddStage(preset.label, preset.headline, preset.benefit)}
                className="inline-flex items-center gap-1.5 bg-[#F4F3EE] hover:bg-[#1C3A13] text-[#1C3A13] hover:text-[#FCFCF7] border border-[#1C3A13]/20 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>+ {preset.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleAddStage('Custom Period', 'Custom Milestone Headline', 'First benefit bullet point')}
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            >
              <Plus className="w-3 h-3" /> + Custom Stage
            </button>
          </div>
        </div>

        {/* 3. EDIT MODE: STAGES ACCORDION / LIST */}
        {viewMode === 'edit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Configured Milestone Stages ({stages.length})
              </span>
              <span className="text-xs text-gray-500">
                Drag or use arrows to rearrange sequence
              </span>
            </div>

            {stages.map((stage, sIdx) => (
              <div
                key={stage.id}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-[#1C3A13]/40 transition-all space-y-4 relative group"
              >
                {/* Stage Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C3A13] text-[#FCFCF7] text-xs font-bold flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      Milestone Stage {sIdx + 1}
                    </span>
                  </div>

                  {/* Stage Tools (Move Up, Down, Duplicate, Delete) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Move Up"
                      disabled={sIdx === 0}
                      onClick={() => handleMoveStage(sIdx, 'up')}
                      className="p-1.5 text-gray-400 hover:text-gray-800 disabled:opacity-30 rounded hover:bg-gray-100"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Move Down"
                      disabled={sIdx === stages.length - 1}
                      onClick={() => handleMoveStage(sIdx, 'down')}
                      className="p-1.5 text-gray-400 hover:text-gray-800 disabled:opacity-30 rounded hover:bg-gray-100"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Duplicate Stage"
                      onClick={() => handleDuplicateStage(stage)}
                      className="p-1.5 text-gray-400 hover:text-gray-800 rounded hover:bg-gray-100"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete Stage"
                      onClick={() => handleRemoveStage(stage.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stage Inputs (Pill Label & Headline) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Pill Label Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Button Pill Text (e.g. 7 Days)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={stage.pillLabel}
                        onChange={(e) => handleUpdateStage(stage.id, 'pillLabel', e.target.value)}
                        placeholder="7 Days"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#1C3A13] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Headline Input */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Stage Headline Title
                    </label>
                    <input
                      type="text"
                      value={stage.headline}
                      onChange={(e) => handleUpdateStage(stage.id, 'headline', e.target.value)}
                      placeholder="Immediate Barrier Soothing & Redness Relief"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1C3A13] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Bullet Points Sub-List */}
                <div className="bg-[#FAFAFA] rounded-lg p-3 sm:p-4 space-y-2 border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Benefit Bullet Points (disc list)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddBenefit(stage.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1C3A13] hover:text-[#2F6D20]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Bullet Point
                    </button>
                  </div>

                  {stage.benefits.map((benefit, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <span className="text-[#1C3A13] text-sm font-bold">•</span>
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => handleUpdateBenefit(stage.id, bIdx, e.target.value)}
                        placeholder="Detail specific benefit observed during this time frame..."
                        className="flex-1 px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1C3A13] focus:border-transparent"
                      />
                      {stage.benefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(stage.id, bIdx)}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-gray-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Bottom Add Stage Bar */}
            <button
              type="button"
              onClick={() => handleAddStage('Next Phase', 'New Milestone Headline', 'Specific benefit observed')}
              className="w-full py-3.5 border-2 border-dashed border-[#1C3A13]/25 hover:border-[#1C3A13] hover:bg-[#F4F3EE]/50 text-[#1C3A13] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Another Milestone Stage
            </button>
          </div>
        )}

        {/* 4. PREVIEW MODE: REAL-TIME STOREFRONT SIMULATOR */}
        {viewMode === 'preview' && (
          <div className="bg-[#F4F3EE] rounded-2xl p-6 sm:p-8 border border-[#1C3A13]/10">
            <div className="text-center max-w-[591px] mx-auto mb-8">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2F6D20] bg-white/70 px-2.5 py-1 rounded-full border border-[#1C3A13]/10 mb-2 inline-block">
                Live Storefront Customer View
              </span>
              <h4 className="text-2xl font-normal text-[#1C3A13] leading-[1.2] mb-2">
                The {productName} difference:<br />Benefits that build over time
              </h4>
              <p className="text-sm font-normal text-[#1C3A13] leading-6">
                Results you can feel in as little as {stages[0]?.pillLabel || '7 days'}.*
              </p>
            </div>

            {/* Simulated Interactive Timeline */}
            <div className="max-w-[540px] mx-auto space-y-6">
              {stages.map((stage, idx) => {
                const isActive = stage.id === activePreviewStage;

                return (
                  <div
                    key={stage.id}
                    onClick={() => setActivePreviewStage(stage.id)}
                    className={`cursor-pointer transition-all duration-300 pl-6 relative ${
                      isActive ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                    }`}
                  >
                    {/* Dot */}
                    <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-2 transition-all ${
                          isActive ? 'bg-[#1C3A13] ring-4 ring-[#1C3A13]/20 scale-110' : 'bg-[#1C3A13]/30'
                        }`}
                      />
                      {idx < stages.length - 1 && <div className="w-[1.5px] flex-1 bg-[#1C3A13]/15 mt-2" />}
                    </div>

                    {/* Stage Header */}
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <span
                        className={`inline-flex items-center justify-center h-[30px] px-[12px] rounded-[32px] text-[14px] font-normal tracking-[0.56px] leading-[14px] ${
                          isActive ? 'bg-[#1C3A13] text-[#FCFCF7]' : 'bg-[#1C3A13]/10 text-[#1C3A13]'
                        }`}
                      >
                        {stage.pillLabel}
                      </span>
                      <span className="text-[16px] font-normal text-[#000000] leading-[24px]">
                        {stage.headline}
                      </span>
                    </div>

                    {/* Stage Bullets */}
                    <ul className="pl-6 space-y-1 list-disc list-outside">
                      {stage.benefits.map((benefit, bIdx) => (
                        <li key={bIdx} className="text-[15px] font-normal text-[#1C3A13] leading-[24px]">
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
