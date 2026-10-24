import React, { useCallback, useEffect, useRef, useState } from 'react';

type Any = any;
const BACKUP_KEY = 'betmatrix_learning_backup_v1';
const pct = (n: number | null | undefined) => (n === null || n === undefined ? '–' : (n * 100).toFixed(1) + '%');
const num = (n: number | null | undefined, d = 3) => (n === null || n === undefined ? '–' : n.toFixed(d));
const timeOf = (iso: string) => new Date(iso).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const ago = (iso?: string) => { if (!iso) return 'never'; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'just now' : m < 90 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

async function api(path: string, init?: RequestInit): Promise<Any> {
  const r = await fetch(path, init); const text = await r.text();
  let body: Any; try { body = JSON.parse(text); } catch { throw new Error(`Server returned a non-JSON reply (HTTP ${r.status}).`); }
  if (!r.ok || body?.success === false) throw new Error(body?.error || `HTTP ${r.status}`);
  return body;
}
const fileToBase64 = (f: File) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(new Error('Could not read the file.')); fr.readAsDataURL(f); });

export default function AutomationCenter() {
  const [status, setStatus] = useState<Any>(null);
  const [stats, setStats] = useState<Any>(null);
  const [day, setDay] = useState<'yesterday' | 'today' | 'tomorrow'>('yesterday');
  const [preds, setPreds] = useState<Any>(null);
  const [busy, setBusy] = useState<string>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paste, setPaste] = useState(''); const [pasteKind, setPasteKind] = useState<'fixtures' | 'results'>('fixtures');
  const fixturesInput = useRef<HTMLInputElement>(null); const resultsInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, st, p] = await Promise.all([api('/api/system/status'), api('/api/predictions/stats'), api('/api/predictions?date=' + day)]);
      setStatus(s); setStats(st); setPreds(p);
      // keep a browser-side copy of what the model has learned (protects against hosts that wipe files)
      if (s.data.predictions > 0 || s.data.ratedTeams > 0) { try { const b = await api('/api/system/backup'); localStorage.setItem(BACKUP_KEY, JSON.stringify(b)); } catch { /* storage full or unavailable */ } }
      else { const saved = localStorage.getItem(BACKUP_KEY); if (saved) { try { const r = await api('/api/system/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: saved }); if (r.restored) { setMsg({ ok: true, text: `Restored learned data from this browser (${r.predictions} predictions, ${r.teams} teams) after the server lost its files.` }); } } catch { /* ignore */ } } }
    } catch (e: Any) { setMsg({ ok: false, text: 'Could not load status: ' + (e?.message || e) }); }
  }, [day]);

  useEffect(() => { void refresh(); const t = setInterval(() => void refresh(), 60000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => { void fetch('/api/jobs/tick', { method: 'POST' }).catch(() => undefined); }, []); // catch-up whenever the app is opened

  const runJob = async (job: string, label: string) => {
    setBusy(job); setMsg(null);
    try { const r = await api('/api/jobs/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ job }) }); setMsg({ ok: r.run.ok, text: `${label}: ${r.run.summary}` }); await refresh(); }
    catch (e: Any) { setMsg({ ok: false, text: `${label} failed: ${e?.message || e}` }); }
    finally { setBusy(''); }
  };
  const upload = async (kind: 'fixtures' | 'results', body: Any, label: string) => {
    setBusy('upload-' + kind); setMsg(null);
    try {
      const r = await api('/api/import/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      setMsg({ ok: true, text: kind === 'fixtures'
        ? `${label}: ${r.accepted} fixtures loaded (${r.withOdds} with full 1X2 odds, ${r.skipped} skipped). ${r.predictions?.created ?? 0} new predictions created.`
        : `${label}: ${r.accepted} results loaded (${r.skipped} skipped${r.conflicts ? `, ${r.conflicts} conflicting` : ''}). ${r.settlement}` });
      await refresh();
    } catch (e: Any) { setMsg({ ok: false, text: `${label}: ${e?.message || e}` }); }
    finally { setBusy(''); }
  };
  const onFile = async (kind: 'fixtures' | 'results', f?: File | null) => { if (!f) return; try { await upload(kind, { filename: f.name, contentBase64: await fileToBase64(f) }, f.name); } catch (e: Any) { setMsg({ ok: false, text: e?.message || String(e) }); } };
  const downloadBackup = async () => { const b = await api('/api/system/backup'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' })); a.download = `betmatrix-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
  const restoreBackup = async (f?: File | null) => { if (!f) return; try { const body = JSON.parse(await f.text()); body.force = true; const r = await api('/api/system/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); setMsg({ ok: true, text: `Backup restored: ${r.predictions} predictions, ${r.teams} teams.` }); await refresh(); } catch (e: Any) { setMsg({ ok: false, text: 'Restore failed: ' + (e?.message || e) }); } };

  const card = 'rounded-xl border border-slate-700/60 bg-slate-900/60 p-4';
  const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50 disabled:cursor-wait';
  const st = status; const ov = stats?.overall; const lc = stats?.learning?.calibration;

  return (
    <div className="space-y-4 text-slate-200" data-testid="automation-center">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-white">Automation &amp; Prediction Log</h2>
          <p className="text-xs text-slate-400">Fixtures → predictions → results → settlement → learning. All times South Africa (SAST).</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${st?.automationEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>{st ? (st.automationEnabled ? 'SCHEDULER ON' : 'SCHEDULER OFF') : 'LOADING…'}</span>
      </div>

      {msg && <div className={`text-xs rounded-lg border px-3 py-2 ${msg.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-red-500/40 bg-red-500/10 text-red-200'}`}>{msg.text}</div>}
      {st?.persistence?.warning && <div className="text-xs rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 px-3 py-2">⚠ {st.persistence.warning}</div>}

      <div className="grid md:grid-cols-3 gap-3">
        <div className={card}>
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Run now</div>
          <div className="flex flex-col gap-2">
            <button disabled={!!busy} onClick={() => runJob('fixture-sync', 'Fixtures & predictions')} className={`${btn} bg-emerald-600/20 border-emerald-500/50 text-emerald-200`}>{busy === 'fixture-sync' ? 'Working…' : '1. Load fixtures & make predictions'}</button>
            <button disabled={!!busy} onClick={() => runJob('result-sync', 'Results & learning')} className={`${btn} bg-sky-600/20 border-sky-500/50 text-sky-200`}>{busy === 'result-sync' ? 'Working…' : '2. Fetch results, settle & learn'}</button>
            <button disabled={!!busy} onClick={() => runJob('backfill', 'Backfill')} className={`${btn} bg-slate-700/40 border-slate-500/50 text-slate-200`}>{busy === 'backfill' ? 'Working…' : 'Backfill team ratings (one-off)'}</button>
          </div>
          {st && <div className="mt-3 text-[11px] text-slate-400 space-y-0.5">
            <div>Last fixture sync: {ago(st.lastRun?.['fixture-sync'])}</div><div>Last result sync: {ago(st.lastRun?.['result-sync'])}</div>
            <div>Waiting for results: {st.waiting.predictionsAwaitingResult} predictions, {st.waiting.ticketLegsAwaitingResult} ticket legs</div>
          </div>}
        </div>

        <div className={card}>
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Load data without any API</div>
          <input ref={fixturesInput} type="file" accept=".csv,.tsv,.txt,.xlsx" className="hidden" onChange={e => { void onFile('fixtures', e.target.files?.[0]); e.target.value = ''; }} />
          <input ref={resultsInput} type="file" accept=".csv,.tsv,.txt,.xlsx" className="hidden" onChange={e => { void onFile('results', e.target.files?.[0]); e.target.value = ''; }} />
          <div className="flex flex-col gap-2">
            <button disabled={!!busy} onClick={() => fixturesInput.current?.click()} className={`${btn} bg-emerald-600/20 border-emerald-500/50 text-emerald-200`}>Upload Hollywoodbets fixtures (Excel / CSV)</button>
            <button disabled={!!busy} onClick={() => resultsInput.current?.click()} className={`${btn} bg-sky-600/20 border-sky-500/50 text-sky-200`}>Upload results (Excel / CSV)</button>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Columns: Date, Time, League, Home Team, Away Team, Home/Draw/Away Odds. <a className="underline text-emerald-300" href="/api/templates/fixtures.csv">fixtures template</a> · <a className="underline text-sky-300" href="/api/templates/results.csv">results template</a>. Free results CSVs: football-data.co.uk.</div>
        </div>

        <div className={card}>
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Paste from Excel / website</div>
          <div className="flex gap-2 mb-2">{(['fixtures', 'results'] as const).map(k => <button key={k} onClick={() => setPasteKind(k)} className={`${btn} ${pasteKind === k ? 'bg-slate-600/60 border-slate-400 text-white' : 'border-slate-600 text-slate-400'}`}>{k}</button>)}</div>
          <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={4} placeholder={'Date\tTime\tHome Team\tAway Team\tHome Odds\tDraw Odds\tAway Odds\n2026-10-24\t15:30\tKaizer Chiefs\tOrlando Pirates\t2.60\t3.10\t2.75'} className="w-full text-[11px] font-mono bg-slate-950/70 border border-slate-700 rounded p-2 text-slate-200" />
          <button disabled={!!busy || !paste.trim()} onClick={async () => { await upload(pasteKind, { text: paste }, 'Pasted ' + pasteKind); setPaste(''); }} className={`${btn} mt-2 w-full bg-slate-700/40 border-slate-500/50 text-slate-100`}>Load pasted {pasteKind}</button>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm font-bold text-white">Predictions</div>
          <div className="flex gap-1">{(['yesterday', 'today', 'tomorrow'] as const).map(d => <button key={d} onClick={() => setDay(d)} className={`${btn} ${day === d ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100' : 'border-slate-600 text-slate-400'}`}>{d}</button>)}</div>
        </div>
        {!preds ? <div className="text-xs text-slate-400">Loading…</div> : preds.count === 0 ? (
          <div className="text-xs text-slate-400">No predictions logged for {preds.date}. {day === 'yesterday' ? 'Predictions are only created before kick-off, so a day that was never loaded cannot be filled in afterwards (that would be hindsight). Load fixtures each morning or leave the scheduler running.' : 'Press “Load fixtures & make predictions”, or upload your Hollywoodbets slate.'}</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead className="text-slate-400 text-left"><tr><th className="py-1 pr-2">Kick-off</th><th className="pr-2">Match</th><th className="pr-2">Pick</th><th className="pr-2">Prob</th><th className="pr-2">Odds</th><th className="pr-2">Conf.</th><th className="pr-2">Result</th></tr></thead>
            <tbody>{preds.predictions.map((p: Any) => (
              <tr key={p.id} className="border-t border-slate-800 align-top">
                <td className="py-1.5 pr-2 whitespace-nowrap">{timeOf(p.kickoff)}</td>
                <td className="pr-2"><div className="font-semibold text-white">{p.homeTeam} v {p.awayTeam}</div><div className="text-[10px] text-slate-500">{p.league || ''}</div></td>
                <td className="pr-2 font-semibold text-emerald-300">{p.pickLabel}{p.valuePick && p.valuePick !== p.pick ? <span className="ml-1 text-[9px] text-amber-300">value: {p.valuePick}</span> : null}</td>
                <td className="pr-2">{pct(p.pickProb)}</td>
                <td className="pr-2">{p.odds ? `${p.odds.home} / ${p.odds.draw} / ${p.odds.away}` : <span className="text-slate-500">none</span>}</td>
                <td className="pr-2">{p.confidence}</td>
                <td className="pr-2 whitespace-nowrap">{p.status === 'settled' ? <span className={p.result.correct ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'}>{p.result.correct ? '✔' : '✘'} {p.result.homeGoals}-{p.result.awayGoals}</span> : p.status === 'unresolved' ? <span className="text-amber-300" title="No source returned a final score within 72 h. Upload the result to settle it.">no result found</span> : <span className="text-slate-500">pending</span>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className={card}>
          <div className="text-sm font-bold text-white mb-2">Is it learning?</div>
          {stats && <div className="text-xs space-y-1 text-slate-300">
            <div>Predictions logged: <b>{stats.total}</b> · settled <b>{stats.settled}</b> · pending <b>{stats.pending}</b> · unresolved <b>{stats.unresolved}</b></div>
            <div>Teams rated: <b>{stats.ratedTeams}</b> · matches learned from: <b>{stats.learning.matchesLearned}</b></div>
            <div>Accuracy: <b>{pct(ov?.accuracy)}</b> (always-home baseline {pct(stats.baselineAlwaysHomeAccuracy)}) · Brier {num(ov?.brier)} · log-loss {num(ov?.logLoss)}</div>
            <div>Brier — market only {num(lc?.marketBrier)} · ratings only {num(lc?.ratingBrier)} · blend {num(lc?.blendBrier)} <span className="text-slate-500">(lower is better)</span></div>
            <div>ROI on flat 1-unit picks: {pct(ov?.roiPick)} over {ov?.oddsN ?? 0} priced picks · value picks {pct(ov?.roiValue)} over {ov?.valueN ?? 0}</div>
            <div>Rating weight now <b>{num(stats.learning.ratingWeight, 2)}</b> · home advantage <b>{stats.learning.homeAdvantage.toFixed(0)}</b> Elo · draw base <b>{num(stats.learning.drawBase, 2)}</b></div>
            <div className={stats.meaningful ? 'text-emerald-300' : 'text-amber-300'}>{lc?.note}</div>
          </div>}
        </div>
        <div className={card}>
          <div className="text-sm font-bold text-white mb-2">Data sources &amp; health</div>
          {st && <ul className="text-xs space-y-1">{st.sources.map((s: Any) => <li key={s.id} className="flex gap-2"><span className={s.configured ? 'text-emerald-400' : 'text-slate-600'}>●</span><span><b>{s.id}</b> <span className="text-slate-500">({s.kind})</span> <span className="text-slate-400">{s.note}</span></span></li>)}</ul>}
          {st && <div className="mt-3 text-[11px] text-slate-400">Stored: {st.data.fixtures} fixtures · {st.data.results} results · {st.data.predictions} predictions.</div>}
          <div className="mt-2 flex gap-2 flex-wrap"><button onClick={() => void downloadBackup()} className={`${btn} border-slate-500 text-slate-200`}>Download backup</button><label className={`${btn} border-slate-500 text-slate-200 cursor-pointer`}>Restore backup<input type="file" accept=".json" className="hidden" onChange={e => { void restoreBackup(e.target.files?.[0]); e.target.value = ''; }} /></label></div>
        </div>
      </div>

      {st?.recentRuns?.length > 0 && <div className={card}>
        <div className="text-sm font-bold text-white mb-2">Job history</div>
        <ul className="text-[11px] space-y-1 font-mono">{st.recentRuns.map((r: Any) => <li key={r.id} className={r.ok ? 'text-slate-300' : 'text-red-300'}><span className="text-slate-500">{timeOf(r.finishedAt)}</span> {r.job} <span className="text-slate-500">({r.trigger})</span> — {r.summary}</li>)}</ul>
      </div>}
    </div>
  );
}
