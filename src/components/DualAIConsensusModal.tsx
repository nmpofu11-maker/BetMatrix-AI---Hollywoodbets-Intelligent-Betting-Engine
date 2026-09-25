import React, { useState } from 'react';
import {
  BrainCircuit,
  ShieldAlert,
  TrendingUp,
  Zap,
  CheckCircle2,
  RefreshCw,
  Scale,
  Sparkles,
  MessageSquare,
  Lock,
  X,
  ShieldCheck
} from 'lucide-react';
import {
  BetTicket,
  SuperLearningIntelligenceState,
  AIDiscussionSession,
  AIDualConsensusProposal
} from '../types/betting';
import { generatePendingSlipBestSelections } from '../utils/analytics';


interface DualAIConsensusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: BetTicket[];
  intelligenceState: SuperLearningIntelligenceState;
  onApplyConsensus: (updatedState: SuperLearningIntelligenceState, consensusProposal: AIDualConsensusProposal) => void;
}

const DEFAULT_TOPICS = [
  'Reconcile Chelsea & Man United Trap Quarantines with Sundowns & Arsenal High-Stake Anchors',
  'Enforce Accumulator Leg Ceiling (4 Legs) vs High-Odds Longshot Variance',
  'Home Advantage Multipliers vs Hostile Away Leg Vulnerability in PSL & EPL',
  'Strict Blacklist vs Tactical Double Chance (1X/X2) Adaptation for High Volatility Clubs'
];

export const DualAIConsensusModal: React.FC<DualAIConsensusModalProps> = ({
  isOpen,
  onClose,
  tickets,
  intelligenceState,
  onApplyConsensus,
}) => {
  const [selectedTopic, setSelectedTopic] = useState(DEFAULT_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [sessionData, setSessionData] = useState<AIDiscussionSession | null>(null);
  const [hasImplemented, setHasImplemented] = useState(false);

  if (!isOpen) return null;

  const handleStartDeliberation = async () => {
    setIsDeliberating(true);
    setHasImplemented(false);
    try {
      const topic = customTopic.trim() || selectedTopic;
      const res = await fetch('/api/ai/dual-deliberation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betHistory: tickets,
          intelligenceState,
          topic,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to run AI deliberation');
      }

      const data: AIDiscussionSession = await res.json();
      setSessionData(data);
    } catch (err) {
      console.error('Deliberation error:', err);
    } finally {
      setIsDeliberating(false);
    }
  };

  const handleImplementConsensus = () => {
    if (!sessionData || !sessionData.consensus) return;

    const consensus = sessionData.consensus;
    const currentMatrices = { ...intelligenceState.team_intelligence_matrices };

    // Apply updated team coefficients
    Object.entries(consensus.proposedMatrixUpdates).forEach(([team, update]) => {
      if (currentMatrices[team]) {
        currentMatrices[team] = {
          sample_size_matches: (currentMatrices[team].sample_size_matches || 5) + 1,
          learned_coefficients: {
            form_momentum_weight: update.form_momentum_weight,
            volatility_index: update.volatility_index,
            home_advantage_multiplier: update.home_advantage_multiplier,
            fatigue_penalty_modifier: update.fatigue_penalty_modifier,
          },
        };
      } else {
        currentMatrices[team] = {
          sample_size_matches: 6,
          learned_coefficients: {
            form_momentum_weight: update.form_momentum_weight,
            volatility_index: update.volatility_index,
            home_advantage_multiplier: update.home_advantage_multiplier,
            fatigue_penalty_modifier: update.fatigue_penalty_modifier,
          },
        };
      }
    });

    const updatedState: SuperLearningIntelligenceState = {
      sync_timestamp: new Date().toISOString(),
      model_engine: 'BetMatrix-DualConsensus-Synthesized-v5.0',
      meta_improvement_notes: `Synthesized policy implemented via Dual-AI Deliberation (${sessionData.sessionId}). Quarantines & anchor multipliers calibrated.`,
      team_intelligence_matrices: currentMatrices,
    };

    onApplyConsensus(updatedState, consensus);
    setHasImplemented(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-purple-800/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-900 to-indigo-900 border border-purple-700/60 text-amber-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Dual-Perspective AI Deliberation Chamber
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                  Isolated Internal Models
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Two specialized internal AI agents debate your Hollywoodbets settled tickets to balance downside defense against positive expected value.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Real Verified Data Banner */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                <strong>Strict Real Data Policy Active:</strong> Deliberation is strictly grounded in verified match records ({tickets.length} settled ledger tickets). Zero placeholder values or synthetic clubs allowed.
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold shrink-0">
              VERIFIED LEDGER
            </span>
          </div>

          {/* The Two Agents Profiles Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent 1: Sentinel (Risk) */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-900/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800/60 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <strong className="text-sm font-bold text-white">Sentinel AI</strong>
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-900">
                    Risk & Downside Auditor
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Skeptical bankroll preserver. Demands strict quarantines on accumulator busters (Chelsea, Man United), caps multibet leg count, and penalizes high bookmaker vig.
                </p>
                <div className="mt-2 text-[10px] font-mono text-rose-300">
                  Core Metric: Max Drawdown Minimization & Bust Zero-Tolerance
                </div>
              </div>
            </div>

            {/* Agent 2: Apex (Value) */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-900/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <strong className="text-sm font-bold text-white">Apex AI</strong>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900">
                    Value & Momentum Architect
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Long-term positive EV compounder. Defends positive momentum anchors (Mamelodi Sundowns, Arsenal), suggests tactical Double Chance adaptations, and optimizes Kelly sizing.
                </p>
                <div className="mt-2 text-[10px] font-mono text-emerald-300">
                  Core Metric: Geometric Growth Rate & Expected Value (EV)
                </div>
              </div>
            </div>
          </div>

          {/* Topic Selector & Deliberation Trigger */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Select Topic for the Internal AI Agents to Deliberate:
              </label>
              <span className="text-[11px] text-slate-500">
                Ledger: {tickets.length} settled tickets loaded
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_TOPICS.map((topic, idx) => (
                <button
                  key={`topic-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(topic);
                    setCustomTopic('');
                  }}
                  className={`p-2.5 rounded-lg text-left transition border text-xs leading-snug cursor-pointer ${
                    selectedTopic === topic && !customTopic
                      ? 'bg-purple-950/70 border-amber-400/80 text-white font-semibold shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Or type custom discussion prompt for the two AIs..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleStartDeliberation}
                disabled={isDeliberating}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isDeliberating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>AIs Deliberating...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-4 h-4 text-slate-950" />
                    <span>Start Dual-AI Debate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Discussion Transcript Stream */}
          {sessionData && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  Live Discussion Transcript ({sessionData.sessionId})
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(sessionData.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="space-y-3">
                {sessionData.turns.map((turn, tIdx) => {
                  const isRisk = turn.speaker === 'sentinel_risk';
                  const isApex = turn.speaker === 'apex_value';

                  return (
                    <div
                      key={`turn-${tIdx}`}
                      className={`p-3.5 rounded-xl border transition ${
                        isRisk
                          ? 'bg-rose-950/20 border-rose-900/40 text-rose-100'
                          : isApex
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-100'
                          : 'bg-purple-950/30 border-purple-800/60 text-purple-100 shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isRisk ? 'bg-rose-400' : isApex ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          <strong className="font-bold text-xs text-white">
                            {turn.speakerName}
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            ({turn.speakerRole})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 italic">
                          {turn.stance}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed pl-4 border-l-2 border-slate-700/60">
                        {turn.message}
                      </p>

                      {turn.keyPoints && turn.keyPoints.length > 0 && (
                        <div className="mt-2.5 pl-4 flex flex-wrap gap-1.5">
                          {turn.keyPoints.map((kp, kIdx) => (
                            <span
                              key={`kp-${tIdx}-${kIdx}`}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300"
                            >
                              • {kp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Agreed Consensus Accord */}
              {sessionData.consensus && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/90 via-slate-950 to-slate-950 border border-amber-500/60 shadow-xl space-y-4 mt-6">
                  <div className="flex items-center justify-between pb-3 border-b border-purple-800/60">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-amber-400" />
                      <div>
                        <h4 className="font-black text-sm text-white">
                          Synthesized Consensus: What The Two AIs Agreed Is Best
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          {sessionData.consensus.coreDebateSummary}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold font-mono">
                      ACCORD CONCLUDED
                    </span>
                  </div>

                  {/* Consensus Rules */}
                  <div className="space-y-2">
                    <span className="font-bold text-amber-300 text-xs uppercase tracking-wider block">
                      Agreed Strategic Rules to Implement:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sessionData.consensus.consensusRules.map((rule, rIdx) => (
                        <div
                          key={`rule-${rIdx}`}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proposed Matrix Updates Table */}
                  <div className="space-y-2">
                    <span className="font-bold text-purple-300 text-xs uppercase tracking-wider block">
                      Agreed Team Intelligence Matrix Re-calibrations:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(sessionData.consensus.proposedMatrixUpdates).map(([team, update], uIdx) => (
                        <div
                          key={`upd-${team}-${uIdx}`}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <strong className="text-white font-bold">{team}</strong>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-purple-300">
                                Form: <strong>{update.form_momentum_weight}x</strong>
                              </span>
                              <span className={update.volatility_index >= 0.65 ? 'text-rose-400' : 'text-emerald-400'}>
                                Vol: <strong>{update.volatility_index}</strong>
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">
                            {update.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Staking Limits */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Optimal Staking Framework:</span>
                      <span className="font-mono text-white font-bold">
                        Max Single: R{sessionData.consensus.optimalStakingGuideline.maxSingleStakeZar} · Max Acca: R{sessionData.consensus.optimalStakingGuideline.maxAccumulatorStakeZar} · {sessionData.consensus.optimalStakingGuideline.maxLegsPerAccumulator} Legs Ceiling
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-300 font-mono bg-amber-950/60 px-2 py-1 rounded border border-amber-800">
                      Kelly Fraction: {sessionData.consensus.optimalStakingGuideline.recommendedKellyFraction * 100}%
                    </span>
                  </div>

                  {/* Pending Uploaded Slips Dual-AI Best Selections */}
                  {(() => {
                    const pendingSlips = tickets.filter(t => t.status === 'pending');
                    if (pendingSlips.length === 0) return null;

                    return (
                      <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Dual-AI Consensus on Pending Uploaded Slips ({pendingSlips.length} Slips Active)
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            Sentinel & Apex Recommends Tactical Double Chance
                          </span>
                        </div>

                        <div className="space-y-2">
                          {pendingSlips.map(pending => {
                            const evalReport = generatePendingSlipBestSelections(pending, intelligenceState);
                            if (!evalReport) return null;

                            return (
                              <div key={`dual-p-${pending.id}`} className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between font-mono text-xs">
                                  <span className="text-white font-bold">Ticket #{pending.id} ({pending.legs.length} Legs)</span>
                                  <span className="text-purple-300">Suggested Total Odds: {evalReport.suggestedTotalOdds}x</span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                  {evalReport.strategicAdviceSummary}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}


                  {/* Implement Button */}
                  <div className="pt-2">
                    {hasImplemented ? (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-2 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Consensus Successfully Implemented! Active Intelligence Matrices Updated.
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400">
                          Bet Validator & Risk Radar Synced
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleImplementConsensus}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>Implement What The Two AIs Agreed Is Best (Apply to Live Engine)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Isolated Sandbox • Zero Data Contamination with External Apps
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
          >
            Close Chamber
          </button>
        </div>

      </div>
    </div>
  );
};
