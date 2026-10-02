'use client';

import React, { useState } from 'react';
import { Order, TimelineEvent } from '../../types';
import { AdminAuditTimeline, TimelineEntry } from '@/components/admin/common/AdminAuditTimeline';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Send, Loader2 } from 'lucide-react';

export interface OrderDetailTimelineTabProps {
  order: Order;
  onAddNote?: (note: string) => Promise<void>;
}

export const OrderDetailTimelineTab: React.FC<OrderDetailTimelineTabProps> = ({
  order,
  onAddNote,
}) => {
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Convert order.timeline into TimelineEntry format
  const events: TimelineEntry[] = (order.timeline || []).map((t, idx) => ({
    id: `event-${idx}`,
    timestamp: t.timestamp,
    status: t.status,
    note: t.note,
    actor: t.actor || 'System',
    type: t.status?.toLowerCase().includes('shipped')
      ? 'logistics'
      : t.status?.toLowerCase().includes('paid')
      ? 'payment'
      : t.actor === 'Admin' || t.actor === 'Staff'
      ? 'staff'
      : 'status',
  }));

  // Fallback initial created event if timeline empty
  if (events.length === 0 && order.createdAt) {
    events.push({
      id: 'created',
      timestamp: order.createdAt,
      status: 'Order Placed',
      note: `Order #${order.id} was placed by customer.`,
      actor: 'Customer',
      type: 'status',
    });
  }

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !onAddNote) return;

    try {
      setSaving(true);
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Staff Note Entry */}
      {onAddNote && (
        <form onSubmit={handlePostNote} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Record Staff Activity / Customer Call
          </label>
          <Textarea
            rows={2}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="e.g. Called customer at 3 PM, confirmed delivery address..."
            className="text-xs"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving || !newNote.trim()}
              className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>Post Activity</span>
            </Button>
          </div>
        </form>
      )}

      {/* Audit Timeline */}
      <AdminAuditTimeline events={events} emptyMessage="No timeline activity recorded yet." />
    </div>
  );
};

export default OrderDetailTimelineTab;
