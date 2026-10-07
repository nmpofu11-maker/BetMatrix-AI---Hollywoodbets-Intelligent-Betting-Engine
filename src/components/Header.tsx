import React from 'react';
import { 
  Zap, 
  BrainCircuit, 
  PlusCircle, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  SlidersHorizontal,
  Wallet,
  FileText,
  FileUp,
  Scale,
  Database,
  Globe,
  Trash2
} from 'lucide-react';
import { SuperLearningIntelligenceState } from '../types/betting';

interface HeaderProps {
  bankroll: number;
  onUpdateBankroll: (newBankroll: number) => void;
  intelligenceState: SuperLearningIntelligenceState;
  isRetraining: boolean;
  onRetrain: () => void;
  onOpenImporter: () => void;
  onOpenValidator: () => void;
  onOpenSettings: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  criticalAlertCount: number;
  pendingCount?: number;
  onOpenCashOutCalculator?: () => void;
  onOpenBackupRestore?: () => void;
  onOpenDualAI?: () => void;
  onOpenVerificationModal?: () => void;
  onOpenFixturesModal?: () => void;
  onOpenIngestionModal?: () => void;
  onPurgeSlates?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  bankroll,
  onUpdateBankroll,
  intelligenceState,
  isRetraining,
  onRetrain,
  onOpenImporter,
  onOpenValidator,
  onOpenSettings,
  activeTab,
  setActiveTab,
  criticalAlertCount,
  pendingCount = 0,
  onOpenCashOutCalculator,
  onOpenBackupRestore,
  onOpenDualAI,
  onOpenVerificationModal,
  onOpenFixturesModal,
  onOpenIngestionModal,
  onPurgeSlates,
}) => {
  const [editingBankroll, setEditingBankroll] = React.useState(false);
  const [tempBankroll, setTempBankroll] = React.useState(bankroll.toString());

  const handleBankrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempBankroll);
    if (!isNaN(val) && val >= 0) {
      onUpdateBankroll(val);
      setEditingBankroll(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur border-b border-purple-900/40 text-slate-100 shadow-xl">
      {/* Top Banner with Hollywoodbets Terminal Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-purple-800 to-indigo-950 border border-purple-500/50 shadow-lg shadow-purple-900/40">
              <BrainCircuit className="w-5 h-5 text-amber-300 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0d1117]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider text-white">
                  BET<span className="text-amber-400">MATRIX</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-purple-950 text-purple-300 border border-purple-700/60 rounded">
                  HB·AI v4.9
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hollywoodbets Super-Learning Engine & Loss Prevention Radar
              </p>
            </div>
          </div>

          {/* Quick Bankroll & Status Pill */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Bankroll Chip */}
            <div className="relative group">
              {editingBankroll ? (
                <form onSubmit={handleBankrollSubmit} className="flex items-center gap-1 bg-slate-900 border border-amber-500/50 rounded-lg p-1">
                  <span className="text-xs font-bold text-amber-400 pl-1">R</span>
                  <input
                    type="number"
                    value={tempBankroll}
                    onChange={(e) => setTempBankroll(e.target.value)}
                    className="w-20 bg-transparent text-xs text-white font-mono focus:outline-none"
                    autoFocus
                    onBlur={() => setEditingBankroll(false)}
                  />
                  <button type="submit" className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-bold">
                    Save
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => {
                    setTempBankroll(bankroll.toString());
                    setEditingBankroll(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-colors text-left"
                  title="Click to edit bankroll"
                >
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-[10px] text-slate-400 leading-none">BANKROLL</div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-amber-300">
                      R {bankroll.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Neural Synapse State */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-600/60 shadow-lg shadow-purple-900/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-wider text-purple-300 font-black flex items-center gap-1">
                  <span>AGGRESSIVE LEARNER</span>
                  <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[8px] font-mono">SEEKING ALPHA</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  CONTINUOUS AUTO-LEARN
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {onOpenCashOutCalculator && (
                <button
                  onClick={onOpenCashOutCalculator}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-semibold transition"
                  title="Fair Cash-Out Valuation Calculator"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cash-Out Calc</span>
                </button>
              )}

              {onOpenBackupRestore && (
                <button
                  onClick={onOpenBackupRestore}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/40 text-xs font-semibold transition"
                  title="Data Backup & Disaster Recovery Center"
                >
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span>Backup</span>
                </button>
              )}

              {onOpenDualAI && (
                <button
                  onClick={onOpenDualAI}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-amber-300 border border-purple-700/70 text-xs font-semibold transition shadow-sm"
                  title="Dual-AI Deliberation & Peer Consensus Chamber"
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Dual-AI Debate</span>
                </button>
              )}

              {onOpenVerificationModal && (
                <button
                  onClick={onOpenVerificationModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/60 text-xs font-semibold transition shadow-sm"
                  title="AI Result Verification Utility"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">AI Verify</span>
                </button>
              )}

              {onOpenFixturesModal && (
                <button
                  onClick={onOpenFixturesModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-600/60 text-xs font-semibold transition shadow-sm"
                  title="Authentic Live Fixtures & Scores Center"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Live Fixtures</span>
                </button>
              )}

              {onOpenIngestionModal && (
                <button
                  onClick={onOpenIngestionModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/60 text-xs font-semibold transition shadow-sm cursor-pointer"
                  title="PDF Fixture Upload & Ingestion Engine"
                >
                  <FileUp className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Upload Fixture PDF</span>
                </button>
              )}

              {onPurgeSlates && (
                <button
                  onClick={onPurgeSlates}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition shadow-sm"
                  title="Purge & Reset Slates (Wipes Disk Manifest & Memory Cache)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden lg:inline">Purge Slates</span>
                </button>
              )}

              <button
                onClick={onRetrain}
                disabled={isRetraining}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/40 text-xs font-semibold transition disabled:opacity-50"
                title="Retrain AI with updated betting history"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">{isRetraining ? 'Retraining...' : 'Sync AI'}</span>
              </button>

              <button
                onClick={onOpenImporter}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 text-purple-100 border border-purple-700/60 text-xs font-semibold transition"
                title="Import Hollywoodbets Slip or SMS"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Import Slip</span>
              </button>

              <button
                onClick={onOpenValidator}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Validate Slip</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 border-t border-slate-800/60 scrollbar-none text-xs">
          {[
            { id: 'dashboard', label: 'Executive Dashboard', badge: null },
            { id: 'features', label: "Today's Features", badge: 'BEST SLIPS', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
            { id: 'validator', label: 'Predictor & Bet Validator', badge: 'AI-EV+', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
            { id: 'traps', label: 'Trap Teams (Loss Avoidance)', badge: 'CRITICAL', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
            { id: 'positive', label: 'Positive Anchors (Gold Standard)', badge: 'HIGH ROI', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
            { id: 'history', label: 'Bet History Ledger', badge: pendingCount > 0 ? `${pendingCount} PENDING` : null, badgeColor: 'bg-amber-500 text-slate-950 font-black' },
            { id: 'matrix', label: 'Neural Matrix Inspector', badge: 'SCHEMA SYNC', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
            { id: 'evidence', label: 'Verified Data Centre', badge: 'EVIDENCE', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
            { id: 'risk', label: 'Risk Automation & Kelly', badge: criticalAlertCount > 0 ? `${criticalAlertCount} ALERTS` : null, badgeColor: 'bg-rose-500 text-white' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`header-nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-purple-600/30 text-amber-300 border border-purple-500/50 shadow-inner shadow-purple-900/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
