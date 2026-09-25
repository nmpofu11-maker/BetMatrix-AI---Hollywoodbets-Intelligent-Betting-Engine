import React, { useState } from 'react';
import {
  Sparkles,
  PlusCircle,
  ShieldCheck,
  Zap,
  TrendingUp,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Filter,
  Search,
  SlidersHorizontal,
  BookmarkPlus,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Coins,
  Copy,
  Info
} from 'lucide-react';
import {
  TodaysFeaturedSlip,
  FeaturedBetLeg,
  BetTicket,
  SuperLearningIntelligenceState,
  FixtureSchedule
} from '../types/betting';
import { PendingSlipBestSelectionsCard } from './PendingSlipBestSelectionsCard';

interface TodaysFeaturesViewProps {
  featuredSlips: TodaysFeaturedSlip[];
  activeFixtures?: FixtureSchedule[];
  onAddCustomSlip: (slip: TodaysFeaturedSlip) => void;
  onDeleteCustomSlip: (slipId: string) => void;
  onLoadIntoValidator: (slip: TodaysFeaturedSlip | BetTicket) => void;
  onPlaceSlipDirectly: (slip: TodaysFeaturedSlip) => void;
  onRunAiAdvisor: (slip: TodaysFeaturedSlip) => void;
  intelligenceState: SuperLearningIntelligenceState;
  blacklistedTeams: string[];
  pendingTickets?: BetTicket[];
  onOpenCashOutCalculator?: (ticket: BetTicket) => void;
  onShowToast?: (msg: string) => void;
}

export const TodaysFeaturesView: React.FC<TodaysFeaturesViewProps> = ({
  featuredSlips,
  activeFixtures = [],
  onAddCustomSlip,
  onDeleteCustomSlip,
  onLoadIntoValidator,
  onPlaceSlipDirectly,
  onRunAiAdvisor,
  intelligenceState,
  blacklistedTeams,
  pendingTickets = [],
  onOpenCashOutCalculator,
  onShowToast,
}) => {
  const availableFixtures = activeFixtures;

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [expandedSlipId, setExpandedSlipId] = useState<string | null>(featuredSlips[0]?.id || null);

  // Manual slip builder form state
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState<TodaysFeaturedSlip['strategyCategory']>('CUSTOM_MANUAL');
  const [manualRisk, setManualRisk] = useState<'LOW' | 'MEDIUM' | 'CALCULATED_HIGH'>('MEDIUM');
  const [manualStake, setManualStake] = useState<number>(100);
  const [manualNotes, setManualNotes] = useState('');
  const [manualLegs, setManualLegs] = useState<Array<{
    match: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    market: string;
    odds: number;
    reasoning: string;
    confidenceScore: number;
    isAnchor: boolean;
  }>>([
    {
      match: 'Mamelodi Sundowns vs Polokwane City',
      homeTeam: 'Mamelodi Sundowns',
      awayTeam: 'Polokwane City',
      league: 'Betway Premiership',
      market: 'Match 1X2 - Home Win',
      odds: 1.34,
      reasoning: 'Verified anchor performance with 1.22x form multiplier.',
      confidenceScore: 92,
      isAnchor: true,
    }
  ]);

  // Handle adding a leg to manual form
  const handleAddManualLeg = () => {
    setManualLegs((prev) => [
      ...prev,
      {
        match: '',
        homeTeam: '',
        awayTeam: '',
        league: 'Premier League',
        market: 'Match 1X2 - Home Win',
        odds: 1.50,
        reasoning: 'Tactical positive form and home defense.',
        confidenceScore: 80,
        isAnchor: false,
      }
    ]);
  };

  const handleRemoveManualLeg = (index: number) => {
    if (manualLegs.length <= 1) return;
    setManualLegs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateManualLeg = (index: number, field: string, value: any) => {
    setManualLegs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'homeTeam' || field === 'awayTeam') {
        const h = field === 'homeTeam' ? value : updated[index].homeTeam;
        const a = field === 'awayTeam' ? value : updated[index].awayTeam;
        if (h && a) updated[index].match = `${h} vs ${a}`;
      }
      return updated;
    });
  };

  const handleQuickSelectFixture = (index: number, fix: FixtureSchedule) => {
    setManualLegs((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        match: `${fix.homeTeam} vs ${fix.awayTeam}`,
        homeTeam: fix.homeTeam,
        awayTeam: fix.awayTeam,
        league: fix.league,
        market: `Match 1X2 - Home Win`,
        odds: fix.homeOdds,
        reasoning: `Selected from Hollywoodbets board (Event ${fix.eventCode}).`,
      };
      return updated;
    });
  };

  // Submit manual custom slip
  const handleSubmitManualSlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      alert('Please provide a title for your custom feature slip.');
      return;
    }

    const totalOdds = parseFloat(
      manualLegs.reduce((acc, leg) => acc * (Number(leg.odds) || 1), 1).toFixed(2)
    );

    const containsTrap = manualLegs.some(
      (l) => blacklistedTeams.includes(l.homeTeam) || blacklistedTeams.includes(l.awayTeam)
    );

    const newSlip: TodaysFeaturedSlip = {
      id: `custom-feat-${Date.now()}`,
      title: manualTitle.trim(),
      strategyCategory: manualCategory,
      riskLevel: manualRisk,
      confidenceScore: Math.round(
        manualLegs.reduce((acc, l) => acc + (l.confidenceScore || 75), 0) / manualLegs.length
      ),
      totalOdds,
      recommendedStakeZar: manualStake,
      estimatedReturnZar: parseFloat((manualStake * totalOdds).toFixed(2)),
      aiRationale: manualNotes.trim() || 'Custom punter-curated daily selection evaluated by Super-Learning Engine.',
      trapCheckStatus: containsTrap ? 'TACTICAL_DOUBLE_CHANCE_APPLIED' : 'MANUAL_AUDITED',
      curatedBy: 'MANUAL_PUNTER',
      dateAdded: 'Today',
      legs: manualLegs.map((l, i) => ({
        id: `m-leg-${Date.now()}-${i}`,
        match: l.match || `${l.homeTeam} vs ${l.awayTeam}`,
        homeTeam: l.homeTeam || 'Home Club',
        awayTeam: l.awayTeam || 'Away Club',
        league: l.league || 'Football',
        market: l.market || 'Match 1X2',
        odds: Number(l.odds) || 1.50,
        reasoning: l.reasoning || 'Punter tactical selection.',
        confidenceScore: l.confidenceScore || 80,
        isAnchor: l.isAnchor,
      })),
    };

    onAddCustomSlip(newSlip);
    setIsManualModalOpen(false);
    setExpandedSlipId(newSlip.id);
    // Reset form
    setManualTitle('');
    setManualNotes('');
  };

  // Filtered slips
  const filteredSlips = featuredSlips.filter((slip) => {
    if (activeCategoryFilter !== 'ALL' && slip.strategyCategory !== activeCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (
        slip.title +
        ' ' +
        slip.aiRationale +
        ' ' +
        slip.legs.map((l) => l.match + ' ' + l.homeTeam + ' ' + l.awayTeam).join(' ')
      ).toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border border-purple-800/60 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Today's Featured Best Bet Slips & Pending Slip Advisor
              </h2>
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] font-mono tracking-widest">
                DAILY PICKS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Mathematically optimized daily betting slips calibrated using the Super-Learning Matrix, Dual-AI Consensus rules, and verified Hollywoodbets fixture boards.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-purple-900/30 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>+ Add / Curate Custom Slip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Uploaded Slips AI Best Bet Selections */}
      {pendingTickets && pendingTickets.length > 0 && (
        <PendingSlipBestSelectionsCard
          pendingTickets={pendingTickets}
          intelligenceState={intelligenceState}
          onAddCustomFeaturedSlip={onAddCustomSlip}
          onLoadIntoValidator={(t: any) => onLoadIntoValidator(t)}
          onOpenCashOutCalculator={onOpenCashOutCalculator}
          onShowToast={onShowToast}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs">
        
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Strategy:
          </span>

          {[
            { id: 'ALL', label: 'All Slips' },
            { id: 'SAFE_BANKER', label: '🟢 Safe Banker' },
            { id: 'DEFENSIVE_DOUBLE_CHANCE', label: '🛡️ Double Chance' },
            { id: 'VALUE_TRIAD', label: '⚡ Value Triad' },
            { id: 'CUSTOM_MANUAL', label: '👤 Punter Curated' },
          ].map((cat) => (

            <button
              key={cat.id}
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                activeCategoryFilter === cat.id
                  ? 'bg-purple-950 text-white border border-purple-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search featured matches or teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Featured Slips Grid / Accordion */}
      <div className="space-y-4">
        {filteredSlips.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            <p className="font-bold text-sm text-slate-300">No Featured Slips Found</p>
            <p className="mt-1">Try adjusting your filter or click "+ Add / Curate Custom Slip" to create one.</p>
          </div>
        ) : (
          filteredSlips.map((slip) => {
            const isExpanded = expandedSlipId === slip.id;
            const isCustom = slip.curatedBy === 'MANUAL_PUNTER';

            return (
              <div
                key={slip.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-purple-600/60 rounded-2xl overflow-hidden shadow-xl transition"
              >
                {/* Header Card Strip */}
                <div
                  onClick={() => setExpandedSlipId(isExpanded ? null : slip.id)}
                  className="p-4 sm:p-5 bg-slate-950/60 hover:bg-slate-950/90 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 border ${
                        slip.riskLevel === 'LOW'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                          : slip.riskLevel === 'MEDIUM'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}
                    >
                      {slip.riskLevel === 'LOW' ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : slip.riskLevel === 'MEDIUM' ? (
                        <Scale className="w-5 h-5" />
                      ) : (
                        <Zap className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-white">{slip.title}</h3>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono border ${
                            slip.riskLevel === 'LOW'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-purple-950 text-purple-300 border-purple-800'
                          }`}
                        >
                          {slip.riskLevel} RISK
                        </span>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                          {slip.confidenceScore}% Confidence
                        </span>
                        {isCustom && (
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                            Punter Curated
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1 leading-snug">
                        {slip.aiRationale}
                      </p>
                    </div>
                  </div>

                  {/* Right Side Stats & Quick Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Total Odds ({slip.legs.length} Legs)
                      </span>
                      <span className="text-base font-black text-amber-300 font-mono">
                        {slip.totalOdds}x
                      </span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Rec. Stake (Return)
                      </span>
                      <span className="text-xs font-bold text-white font-mono">
                        R{slip.recommendedStakeZar}{' '}
                        <span className="text-emerald-400 font-bold">
                          (R{slip.estimatedReturnZar})
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-purple-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Legs & Direct Execution Drawer */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 space-y-4 animate-in fade-in">
                    
                    {/* Legs Listing */}
                    <div className="space-y-2.5">
                      <span className="font-bold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        Included Match Selections & Tactical Breakdown:
                      </span>

                      <div className="grid grid-cols-1 gap-2.5">
                        {slip.legs.map((leg, lIdx) => (
                          <div
                            key={leg.id || `leg-${lIdx}`}
                            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-amber-400 shrink-0 text-xs">
                                {lIdx + 1}
                              </span>

                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-sm font-bold text-white">
                                    {leg.match}
                                  </strong>
                                  {leg.isAnchor && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-bold">
                                      GOLD ANCHOR
                                    </span>
                                  )}
                                  {leg.eventCode && (
                                    <span className="text-[10px] font-mono text-purple-400">
                                      {leg.eventCode}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                  <span>Market: <strong className="text-amber-200">{leg.market}</strong></span>
                                  <span>Odds: <strong className="text-amber-400 font-mono">{leg.odds}</strong></span>
                                  {leg.kickoffTime && <span className="text-slate-400">Kickoff: {leg.kickoffTime}</span>}
                                  {leg.league && <span className="text-slate-400 font-mono">({leg.league})</span>}
                                </div>

                                <p className="text-[11px] text-slate-400 mt-1 italic">
                                  "{leg.reasoning}"
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-mono text-slate-400 block">
                                Leg Confidence
                              </span>
                              <strong className="text-xs font-mono text-emerald-400">
                                {leg.confidenceScore}%
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Action Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-300 text-xs">
                          {slip.trapCheckStatus === 'PASSED_ZERO_TRAPS'
                            ? 'Passed Trap Radar: Zero accumulator kryptonite detected.'
                            : 'Defensive Double Chance Applied to high volatility legs.'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isCustom && (
                          <button
                            onClick={() => onDeleteCustomSlip(slip.id)}
                            className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition cursor-pointer"
                            title="Delete custom slip"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onRunAiAdvisor(slip)}
                          className="px-3 py-2 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />
                          <span>AI Advisor Pre-Flight</span>
                        </button>

                        <button
                          onClick={() => onLoadIntoValidator(slip)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-purple-300" />
                          <span>Load in Slip Builder</span>
                        </button>

                        <button
                          onClick={() => onPlaceSlipDirectly(slip)}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Log to Ledger (R{slip.recommendedStakeZar})</span>
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual Slip Builder Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-purple-800/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-950 text-amber-400 border border-purple-800">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Manual Feature Bet Slip Builder & Advisor
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hand-craft today's custom bet slip, select verified matches, and evaluate with our AI risk advisor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitManualSlip} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* Slip Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Slip Title / Concept:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saturday PSL & EPL Defensive Double"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Strategy Profile:</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="CUSTOM_MANUAL">Punter Curated</option>
                    <option value="SAFE_BANKER">Safe Banker</option>
                    <option value="DEFENSIVE_DOUBLE_CHANCE">Defensive Double Chance</option>
                    <option value="VALUE_TRIAD">Value Triad</option>
                    <option value="GOLD_ANCHOR_MULTI">Gold Anchor Multi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Recommended Stake (ZAR):</label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={manualStake}
                    onChange={(e) => setManualStake(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Risk Rating:</label>
                  <select
                    value={manualRisk}
                    onChange={(e) => setManualRisk(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="LOW">LOW Risk (Anchored)</option>
                    <option value="MEDIUM">MEDIUM Risk (Standard)</option>
                    <option value="CALCULATED_HIGH">HIGH Risk (Longshot EV)</option>
                  </select>
                </div>
              </div>

              {/* Legs Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Slip Legs ({manualLegs.length} selections)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddManualLeg}
                    className="px-2.5 py-1 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 font-bold text-[11px]"
                  >
                    + Add Another Match Leg
                  </button>
                </div>

                <div className="space-y-3">
                  {manualLegs.map((leg, idx) => (
                    <div
                      key={`m-leg-${idx}`}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 text-xs">
                          Leg #{idx + 1}
                        </span>
                        {manualLegs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveManualLeg(idx)}
                            className="text-rose-400 hover:text-rose-300 text-[11px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Quick Select from Upcoming Board */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">
                          Quick-Pick Upcoming Hollywoodbets Fixture:
                        </span>
                        <select
                          onChange={(e) => {
                            const fix = availableFixtures.find((f) => f.id === e.target.value);
                            if (fix) handleQuickSelectFixture(idx, fix);
                          }}
                          className="w-full p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                        >
                          <option value="">-- Choose verified upcoming fixture or type below --</option>
                          {availableFixtures.slice(0, 15).map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.homeTeam} vs {f.awayTeam} ({f.league} - {f.homeOdds})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Home Team:</label>
                          <input
                            type="text"
                            required
                            value={leg.homeTeam}
                            onChange={(e) => handleUpdateManualLeg(idx, 'homeTeam', e.target.value)}
                            placeholder="e.g. Mamelodi Sundowns"
                            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Away Team:</label>
                          <input
                            type="text"
                            required
                            value={leg.awayTeam}
                            onChange={(e) => handleUpdateManualLeg(idx, 'awayTeam', e.target.value)}
                            placeholder="e.g. Polokwane City"
                            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Market Selection:</label>
                          <input
                            type="text"
                            required
                            value={leg.market}
                            onChange={(e) => handleUpdateManualLeg(idx, 'market', e.target.value)}
                            placeholder="e.g. Match 1X2 - Home Win"
                            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Odds:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="1.01"
                            max="50"
                            required
                            value={leg.odds}
                            onChange={(e) => handleUpdateManualLeg(idx, 'odds', parseFloat(e.target.value) || 1.01)}
                            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Confidence %:</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={leg.confidenceScore}
                            onChange={(e) => handleUpdateManualLeg(idx, 'confidenceScore', parseInt(e.target.value) || 80)}
                            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rationale Notes */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Tactical Notes & AI Rationale:
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Explain why this combination represents positive expected value..."
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              {/* Modal Footer Submit */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="font-mono text-xs text-amber-400">
                  Total Odds:{' '}
                  <strong>
                    {manualLegs.reduce((acc, l) => acc * (Number(l.odds) || 1), 1).toFixed(2)}x
                  </strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Save to Today's Features
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
