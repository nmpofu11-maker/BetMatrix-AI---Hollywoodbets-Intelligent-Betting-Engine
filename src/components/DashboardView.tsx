import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Flame, 
  Target, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Crosshair, 
  Sparkles,
  Zap,
  Percent,
  Coins,
  BrainCircuit,
  BookmarkCheck,
  RefreshCw
} from 'lucide-react';
import { BetTicket, SuperLearningIntelligenceState, TrapTeamAnalysis, PositiveMomentumTeamAnalysis, RiskManagementAlert } from '../types/betting';
import { DashboardMetrics, computePnlTimeSeries } from '../utils/analytics';
import { TeamMomentumChart } from './TeamMomentumChart';
import { FixtureSchedule } from '../types/betting';
import { BettingTimelineCalendar } from './BettingTimelineCalendar';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  tickets: BetTicket[];
  activeFixtures?: FixtureSchedule[];
  trapTeams: TrapTeamAnalysis[];
  positiveTeams: PositiveMomentumTeamAnalysis[];
  riskAlerts: RiskManagementAlert[];
  intelligenceState: SuperLearningIntelligenceState;
  onNavigateTab: (tab: string) => void;
  onOpenValidator: () => void;
  onDismissAlert: (id: string) => void;
  onAdvisePendingTicket?: (ticket: BetTicket) => void;
  onDiagnoseMistakes?: (ticket: BetTicket) => void;
  onOpenDualAI?: () => void;
  onRunAutoCheck: () => void;
  onDeleteFixture?: (fixtureId: string) => void;
  onPurgeSlates?: () => void;
  onOpenIngestionModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  tickets,
  activeFixtures,
  trapTeams,
  positiveTeams,
  riskAlerts,
  intelligenceState,
  onNavigateTab,
  onOpenValidator,
  onDismissAlert,
  onAdvisePendingTicket,
  onDiagnoseMistakes,
  onOpenDualAI,
  onRunAutoCheck,
  onDeleteFixture,
  onPurgeSlates,
  onOpenIngestionModal,
}) => {
  const pnlData = React.useMemo(() => computePnlTimeSeries(tickets), [tickets]);
  const [hoveredPoint, setHoveredPoint] = React.useState<any | null>(null);

  const pendingTickets = React.useMemo(() => tickets.filter(t => t.status === 'pending'), [tickets]);
  const latestLostTicket = React.useMemo(() => tickets.find(t => t.status === 'lost'), [tickets]);

  // SVG Chart Dimensions & Computations
  const chartHeight = 180;
  const chartWidth = 700;
  const padding = { top: 25, right: 30, bottom: 30, left: 55 };

  const minPnl = Math.min(0, ...pnlData.map(p => p.pnl));
  const maxPnl = Math.max(1000, ...pnlData.map(p => p.pnl));
  const pnlRange = maxPnl - minPnl || 1;

  const getX = (index: number) => {
    if (pnlData.length <= 1) return padding.left;
    return padding.left + (index / (pnlData.length - 1)) * (chartWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return chartHeight - padding.bottom - ((val - minPnl) / pnlRange) * (chartHeight - padding.top - padding.bottom);
  };

  const pathD = pnlData.length > 0
    ? pnlData.reduce((acc, pt, idx) => {
        const x = getX(idx);
        const y = getY(pt.pnl);
        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
      }, '')
    : '';

  const areaD = pnlData.length > 0
    ? `${pathD} L ${getX(pnlData.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`
    : '';

  const isNetPositive = metrics.netProfitZar >= 0;

  return (
    <div className="space-y-6">

      {/* Active Pending Slip Loss Hazard Watch Card */}
      {pendingTickets.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-900/60 text-amber-300 border border-purple-700/60 shrink-0 mt-0.5">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                  {pendingTickets.length} ACTIVE PENDING SLIP{pendingTickets.length > 1 ? 'S' : ''}
                </span>
                <span className="font-bold text-sm text-white">
                  Ticket {pendingTickets[0].id} (R{pendingTickets[0].stakeZar} Staked)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Evaluate which team(s) in this active ticket represent potential losses based on prior accumulator collapses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onAdvisePendingTicket && (
              <button
                onClick={() => onAdvisePendingTicket(pendingTickets[0])}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Advise Potential Loss Teams</span>
              </button>
            )}
            <button
              onClick={onRunAutoCheck}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Run Auto-Check Now</span>
            </button>
            <button
              onClick={() => onNavigateTab('history')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              View All Slips
            </button>
          </div>
        </div>
      )}

      {/* AI Mistake Diagnosis & Post-Mortem Card */}
      {latestLostTicket && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 shrink-0 mt-0.5">
              <BrainCircuit className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500 text-white">
                  SELECTION MISTAKE LEARNING
                </span>
                <span className="font-bold text-sm text-white">
                  Post-Mortem Ready: Ticket #{latestLostTicket.id}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                AI has identified the tactical errors (away favorites, false bankers, and accumulator variance) from your past collapses. Review the post-mortem to adopt permanent anti-loss rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onDiagnoseMistakes && (
              <button
                onClick={() => onDiagnoseMistakes(latestLostTicket)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
              >
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Diagnose Mistakes (AI Post-Mortem)</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('history')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              All Past Slips
            </button>
          </div>
        </div>
      )}
      
      {/* Today's Featured Best Slips Spotlight Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-purple-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-900/60 text-amber-300 border border-purple-700/60 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono">
                TODAY'S BEST SLIPS
              </span>
              <span className="font-bold text-sm text-white">
                Curated High-EV & Zero-Trap Featured Bets
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Engineered using the Super-Learning Matrix, Dual-AI consensus rules, and verified fixture boards. Hand-craft custom slips or load curated bankers with 1 click.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('features')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Today's Features</span>
          </button>
        </div>
      </div>

      {/* Top Banner Alert System */}
      {riskAlerts.length > 0 && (
        <div className="space-y-2">
          {riskAlerts.slice(0, 2).map((alert, aIdx) => (
            <div
              key={`dash-alert-${alert.id || 'a'}-${aIdx}`}
              className={`flex items-start justify-between p-3.5 rounded-xl border backdrop-blur transition ${
                alert.severity === 'critical'
                  ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                  : 'bg-amber-950/40 border-amber-600/50 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg mt-0.5 ${
                  alert.severity === 'critical' ? 'bg-rose-600/30 text-rose-400' : 'bg-amber-600/30 text-amber-400'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded bg-black/40 border border-current/30">
                      {alert.severity} RISK
                    </span>
                    <h4 className="font-bold text-sm text-white">{alert.title}</h4>
                    <span className="text-[11px] opacity-70">{alert.timestamp}</span>
                  </div>
                  <p className="text-xs mt-1 text-slate-300 leading-relaxed">{alert.message}</p>
                  <div className="mt-2 text-xs font-semibold flex items-center gap-2 text-amber-300 bg-black/30 px-2.5 py-1 rounded inline-block">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Recommendation: {alert.actionRecommendation}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDismissAlert(alert.id)}
                className="text-xs px-2 py-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Net Profit Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">NET PROFIT</span>
            {isNetPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
            isNetPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isNetPositive ? '+' : ''}R {metrics.netProfitZar.toLocaleString('en-ZA')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Staked:</span>
            <span className="text-slate-300 font-mono">R {metrics.totalStakedZar.toLocaleString()}</span>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${isNetPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        </div>

        {/* ROI % Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">YIELD / ROI</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
            metrics.roiPercent >= 0 ? 'text-amber-300' : 'text-rose-400'
          }`}>
            {metrics.roiPercent >= 0 ? '+' : ''}{metrics.roiPercent}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Net return per Rand staked
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Win Rate Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">WIN RATE</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-purple-300 tracking-tight">
            {metrics.winRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.wonTickets} Won / {metrics.lostTickets} Lost
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
        </div>

        {/* Streak Monitor Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">STREAK</span>
            <Flame className={`w-4 h-4 ${metrics.currentStreak.type === 'won' ? 'text-amber-400' : 'text-rose-400'}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {metrics.currentStreak.count}
            </span>
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
              metrics.currentStreak.type === 'won' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {metrics.currentStreak.type}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.currentStreak.type === 'won' ? 'Positive variance run' : 'Variance dip: Kelly guard on'}
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${metrics.currentStreak.type === 'won' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        </div>

        {/* Average Odds Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">AVG ODDS</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight">
            {metrics.averageOdds}x
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Ticket pricing bracket
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500" />
        </div>

        {/* Multibet Win Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">ACCA ACCURACY</span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-300 tracking-tight">
            {metrics.multibetWinRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Singles rate: {metrics.singleWinRate}%
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
        </div>

      </div>

      {/* Main Graph & Super-Learning Matrix Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* P&L Trajectory Chart (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Cumulative Hollywoodbets P&L Trajectory</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 rounded">
                  ZAR CURVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Performance trajectory over {tickets.length} logged tickets with profit/loss milestones
              </p>
            </div>
            
            {hoveredPoint ? (
              <div className="text-right bg-slate-950 border border-purple-800/60 px-3 py-1.5 rounded-lg">
                <div className="text-[10px] text-slate-400">{hoveredPoint.date} · {hoveredPoint.ticketId}</div>
                <div className={`text-xs font-mono font-bold ${hoveredPoint.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Net P&L: R {hoveredPoint.pnl.toLocaleString()} (Ticket: {hoveredPoint.profitThisTicket >= 0 ? '+' : ''}R {hoveredPoint.profitThisTicket})
                </div>
              </div>
            ) : (
              <div className="text-right">
                <div className="text-xs text-slate-400">Current P&L</div>
                <div className={`text-base font-mono font-bold ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isNetPositive ? '+' : ''}R {metrics.netProfitZar.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* SVG Chart Container */}
          <div className="relative w-full overflow-hidden bg-slate-950/70 border border-slate-800/80 rounded-xl p-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 sm:h-52 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={padding.left}
                y1={getY(0)}
                x2={chartWidth - padding.right}
                y2={getY(0)}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={getY(0) + 3}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
              >
                R 0
              </text>

              {/* Max & Min guides */}
              <text
                x={padding.left - 8}
                y={padding.top + 5}
                fill="#10b981"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                +R {maxPnl.toLocaleString()}
              </text>
              <text
                x={padding.left - 8}
                y={chartHeight - padding.bottom}
                fill="#f43f5e"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                R {minPnl.toLocaleString()}
              </text>

              {/* Area */}
              {areaD && (
                <path d={areaD} fill="url(#pnlGradient)" />
              )}

              {/* Path Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Points */}
              {pnlData.map((pt, idx) => {
                const x = getX(idx);
                const y = getY(pt.pnl);
                const isWon = pt.status === 'won';
                return (
                  <g key={`${pt.ticketId}-${idx}`} className="cursor-pointer">
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={isWon ? '#10b981' : '#f43f5e'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="hover:r-6 transition-all"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Won Ticket
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ml-2" /> Lost Ticket
            </span>
            <span className="font-mono text-slate-400">
              {pnlData[0]?.date || 'Start'} → {pnlData[pnlData.length - 1]?.date || 'Latest'}
            </span>
          </div>
        </div>

        {/* Super-Learning Neural Engine Status (1 col) */}
        <div className="bg-slate-900/90 border border-purple-900/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Super-Learning Model</h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {intelligenceState.meta_improvement_notes}
            </p>

            <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Engine Build:</span>
                <span className="font-mono font-bold text-purple-300">{intelligenceState.model_engine}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Synced Teams:</span>
                <span className="font-mono text-amber-300">
                  {Object.keys(intelligenceState.team_intelligence_matrices).length} Club Profiles
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Sync:</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {new Date(intelligenceState.sync_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Unrestricted Mode:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Real-Time Optimization
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            {onOpenDualAI && (
              <button
                type="button"
                onClick={onOpenDualAI}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/30 transition cursor-pointer"
              >
                <BrainCircuit className="w-4 h-4 text-amber-300" />
                <span>Launch Dual-AI Deliberation & Peer Consensus</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('matrix')}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              >
                Inspect Matrix Schema
              </button>
              <button
                onClick={onOpenValidator}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
              >
                Validate New Slip
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Team Momentum & Calculated Win Probability Trajectory Chart (Recharts) */}
      <TeamMomentumChart
        tickets={tickets}
        intelligenceState={intelligenceState}
        onSelectTeam={(team) => onNavigateTab('traps')}
      />

      {/* Betting Timeline & Match Calendar Visualization */}
      <BettingTimelineCalendar
        tickets={tickets}
        activeFixtures={activeFixtures}
        onNavigateTab={onNavigateTab}
        onDiagnoseMistakes={onDiagnoseMistakes}
        onAdvisePendingTicket={onAdvisePendingTicket}
        onDeleteFixture={onDeleteFixture}
        onPurgeSlates={onPurgeSlates}
        onOpenIngestionModal={onOpenIngestionModal}
      />

      {/* Showdown Section: Trap Teams to Avoid VS Positive Momentum Anchors to Back */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Trap Teams (Potential Loss Teams to Avoid) */}
        <div className="bg-slate-900/90 border border-rose-900/40 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800/60">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Potential Loss Teams to Avoid (Trap Radar)</h3>
                <p className="text-[11px] text-slate-400">Historical multibet breakers based on your Hollywoodbets losses</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('traps')}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {trapTeams.slice(0, 3).map((trap, tIdx) => (
              <div
                key={`dash-trap-${trap.teamName}-${tIdx}`}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-900/30 hover:border-rose-700/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{trap.teamName}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      trap.affordabilityStatus === 'STRICT_AVOID'
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : 'bg-amber-950 text-amber-400 border-amber-800'
                    }`}>
                      {trap.affordabilityStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-rose-400">
                      -R {trap.totalLossZar.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">Total Lost Capital</div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                  {trap.primaryTrapFactor}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    Busted Slips: <strong className="text-rose-300 font-mono">{trap.bustCount}</strong> of {trap.totalMatchesBet}
                  </span>
                  <span className="text-slate-400">
                    Volatility: <strong className="text-amber-300 font-mono">{trap.volatilityIndex}</strong>
                  </span>
                  <span className="text-slate-400">
                    Affordable Limit: <strong className="text-slate-200 font-mono">R {trap.maxAllowedStakeZar}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Positive Momentum Anchors (Gold Standard Performers) */}
        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Gold Standard Anchors (Positive Momentum)</h3>
                <p className="text-[11px] text-slate-400">Teams that have consistently generated profits in your tickets</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('positive')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {positiveTeams.slice(0, 3).map((pos, pIdx) => (
              <div
                key={`dash-pos-${pos.teamName}-${pIdx}`}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/30 hover:border-emerald-700/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{pos.teamName}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {pos.bankerRating.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      +R {pos.totalProfitZar.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">Attributed Profit</div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                  {pos.suggestedRole}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    Win Rate: <strong className="text-emerald-300 font-mono">{pos.winRatePercent}%</strong> ({pos.winCount}/{pos.totalMatchesBet})
                  </span>
                  <span className="text-slate-400">
                    Form Momentum: <strong className="text-purple-300 font-mono">{pos.formWeight}x</strong>
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    Core Banker Asset
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
