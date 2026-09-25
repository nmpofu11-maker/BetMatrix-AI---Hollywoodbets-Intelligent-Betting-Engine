import React from 'react';
import { 
  BrainCircuit, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  Terminal, 
  Sparkles,
  Info
} from 'lucide-react';
import { SuperLearningIntelligenceState } from '../types/betting';

interface IntelligenceMatrixInspectorProps {
  intelligenceState: SuperLearningIntelligenceState;
  isRetraining: boolean;
  onRetrain: () => void;
  onUpdateState: (newState: SuperLearningIntelligenceState) => void;
}

export const IntelligenceMatrixInspector: React.FC<IntelligenceMatrixInspectorProps> = ({
  intelligenceState,
  isRetraining,
  onRetrain,
  onUpdateState,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'table' | 'json'>('table');
  const [editingTeam, setEditingTeam] = React.useState<string | null>(null);

  const jsonString = JSON.stringify(intelligenceState, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betmatrix_intelligence_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-purple-900/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
              <BrainCircuit className="w-4 h-4 text-amber-400" />
              <span>Super-Learning Schema Inspector</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Team Intelligence Matrices & Learned Coefficients
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Strict schema-compliant Bayesian neural matrix powering Hollywoodbets predictions, loss prevention, and trap identification. Recalibrates after every ticket resolution.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={onRetrain}
              disabled={isRetraining}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
              <span>{isRetraining ? 'Recalibrating Matrix...' : 'Retrain AI Models Now'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              title="Copy schema JSON"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition"
              title="Download JSON schema file"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Info Meta Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-purple-900/40 text-xs">
          <div>
            <span className="text-slate-400">Model Engine:</span>
            <div className="font-mono font-bold text-amber-300">{intelligenceState.model_engine}</div>
          </div>
          <div>
            <span className="text-slate-400">Synchronized At:</span>
            <div className="font-mono text-slate-200">
              {new Date(intelligenceState.sync_timestamp).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Total Teams Calibrated:</span>
            <div className="font-mono font-bold text-emerald-400">
              {Object.keys(intelligenceState.team_intelligence_matrices).length} Active Club Matrices
            </div>
          </div>
        </div>
      </div>

      {/* Meta Improvement Notes Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
          <Terminal className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-white text-xs uppercase tracking-wider mb-0.5">
            Meta Improvement Notes (Automated AI Learning Log)
          </div>
          <p className="text-slate-300 leading-relaxed font-mono">
            {intelligenceState.meta_improvement_notes}
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'table'
                ? 'bg-purple-900/60 text-amber-300 border border-purple-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            Matrix Coefficients Table
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'json'
                ? 'bg-purple-900/60 text-amber-300 border border-purple-700'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            Strict JSON Schema View
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Schema: team_intelligence_matrices[team].learned_coefficients
        </span>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Club / Entity</th>
                  <th className="py-3 px-3">Sample Matches</th>
                  <th className="py-3 px-3">Home Multiplier</th>
                  <th className="py-3 px-3">Form Momentum</th>
                  <th className="py-3 px-3">Volatility Index</th>
                  <th className="py-3 px-3">Fatigue Penalty</th>
                  <th className="py-3 px-4">AI Matrix Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(intelligenceState.team_intelligence_matrices).map(([teamName, entry], idx) => {
                  const coeffs = entry.learned_coefficients;
                  const isTrap = coeffs.volatility_index >= 0.70;
                  const isAnchor = coeffs.volatility_index <= 0.35 && coeffs.form_momentum_weight >= 1.05;

                  return (
                    <tr
                      key={`matrix-row-${teamName}-${idx}`}
                      className="hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        {teamName}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-300">
                        {entry.sample_size_matches}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-200">
                        <span className={coeffs.home_advantage_multiplier >= 1.25 ? 'text-emerald-400 font-bold' : ''}>
                          {coeffs.home_advantage_multiplier.toFixed(2)}x
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className={coeffs.form_momentum_weight >= 1.1 ? 'text-purple-300 font-bold' : 'text-slate-400'}>
                          {coeffs.form_momentum_weight.toFixed(2)}x
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          coeffs.volatility_index >= 0.75
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : coeffs.volatility_index <= 0.30
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'text-amber-300'
                        }`}>
                          {coeffs.volatility_index.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-300">
                        {coeffs.fatigue_penalty_modifier.toFixed(2)}
                      </td>

                      <td className="py-3 px-4">
                        {isTrap ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-800">
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            Trap Hazard (Avoid Outrights)
                          </span>
                        ) : isAnchor ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Gold Standard Banker
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                            Neutral Variance
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* JSON View */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-x-auto shadow-2xl">
          <pre className="text-emerald-400 whitespace-pre">
            {jsonString}
          </pre>
        </div>
      )}

    </div>
  );
};
