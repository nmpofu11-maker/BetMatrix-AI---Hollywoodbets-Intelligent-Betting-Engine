import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  X, 
  TrendingDown, 
  ArrowRight, 
  Coins, 
  ExternalLink,
  Ban,
  Lock,
  Scale
} from 'lucide-react';
import { BetTicket } from '../types/betting';
import { generatePendingSlipBestSelections } from '../utils/analytics';

interface PendingLossReport {
  ticketId: string;
  stakeZar: number;
  potentialPayoutZar: number;
  overallTicketLossRisk: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  recommendedAction: 'CASH_OUT_IMMEDIATELY' | 'HEDGE_TRAP_LEG' | 'LET_RIDE';
  potentialLossTeams: Array<{
    team: string;
    legMatch?: string;
    legMarket?: string;
    odds?: number;
    hazardLevel: string;
    lossProbabilityPercent: number;
    learnedVolatilityIndex: number;
    learnedFormWeight?: number;
    historicalLossAttributionZar: number;
    priorBustCount: number;
    tacticalFailureReason: string;
    actionableAdvice: string;
  }>;
  safeAnchorTeams: Array<{
    team: string;
    legMatch?: string;
    legMarket?: string;
    odds?: number;
    formWeight: number;
    volatilityIndex: number;
    rating: string;
    assessment: string;
  }>;
  strategicSummary: string;
  hedgingInstructions?: string;
}

interface PendingSlipLossAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PendingLossReport | null;
  ticket: BetTicket | null;
  onBlacklistTeam?: (team: string) => void;
  onOpenCashOutCalculator?: (ticket: BetTicket) => void;
}

export const PendingSlipLossAdvisorModal: React.FC<PendingSlipLossAdvisorModalProps> = ({
  isOpen,
  onClose,
  report,
  ticket,
  onBlacklistTeam,
  onOpenCashOutCalculator,
}) => {
  if (!isOpen || !report || !ticket) return null;

  const isExtreme = report.overallTicketLossRisk === 'EXTREME' || report.overallTicketLossRisk === 'HIGH';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-purple-900/60 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`p-1.5 rounded-lg border ${
                isExtreme
                  ? 'bg-rose-950/80 border-rose-600/60 text-rose-400'
                  : 'bg-emerald-950/80 border-emerald-600/60 text-emerald-400'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-white">
                Pending Slip: Loss Hazard & Trap Assessment
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Cross-referencing pending ticket <span className="font-mono text-amber-300 font-bold">{ticket.id}</span> against all learned team intelligence and prior betting losses.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Verdict Banner */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          report.overallTicketLossRisk === 'EXTREME'
            ? 'bg-rose-950/50 border-rose-600/80 shadow-lg shadow-rose-950/50'
            : report.overallTicketLossRisk === 'HIGH'
            ? 'bg-amber-950/50 border-amber-600/80'
            : 'bg-emerald-950/50 border-emerald-600/80'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${
                report.overallTicketLossRisk === 'EXTREME'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : report.overallTicketLossRisk === 'HIGH'
                  ? 'bg-amber-600 text-slate-950 border-amber-500'
                  : 'bg-emerald-600 text-white border-emerald-500'
              }`}>
                {report.overallTicketLossRisk} LOSS RISK
              </span>
              <span className="text-xs font-bold text-slate-300">
                Action: <strong className="text-white underline">{report.recommendedAction.replace(/_/g, ' ')}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {report.strategicSummary}
            </p>
          </div>

          <div className="shrink-0 text-right bg-slate-950/80 p-3 rounded-xl border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase">Capital at Stake</div>
            <div className="text-lg font-black font-mono text-amber-300">
              R {report.stakeZar.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Potential: R {report.potentialPayoutZar.toLocaleString()}</div>
          </div>
        </div>

        {/* POTENTIAL LOSS TEAMS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Flagged Potential Loss Teams in this Slip ({report.potentialLossTeams.length})
              </h3>
            </div>
            <span className="text-[11px] text-rose-400 font-semibold">
              Based on historical slip collapses & volatility matrices
            </span>
          </div>

          {report.potentialLossTeams.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>No major historical trap teams detected in this pending ticket.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {report.potentialLossTeams.map((hazard, idx) => (
                <div
                  key={`hazard-${hazard.team}-${hazard.legMatch || 'leg'}-${idx}`}
                  className="p-4 rounded-xl bg-slate-950 border border-rose-800/70 hover:border-rose-600 transition space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">{hazard.team}</span>
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-950 text-rose-300 border border-rose-700">
                        {hazard.hazardLevel.replace(/_/g, ' ')}
                      </span>
                      {hazard.odds && (
                        <span className="font-mono text-xs text-amber-300 bg-slate-900 px-2 py-0.5 rounded">
                          Odds: {hazard.odds}x
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-rose-950/60 px-2.5 py-1 rounded border border-rose-900/60 text-rose-300 font-mono font-bold">
                        Loss Risk: {hazard.lossProbabilityPercent}%
                      </div>
                      {onBlacklistTeam && (
                        <button
                          onClick={() => onBlacklistTeam(hazard.team)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition"
                        >
                          <Ban className="w-3 h-3 text-rose-400" />
                          <span>Firewall Quarantine</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {hazard.legMatch && (
                    <div className="text-xs text-slate-400 font-medium">
                      Selection: <span className="text-slate-200">{hazard.legMatch}</span> — Market: <span className="text-amber-300">{hazard.legMarket}</span>
                    </div>
                  )}

                  {/* Tactical Failure Reason */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Learned Tactical Failure Pattern:
                    </span>
                    <p className="text-slate-300 leading-relaxed font-medium">
                      {hazard.tacticalFailureReason}
                    </p>
                  </div>

                  {/* Prior Attribution & Volatility Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Prior Collapsed Slips</div>
                      <div className="font-mono font-bold text-rose-300">
                        {hazard.priorBustCount} Busted Tickets
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Historical Stakes Lost</div>
                      <div className="font-mono font-bold text-rose-400">
                        -R {hazard.historicalLossAttributionZar.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Learned Volatility Index</div>
                      <div className="font-mono font-bold text-amber-300">
                        {hazard.learnedVolatilityIndex}
                      </div>
                    </div>
                  </div>

                  {/* Actionable Advice */}
                  <div className="flex items-start gap-2 text-xs bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg text-amber-200">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block text-[11px]">Recommended Mitigation:</strong>
                      <span>{hazard.actionableAdvice}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SAFE ANCHOR TEAMS IN THIS PENDING SLIP */}
        {report.safeAnchorTeams.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Reliable Banker Anchors in this Slip ({report.safeAnchorTeams.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {report.safeAnchorTeams.map((safe, idx) => (
                <div key={`safe-${safe.team}-${safe.legMatch || 'leg'}-${idx}`} className="p-3 rounded-xl bg-slate-950/80 border border-emerald-900/40">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="text-white">{safe.team}</strong>
                    <span className="text-[10px] font-bold text-emerald-400 font-mono">
                      Form: {safe.formWeight}x
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{safe.assessment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hedging / Cash Out Tactical Guide */}
        {report.hedgingInstructions && (
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              <span>Hollywoodbets Cash-Out / Hedging Instructions:</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-medium">
              {report.hedgingInstructions}
            </p>
          </div>
        )}

        {/* AI Best Suggested Bet Selections for Every Leg */}
        {(() => {
          const legSelections = generatePendingSlipBestSelections(ticket);
          if (!legSelections || !legSelections.legBestSelections) return null;

          return (
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  AI Best Suggested Bet Selections for Every Leg ({legSelections.legBestSelections.length} Legs)
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  Total Odds: {legSelections.suggestedTotalOdds}x (+{legSelections.winProbabilityBoostPercent}% Hit Rate)
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {legSelections.legBestSelections.map((leg, idx) => (
                  <div key={`m-best-${leg.legId}-${idx}`} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{leg.match}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          {leg.recommendationBadge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Pick: <span className="line-through text-slate-500 mr-1">{leg.originalMarket} ({leg.originalOdds}x)</span>
                        👉 <strong className="text-amber-300">{leg.bestSuggestedMarket} ({leg.bestSuggestedOdds}x)</strong>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold block">{leg.expectedValue}</span>
                      <span className="text-[10px] text-purple-300">{leg.confidenceScore}% Conf</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}


        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 font-mono">
            Hollywoodbets AI Defense Engine
          </span>
          <div className="flex items-center gap-2">
            {onOpenCashOutCalculator && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCashOutCalculator(ticket);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Calculate Fair Cash-Out Value</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
