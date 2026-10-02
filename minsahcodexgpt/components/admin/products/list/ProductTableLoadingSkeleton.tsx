'use client';

import React from 'react';

export interface ProductTableLoadingSkeletonProps {
  rowCount?: number;
}

export function ProductTableLoadingSkeleton({ rowCount = 5 }: ProductTableLoadingSkeletonProps) {
  return (
    <tbody className="bg-[#161824] divide-y divide-[#232636] animate-pulse">
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={i} className="hover:bg-white/[0.02]">
          <td className="px-3.5 py-3">
            <div className="w-3.5 h-3.5 bg-white/[0.06] rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-md bg-white/[0.06]" />
              <div className="space-y-1.5 flex-1">
                <div className="w-32 h-3.5 bg-white/[0.08] rounded" />
                <div className="w-20 h-2.5 bg-white/[0.04] rounded" />
              </div>
            </div>
          </td>
          <td className="px-3 py-3">
            <div className="w-20 h-3 bg-white/[0.06] rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="w-16 h-3.5 bg-white/[0.08] rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="w-14 h-3 bg-white/[0.06] rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="w-16 h-5 bg-white/[0.06] rounded-full" />
          </td>
          <td className="px-3 py-3">
            <div className="w-12 h-3 bg-white/[0.06] rounded" />
          </td>
          <td className="px-3 py-3 text-right">
            <div className="w-16 h-6 bg-white/[0.06] rounded ml-auto" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}
