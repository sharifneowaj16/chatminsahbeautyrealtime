'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Check, X, Loader2, MessageSquare } from 'lucide-react';

export interface InlineAdminNoteEditorProps {
  initialValue: string | null | undefined;
  onSave: (newNote: string) => Promise<void> | void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const InlineAdminNoteEditor: React.FC<InlineAdminNoteEditorProps> = ({
  initialValue = '',
  onSave,
  placeholder = 'Add an internal note or staff memo...',
  label = 'Admin Memo',
  disabled = false,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await onSave(note.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save admin note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNote(initialValue || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
          {label}
        </span>
        {!isEditing && !disabled && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-normal transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            {note ? 'Edit' : 'Add Note'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={note}
            disabled={saving}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Ctrl+Enter to save • Esc to cancel</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleCancel}
                className="h-7 px-2.5 rounded text-xs text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900 transition-colors"
              >
                <X className="w-3 h-3 inline mr-1" />
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="h-7 px-3 rounded text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors flex items-center gap-1 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setIsEditing(true)}
          className={`text-xs p-2.5 rounded-lg border transition-colors ${
            note
              ? 'bg-slate-950/60 border-slate-800 text-slate-300 cursor-pointer hover:border-slate-700'
              : 'bg-slate-950/30 border-dashed border-slate-800 text-slate-500 cursor-pointer hover:border-slate-700 hover:text-slate-400'
          }`}
        >
          {note ? (
            <p className="whitespace-pre-wrap leading-relaxed">{note}</p>
          ) : (
            <p className="italic">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineAdminNoteEditor;
