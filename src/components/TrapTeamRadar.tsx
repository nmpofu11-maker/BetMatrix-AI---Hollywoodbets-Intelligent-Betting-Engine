import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Flame, 
  Ban, 
  TrendingDown, 
  DollarSign, 
  Lock, 
  Unlock, 
  Eye, 
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { TrapTeamAnalysis, BetTicket } from '../types/betting';

interface TrapTeamRadarProps {
  trapTeams: TrapTeamAnalysis[];
  tickets: BetTicket[];
  blacklistedTeams: string[];
  onToggleBlacklist: (teamName: string) => void;
  onOpenValidatorWithTeam?: (teamName: string) => void;
  onSelectTicket?: (ticketId: string) => void;
}

export const TrapTeamRadar: React.FC<TrapTeamRadarProps> = ({
  trapTeams,
  tickets,
  blacklistedTeams,
  onToggleBlacklist,
  onOpenValidatorWithTeam,
  onSelectTicket,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'strict_avoid' | 'high_exposure'>('all');

  const filteredTraps = trapTeams.filter(team => {
    const matchesSearch = team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          team.primaryTrapFactor.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFilter === 'strict_avoid') return team.affordabilityStatus === 'STRICT_AVOID';
    if (selectedFilter === 'high_exposure') return team.affordabilityStatus !== 'STRICT_AVOID';
    return true;
  });

  const totalLossFromTraps = trapTeams.reduce((acc, t) => acc + t.totalLossZar, 0);
  const totalBustsFromTraps = trapTeams.reduce((acc, t) => acc + t.bustCount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-900/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Loss Prevention & Kryptonite Trap Radar</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Potential Loss Teams & Affordability Quarantine
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            The AI engine automatically cross-references your prior Hollywoodbets losses, detecting teams that disproportionately collapse accumulators, carry unpredictable variance, or inflict severe capital drawdowns.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-rose-900/40 text-xs">
            <div>
              <div className="text-slate-400">Total Trap Losses</div>
              <div className="text-base font-bold font-mono text-rose-400">
                -R {totalLossFromTraps.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Collapsed Accas</div>
              <div className="text-base font-bold font-mono text-amber-300">
                {totalBustsFromTraps} Tickets
              </div>
            </div>
            <div>
              <div className="text-slate-400">Blacklisted in Firewall</div>
              <div className="text-base font-bold font-mono text-purple-300">
                {blacklistedTeams.length} Clubs
              </div>
            </div>
            <div>
              <div className="text-slate-400">Capital Protection</div>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Enforced
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <ShieldAlert className="w-64 h-64 text-rose-500" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search trap club or tactical cause..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto text-xs">
          <span className="text-slate-400 text-xs mr-1 hidden sm:inline">Filter:</span>
          {(['all', 'strict_avoid', 'high_exposure'] as const).map((filter) => (
            <button
              key={`trap-filter-${filter}`}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedFilter === filter
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter === 'all' && 'All Loss Teams'}
              {filter === 'strict_avoid' && 'Strict Avoid (0 Cap)'}
              {filter === 'high_exposure' && 'Exposure Capped'}
            </button>
          ))}
        </div>
      </div>

      {/* Trap Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTraps.map((trap, trapIdx) => {
          const isBlacklisted = blacklistedTeams.includes(trap.teamName);
          const relatedTickets = tickets.filter(
            t => t.bustedByTeams?.includes(trap.teamName) ||
                 t.legs.some(l => (l.targetTeam === trap.teamName || l.homeTeam === trap.teamName || l.awayTeam === trap.teamName) && (l.status === 'lost' || l.faultContribution))
          );

          return (
            <div
              key={`trap-radar-card-${trap.teamName}-${trapIdx}`}
              className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                isBlacklisted
                  ? 'bg-rose-950/20 border-rose-800/80 shadow-lg shadow-rose-950/40'
                  : 'bg-slate-900/90 border-slate-800 hover:border-rose-900/60'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">{trap.teamName}</h3>
                      {isBlacklisted && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-rose-600 text-white flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> FIREWALL BLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rose-400 font-semibold mt-0.5">
                      {trap.affordabilityStatus.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-rose-400">
                      -R {trap.totalLossZar.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Cumulative Capital Loss
                    </div>
                  </div>
                </div>

                {/* Primary Factor Description */}
                <div className="my-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Tactical Loss Pattern Identified by AI
                  </div>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {trap.primaryTrapFactor}
                  </p>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Acca Busts</div>
                    <div className="text-sm font-black font-mono text-rose-300">
                      {trap.bustCount} / {trap.totalMatchesBet}
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Volatility Index</div>
                    <div className="text-sm font-black font-mono text-amber-300">
                      {trap.volatilityIndex}
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Affordable Cap</div>
                    <div className={`text-sm font-black font-mono ${trap.maxAllowedStakeZar === 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {trap.maxAllowedStakeZar === 0 ? 'R 0 (BANNED)' : `R ${trap.maxAllowedStakeZar}`}
                    </div>
                  </div>
                </div>

                {/* Recent Ticket Collapses */}
                {relatedTickets.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                      Recent Collapsed Tickets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedTickets.slice(0, 3).map((t, rIdx) => (
                        <button
                          key={`trap-related-ticket-${t.id || 't'}-${rIdx}`}
                          onClick={() => onSelectTicket?.(t.id)}
                          className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] font-mono text-rose-300 border border-rose-900/40 rounded flex items-center gap-1 transition"
                        >
                          <span>{t.id}</span>
                          <span className="text-slate-400">(-R{t.stakeZar})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onToggleBlacklist(trap.teamName)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isBlacklisted
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-800'
                  }`}
                >
                  {isBlacklisted ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      Remove from Firewall
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      Firewall Blacklist (Block in Slips)
                    </>
                  )}
                </button>

                {onOpenValidatorWithTeam && (
                  <button
                    onClick={() => onOpenValidatorWithTeam(trap.teamName)}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                    title="Simulate risk of placing bet on this team"
                  >
                    Simulate Risk
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTraps.length === 0 && (
        <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-white font-bold text-sm">No Trap Teams Match Search</h4>
          <p className="text-xs text-slate-400 mt-1">Try adjusting the filter or search term.</p>
        </div>
      )}

    </div>
  );
};
