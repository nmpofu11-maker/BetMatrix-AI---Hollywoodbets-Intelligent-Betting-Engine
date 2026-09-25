import React, { useState } from 'react';
import { BetTicket, BetLeg } from '../types/betting';
import { ShieldCheck, CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle, Sparkles, Database } from 'lucide-react';

interface AIResultVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: BetTicket[];
  onUpdateTickets: (tickets: BetTicket[]) => void;
  onShowToast: (msg: string) => void;
}

export const AIResultVerificationModal: React.FC<AIResultVerificationModalProps> = ({
  isOpen,
  onClose,
  tickets,
  onUpdateTickets,
  onShowToast,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<any[] | null>(null);

  if (!isOpen) return null;

  const pendingTickets = tickets.filter(t => t.status === 'pending');

  const handleRunVerification = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/ai/verify-match-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.verifiedTickets)) {
          onUpdateTickets(data.verifiedTickets);
          setVerificationReport(data.verificationAudit || []);
          onShowToast('AI Result Verification completed successfully! Live match scores cross-referenced.');
        } else {
          onShowToast(data.error || 'Verification completed with fallback check.');
        }
      } else {
        onShowToast('Failed to connect to AI Result Verification service.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      onShowToast('Error during AI Result Verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                AI Result Verification Utility
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Grounding Active
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Cross-reference live sports data & match final scores before settling tickets to prevent premature or incorrect wins/losses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-2 rounded-xl transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-300">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-white font-medium flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Pending Tickets Audit Queue ({pendingTickets.length} active)</span>
              </div>
              <p className="text-sm text-slate-400">
                Verifies every leg against public sports APIs and Google Search grounding to ensure teams are finished playing (FT) before settling.
              </p>
            </div>
            <button
              onClick={handleRunVerification}
              disabled={isVerifying || pendingTickets.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying Live Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Run Live AI Verification</span>
                </>
              )}
            </button>
          </div>

          {/* Pending Tickets & Audit View */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Active Pending Tickets & Verification Status
            </h3>

            {pendingTickets.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <p className="text-lg font-medium text-white">No pending tickets in queue</p>
                <p className="text-sm">All tickets have been successfully settled or verified.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTickets.map(ticket => {
                  const auditMatch = verificationReport?.find((r: any) => r.id === ticket.id);
                  return (
                    <div
                      key={ticket.id}
                      className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-md space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-emerald-400 font-semibold">#{ticket.id}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">
                            Pending / In Play
                          </span>
                        </div>
                        <div className="text-sm text-slate-400">
                          Stake: <strong className="text-white">R{ticket.stakeZar}</strong> | Odds: <strong className="text-white">{ticket.totalOdds}</strong>
                        </div>
                      </div>

                      {/* Legs list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ticket.legs.map((leg: BetLeg) => {
                          const auditLeg = auditMatch?.legs?.find((al: any) => al.id === leg.id);
                          return (
                            <div
                              key={leg.id}
                              className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-white">
                                  {leg.homeTeam || leg.targetTeam} vs {leg.awayTeam || 'Away'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  auditLeg?.matchStatus === 'FT'
                                    ? auditLeg.status === 'won' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {auditLeg?.matchStatus || 'LIVE / PENDING'}
                                </span>
                              </div>
                              <div className="text-slate-400 flex justify-between">
                                <span>Market: {leg.market || '1X2'}</span>
                                <span className="text-emerald-300 font-mono">Odds: {leg.odds}</span>
                              </div>
                              {auditLeg && (
                                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                                  <span>Score: <strong className="text-white">{auditLeg.actualScore || 'In Progress'}</strong></span>
                                  <span className="text-emerald-400">{auditLeg.verificationSource || 'Live Grounding'}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {auditMatch?.verificationSummary && (
                        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5 text-xs text-emerald-300 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{auditMatch.verificationSummary}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 px-6 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Anti-Premature Settlement Firewall Enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all"
          >
            Close Utility
          </button>
        </div>
      </div>
    </div>
  );
};
