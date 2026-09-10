'use client';

import React, { useEffect, useState } from 'react';
import {
  Truck,
  Sparkles,
  UserCheck,
  UserPlus,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  DEFAULT_DELIVERY_MESSAGE_CONFIG,
  type DeliveryMessageConfig,
  type DeliveryMessageItemConfig,
} from '@/lib/delivery-message/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface MessageCardProps {
  number: 1 | 2 | 3;
  title: string;
  badge: string;
  badgeTone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  message: DeliveryMessageItemConfig;
  onChange: (field: keyof DeliveryMessageItemConfig, value: any) => void;
  canEdit: boolean;
}

function MessageCard({
  number,
  title,
  badge,
  badgeTone = 'neutral',
  icon: Icon,
  description,
  message,
  onChange,
  canEdit,
}: MessageCardProps) {
  return (
    <div className="rounded-lg border border-[#232636] bg-[#161824] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#5e6ad2]/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1b1e2c] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10121b] border border-[#232636] text-[#5e6ad2]">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#f7f8f8]">
                Message {number}: {title}
              </h3>
              <Badge tone={badgeTone}>{badge}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-[#8a8f98]">{description}</p>
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={message.active}
            onChange={(e) => onChange('active', e.target.checked)}
            disabled={!canEdit}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-[#232636] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[#232636] after:bg-[#161824] after:transition-all after:content-[''] peer-checked:bg-[#5e6ad2] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60"></div>
          <span className="text-xs font-medium text-[#8a8f98]">
            {message.active ? 'Active' : 'Inactive'}
          </span>
        </label>
      </div>

      <div className="mt-4 space-y-4">
        {/* Message Text Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">
            Message Text
          </label>
          <textarea
            value={message.text}
            onChange={(e) => onChange('text', e.target.value)}
            disabled={!canEdit}
            rows={2}
            className="mt-1.5 w-full rounded-md border border-[#232636] bg-[#10121b] p-3 text-xs sm:text-sm font-medium text-[#f7f8f8] placeholder-[#62666d] shadow-sm transition focus:border-[#5e6ad2] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2] disabled:opacity-60"
            placeholder="Enter promotional or delivery copy..."
          />
        </div>

        {/* Color Customization */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">
              Background Color
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={message.backgroundColor}
                onChange={(e) => onChange('backgroundColor', e.target.value)}
                disabled={!canEdit}
                className="h-9 w-12 cursor-pointer rounded-md border border-[#232636] bg-[#10121b] p-0.5 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={message.backgroundColor}
                onChange={(e) => onChange('backgroundColor', e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-md border border-[#232636] px-3 py-2 text-xs sm:text-sm font-mono font-medium uppercase text-[#f7f8f8] bg-[#10121b] shadow-sm focus:border-[#5e6ad2] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2] disabled:opacity-60"
                placeholder="#d3fa99"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">
              Text Color
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={message.textColor}
                onChange={(e) => onChange('textColor', e.target.value)}
                disabled={!canEdit}
                className="h-9 w-12 cursor-pointer rounded-md border border-[#232636] bg-[#10121b] p-0.5 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={message.textColor}
                onChange={(e) => onChange('textColor', e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-md border border-[#232636] px-3 py-2 text-xs sm:text-sm font-mono font-medium uppercase text-[#f7f8f8] bg-[#10121b] shadow-sm focus:border-[#5e6ad2] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2] disabled:opacity-60"
                placeholder="#1c3a13"
              />
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="mt-3 rounded-lg border border-dashed border-[#232636] bg-[#10121b] p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#8a8f98]">
            <Eye className="h-3.5 w-3.5 text-[#5e6ad2]" />
            <span>Storefront Live Preview</span>
          </div>
          <div
            className="mt-2 flex min-h-[40px] items-center justify-center rounded-md px-4 py-2 text-center text-xs sm:text-sm font-medium transition-colors shadow-sm"
            style={{
              backgroundColor: message.backgroundColor,
              color: message.textColor,
            }}
          >
            {message.text || <span className="italic opacity-60">No message text specified</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryMessageSettings() {
  const { hasPermission } = useAdminAuth();
  const canEdit = hasPermission(PERMISSIONS.SETTINGS_EDIT);

  const [config, setConfig] = useState<DeliveryMessageConfig>(DEFAULT_DELIVERY_MESSAGE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/delivery-message-config', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.config) {
            setConfig(data.config);
          }
        }
      } catch (err) {
        console.error('Failed to load delivery message settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const handleMessageChange = (
    messageKey: 'message1' | 'message2' | 'message3',
    field: keyof DeliveryMessageItemConfig,
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      [messageKey]: {
        ...prev[messageKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setStatusMessage(null);

      const res = await fetch('/api/admin/delivery-message-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Save failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data?.config) {
        setConfig(data.config);
      }
      setStatusMessage({
        type: 'success',
        text: 'Delivery message configuration saved and revalidated successfully.',
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Save error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save delivery message configuration.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('Are you sure you want to reset all 3 delivery messages to their default values?')) {
      return;
    }
    setConfig(DEFAULT_DELIVERY_MESSAGE_CONFIG);
  };

  if (loading) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-[#232636] bg-[#161824] p-6 text-[#8a8f98]">
        <div className="flex items-center gap-3 text-sm font-medium text-[#8a8f98]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5e6ad2] border-t-transparent"></div>
          <span>Loading delivery message configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="delivery-messages-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b1e2c] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10121b] border border-[#232636] text-[#5e6ad2]">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="delivery-messages-heading" className="text-lg sm:text-xl font-bold text-[#f7f8f8]">
              Product Delivery Top-Bar Messages
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#8a8f98]">
              Configure dynamic top-bar notices displayed on product detail pages based on product offer and customer loyalty.
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetDefaults}
              disabled={saving}
              className="gap-1.5 bg-[#161824] hover:bg-[#1b1e2c] border border-[#232636] text-[#f7f8f8] text-xs sm:text-sm"
            >
              <RotateCcw className="h-4 w-4 text-[#8a8f98]" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] text-xs sm:text-sm"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 rounded-lg p-3 sm:p-4 text-xs sm:text-sm font-medium transition ${
            statusMessage.type === 'success'
              ? 'border border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]'
              : 'border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#f87171]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#10b981]" />
          ) : (
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#ef4444]" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 3 Message Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Message 1: Product Free Delivery */}
        <MessageCard
          number={1}
          title="Product Free Delivery"
          badge="Priority 1 (Offer Driven)"
          badgeTone="success"
          icon={Sparkles}
          description="Shown when the viewed product has active free delivery (deliveryOfferType === 'FREE'). Overrides all customer messages."
          message={config.message1}
          onChange={(field, val) => handleMessageChange('message1', field, val)}
          canEdit={canEdit}
        />

        {/* Message 2: New / Unknown Customer */}
        <MessageCard
          number={2}
          title="New / Unknown Customer"
          badge="Priority 3 (Default Fallback)"
          badgeTone="info"
          icon={UserPlus}
          description="Shown when customer phone is unknown, or customer has zero qualifying completed/delivered orders."
          message={config.message2}
          onChange={(field, val) => handleMessageChange('message2', field, val)}
          canEdit={canEdit}
        />

        {/* Message 3: Returning Customer */}
        <MessageCard
          number={3}
          title="Returning Customer"
          badge="Priority 2 (Loyalty Driven)"
          badgeTone="neutral"
          icon={UserCheck}
          description="Shown when identified customer phone has at least 1 successfully completed/delivered order (OrderStatus.DELIVERED)."
          message={config.message3}
          onChange={(field, val) => handleMessageChange('message3', field, val)}
          canEdit={canEdit}
        />
      </div>
    </section>
  );
}
