import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { BetTicket, SuperLearningIntelligenceState } from '../types/betting';

interface TeamMomentumChartProps {
  tickets: BetTicket[];
  intelligenceState: SuperLearningIntelligenceState;
  onSelectTeam?: (teamName: string) => void;
}

// Distinct high-contrast palette tailored for dark theme
export const TEAM_COLORS: Record<string, string> = {
  'Mamelodi Sundowns': '#eab308', // Gold / Amber
  'Arsenal': '#ef4444',          // Vibrant Red
  'Manchester City': '#38bdf8',  // Sky Blue
  'Real Madrid': '#a855f7',      // Purple
  'Liverpool': '#f97316',        // Coral / Orange
  'Orlando Pirates': '#94a3b8',   // Silver / Slate
  'Chelsea': '#06b6d4',          // Cyan / Warning Blue
  'Manchester United': '#ec4899',// Hot Pink / Fuchsia
  'Kaizer Chiefs': '#f59e0b',    // Dark Amber
  'Stellenbosch FC': '#10b981',  // Emerald Green
};

const FALLBACK_COLORS = ['#8b5cf6', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

export const TeamMomentumChart: React.FC<TeamMomentumChartProps> = ({
  tickets,
  intelligenceState,
  onSelectTeam,
}) => {
  // Available major teams from the intelligence matrices
  const matrixTeams = useMemo(() => {
    return Object.keys(intelligenceState.team_intelligence_matrices || {});
  }, [intelligenceState]);

  // Selected teams for the chart (default to top 4-5 major clubs for clarity)
  const [selectedTeams, setSelectedTeams] = useState<string[]>(() => {
    const defaults = ['Mamelodi Sundowns', 'Arsenal', 'Chelsea', 'Manchester United', 'Manchester City'];
    const available = defaults.filter(t => matrixTeams.includes(t));
    return available.length >= 3 ? available : matrixTeams.slice(0, 5);
  });

  const [activePreset, setActivePreset] = useState<'all' | 'anchors' | 'traps' | 'psl' | 'epl'>('all');
  const [timeWindow, setTimeWindow] = useState<'all' | 'last10' | 'last5'>('all');
  const [highlightedTeam, setHighlightedTeam] = useState<string | null>(null);

  // Quick preset filtering
  const handleApplyPreset = (preset: 'all' | 'anchors' | 'traps' | 'psl' | 'epl') => {
    setActivePreset(preset);
    if (preset === 'all') {
      setSelectedTeams(matrixTeams.slice(0, 6));
    } else if (preset === 'anchors') {
      // Anchors: High form, low volatility
      const anchors = matrixTeams.filter(t => {
        const m = intelligenceState.team_intelligence_matrices[t]?.learned_coefficients;
        return m && m.volatility_index <= 0.40 && m.form_momentum_weight >= 1.0;
      });
      setSelectedTeams(anchors.length > 0 ? anchors : ['Mamelodi Sundowns', 'Arsenal', 'Manchester City']);
    } else if (preset === 'traps') {
      // Traps: High volatility
      const traps = matrixTeams.filter(t => {
        const m = intelligenceState.team_intelligence_matrices[t]?.learned_coefficients;
        return m && m.volatility_index >= 0.65;
      });
      setSelectedTeams(traps.length > 0 ? traps : ['Chelsea', 'Manchester United', 'Kaizer Chiefs']);
    } else if (preset === 'psl') {
      const psl = matrixTeams.filter(t => 
        ['Mamelodi Sundowns', 'Orlando Pirates', 'Kaizer Chiefs', 'Stellenbosch FC'].includes(t)
      );
      setSelectedTeams(psl.length > 0 ? psl : matrixTeams.slice(0, 4));
    } else if (preset === 'epl') {
      const epl = matrixTeams.filter(t => 
        ['Arsenal', 'Manchester City', 'Liverpool', 'Chelsea', 'Manchester United'].includes(t)
      );
      setSelectedTeams(epl.length > 0 ? epl : matrixTeams.slice(0, 5));
    }
  };

  const toggleTeam = (team: string) => {
    if (selectedTeams.includes(team)) {
      if (selectedTeams.length > 1) {
        setSelectedTeams(selectedTeams.filter(t => t !== team));
      }
    } else {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  // Compute chronological momentum time series
  const chartData = useMemo(() => {
    // 1. Sort tickets chronologically (oldest first)
    const sortedTickets = [...tickets]
      .filter(t => t.status === 'won' || t.status === 'lost')
      .sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime());

    const activeTickets = timeWindow === 'last5' 
      ? sortedTickets.slice(-5) 
      : timeWindow === 'last10' 
      ? sortedTickets.slice(-10) 
      : sortedTickets;

    // 2. Compute initial baseline score at t0 for each team from intelligence matrix
    const currentScores: Record<string, number> = {};
    matrixTeams.forEach(team => {
      const coeffs = intelligenceState.team_intelligence_matrices[team]?.learned_coefficients;
      if (coeffs) {
        // Base probability: anchored around 50% + adjusted by form, volatility penalty, and home advantage
        const baseProb = 50 + (coeffs.form_momentum_weight - 1.0) * 45 - (coeffs.volatility_index - 0.4) * 35;
        currentScores[team] = Math.max(20, Math.min(92, Math.round(baseProb)));
      } else {
        currentScores[team] = 50;
      }
    });

    const dataPoints: Array<Record<string, any>> = [];

    // Point 0: Baseline state
    const t0Point: Record<string, any> = {
      label: 'Model Baseline',
      ticketId: 'Baseline',
      date: 'Matrix Init',
      eventNote: 'SuperLearner Synced',
    };
    matrixTeams.forEach(team => {
      t0Point[team] = currentScores[team];
    });
    dataPoints.push(t0Point);

    // Points 1..N: Step through chronological tickets
    activeTickets.forEach((ticket, idx) => {
      const ticketDate = new Date(ticket.placedAt);
      const formattedDate = `${ticketDate.getDate()} ${ticketDate.toLocaleString('default', { month: 'short' })}`;

      // Track which teams appeared in this ticket and what happened to them
      const teamsInTicket: Record<string, 'won' | 'lost'> = {};
      ticket.legs.forEach(leg => {
        const teams = [leg.targetTeam, leg.homeTeam, leg.awayTeam].filter(Boolean) as string[];
        teams.forEach(t => {
          if (matrixTeams.includes(t)) {
            // If already marked lost, keep as lost
            if (teamsInTicket[t] !== 'lost') {
              teamsInTicket[t] = leg.status === 'lost' || leg.faultContribution ? 'lost' : 'won';
            }
          }
        });
      });

      // Update momentum score for each team
      matrixTeams.forEach(team => {
        const coeffs = intelligenceState.team_intelligence_matrices[team]?.learned_coefficients;
        const vol = coeffs ? coeffs.volatility_index : 0.5;

        if (teamsInTicket[team] === 'won') {
          // Team won their leg: momentum surges
          const gain = 4.5 + (1 - vol) * 2.5;
          currentScores[team] = Math.min(96, Number((currentScores[team] + gain).toFixed(1)));
        } else if (teamsInTicket[team] === 'lost') {
          // Team lost: heavy drop, amplified if volatility is high
          const drop = 5.5 + vol * 6.5;
          currentScores[team] = Math.max(12, Number((currentScores[team] - drop).toFixed(1)));
        } else {
          // Team was inactive this ticket: slight mean reversion toward baseline
          const baseline = coeffs 
            ? Math.max(20, Math.min(92, 50 + (coeffs.form_momentum_weight - 1.0) * 45 - (coeffs.volatility_index - 0.4) * 35))
            : 50;
          const diff = baseline - currentScores[team];
          currentScores[team] = Number((currentScores[team] + diff * 0.05).toFixed(1));
        }
      });

      const pt: Record<string, any> = {
        label: `T${idx + 1}`,
        ticketId: ticket.id,
        date: formattedDate,
        status: ticket.status,
        stake: ticket.stakeZar,
        bustedBy: ticket.bustedByTeams || [],
      };

      matrixTeams.forEach(team => {
        pt[team] = currentScores[team];
      });

      dataPoints.push(pt);
    });

    return dataPoints;
  }, [tickets, intelligenceState, matrixTeams, timeWindow]);

  // Current leaders and traps
  const currentMomentumRanking = useMemo(() => {
    if (chartData.length === 0) return [];
    const latest = chartData[chartData.length - 1];
    return matrixTeams.map(team => {
      const score = latest[team] ?? 50;
      const initial = chartData[0]?.[team] ?? 50;
      const delta = Number((score - initial).toFixed(1));
      const coeffs = intelligenceState.team_intelligence_matrices[team]?.learned_coefficients;
      return {
        team,
        score,
        initial,
        delta,
        volatility: coeffs?.volatility_index ?? 0.5,
        form: coeffs?.form_momentum_weight ?? 1.0,
      };
    }).sort((a, b) => b.score - a.score);
  }, [chartData, matrixTeams, intelligenceState]);

  const topLeader = currentMomentumRanking[0];
  const lowestTrap = currentMomentumRanking[currentMomentumRanking.length - 1];

  return (
    <div className="bg-slate-900/90 border border-purple-900/40 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-300 border border-purple-800/60">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Team Momentum & Success Probability Trajectory
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  d3 / Recharts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dynamic line chart tracking each major team's calculated win probability score (%) over historical tickets.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-500 font-semibold px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Preset:
            </span>
            {(['all', 'anchors', 'traps', 'psl', 'epl'] as const).map(preset => (
              <button
                key={`preset-${preset}`}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`px-2.5 py-1 rounded-lg font-medium transition capitalize ${
                  activePreset === preset
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {preset === 'all' ? 'Top 6' : preset}
              </button>
            ))}
          </div>

          {/* Time Window Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'last10', 'last5'] as const).map(w => (
              <button
                key={`window-${w}`}
                type="button"
                onClick={() => setTimeWindow(w)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition ${
                  timeWindow === w
                    ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w === 'all' ? 'Full History' : w === 'last10' ? 'Last 10' : 'Last 5'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Macro Insight Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topLeader && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Current Momentum Leader
                </span>
                <strong className="text-white text-xs">{topLeader.team}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-black text-emerald-400">{topLeader.score}%</span>
              <span className="text-[10px] text-slate-500 block">Prob Score</span>
            </div>
          </div>
        )}

        {lowestTrap && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Most Severe Kryptonite Trap
                </span>
                <strong className="text-white text-xs">{lowestTrap.team}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-black text-rose-400">{lowestTrap.score}%</span>
              <span className="text-[10px] text-slate-500 block">Prob Score</span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Matrix Calibration Model
              </span>
              <span className="text-slate-300 font-medium">{intelligenceState.model_engine}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-purple-300 font-bold">
              {selectedTeams.length} / {matrixTeams.length}
            </span>
            <span className="text-[10px] text-slate-500 block">Teams Mapped</span>
          </div>
        </div>
      </div>

      {/* Team Selection Multi-Toggle Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Toggle Teams on Chart ({selectedTeams.length} Active):
          </span>
          <span className="text-[11px] text-slate-500">
            Click team to show/hide · Hover over line to inspect
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {matrixTeams.map((team, idx) => {
            const isSelected = selectedTeams.includes(team);
            const color = TEAM_COLORS[team] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
            const coeffs = intelligenceState.team_intelligence_matrices[team]?.learned_coefficients;
            const isTrap = coeffs && coeffs.volatility_index >= 0.65;
            const isAnchor = coeffs && coeffs.volatility_index <= 0.35;

            return (
              <button
                key={`team-toggle-${team}`}
                type="button"
                onClick={() => toggleTeam(team)}
                onMouseEnter={() => setHighlightedTeam(team)}
                onMouseLeave={() => setHighlightedTeam(null)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/80 hover:text-slate-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition"
                  style={{
                    backgroundColor: isSelected ? color : '#475569',
                    boxShadow: isSelected ? `0 0 8px ${color}80` : 'none',
                  }}
                />
                <span className="truncate max-w-[120px]">{team}</span>
                {isTrap && <span className="text-[9px] font-bold text-rose-400">TRAP</span>}
                {isAnchor && <span className="text-[9px] font-bold text-emerald-400">ANC</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="w-full h-80 pt-2 pb-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 25, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              opacity={0.5}
            />

            {/* X-Axis */}
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
            />

            {/* Y-Axis (Probability Score %) */}
            <YAxis
              domain={[10, 100]}
              ticks={[20, 40, 50, 60, 75, 90]}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `${v}%`}
            />

            {/* Risk Benchmark Reference Lines */}
            <ReferenceLine
              y={75}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '75% Anchor Threshold',
                fill: '#10b981',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />

            <ReferenceLine
              y={50}
              stroke="#eab308"
              strokeDasharray="2 2"
              strokeWidth={1}
              label={{
                value: '50% Break-Even Line',
                fill: '#eab308',
                fontSize: 9,
                position: 'insideRight',
              }}
            />

            <ReferenceLine
              y={35}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '35% High-Loss Quarantine Threshold',
                fill: '#f43f5e',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />

            {/* Custom Dark Theme Tooltip */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const pointData = payload[0]?.payload;

                return (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-xs space-y-2 max-w-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-white text-xs">{label} ({pointData?.date})</span>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">
                        {pointData?.ticketId}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {payload
                        .filter(item => selectedTeams.includes(item.dataKey as string))
                        .sort((a, b) => Number(b.value) - Number(a.value))
                        .map(item => {
                          const teamName = item.dataKey as string;
                          const score = Number(item.value);
                          const coeffs = intelligenceState.team_intelligence_matrices[teamName]?.learned_coefficients;

                          return (
                            <div
                              key={`tooltip-${teamName}`}
                              className="flex items-center justify-between gap-3 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-slate-200 truncate">{teamName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-bold" style={{ color: item.color }}>
                                  {score}%
                                </span>
                                {coeffs && (
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    (Vol: {coeffs.volatility_index})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {pointData?.status && (
                      <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Ticket Result:</span>
                        <span className={`font-bold uppercase ${
                          pointData.status === 'won' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {pointData.status} (R{pointData.stake})
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              content={() => (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-[11px]">
                  {selectedTeams.map((team, idx) => {
                    const color = TEAM_COLORS[team] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                    const isHovered = highlightedTeam === team;

                    return (
                      <span
                        key={`legend-${team}`}
                        className={`flex items-center gap-1.5 cursor-pointer transition ${
                          isHovered ? 'scale-110 font-bold text-white' : 'text-slate-400'
                        }`}
                        onMouseEnter={() => setHighlightedTeam(team)}
                        onMouseLeave={() => setHighlightedTeam(null)}
                      >
                        <span
                          className="w-2.5 h-0.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span>{team}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            />

            {/* Lines for each selected team */}
            {selectedTeams.map((team, idx) => {
              const color = TEAM_COLORS[team] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
              const isHovered = highlightedTeam === team;
              const hasHover = highlightedTeam !== null;

              return (
                <Line
                  key={`line-${team}`}
                  type="monotone"
                  dataKey={team}
                  name={team}
                  stroke={color}
                  strokeWidth={isHovered ? 3.5 : hasHover ? 1.2 : 2.2}
                  strokeOpacity={hasHover && !isHovered ? 0.35 : 1}
                  dot={{
                    r: isHovered ? 4.5 : 2.5,
                    fill: color,
                    stroke: '#0f172a',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 6,
                    fill: color,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                  animationDuration={800}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretive Footer & Guidance */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">How to read this chart:</strong> Teams climbing above <strong>75%</strong> (e.g. Mamelodi Sundowns, Arsenal) demonstrate persistent positive form momentum and low volatility—ideal primary anchors. Teams plunging below <strong>35%</strong> (e.g. Chelsea) suffer from accumulator-busting volatility.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleApplyPreset('anchors')}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
          >
            Show Elite Anchors &rarr;
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => handleApplyPreset('traps')}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition"
          >
            Show Traps &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
