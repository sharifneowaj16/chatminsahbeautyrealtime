'use client';

interface ReturnNotesInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function ReturnNotesInput({
  value,
  onChange,
  maxLength = 250,
}: ReturnNotesInputProps) {
  return (
    <div className="px-4 mt-5 space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="return-notes"
          className="text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Additional Details (Optional)
        </label>
        <span className="text-[11px] font-mono text-slate-400">
          {value.length}/{maxLength}
        </span>
      </div>

      <div className="relative">
        <textarea
          id="return-notes"
          rows={3}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Please describe what happened (e.g., leaked during transit, broken nozzle, batch verification details)..."
          className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all resize-none"
        />
      </div>
    </div>
  );
}
