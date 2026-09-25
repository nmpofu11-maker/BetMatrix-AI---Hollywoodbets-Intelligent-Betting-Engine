import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  TrendingUp, 
  AlertCircle, 
  Layers, 
  Copy, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Scale,
  Plus
} from 'lucide-react';
import { BetTicket, SuperLearningIntelligenceState, TodaysFeaturedSlip } from '../types/betting';
import { generatePendingSlipBestSelections } from '../utils/analytics';

interface PendingSlipBestSelectionsCardProps {
  pendingTickets: BetTicket[];
  intelligenceState: SuperLearningIntelligenceState;
  onAddCustomFeaturedSlip?: (slip: TodaysFeaturedSlip) => void;
  onLoadIntoValidator?: (ticket: BetTicket) => void;
  onOpenCashOutCalculator?: (ticket: BetTicket) => void;
  onShowToast?: (msg: string) => void;
}

export const PendingSlipBestSelectionsCard: React.FC<PendingSlipBestSelectionsCardProps> = ({
  pendingTickets,
  intelligenceState,
  onAddCustomFeaturedSlip,
  onLoadIntoValidator,
  onOpenCashOutCalculator,
  onShowToast,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    pendingTickets[0]?.id || ''
  );
  const [expandedLegs, setExpandedLegs] = useState<Record<string, boolean>>({});

  if (!pendingTickets || pendingTickets.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3 my-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/40 text-purple-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No Pending Uploaded Slips Detected</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Upload or import your Hollywoodbets bet slip (or ticket number) to receive match-by-match AI best bet selections, win probability boosts, and tactical market recommendations.
        </p>
      </div>
    );
  }

  const activeTicket = pendingTickets.find(t => t.id === selectedTicketId) || pendingTickets[0];
  const audit = generatePendingSlipBestSelections(activeTicket, intelligenceState);

  if (!audit) return null;

  const toggleExpandLeg = (legId: string) => {
    setExpandedLegs(prev => ({ ...prev, [legId]: !prev[legId] }));
  };

  const handleGenerateOptimizedSlip = () => {
    if (!onAddCustomFeaturedSlip) return;

    const newSlip: TodaysFeaturedSlip = {
      id: `ai-opt-${activeTicket.id}-${Date.now()}`,
      title: `AI Best Selections: Ticket #${activeTicket.id}`,
      strategyCategory: 'DEFENSIVE_DOUBLE_CHANCE',
      riskLevel: 'LOW',
      confidenceScore: Math.round(
        audit.legBestSelections.reduce((acc, l) => acc + l.confidenceScore, 0) / audit.legBestSelections.length
      ),
      totalOdds: audit.suggestedTotalOdds,
      recommendedStakeZar: activeTicket.stakeZar,
      estimatedReturnZar: Number((activeTicket.stakeZar * audit.suggestedTotalOdds).toFixed(2)),
      aiRationale: `AI-Optimized version derived from pending slip #${activeTicket.id}. Replaced volatile 1X2 legs with Double Chance & Goals markets for +${audit.winProbabilityBoostPercent}% higher hit rate.`,
      trapCheckStatus: 'TACTICAL_DOUBLE_CHANCE_APPLIED',
      curatedBy: 'AI_SUPER_LEARNING_ENGINE',
      dateAdded: 'Today',
      legs: audit.legBestSelections.map(l => ({
        id: `opt-leg-${l.legId}`,
        match: l.match,
        homeTeam: l.homeTeam,
        awayTeam: l.awayTeam,
        league: l.league || 'Football',
        market: l.bestSuggestedMarket,
        odds: l.bestSuggestedOdds,
        reasoning: l.reasoning,
        confidenceScore: l.confidenceScore,
        isAnchor: l.recommendationType === 'KEEP_ORIGINAL',
      })),
    };

    onAddCustomFeaturedSlip(newSlip);
    if (onShowToast) {
      onShowToast(`🎉 Created AI-Optimized slip version with best bet selections for Ticket #${activeTicket.id}!`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/40 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-5 my-4">
      
      {/* Top Banner & Ticket Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-950/50 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                AI Best Bet Advisor
              </span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +{audit.winProbabilityBoostPercent}% Win Rate Boost
              </span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Best Suggested Bet Selections for Pending Uploaded Slips
            </h2>
          </div>
        </div>

        {/* Ticket Selector Dropdown if multiple */}
        {pendingTickets.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium pl-2">Select Slip:</span>
            <select
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              className="bg-slate-950 text-amber-300 font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 border border-purple-800/60 focus:outline-none focus:border-amber-400"
            >
              {pendingTickets.map(t => (
                <option key={t.id} value={t.id}>
                  #{t.id} ({t.legs.length} Legs — R{t.stakeZar} Stake)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 text-xs">
        <div>
          <span className="text-slate-400 uppercase text-[10px] font-semibold block">Ticket ID</span>
          <span className="font-mono font-bold text-amber-300 text-sm">{activeTicket.id}</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase text-[10px] font-semibold block">Original Total Odds</span>
          <span className="font-mono font-bold text-slate-200 text-sm">{audit.originalTotalOdds}x</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase text-[10px] font-semibold block">AI Best Total Odds</span>
          <span className="font-mono font-bold text-purple-300 text-sm">{audit.suggestedTotalOdds}x</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase text-[10px] font-semibold block">Potential Return</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            R {(activeTicket.stakeZar * audit.suggestedTotalOdds).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* AI Strategy Verdict Summary */}
      <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 leading-relaxed font-medium flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block text-[11px] uppercase tracking-wider mb-0.5">
            AI Tactical Assessment & Best Bet Recommendation:
          </strong>
          <span>{audit.strategicAdviceSummary}</span>
        </div>
      </div>

      {/* Match-by-Match Best Bet Selections Table/Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            Leg-by-Leg Best Bet Selections ({audit.legBestSelections.length} Matches)
          </h3>
          <span className="text-[11px] text-slate-400">
            Original Pick <span className="text-amber-400">VS</span> AI Suggested Best Selection
          </span>
        </div>

        <div className="space-y-2.5">
          {audit.legBestSelections.map((leg, idx) => {
            const isModified = leg.recommendationType !== 'KEEP_ORIGINAL';
            const isExpanded = !!expandedLegs[leg.legId];

            return (
              <div
                key={leg.legId || `leg-${idx}`}
                className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                  isModified
                    ? 'bg-gradient-to-r from-slate-950 via-purple-950/20 to-slate-950 border-purple-700/60 hover:border-purple-500'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">{leg.match}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                      {leg.league}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      isModified
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    }`}>
                      {leg.recommendationBadge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {leg.expectedValue}
                    </span>
                    <span className="font-mono text-purple-300 font-bold">
                      Confidence: {leg.confidenceScore}%
                    </span>
                  </div>
                </div>

                {/* Selection Comparison Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Original Pick */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Your Original Pick</div>
                    <div className="font-semibold text-slate-200">
                      {leg.originalMarket}
                    </div>
                    <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                      Odds: {leg.originalOdds}x
                    </div>
                  </div>

                  {/* AI Best Selection */}
                  <div className={`p-2.5 rounded-lg border ${
                    isModified
                      ? 'bg-purple-950/60 border-purple-600/70'
                      : 'bg-emerald-950/60 border-emerald-600/70'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-purple-300 mb-0.5 flex items-center justify-between">
                      <span>AI Best Suggested Selection</span>
                      {isModified && <Sparkles className="w-3 h-3 text-amber-300" />}
                    </div>
                    <div className="font-black text-white">
                      {leg.bestSuggestedMarket}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-300 mt-0.5">
                      Odds: {leg.bestSuggestedOdds}x
                    </div>
                  </div>
                </div>

                {/* AI Rationale */}
                <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium text-slate-300">
                    {leg.reasoning}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          Evaluated against Hollywoodbets matrix & continuous learning model.
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenCashOutCalculator && (
            <button
              onClick={() => onOpenCashOutCalculator(activeTicket)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Cash-Out Calculator</span>
            </button>
          )}

          {onLoadIntoValidator && (
            <button
              onClick={() => onLoadIntoValidator(activeTicket)}
              className="px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 text-xs font-bold border border-purple-700/60 flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-300" />
              <span>Customize in Validator</span>
            </button>
          )}

          {onAddCustomFeaturedSlip && (
            <button
              onClick={handleGenerateOptimizedSlip}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition shadow-lg shadow-purple-950/50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate AI-Optimized Version of This Slip</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
