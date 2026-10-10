import React from 'react';

export function DataStatusIndicator({ source }: { source?: 'sportapi_ai' | 'therundown' | 'api' | 'scraper' | string }) {
  if (source === 'sportapi_ai' || source === 'api') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        SportAPI.ai Active (Primary)
      </span>
    );
  }

  if (source === 'therundown') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-cyan-400" />
        TheRundown.io Active (Secondary)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-amber-400" />
      Fallback Scraper Active
    </span>
  );
}
