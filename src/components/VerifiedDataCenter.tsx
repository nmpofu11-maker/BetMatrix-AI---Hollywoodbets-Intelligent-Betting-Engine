import React from 'react';

type Status = { fixtures: number; results: number; tickets: number; dataHash: string; adapters: Array<{id:string;name:string;configured:boolean}> };

export const VerifiedDataCenter: React.FC = () => {
  const [status, setStatus] = React.useState<Status | null>(null);
  const [resultsText, setResultsText] = React.useState('');
  const [ticketText, setTicketText] = React.useState('');
  const [message, setMessage] = React.useState('');

  const refresh = React.useCallback(async () => {
    const r = await fetch('/api/verified-data/status');
    if (r.ok) setStatus(await r.json());
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const syncFixtures = async () => {
    setMessage('Synchronising configured verified sources...');
    const r = await fetch('/api/verified-data/sync-fixtures', { method: 'POST' });
    const data = await r.json();
    setMessage(data.success ? 'Verified fixtures synchronised.' : (data.error || 'Fixture sync failed.'));
    void refresh();
  };

  const ingestResults = async () => {
    try {
      const parsed = JSON.parse(resultsText);
      const r = await fetch('/api/verified-data/ingest-results', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ results: Array.isArray(parsed) ? parsed : parsed.results, source: { sourceId:'user-import-results', sourceName:'User supplied historical results' } }),
      });
      const data = await r.json();
      setMessage(data.success ? 'Historical results accepted into the verified ledger.' : (data.error || 'Result import failed.'));
      void refresh();
    } catch { setMessage('Historical results must be valid JSON.'); }
  };

  const verifyTicket = async () => {
    try {
      const parsed = JSON.parse(ticketText);
      const r = await fetch('/api/verified-data/verify-ticket', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ ticket: parsed, source: { sourceId:'user-artifact', sourceName:'User supplied ticket artifact' } }),
      });
      const data = await r.json();
      setMessage(data.success ? 'Ticket content structurally verified and hashed.' : (data.error || 'Ticket verification failed.'));
      void refresh();
    } catch { setMessage('Ticket must be valid JSON containing the actual ticket legs and odds.'); }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-white">Verified Data Centre</h2>
        <p className="text-sm text-slate-400 mt-1">Only sourced or explicitly supplied evidence enters prediction. Missing evidence stays unknown.</p>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Fixtures', status.fixtures], ['Results', status.results], ['Tickets', status.tickets],
            ['Adapters', status.adapters.filter(a => a.configured).length], ['Data hash', status.dataHash.slice(0, 10)],
          ].map(([label,value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-[10px] uppercase text-slate-500">{label}</div>
              <div className="mt-1 font-mono font-bold text-amber-300">{String(value)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={syncFixtures} className="px-3 py-2 rounded-lg bg-blue-900/60 border border-blue-700 text-blue-200 text-xs font-bold">Sync verified sources</button>
          <button onClick={() => void refresh()} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold">Refresh status</button>
          <span className="text-[11px] text-slate-500">Configured adapters are shown below.</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {status?.adapters.map(a => <span key={a.id} className={`px-2 py-1 rounded-md text-[10px] border ${a.configured ? 'border-emerald-700 text-emerald-300' : 'border-slate-700 text-slate-500'}`}>{a.name}: {a.configured ? 'configured' : 'not configured'}</span>)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="font-bold text-white">Historical result ingestion</h3>
          <p className="text-xs text-slate-500 mt-1">Paste actual settled results. No scores are inferred.</p>
          <textarea value={resultsText} onChange={e=>setResultsText(e.target.value)} placeholder='[{"id":"...","kickoff":"2026-10-01T18:00:00Z","homeTeam":"...","awayTeam":"...","homeGoals":2,"awayGoals":1}]' className="mt-3 w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200" />
          <button onClick={ingestResults} className="mt-2 px-3 py-2 rounded-lg bg-emerald-900/60 border border-emerald-700 text-emerald-200 text-xs font-bold">Import verified results</button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="font-bold text-white">Ticket verification</h3>
          <p className="text-xs text-slate-500 mt-1">Ticket number alone is never accepted as proof.</p>
          <textarea value={ticketText} onChange={e=>setTicketText(e.target.value)} placeholder='{"id":"...","ticketNumber":"...","platform":"Hollywoodbets","status":"won","stakeZar":10,"legs":[...]}' className="mt-3 w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200" />
          <button onClick={verifyTicket} className="mt-2 px-3 py-2 rounded-lg bg-purple-900/60 border border-purple-700 text-purple-200 text-xs font-bold">Verify ticket evidence</button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">{message}</div>}
    </section>
  );
};
