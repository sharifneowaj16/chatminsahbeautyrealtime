'use client';

import React from 'react';
import { Clock, CheckCircle2, Truck, AlertTriangle, User, MessageSquare, ShieldAlert } from 'lucide-react';

export interface TimelineEntry {
  id?: string;
  timestamp: string;
  status?: string;
  title?: string;
  note?: string;
  actor?: string;
  type?: 'status' | 'logistics' | 'payment' | 'staff' | 'fraud' | string;
}

export interface AdminAuditTimelineProps {
  events: TimelineEntry[];
  emptyMessage?: string;
  className?: string;
}

const TYPE_ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  status: { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  logistics: { icon: Truck, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  payment: { icon: CheckCircle2, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  staff: { icon: User, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  fraud: { icon: ShieldAlert, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

export const AdminAuditTimeline: React.FC<AdminAuditTimelineProps> = ({
  events,
  emptyMessage = 'No activity history recorded yet.',
  className = '',
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs italic">
        <Clock className="w-5 h-5 mx-auto text-slate-600 mb-1" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-4 relative pl-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 ${className}`}>
      {events.map((evt, idx) => {
        const type = (evt.type || 'status').toLowerCase();
        const conf = TYPE_ICON[type] || TYPE_ICON.status;
        const Icon = conf.icon;

        const dateStr = evt.timestamp
          ? new Date(evt.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Just now';

        return (
          <div key={evt.id || idx} className="relative flex items-start gap-3 text-xs">
            {/* Dot / Icon */}
            <div
              className={`-ml-[1.4rem] w-6 h-6 rounded-full border flex items-center justify-center shrink-0 z-10 ${conf.color}`}
            >
              <Icon className="w-3 h-3" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white truncate">
                  {evt.title || evt.status || 'Status Updated'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {dateStr}
                </span>
              </div>

              {evt.note && (
                <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                  {evt.note}
                </p>
              )}

              {evt.actor && (
                <div className="pt-1 text-[10px] text-slate-500 flex items-center gap-1">
                  <User className="w-2.5 h-2.5 text-slate-600" />
                  <span>By {evt.actor}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminAuditTimeline;
