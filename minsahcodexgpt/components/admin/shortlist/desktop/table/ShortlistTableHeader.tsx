'use client';

import React from 'react';

export const ShortlistTableHeader: React.FC = () => {
  return (
    <thead>
      <tr className="bg-[#050f1a] border-b border-[#142336] text-[10px] font-mono uppercase tracking-wider text-slate-400 select-none">
        <th className="py-2.5 px-3 w-[26%] text-slate-300 font-bold" scope="col">
          Product &amp; SKU Spec
        </th>
        <th className="py-2.5 px-3 w-[18%] text-slate-300 font-bold" scope="col">
          Demand &amp; Order Mapping
        </th>
        <th className="py-2.5 px-3 w-[22%] text-slate-300 font-bold" scope="col">
          Wholesale Stand &amp; Vendor
        </th>
        <th className="py-2.5 px-3 w-[16%] text-slate-300 font-bold" scope="col">
          Cost &amp; Profit
        </th>
        <th className="py-2.5 px-3 w-[10%] text-slate-300 font-bold" scope="col">
          Acquisition
        </th>
        <th className="py-2.5 px-3 w-[8%] text-right text-slate-300 font-bold" scope="col">
          Action
        </th>
      </tr>
    </thead>
  );
};
