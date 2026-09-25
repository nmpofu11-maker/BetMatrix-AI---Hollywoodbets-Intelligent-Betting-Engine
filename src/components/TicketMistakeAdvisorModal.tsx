import React from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  X, 
  CheckCircle, 
  ArrowRight, 
  BrainCircuit, 
  Flame, 
  TrendingDown, 
  ShieldCheck,
  BookmarkCheck,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { BetTicket, TicketMistakeAnalysis, SelectionMistake } from '../types/betting';

interface TicketMistakeAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: BetTicket | null;
  mistakeAnalysis: TicketMistakeAnalysis | null;
  isLoading?: boolean;
  onQuarantineTeam?: (team: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const TicketMistakeAdvisorModal: React.FC<TicketMistakeAdvisorModalProps> = ({
  isOpen,
  onClose,
  ticket,
  mistakeAnalysis,
  isLoading = false,
  onQuarantineTeam,
  onNavigateTab,
}) => {
  if (!isOpen || !ticket) return null;

  const isPending = ticket.status === 'pending';
  const isLost = ticket.status === 'lost';
  const isWon = ticket.status === 'won';

  const mistakes = mistakeAnalysis?.mistakesIdentified || [];
  const rules = mistakeAnalysis?.strategicRulesLearned || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className={`p-6 border-b ${
          isLost 
            ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-rose-800/60' 
            : isPending
            ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-800/60'
            : 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-800/60'
        } flex items-start justify-between gap-4`}>
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isLost
                ? 'bg-rose-900/40 text-rose-400 border-rose-700/60'
                : isPending
                ? 'bg-amber-900/40 text-amber-400 border-amber-700/60'
                : 'bg-emerald-900/40 text-emerald-400 border-emerald-700/60'
            }`}>
              {isLost ? (
                <TrendingDown className="w-6 h-6 text-rose-400" />
              ) : isPending ? (
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                  isLost
                    ? 'bg-rose-500 text-white'
                    : isPending
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  {isLost ? 'PAST SLIP POST-MORTEM' : isPending ? 'PRE-EMPTIVE PENDING MISTAKE AUDIT' : 'SELECTION EFFICIENCY AUDIT'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Ticket #{ticket.id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {isLost 
                  ? 'AI Selection Mistake Diagnosis & Root Cause' 
                  : isPending 
                  ? 'Active Slip Flaw & Loss Hazard Review' 
                  : 'Winning Slip Quality & Hidden Variance Audit'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {isLost
                  ? 'Detailed evaluation of the tactical errors, market overconfidence, and trap teams that busted this ticket.'
                  : isPending
                  ? 'Strategic flaws discovered in your pending selections before matches commence to prevent loss.'
                  : 'Analysis of whether this win was high positive EV or involved fragile high-risk variance.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Quick Ticket Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stake Staked</span>
              <span className="text-base font-black text-white font-mono">R{ticket.stakeZar.toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Combined Odds</span>
              <span className="text-base font-black text-amber-400 font-mono">{ticket.totalOdds}x</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leg Count</span>
              <span className="text-base font-black text-white font-mono">{ticket.legs.length} Legs</span>
            </div>
            <div className={`p-3 rounded-xl border ${
              isLost
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : isPending
                ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider block">Status</span>
              <span className="text-base font-black font-mono uppercase">{ticket.status}</span>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-8 rounded-xl bg-slate-800/40 border border-slate-700 text-center space-y-3">
              <BrainCircuit className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-200">
                Auditing betting selections against learned Bayesian volatility matrices...
              </p>
            </div>
          )}

          {/* Executive Summary Card */}
          {mistakeAnalysis && !isLoading && (
            <div className={`p-4 rounded-xl border ${
              isLost
                ? 'bg-rose-950/20 border-rose-700/40 text-rose-100'
                : isPending
                ? 'bg-amber-950/20 border-amber-700/40 text-amber-100'
                : 'bg-slate-800/60 border-slate-700 text-slate-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Executive AI Diagnosis:</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-200">
                {mistakeAnalysis.executiveSummary}
              </p>
              {mistakeAnalysis.recommendedMitigationOrCorrection && (
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-start gap-2 text-xs">
                  <span className="font-bold text-amber-400 shrink-0">Immediate Action:</span>
                  <span className="text-slate-300">{mistakeAnalysis.recommendedMitigationOrCorrection}</span>
                </div>
              )}
            </div>
          )}

          {/* Identified Selection Mistakes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Identified Selection & Market Mistakes ({mistakes.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Calibrated against continuous Hollywoodbets learning
              </span>
            </div>

            {mistakes.length === 0 && !isLoading && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-center">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300">
                  No structural mistakes detected. Selections align with mathematical positive expectation and safe volatility bounds.
                </p>
              </div>
            )}

            {mistakes.map((mistake, idx) => (
              <div 
                key={`mistake-${mistake.category}-${idx}`}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 hover:border-slate-600 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        mistake.severity === 'CRITICAL'
                          ? 'bg-rose-500 text-white'
                          : mistake.severity === 'HIGH'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {mistake.severity} ERROR
                      </span>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                        {mistake.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">
                      {mistake.title}
                    </h4>
                  </div>

                  {mistake.targetTeam && onQuarantineTeam && (
                    <button
                      onClick={() => onQuarantineTeam(mistake.targetTeam!)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
                      title="Add to Anti-Loss Firewall"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Quarantine {mistake.targetTeam}</span>
                    </button>
                  )}
                </div>

                {mistake.legMatch && (
                  <div className="text-xs text-slate-300 flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-400">Match & Market:</span>
                    <span className="text-white font-mono">{mistake.legMatch}</span>
                    <span className="text-amber-400 font-mono">[{mistake.marketPicked}]</span>
                  </div>
                )}

                <p className="text-xs text-slate-300 leading-relaxed">
                  {mistake.explanation}
                </p>

                {/* Evidence & Learned Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Learned Data Reference</span>
                    <span className="text-slate-300 font-mono text-[11px]">{mistake.learnedDataReference}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-0.5">Recommended Better Alternative</span>
                    <span className="text-emerald-200 text-[11px]">{mistake.betterAlternative}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Golden Rules Learned From This Slip */}
          {rules.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/60 space-y-3">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Strategic Rules Learned From This Slip
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                The continuous learning engine has added these protocol rules to prevent repeating this exact capital loss:
              </p>
              <div className="space-y-1.5">
                {rules.map((rule, idx) => (
                  <div key={`learned-rule-${idx}`} className="flex items-start gap-2 text-xs text-purple-200 bg-purple-950/30 p-2 rounded-lg border border-purple-900/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legs Breakdown of Ticket */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ticket Selections Overview ({ticket.legs.length} Legs)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ticket.legs.map((leg, i) => (
                <div
                  key={`${leg.id || 'leg'}-${i}`}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    leg.status === 'won'
                      ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200'
                      : leg.status === 'pending'
                      ? 'bg-purple-950/20 border-purple-900/50 text-purple-200'
                      : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                  }`}
                >
                  <div>
                    <span className="font-bold text-white block">{leg.match || `${leg.homeTeam} vs ${leg.awayTeam}`}</span>
                    <span className="text-[10px] text-slate-400">{leg.market}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold block">{leg.odds}x</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      leg.status === 'won'
                        ? 'bg-emerald-500 text-slate-950'
                        : leg.status === 'pending'
                        ? 'bg-purple-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {leg.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Engine: Continuous Bayesian Mistake Detector v4.9
          </div>

          <div className="flex items-center gap-2">
            {onNavigateTab && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('traps');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                View Trap Radar
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20"
            >
              Close & Apply Rules
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
