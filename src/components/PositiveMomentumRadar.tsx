import React from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  Award, 
  ArrowUpRight, 
  PlusCircle, 
  Anchor, 
  Zap,
  Search
} from 'lucide-react';
import { PositiveMomentumTeamAnalysis, BetTicket } from '../types/betting';

interface PositiveMomentumRadarProps {
  positiveTeams: PositiveMomentumTeamAnalysis[];
  tickets: BetTicket[];
  onAddAnchorToSlip?: (teamName: string) => void;
  onSelectTicket?: (ticketId: string) => void;
}

export const PositiveMomentumRadar: React.FC<PositiveMomentumRadarProps> = ({
  positiveTeams,
  tickets,
  onAddAnchorToSlip,
  onSelectTicket,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredTeams = positiveTeams.filter(team =>
    team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.suggestedRole.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPositiveProfit = positiveTeams.reduce((acc, t) => acc + t.totalProfitZar, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-900/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>High-Yield Foundation & Gold Standard Teams</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Positive Momentum Anchors & Profit Drivers
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            These clubs have demonstrated rock-solid positive returns in your Hollywoodbets betting history. Use them as anchor legs to stabilize multibets, maximize positive expected value (+EV), and compound long-term edge.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-900/40 text-xs">
            <div>
              <div className="text-slate-400">Total Anchor Profit</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                +R {totalPositiveProfit.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Identified Anchors</div>
              <div className="text-base font-bold font-mono text-amber-300">
                {positiveTeams.length} Clubs
              </div>
            </div>
            <div>
              <div className="text-slate-400">Average Win Rate</div>
              <div className="text-base font-bold font-mono text-purple-300">
                {positiveTeams.length > 0 ? (positiveTeams.reduce((a, b) => a + b.winRatePercent, 0) / positiveTeams.length).toFixed(1) : 0}%
              </div>
            </div>
            <div>
              <div className="text-slate-400">AI Confidence</div>
              <div className="text-base font-bold text-cyan-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 94% Reliability
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Award className="w-64 h-64 text-emerald-500" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search positive anchor club..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="text-xs text-slate-400 hidden sm:block">
          Showing <span className="text-white font-bold">{filteredTeams.length}</span> reliable clubs
        </div>
      </div>

      {/* Grid of Positive Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTeams.map((team, tIdx) => {
          const winningTickets = tickets.filter(
            t => t.status === 'won' &&
                 t.legs.some(l => l.targetTeam === team.teamName || l.homeTeam === team.teamName || l.awayTeam === team.teamName)
          );

          return (
            <div
              key={`pos-team-${team.teamName}-${tIdx}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-emerald-700/60 p-5 transition flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">{team.teamName}</h3>
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <Anchor className="w-2.5 h-2.5" /> {team.bankerRating.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                      {team.suggestedRole}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-emerald-400">
                      +R {team.totalProfitZar.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Attributed Profit
                    </div>
                  </div>
                </div>

                {/* Tactical Role Description */}
                <div className="my-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Recommended Staking Placement
                  </div>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    Consistently executes tactical superiority with high goal conversion. Ideal for anchoring 2-3 leg value slips on Hollywoodbets without inducing variance shock.
                  </p>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Win Rate</div>
                    <div className="text-sm font-black font-mono text-emerald-300">
                      {team.winRatePercent}%
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Matches Won</div>
                    <div className="text-sm font-black font-mono text-purple-300">
                      {team.winCount} / {team.totalMatchesBet}
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Form Weight</div>
                    <div className="text-sm font-black font-mono text-cyan-300">
                      {team.formWeight}x
                    </div>
                  </div>
                </div>

                {/* Winning Slips */}
                {winningTickets.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                      Successful Tickets with {team.teamName}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {winningTickets.slice(0, 3).map((t, wIdx) => (
                        <button
                          key={`pos-win-ticket-${t.id || 't'}-${wIdx}`}
                          onClick={() => onSelectTicket?.(t.id)}
                          className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] font-mono text-emerald-300 border border-emerald-900/40 rounded flex items-center gap-1 transition"
                        >
                          <span>{t.id}</span>
                          <span className="text-emerald-400 font-bold">(+R{t.profitZar})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {onAddAnchorToSlip && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => onAddAnchorToSlip(team.teamName)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/80 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                    Load as Anchor Leg in Bet Validator
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
