// app/admin/shortlist/components/EmptyState.tsx
 
'use client';
 
import React from 'react';
 
export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-6xl mb-4">📭</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        No Orders to Process
      </h2>
      <p className="text-gray-600 text-center max-w-md mb-6">
        All orders are fully sourced! You don't have any pending purchases right now.
      </p>
      <div className="space-y-2 text-sm text-gray-600 text-center">
        <p>✅ No pending orders with unpurchased products</p>
        <p>✅ All suppliers are keeping up with demand</p>
        <p>✅ Your inventory is well-maintained</p>
      </div>
    </div>
  );
}
