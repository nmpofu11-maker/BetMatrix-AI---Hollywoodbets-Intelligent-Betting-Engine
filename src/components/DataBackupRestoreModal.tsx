import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Database, 
  FileSpreadsheet, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  HardDrive, 
  Copy, 
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { BetTicket, SuperLearningIntelligenceState } from '../types/betting';
import { INITIAL_BET_HISTORY, INITIAL_INTELLIGENCE_STATE } from '../data/mockBetHistory';

interface BackupDataPayload {
  version: string;
  exportedAt: string;
  platform: string;
  bankroll: number;
  tickets: BetTicket[];
  intelligenceState: SuperLearningIntelligenceState;
  blacklistedTeams: string[];
  antiLossFirewallEnabled: boolean;
  maxStakePct: number;
  kellyFraction: number;
}

interface DataBackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankroll: number;
  onUpdateBankroll: (b: number) => void;
  tickets: BetTicket[];
  onUpdateTickets: (t: BetTicket[]) => void;
  intelligenceState: SuperLearningIntelligenceState;
  onUpdateIntelligenceState: (s: SuperLearningIntelligenceState) => void;
  blacklistedTeams: string[];
  onUpdateBlacklistedTeams: (teams: string[]) => void;
  antiLossFirewallEnabled: boolean;
  onUpdateAntiLossFirewall: (enabled: boolean) => void;
  maxStakePct: number;
  onUpdateMaxStakePct: (pct: number) => void;
  kellyFraction: number;
  onUpdateKellyFraction: (f: number) => void;
  onNotify: (msg: string) => void;
}

export const DataBackupRestoreModal: React.FC<DataBackupRestoreModalProps> = ({
  isOpen,
  onClose,
  bankroll,
  onUpdateBankroll,
  tickets,
  onUpdateTickets,
  intelligenceState,
  onUpdateIntelligenceState,
  blacklistedTeams,
  onUpdateBlacklistedTeams,
  antiLossFirewallEnabled,
  onUpdateAntiLossFirewall,
  maxStakePct,
  onUpdateMaxStakePct,
  kellyFraction,
  onUpdateKellyFraction,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [pastedJson, setPastedJson] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Export Complete JSON Backup
  const handleExportJson = () => {
    const backup: BackupDataPayload = {
      version: '4.9',
      exportedAt: new Date().toISOString(),
      platform: 'Hollywoodbets BetMatrix AI',
      bankroll,
      tickets,
      intelligenceState,
      blacklistedTeams,
      antiLossFirewallEnabled,
      maxStakePct,
      kellyFraction,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `betmatrix-ai-backup-${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    onNotify('Complete JSON backup downloaded to your device!');
  };

  // 2. Export Tickets to CSV Spreadsheet
  const handleExportCsv = () => {
    const headers = [
      'Ticket ID',
      'Placed At',
      'Platform',
      'Type',
      'Legs Count',
      'Total Odds',
      'Stake ZAR',
      'Potential Payout ZAR',
      'Actual Payout ZAR',
      'Status',
      'Profit ZAR',
      'Legs Detail',
      'Busted By',
      'Notes'
    ];

    const escapeCsv = (str: string | number | undefined) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = tickets.map(t => {
      const legsDetail = t.legs.map(l => `${l.match} [${l.market} @ ${l.odds}x - ${l.status}]`).join('; ');
      const bustedBy = t.bustedByTeams?.join(', ') || '';

      return [
        escapeCsv(t.id),
        escapeCsv(t.placedAt),
        escapeCsv(t.platform),
        escapeCsv(t.type),
        t.legs.length,
        t.totalOdds,
        t.stakeZar,
        t.potentialPayoutZar,
        t.actualPayoutZar,
        escapeCsv(t.status),
        t.profitZar,
        escapeCsv(legsDetail),
        escapeCsv(bustedBy),
        escapeCsv(t.notes || '')
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `betmatrix-ledger-${today}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    onNotify('Betting ledger exported as CSV spreadsheet!');
  };

  // 3. Process Restore Logic
  const executeRestore = (parsed: any) => {
    try {
      let importedTickets: BetTicket[] = [];
      if (Array.isArray(parsed.tickets)) {
        importedTickets = parsed.tickets;
      } else if (Array.isArray(parsed)) {
        importedTickets = parsed;
      }

      if (restoreMode === 'overwrite') {
        if (importedTickets.length > 0) {
          onUpdateTickets(importedTickets);
        }
        if (typeof parsed.bankroll === 'number') {
          onUpdateBankroll(parsed.bankroll);
        }
        if (parsed.intelligenceState?.team_intelligence_matrices) {
          onUpdateIntelligenceState(parsed.intelligenceState);
        }
        if (Array.isArray(parsed.blacklistedTeams)) {
          onUpdateBlacklistedTeams(parsed.blacklistedTeams);
        }
        if (typeof parsed.antiLossFirewallEnabled === 'boolean') {
          onUpdateAntiLossFirewall(parsed.antiLossFirewallEnabled);
        }
        if (typeof parsed.maxStakePct === 'number') {
          onUpdateMaxStakePct(parsed.maxStakePct);
        }
        if (typeof parsed.kellyFraction === 'number') {
          onUpdateKellyFraction(parsed.kellyFraction);
        }

        setImportStatus({
          success: true,
          message: `Overwrite complete! Restored ${importedTickets.length} tickets, bankroll (R${parsed.bankroll ?? bankroll}), and neural matrices.`,
        });
        onNotify('System state completely restored from backup!');
      } else {
        // Merge mode
        const existingIds = new Set(tickets.map(t => t.id));
        const newTickets = importedTickets.filter(t => !existingIds.has(t.id));
        const combinedTickets = [...newTickets, ...tickets];

        onUpdateTickets(combinedTickets);

        // Merge matrices
        if (parsed.intelligenceState?.team_intelligence_matrices) {
          const mergedMatrices = {
            ...intelligenceState.team_intelligence_matrices,
            ...parsed.intelligenceState.team_intelligence_matrices,
          };
          onUpdateIntelligenceState({
            ...intelligenceState,
            sync_timestamp: new Date().toISOString(),
            team_intelligence_matrices: mergedMatrices,
          });
        }

        // Merge blacklists
        if (Array.isArray(parsed.blacklistedTeams)) {
          const mergedBlacklist = Array.from(new Set([...blacklistedTeams, ...parsed.blacklistedTeams]));
          onUpdateBlacklistedTeams(mergedBlacklist);
        }

        setImportStatus({
          success: true,
          message: `Merge complete! Added ${newTickets.length} new tickets (${importedTickets.length - newTickets.length} duplicates skipped). Neural matrices synchronized.`,
        });
        onNotify(`Merged ${newTickets.length} tickets and neural models!`);
      }
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Failed to restore data: ${err.message || 'Invalid format'}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        executeRestore(parsed);
      } catch (err) {
        setImportStatus({
          success: false,
          message: 'Selected file is not valid JSON. Please select a valid BetMatrix backup file.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handlePasteRestore = () => {
    if (!pastedJson.trim()) return;
    try {
      const parsed = JSON.parse(pastedJson);
      executeRestore(parsed);
      setPastedJson('');
    } catch (err) {
      setImportStatus({
        success: false,
        message: 'Pasted text is not valid JSON. Please check and try again.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-purple-900/60 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-white tracking-wide">
                Data Backup & Disaster Recovery Center
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Safeguard your betting ledger, bankroll, and Super-Learning matrices against browser cache clearing and device changes.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs">
          <button
            onClick={() => { setActiveTab('export'); setImportStatus(null); }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export & Backup</span>
          </button>

          <button
            onClick={() => { setActiveTab('import'); setImportStatus(null); }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restore & Import</span>
          </button>

          <button
            onClick={() => { setActiveTab('reset'); setImportStatus(null); }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ml-auto ${
              activeTab === 'reset'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-rose-300'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Emergency Reset</span>
          </button>
        </div>

        {/* Status Alert if available */}
        {importStatus && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
            importStatus.success
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/60 border-rose-700 text-rose-200'
          }`}>
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>{importStatus.message}</div>
          </div>
        )}

        {/* TAB 1: EXPORT & BACKUP */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Ledger Tickets:</span>
                <span className="font-mono font-bold text-white">{tickets.length} Tickets</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Trained Team Matrices:</span>
                <span className="font-mono font-bold text-purple-300">
                  {Object.keys(intelligenceState.team_intelligence_matrices || {}).length} Clubs
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Bankroll:</span>
                <span className="font-mono font-bold text-amber-300">R {bankroll.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Quarantined Trap Teams:</span>
                <span className="font-mono font-bold text-rose-300">{blacklistedTeams.length} Teams</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option A: Complete JSON Backup */}
              <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
                    <Database className="w-4 h-4" />
                    <span>Complete System Snapshot (JSON)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Downloads an encrypted-ready JSON file containing all tickets, bankroll balance, risk settings, and the Super-Learning neural matrix.
                  </p>
                </div>
                <button
                  onClick={handleExportJson}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full JSON Backup</span>
                </button>
              </div>

              {/* Option B: CSV Ledger */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Spreadsheet Ledger (CSV)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Exports your entire betting history into a clean Excel/Google Sheets CSV spreadsheet with odds, stakes, payouts, and busted legs.
                  </p>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Tickets CSV</span>
                </button>
              </div>

            </div>

            <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-900/40 text-[11px] text-purple-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Tip: Create a weekly backup snapshot to retain your customized team volatility and fatigue coefficients indefinitely.
              </span>
            </div>

          </div>
        )}

        {/* TAB 2: RESTORE & IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-4 text-xs">
            
            {/* Mode Selector */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Restoration Strategy:</span>
                <span className="text-[11px] text-slate-400">
                  {restoreMode === 'merge' ? 'Merge with existing tickets (skip duplicates)' : 'Overwrite current state completely'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRestoreMode('merge')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                    restoreMode === 'merge'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Merge
                </button>
                <button
                  onClick={() => setRestoreMode('overwrite')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                    restoreMode === 'overwrite'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Overwrite
                </button>
              </div>
            </div>

            {/* File Upload Box */}
            <div className="p-5 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 hover:border-purple-500/50 transition text-center space-y-2">
              <Upload className="w-8 h-8 text-purple-400 mx-auto" />
              <div className="font-bold text-white text-xs">Select or Drop BetMatrix Backup File (.json)</div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Restore tickets, neural matrices, and settings previously downloaded from BetMatrix AI.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
              >
                Choose Backup JSON File
              </button>
            </div>

            {/* Quick 1-Click Seed / Reload Verified Slips */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-800/40 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-emerald-300 block text-xs">
                  Restore Verified Hollywoodbets History
                </span>
                <span className="text-[11px] text-slate-400">
                  Instant 1-click restore of all 18+ verified betting slips and historical neural calibration models.
                </span>
              </div>
              <button
                onClick={() => {
                  onUpdateTickets(INITIAL_BET_HISTORY);
                  onUpdateIntelligenceState(INITIAL_INTELLIGENCE_STATE);
                  onNotify('Restored all 18+ verified Hollywoodbets slips and neural matrix!');
                  setImportStatus({
                    success: true,
                    message: `Successfully loaded all ${INITIAL_BET_HISTORY.length} verified betting ledger tickets!`,
                  });
                }}
                className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shrink-0 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Verified Slips</span>
              </button>
            </div>

            {/* Paste JSON Fallback */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-slate-400 block font-semibold text-xs">
                Or Paste Backup JSON Raw Content:
              </label>
              <textarea
                rows={3}
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Paste raw JSON here: { "version": "4.9", "tickets": [...] }'
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handlePasteRestore}
                disabled={!pastedJson.trim()}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs transition disabled:opacity-40"
              >
                Restore from Pasted JSON
              </button>
            </div>

          </div>
        )}

        {/* TAB 3: EMERGENCY RESET */}
        {activeTab === 'reset' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/80 text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <span>Danger Zone: Emergency Data Reset</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                This action will wipe custom tickets and restore factory demo data. Make sure to download a JSON backup first if you want to keep your historical tickets!
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={handleExportJson}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Download Backup First
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you certain you want to wipe local tickets and reset to default? This cannot be undone unless you have a backup.')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition"
              >
                Confirm Factory Reset
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-500">
            BetMatrix AI • Data Resilience & Storage Security
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
