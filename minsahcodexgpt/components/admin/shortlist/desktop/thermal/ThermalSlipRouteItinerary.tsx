'use client';

import React from 'react';

interface ThermalSlipRouteItineraryProps {
  stops: string[];
}

export const ThermalSlipRouteItinerary: React.FC<ThermalSlipRouteItineraryProps> = ({ stops }) => {
  return (
    <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
      <div className="text-[9px] font-extrabold uppercase tracking-wide text-slate-700">
        WALKING ROUTE: {stops.length} STOPS
      </div>
      {stops.map((stop, sIdx) => (
        <div key={sIdx} className="text-[10px] font-bold text-black">
          {stop}
        </div>
      ))}
    </div>
  );
};
