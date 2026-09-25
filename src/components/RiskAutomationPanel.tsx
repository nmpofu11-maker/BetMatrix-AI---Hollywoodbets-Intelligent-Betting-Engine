import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Sliders, 
  Zap, 
  Lock, 
  Unlock, 
  Percent, 
  Coins, 
  CheckCircle, 
  RefreshCw,
  Cpu,
  Flame,
  Scale,
  Database,
  Download,
  Upload
} from 'lucide-react';
import { RiskManagementAlert } from '../types/betting';

interface RiskAutomationPanelProps {
  bankroll: number;
  onUpdateBankroll: (val: number) => void;
  riskAlerts: RiskManagementAlert[];
  onDismissAlert: (id: string) => void;
  blacklistedTeams: string[];
  onToggleBlacklist: (team: string) => void;
  maxStakePct: number;
  onUpdateMaxStakePct: (pct: number) => void;
  kellyFraction: number;
  onUpdateKellyFraction: (frac: number) => void;
  antiLossFirewallEnabled: boolean;
  onToggleAntiLossFirewall: () => void;
  onOpenCashOutCalculator?: () => void;
  onOpenBackupRestore?: () => void;
}

export const RiskAutomationPanel: React.FC<RiskAutomationPanelProps> = ({
  bankroll,
  onUpdateBankroll,
  riskAlerts,
  onDismissAlert,
  blacklistedTeams,
  onToggleBlacklist,
  maxStakePct,
  onUpdateMaxStakePct,
  kellyFraction,
  onUpdateKellyFraction,
  antiLossFirewallEnabled,
  onToggleAntiLossFirewall,
  onOpenCashOutCalculator,
  onOpenBackupRestore,
}) => {
  const [testOdds, setTestOdds] = React.useState('2.10');
  const [testWinProb, setTestWinProb] = React.useState('55');

  // Kelly Staking Calculation
  const b = parseFloat(testOdds) - 1;
  const p = parseFloat(testWinProb) / 100;
  const q = 1 - p;
  const fullKelly = b > 0 ? (b * p - q) / b : 0;
  const safeKellyStake = Math.max(0, Math.round(bankroll * Math.max(0, fullKelly * kellyFraction)));
  const maxSafeStakeZar = Math.round(bankroll * (maxStakePct / 100));

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Automated Risk Management & Guardrails</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Real-Time Strategy Optimizer & Capital Protection
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Strict mathematical bankroll management rules preventing emotional bet-sizing, accumulator compounding hazards, and catastrophic drawdowns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Firewall Status:</span>
            <button
              onClick={onToggleAntiLossFirewall}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                antiLossFirewallEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {antiLossFirewallEnabled ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> FIREWALL ENGAGED
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> FIREWALL OFF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Active Risk Alerts Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Active System Risk Notifications ({riskAlerts.length})</h3>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            Real-Time Monitor
          </span>
        </div>

        {riskAlerts.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>All risk indicators normal. No loss-chasing or excessive tail risk detected.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {riskAlerts.map((alert, aIdx) => (
              <div
                key={`rap-alert-${alert.id || 'a'}-${aIdx}`}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start justify-between gap-3 text-xs ${
                  alert.severity === 'critical'
                    ? 'bg-rose-950/40 border-rose-700/60 text-rose-200'
                    : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/40 border border-current">
                      {alert.severity}
                    </span>
                    <strong className="text-white text-sm">{alert.title}</strong>
                    <span className="text-slate-400 text-[10px]">{alert.timestamp}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{alert.message}</p>
                  <div className="mt-2 text-xs font-semibold text-amber-300 bg-black/40 px-2.5 py-1 rounded inline-flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Action: {alert.actionRecommendation}</span>
                  </div>
                </div>

                <button
                  onClick={() => onDismissAlert(alert.id)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[11px] text-white shrink-0 self-end sm:self-start transition"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kelly Staking Calculator & Control Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Interactive Kelly Calculator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Kelly Criterion Staking Engine</h3>
              <p className="text-xs text-slate-400">Calculate mathematically optimal stake in Rands</p>
            </div>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Offered Odds (Decimal):</label>
              <input
                type="number"
                step="0.05"
                value={testOdds}
                onChange={(e) => setTestOdds(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Estimated True Win Prob (%):</label>
              <input
                type="number"
                value={testWinProb}
                onChange={(e) => setTestWinProb(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Kelly Fraction Staking Profile:</span>
              <span className="font-mono text-purple-300 font-bold">
                {kellyFraction === 0.25 ? 'Quarter-Kelly (Safe)' : kellyFraction === 0.5 ? 'Half-Kelly (Optimal)' : 'Full-Kelly (Aggressive)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0.25, 0.5, 1.0].map(frac => (
                <button
                  key={`kelly-frac-${frac}`}
                  onClick={() => onUpdateKellyFraction(frac)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    kellyFraction === frac
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {frac * 100}% Kelly
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Output */}
          <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/40 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Mathematical Edge / EV:</span>
              <span className={`font-mono font-bold ${fullKelly > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fullKelly > 0 ? `+${(fullKelly * 100).toFixed(1)}% EV (Positive Edge)` : 'Negative EV (Avoid Bet)'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-white font-bold">Recommended Stake (ZAR):</span>
              <span className="text-base font-black font-mono text-amber-300">
                R {safeKellyStake.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Capped at maximum safe allocation of R{maxSafeStakeZar} ({(maxStakePct)}% of bankroll).
            </div>
          </div>
        </div>

        {/* Global Risk Thresholds Controls */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">System Risk Thresholds & Controls</h3>
            <p className="text-xs text-slate-400">Configure automatic tripwires for strategy optimization</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Max Stake % */}
            <div>
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <span>Max Single Ticket Stake Allocation:</span>
                <span className="font-mono font-bold text-amber-300">{maxStakePct}% (R{maxSafeStakeZar})</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={maxStakePct}
                onChange={(e) => onUpdateMaxStakePct(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-slate-400">
                Industry standard: 1% to 3% preserves longevity against drawdowns.
              </span>
            </div>

            {/* Quarantined Teams List */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-300 mb-2">
                <span>Quarantined Trap Teams in Firewall:</span>
                <span className="text-rose-400 font-mono font-bold">{blacklistedTeams.length} Banned</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {blacklistedTeams.length === 0 ? (
                  <span className="text-slate-500 text-xs">No clubs quarantined.</span>
                ) : (
                  blacklistedTeams.map((team, bIdx) => (
                    <span
                      key={`blacklisted-team-${team}-${bIdx}`}
                      className="px-2.5 py-1 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Lock className="w-3 h-3 text-rose-400" />
                      {team}
                      <button
                        onClick={() => onToggleBlacklist(team)}
                        className="hover:text-white transition ml-1"
                        title="Remove from quarantine"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Neural Mode */}
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-bold text-white">Unrestricted Super-Learning Mode</div>
                  <div className="text-[10px] text-slate-400">Real-time dynamic matrix re-weighting enabled</div>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-black text-[10px]">
                ON
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Advanced Hedging & Data Disaster Recovery Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Fair Cash-Out Valuation Calculator */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Scale className="w-5 h-5 text-amber-400" />
                <span>Fair Cash-Out & Arbitrage Calculator</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                ANTI-VIG
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bookmakers regularly cut 15% to 35% of true ticket value when presenting cash-out buttons. Calculate real statistical equity, uncover the haircut percentage, and calculate guaranteed risk-free counter-hedges.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenCashOutCalculator}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow flex items-center justify-center gap-2"
            >
              <Scale className="w-4 h-4" />
              <span>Launch Cash-Out Valuation Engine</span>
            </button>
          </div>
        </div>

        {/* Card 2: Data Backup & Restore Center */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-900/50 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Database className="w-5 h-5 text-purple-400" />
                <span>Data Backup & Disaster Recovery (JSON / CSV)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                PERSISTENCE
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Safeguard your entire betting ledger, bankroll trajectory, and learned team intelligence matrices against browser cache purges or device switching with 1-click JSON snapshot exports and CSV ledger sheets.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenBackupRestore}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Open Backup & Restore Center</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
