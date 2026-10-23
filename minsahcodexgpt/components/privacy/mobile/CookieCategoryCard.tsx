'use client';

import { LucideIcon, Check } from 'lucide-react';

interface CookieCategoryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isLocked?: boolean;
  checked: boolean;
  onChange?: (checked: boolean) => void;
}

export function CookieCategoryCard({
  icon: Icon,
  title,
  description,
  isLocked = false,
  checked,
  onChange,
}: CookieCategoryCardProps) {
  return (
    <div className="bg-[#F2F6F0] rounded-2xl p-4 flex flex-col gap-2 border border-[#E2DED8]/60 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-5 h-5 text-[#062402] shrink-0" />
          <h3 className="text-sm font-bold text-[#062402] truncate">
            {title}
          </h3>
        </div>

        {isLocked ? (
          <div className="flex items-center gap-1.5 bg-[#D4F6A2] px-3 py-1 rounded-full shrink-0">
            <Check className="w-3.5 h-3.5 text-[#062402]" />
            <span className="text-[11px] font-bold text-[#062402]">
              Always Active
            </span>
          </div>
        ) : (
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#dbdad7] rounded-full peer peer-checked:bg-[#062402] transition-colors duration-200" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-200 flex items-center justify-center shadow-xs">
              <Check
                className={`w-3 h-3 text-[#062402] transition-opacity duration-200 ${
                  checked ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          </label>
        )}
      </div>

      <p className="text-xs text-[#5A615D] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
