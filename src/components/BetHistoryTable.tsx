import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertOctagon, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Coins,
  Calendar,
  Layers,
  Sparkles,
  BrainCircuit,
  Flame,
  Scale,
  Database,
  Trash2
} from 'lucide-react';
import { BetTicket, BetLeg } from '../types/betting';

interface BetHistoryTableProps {
  tickets: BetTicket[];
  onOpenImporter: () => void;
  onAddCustomBet: (ticket: BetTicket) => void;
  highlightTicketId?: string | null;
  onAdvisePendingTicket?: (ticket: BetTicket) => void;
  onSettleTicket?: (ticketId: string, status: 'won' | 'lost') => void;
  onDiagnoseMistakes?: (ticket: BetTicket) => void;
  onOpenCashOutCalculator?: (ticket: BetTicket) => void;
  onOpenBackupRestore?: () => void;
  onDeleteTicket?: (ticketId: string) => void;
  onClearMockTickets?: () => void;
}

export const BetHistoryTable: React.FC<BetHistoryTableProps> = ({
  tickets,
  onOpenImporter,
  onAddCustomBet,
  highlightTicketId,
  onAdvisePendingTicket,
  onSettleTicket,
  onDiagnoseMistakes,
  onOpenCashOutCalculator,
  onOpenBackupRestore,
  onDeleteTicket,
  onClearMockTickets,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'won' | 'lost' | 'multibet'>('all');
  const [expandedTicketId, setExpandedTicketId] = React.useState<string | null>(highlightTicketId || null);

  React.useEffect(() => {
    if (highlightTicketId) {
      setExpandedTicketId(highlightTicketId);
    }
  }, [highlightTicketId]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.legs.some(l => l.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                l.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                l.market.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (ticket.notes && ticket.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (statusFilter === 'pending') return ticket.status === 'pending';
    if (statusFilter === 'won') return ticket.status === 'won';
    if (statusFilter === 'lost') return ticket.status === 'lost';
    if (statusFilter === 'multibet') return ticket.type === 'multibet';
    return true;
  });

  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-4">
      
      {/* Top Filter and Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search ticket ID, team, market..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 text-xs overflow-x-auto">
            {(['all', 'pending', 'won', 'lost', 'multibet'] as const).map(tab => (
              <button
                key={`bht-tab-${tab}`}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === tab
                    ? 'bg-purple-900/60 text-amber-300 border border-purple-700/60'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.toUpperCase()}</span>
                {tab === 'pending' && pendingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {onClearMockTickets && (
            <button
              onClick={onClearMockTickets}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-bold transition shadow-sm shrink-0"
              title="Permanently remove default demo/phantom tickets"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Demo Slips</span>
            </button>
          )}

          {onOpenBackupRestore && (
            <button
              onClick={onOpenBackupRestore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-purple-800/60 text-xs font-bold transition shadow-sm shrink-0"
              title="Backup or restore betting ledger and learned matrices"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>Backup / Restore</span>
            </button>
          )}

          <button
            onClick={onOpenImporter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Import Slip</span>
          </button>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket, tIdx) => {
          const isWon = ticket.status === 'won';
          const isPending = ticket.status === 'pending';
          const isExpanded = expandedTicketId === ticket.id;
          const bustedLegs = ticket.legs.filter(l => l.status === 'lost' || l.faultContribution);

          return (
            <div
              key={`ticket-card-${ticket.id || 'ticket'}-${tIdx}`}
              className={`rounded-2xl border transition overflow-hidden ${
                ticket.id === highlightTicketId
                  ? 'border-amber-500/80 bg-slate-900 shadow-xl'
                  : isPending
                  ? 'border-purple-800/80 bg-slate-900/90 shadow-md'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              {/* Summary Bar */}
              <div
                onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                className="p-4 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 select-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    isPending 
                      ? 'bg-purple-950/80 text-amber-400 border border-purple-800/60'
                      : isWon 
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                  }`}>
                    {isPending ? (
                      <span className="w-5 h-5 flex items-center justify-center font-bold text-xs animate-pulse">⏳</span>
                    ) : isWon ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">{ticket.id}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        {ticket.platform}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {ticket.type === 'multibet' ? `${ticket.legs.length}-Leg Multibet` : 'Single'}
                      </span>
                      {isPending && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                          ACTIVE PENDING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(ticket.placedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span>·</span>
                      <span>Total Odds: <strong className="text-slate-200 font-mono">{ticket.totalOdds}x</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right side stats */}
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-slate-400">STAKE</div>
                    <div className="text-xs font-mono font-bold text-slate-200">
                      R {ticket.stakeZar.toLocaleString()}
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-slate-400">{isPending ? 'EST. RETURN' : (isWon ? 'PAYOUT' : 'RETURN')}</div>
                    <div className="text-xs font-mono font-bold text-amber-300">
                      R {(isPending ? ticket.potentialPayoutZar : ticket.actualPayoutZar).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right min-w-24">
                    <div className="text-[10px] text-slate-400">{isPending ? 'STATUS' : 'NET P&L'}</div>
                    <div className={`text-sm font-mono font-black ${
                      isPending 
                        ? 'text-purple-300'
                        : isWon 
                        ? 'text-emerald-400' 
                        : 'text-rose-400'
                    }`}>
                      {isPending ? 'PENDING' : `${isWon ? '+' : ''}R ${ticket.profitZar.toLocaleString()}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onDeleteTicket && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Permanently delete ticket ${ticket.id}?`)) {
                            onDeleteTicket(ticket.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition"
                        title="Delete this ticket from ledger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Slip Action Bar */}
              {isPending && (
                <div className="bg-purple-950/40 border-t border-purple-900/60 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Active Hollywoodbets slip — audit selection flaws before kickoff</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenCashOutCalculator && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCashOutCalculator(ticket);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition border border-amber-500/40 flex items-center gap-1.5 shadow"
                        title="Compare Hollywoodbets cash-out offer against real mathematical equity"
                      >
                        <Scale className="w-3.5 h-3.5 text-amber-400" />
                        <span>Fair Cash-Out</span>
                      </button>
                    )}

                    {onDiagnoseMistakes && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDiagnoseMistakes(ticket);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow flex items-center gap-1.5"
                      >
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>Audit Selection Mistakes (AI)</span>
                      </button>
                    )}

                    {onAdvisePendingTicket && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdvisePendingTicket(ticket);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 font-bold text-xs transition border border-purple-700/60 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Loss Hazard Radar</span>
                      </button>
                    )}

                    {onSettleTicket && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSettleTicket(ticket.id, 'won');
                          }}
                          className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[10px] font-bold rounded"
                          title="Mark Ticket as Won"
                        >
                          Won
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSettleTicket(ticket.id, 'lost');
                          }}
                          className="px-2 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold rounded"
                          title="Mark Ticket as Lost"
                        >
                          Lost
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loss Culprit Quick Banner (if lost) */}
              {!isWon && !isPending && (
                <div className="bg-rose-950/40 border-t border-rose-900/40 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-300">
                  <div className="flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      {ticket.bustedByTeams && ticket.bustedByTeams.length > 0 
                        ? <>Ticket Busted By: <strong>{ticket.bustedByTeams.join(', ')}</strong></>
                        : 'Loss recorded in Hollywoodbets ledger'}
                    </span>
                  </div>

                  {onDiagnoseMistakes && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiagnoseMistakes(ticket);
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition self-start sm:self-auto"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI Mistake Post-Mortem & Diagnosis</span>
                    </button>
                  )}
                </div>
              )}

              {/* Expanded Legs Accordion */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-950/70 p-4 space-y-3">
                  {ticket.notes && (
                    <div className="text-xs text-slate-300 bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg italic">
                      "{ticket.notes}"
                    </div>
                  )}

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Ticket Legs & Outcomes ({ticket.legs.length})
                  </div>

                  <div className="space-y-2">
                    {ticket.legs.map((leg, idx) => {
                      const legWon = leg.status === 'won';
                      const isFault = leg.faultContribution;

                      return (
                        <div
                          key={`bht-leg-${ticket.id || 't'}-${leg.id || 'l'}-${idx}`}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            isFault
                              ? 'bg-rose-950/30 border-rose-700/60 text-rose-200'
                              : legWon
                              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] bg-slate-800 text-slate-300">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{leg.match}</span>
                                {leg.league && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({leg.league})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Market: <span className="text-amber-300 font-medium">{leg.market}</span>
                                {leg.score && <span className="ml-2 font-mono text-slate-400">FT: {leg.score}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-200">{leg.odds}x</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              isFault
                                ? 'bg-rose-950 text-rose-300 border-rose-700'
                                : legWon
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {isFault ? 'BUSTED LEG' : leg.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Accordion Footer Action */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">
                      {isWon ? 'Winning slip audited for true edge vs lucky variance' : (isPending ? 'Pending slip evaluated for potential trap teams' : 'Lost multibet analyzed for tactical root cause')}
                    </span>
                    {onDiagnoseMistakes && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDiagnoseMistakes(ticket);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-700/60 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>Run Full AI Mistake Diagnosis</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h4 className="text-white font-bold text-sm">No Betting Tickets Found</h4>
          <p className="text-xs text-slate-400 mt-1">Import a Hollywoodbets slip or adjust filters.</p>
        </div>
      )}

    </div>
  );
};
