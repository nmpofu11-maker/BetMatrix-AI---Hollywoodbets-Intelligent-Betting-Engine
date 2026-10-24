import fs from 'node:fs';
import path from 'node:path';
import { buildConfiguredAdapters, loadVerifiedData, saveVerifiedData, canonicalDataHash } from '../verified-data/index';
import type { HistoricalResult, VerifiedFixture } from '../verified-data/types';
import { fetchConfiguredMatchResults } from './providerResults';
import { settleTicketsFromResults, type MatchResultEvidence } from './ticketSettlement';
import { mergeFixturesFuzzy, mergeResultsFuzzy } from './dataMerge';
import { fetchApiFootball, fetchEspn, fetchEspnRange, fetchFootballDataFixtures, fetchFootballDataResults, fetchSportApi, apiFootballConfigured, sportApiConfigured, DEFAULT_ESPN_LEAGUES } from './freeSources';
import { createPredictions, learnFromResults, loadPredictions, localDate, recalibrate, savePredictions, settlePredictions } from './predictionLedger';
import { teamsSimilar } from './teamNames';
import { mapFixtureRows, mapResultRows, sheetToObjects, type SheetOptions } from './sheetImport';

export const TZ = 'Africa/Johannesburg';
export interface AutomationDeps { getLedger(): any; saveLedger(next: any): void }
export interface JobRun { id: string; job: string; trigger: string; startedAt: string; finishedAt: string; ok: boolean; summary: string; details?: any }
interface AutomationLog { runs: JobRun[]; lastRun: Record<string, string>; quota: { date: string; apiFootball: number; sportApi: number } }

const DATA_DIR = () => process.env.DATA_DIR || path.join(process.cwd(), 'data');
const LOG_FILE = () => path.join(DATA_DIR(), 'automation-log.json');
let deps: AutomationDeps | null = null;
const running = new Set<string>();

function loadLog(): AutomationLog {
  try { const p = JSON.parse(fs.readFileSync(LOG_FILE(), 'utf8')); if (p && Array.isArray(p.runs)) return { runs: p.runs, lastRun: p.lastRun || {}, quota: p.quota || { date: '', apiFootball: 0, sportApi: 0 } }; } catch { /* first run */ }
  return { runs: [], lastRun: {}, quota: { date: '', apiFootball: 0, sportApi: 0 } };
}
function saveLog(l: AutomationLog) {
  try { fs.mkdirSync(DATA_DIR(), { recursive: true }); const tmp = LOG_FILE() + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ ...l, runs: l.runs.slice(-120) }), 'utf8'); fs.renameSync(tmp, LOG_FILE()); } catch (e) { console.warn('[Automation] could not write log:', e instanceof Error ? e.message : e); }
}
const utcDay = () => new Date().toISOString().slice(0, 10);
function spendQuota(kind: 'apiFootball' | 'sportApi', n: number): boolean {
  const log = loadLog(); if (log.quota.date !== utcDay()) log.quota = { date: utcDay(), apiFootball: 0, sportApi: 0 };
  const budget = Number(kind === 'apiFootball' ? process.env.API_FOOTBALL_DAILY_BUDGET || 80 : process.env.SPORTAPI_DAILY_BUDGET || 200);
  if (log.quota[kind] + n > budget) { saveLog(log); return false; }
  log.quota[kind] += n; saveLog(log); return true;
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

async function runJob(job: string, trigger: string, fn: () => Promise<{ summary: string; details?: any }>): Promise<JobRun> {
  const startedAt = new Date().toISOString();
  if (running.has(job)) return { id: job + '-' + startedAt, job, trigger, startedAt, finishedAt: startedAt, ok: true, summary: 'Skipped: already running.' };
  running.add(job);
  let run: JobRun;
  try { const r = await fn(); run = { id: job + '-' + startedAt, job, trigger, startedAt, finishedAt: new Date().toISOString(), ok: true, summary: r.summary, details: r.details }; }
  catch (e) { run = { id: job + '-' + startedAt, job, trigger, startedAt, finishedAt: new Date().toISOString(), ok: false, summary: 'Failed: ' + (e instanceof Error ? e.message : String(e)).slice(0, 300) }; console.error('[Automation]', job, e); }
  finally { running.delete(job); }
  const log = loadLog(); log.runs.push(run); if (run.ok && !/^Skipped/.test(run.summary)) log.lastRun[job] = run.finishedAt; saveLog(log);
  console.log(`[Automation] ${job} (${trigger}): ${run.summary}`);
  return run;
}

/* ───────────────────── fixtures → predictions ───────────────────── */
export async function syncFixturesAndPredict(trigger = 'schedule') {
  return runJob('fixture-sync', trigger, async () => {
    const now = new Date(); const dates = [0, 1, 2].map(n => addDays(now, n));
    const sources: Array<{ id: string; ok: boolean; count: number; note?: string; requests?: number }> = [];
    const incoming: VerifiedFixture[] = [];
    // 1) documented / configured feeds (Hollywoodbets feed, SportMonks, TheRundown)
    for (const a of buildConfiguredAdapters().filter(x => x.isConfigured())) {
      try { const f = await a.fetchFixtures({ timeoutMs: 15000 }); incoming.push(...f); sources.push({ id: a.id, ok: true, count: f.length }); }
      catch (e) { sources.push({ id: a.id, ok: false, count: 0, note: (e instanceof Error ? e.message : String(e)).replace(/https?:\/\/\S+/g, '[url]').slice(0, 120) }); }
    }
    // 2) free sources (no key)
    if (process.env.DISABLE_FREE_SOURCES !== 'true') {
      const fd = await fetchFootballDataFixtures(); incoming.push(...fd.items); sources.push({ id: fd.id, ok: fd.ok, count: fd.items.length, note: fd.note, requests: fd.requests });
      const es = await fetchEspn(dates); incoming.push(...es.fixtures.items); sources.push({ id: es.fixtures.id, ok: es.fixtures.ok, count: es.fixtures.items.length, note: es.fixtures.note, requests: es.fixtures.requests });
    }
    // 3) your own keys, with a daily request budget
    if (apiFootballConfigured() && spendQuota('apiFootball', dates.length)) { const af = await fetchApiFootball(dates); incoming.push(...af.fixtures.items); sources.push({ id: af.fixtures.id, ok: af.fixtures.ok, count: af.fixtures.items.length, note: af.fixtures.note, requests: af.fixtures.requests }); }
    else if (apiFootballConfigured()) sources.push({ id: 'api-football', ok: false, count: 0, note: 'Daily request budget used up; skipped.' });
    if (sportApiConfigured() && spendQuota('sportApi', dates.length)) { const sa = await fetchSportApi(dates); incoming.push(...sa.fixtures.items); sources.push({ id: sa.fixtures.id, ok: sa.fixtures.ok, count: sa.fixtures.items.length, note: sa.fixtures.note, requests: sa.fixtures.requests }); }

    const state = loadVerifiedData();
    const m = mergeFixturesFuzzy(state.fixtures, incoming);
    const cutoff = Date.now() - 4 * 86400000;
    state.fixtures = m.fixtures.filter(f => Date.parse(f.kickoff) >= cutoff);
    saveVerifiedData(state);

    const p = await predictFromStore();
    return { summary: `${incoming.length} fixtures fetched (${m.added} new, ${m.merged} merged); ${p.created} new predictions, ${p.refreshed} refreshed${p.skippedStarted ? `, ${p.skippedStarted} already started` : ''}.`, details: { sources, ...p, fixturesInStore: state.fixtures.length } };
  });
}

/** Predict for upcoming fixtures. If a Hollywoodbets slate exists for a day, only that slate is predicted. */
export async function predictFromStore() {
  const state = loadVerifiedData(); const store = loadPredictions(); const now = Date.now();
  const upcoming = state.fixtures.filter(f => { const k = Date.parse(f.kickoff); return Number.isFinite(k) && k > now && k < now + 72 * 3600000; });
  const isHB = (f: VerifiedFixture) => f.provenance.some(p => /hollywood/i.test(p.sourceId) || /hollywood/i.test(p.sourceName));
  const hbDays = new Set(upcoming.filter(isHB).map(f => localDate(f.kickoff, TZ)));
  const scoped = upcoming.filter(f => !hbDays.has(localDate(f.kickoff, TZ)) || isHB(f));
  const r = createPredictions(store, scoped, new Date());
  savePredictions(store);
  return { ...r, scope: hbDays.size ? `Hollywoodbets slate for ${[...hbDays].join(', ')}; other days use all feeds` : 'all feeds (no Hollywoodbets slate loaded)', considered: scoped.length };
}

/* ───────────────────── results → settlement → learning ───────────────────── */
function dueItems(now = Date.now()) {
  const store = loadPredictions(); const ledger = deps?.getLedger() || { tickets: [] };
  const preds = store.predictions.filter(p => p.status === 'pending' && Date.parse(p.kickoff) + 105 * 60000 < now);
  const legs: any[] = [];
  for (const t of Array.isArray(ledger.tickets) ? ledger.tickets : []) if (t?.status === 'pending') for (const l of t.legs || []) if (l?.status === 'pending') {
    const ref = Date.parse(l.kickoffISO || t.placedAt || ''); if (!Number.isFinite(ref) || ref + (l.kickoffISO ? 105 : 0) * 60000 < now) legs.push(l);
  }
  return { preds, legs, pendingTickets: (Array.isArray(ledger.tickets) ? ledger.tickets : []).filter((t: any) => t?.status === 'pending').length };
}
export const toEvidence = (rs: HistoricalResult[]): MatchResultEvidence[] => rs.filter(r => !r.conflict).map(r => ({ id: r.id, homeTeam: r.homeTeam, awayTeam: r.awayTeam, kickoff: r.kickoff, homeGoals: r.homeGoals, awayGoals: r.awayGoals, status: 'FT', source: 'Verified store (' + [r.source.sourceName, ...(r.corroboratedBy || [])].join(' + ') + ')' }));

export async function settleAndLearn(trigger = 'schedule', opts: { force?: boolean } = {}) {
  return runJob('result-sync', trigger, async () => {
    const now = new Date(); const due = dueItems(now.getTime());
    const log = loadLog(); const last = Date.parse(log.lastRun['result-sync'] || '');
    if (!opts.force && !due.preds.length && !due.legs.length) return { summary: 'Nothing is due: no finished matches are waiting for a result.' };
    if (!opts.force && Number.isFinite(last) && now.getTime() - last < 10 * 60000) return { summary: 'Skipped: results were synced less than 10 minutes ago.' };

    const dateSet = new Set<string>();
    for (const p of due.preds) { dateSet.add(p.kickoff.slice(0, 10)); }
    for (const l of due.legs) { const r = l.kickoffISO; if (r) dateSet.add(String(r).slice(0, 10)); }
    if (!dateSet.size) for (const n of [-1, 0]) dateSet.add(addDays(now, n).toISOString().slice(0, 10));
    const dates = [...dateSet].sort().slice(-4).map(d => new Date(d + 'T12:00:00Z'));
    const sources: any[] = []; const incoming: HistoricalResult[] = [];

    if (process.env.DISABLE_FREE_SOURCES !== 'true') {
      const es = await fetchEspn(dates); incoming.push(...es.results.items); sources.push({ id: 'espn', ok: es.results.ok, count: es.results.items.length, note: es.results.note });
      const fd = await fetchFootballDataResults(now, 10); incoming.push(...fd.items); sources.push({ id: 'football-data-co-uk', ok: fd.ok, count: fd.items.length, note: fd.note });
    }
    for (const a of buildConfiguredAdapters().filter(x => x.isConfigured() && typeof x.fetchResults === 'function')) {
      try { const r = await a.fetchResults!(addDays(now, -3).toISOString(), now.toISOString(), { timeoutMs: 15000 }); incoming.push(...r); sources.push({ id: a.id, ok: true, count: r.length }); }
      catch (e) { sources.push({ id: a.id, ok: false, count: 0, note: (e instanceof Error ? e.message : String(e)).replace(/https?:\/\/\S+/g, '[url]').slice(0, 100) }); }
    }
    let state = loadVerifiedData();
    let merged = mergeResultsFuzzy(state.results, incoming); state.results = merged.results;
    const store = loadPredictions();
    let sp = settlePredictions(store, state.results, now);

    // anything still unresolved? use the budgeted key-based sources as a fallback
    const stillDue = store.predictions.filter(p => p.status === 'pending' && Date.parse(p.kickoff) + 105 * 60000 < now.getTime());
    if (stillDue.length || due.legs.length) {
      const extra: HistoricalResult[] = [];
      if (apiFootballConfigured() && spendQuota('apiFootball', dates.length)) { const af = await fetchApiFootball(dates); extra.push(...af.results.items); sources.push({ id: 'api-football', ok: af.results.ok, count: af.results.items.length, note: af.results.note }); }
      if (sportApiConfigured() && spendQuota('sportApi', dates.length)) { const sa = await fetchSportApi(dates); extra.push(...sa.results.items); sources.push({ id: 'sportapi-ai', ok: sa.results.ok, count: sa.results.items.length, note: sa.results.note }); }
      if (extra.length) { merged = mergeResultsFuzzy(state.results, extra); state.results = merged.results; const s2 = settlePredictions(store, state.results, now); sp = { settled: sp.settled + s2.settled, unresolved: sp.unresolved + s2.unresolved }; }
    }
    const cutoff = Date.now() - 420 * 86400000; state.results = state.results.filter(r => Date.parse(r.kickoff) >= cutoff).slice(-30000);
    saveVerifiedData(state);

    const learned = learnFromResults(store, state.results);
    const lr = recalibrate(store); savePredictions(store);

    // tickets in the ledger: store evidence + paid providers (SportMonks / TheRundown) if configured
    let ticketMsg = 'no ledger';
    if (deps) {
      const ledger = deps.getLedger(); const tickets = Array.isArray(ledger.tickets) ? ledger.tickets : [];
      if (tickets.some((t: any) => t?.status === 'pending')) {
        let evidence = toEvidence(state.results);
        try { const prov = await fetchConfiguredMatchResults(tickets, now); evidence = [...evidence, ...prov.results]; sources.push(...prov.providers.map(p => ({ id: p.id, ok: !p.error, count: p.resultCount, note: p.error || p.note }))); } catch { /* providers are optional */ }
        const s = settleTicketsFromResults(tickets, evidence, now.toISOString());
        if (s.updatedCount > 0) deps.saveLedger({ ...ledger, tickets: s.tickets, lastUpdated: now.toISOString() });
        ticketMsg = `${s.settledCount} ticket(s) settled, ${s.updatedCount} updated, ${s.checkedLegs} legs matched`;
      } else ticketMsg = 'no pending tickets';
    }
    return { summary: `${incoming.length} results fetched (${merged.added} new${merged.conflicts ? `, ${merged.conflicts} CONFLICTING` : ''}); predictions settled: ${sp.settled}, unresolved: ${sp.unresolved}; learned from ${learned.learned} matches (ratingWeight ${lr.ratingWeight.toFixed(2)}); tickets: ${ticketMsg}.`, details: { sources, settledPredictions: sp.settled, learned: learned.learned, calibration: lr.calibration } };
  });
}

/** One-off: build team ratings from season-to-date results so predictions are informed from day one. */
export async function backfillRatings(trigger = 'manual', days = 140) {
  return runJob('backfill', trigger, async () => {
    const now = new Date(); const sources: any[] = []; const incoming: HistoricalResult[] = [];
    if (process.env.DISABLE_FREE_SOURCES !== 'true') {
      const fd = await fetchFootballDataResults(now, 400); incoming.push(...fd.items); sources.push({ id: 'football-data-co-uk', ok: fd.ok, count: fd.items.length, note: fd.note });
      const es = await fetchEspnRange(addDays(now, -days), now); incoming.push(...es.items); sources.push({ id: 'espn', ok: es.ok, count: es.items.length, note: es.note });
    }
    const state = loadVerifiedData(); const m = mergeResultsFuzzy(state.results, incoming); state.results = m.results; saveVerifiedData(state);
    const store = loadPredictions(); const learned = learnFromResults(store, state.results); const sp = settlePredictions(store, state.results); recalibrate(store); savePredictions(store);
    return { summary: `Backfill: ${incoming.length} results fetched, learned from ${learned.learned} matches; ${Object.keys(store.ratings).length} teams rated.`, details: { sources, settled: sp.settled } };
  });
}

/* ───────────────────── manual imports (CSV / Excel / paste) ───────────────────── */
export async function importSheet(kind: 'fixtures' | 'results', input: { filename?: string; contentBase64?: string; text?: string }, opts: Partial<SheetOptions> = {}) {
  const rows = sheetToObjects(input);
  if (!rows.length) throw new Error('The file has no data rows. The first row must be column headings.');
  const state = loadVerifiedData();
  if (kind === 'fixtures') {
    const { fixtures, skipped } = mapFixtureRows(rows, { sourceId: opts.sourceId || 'hollywoodbets-upload', sourceName: opts.sourceName || 'Hollywoodbets slate (uploaded)', tz: opts.tz || 'Africa/Johannesburg', defaultLeague: opts.defaultLeague, maxAgeSeconds: 48 * 3600 });
    if (!fixtures.length) throw new Error(`No usable fixtures found (${skipped} row(s) skipped). Needed columns: Date, Time, Home, Away (odds optional: Home Odds / Draw Odds / Away Odds).`);
    const m = mergeFixturesFuzzy(state.fixtures, fixtures); state.fixtures = m.fixtures; saveVerifiedData(state);
    const p = await predictFromStore();
    return { kind, accepted: fixtures.length, skipped, added: m.added, merged: m.merged, withOdds: fixtures.filter(f => f.markets.home && f.markets.draw && f.markets.away).length, predictions: p };
  }
  const { results, skipped } = mapResultRows(rows, { sourceId: opts.sourceId || 'results-upload', sourceName: opts.sourceName || 'Results (uploaded)', tz: opts.tz || 'Africa/Johannesburg', defaultLeague: opts.defaultLeague });
  if (!results.length) throw new Error(`No usable results found (${skipped} row(s) skipped). Needed columns: Date, Home, Away, Home Goals, Away Goals (or a Score column like 2-1).`);
  const m = mergeResultsFuzzy(state.results, results); state.results = m.results; saveVerifiedData(state);
  const run = await settleAndLearn('upload', { force: true });
  return { kind, accepted: results.length, skipped, added: m.added, conflicts: m.conflicts, settlement: run.summary };
}

/* ───────────────────── scheduling ───────────────────── */
export async function tick(trigger = 'tick') {
  const log = loadLog(); const now = Date.now(); const ran: string[] = [];
  const age = (job: string) => { const t = Date.parse(log.lastRun[job] || ''); return Number.isFinite(t) ? now - t : Infinity; };
  const store = loadPredictions();
  if (Object.keys(store.ratings).length < 20 && age('backfill') > 24 * 3600000) { await backfillRatings(trigger); ran.push('backfill'); }
  if (age('fixture-sync') > 6 * 3600000) { await syncFixturesAndPredict(trigger); ran.push('fixture-sync'); }
  const due = dueItems(now);
  if ((due.preds.length || due.legs.length) && age('result-sync') > 10 * 60000) { await settleAndLearn(trigger); ran.push('result-sync'); }
  return ran;
}

let timer: ReturnType<typeof setInterval> | null = null;
const sastParts = (d = new Date()) => { const f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d); const o = Object.fromEntries(f.map(p => [p.type, p.value])); return { h: Number(o.hour), m: Number(o.minute) }; };
const FIXTURE_TIMES = ['05:30', '11:30', '16:30'];

/**
 * Dependency-free scheduler (no node-cron: it breaks when the server is bundled with esbuild).
 * A 60-second heartbeat checks the SAST clock. Every job is idempotent and age-guarded, so a
 * missed minute, a restart or an external /api/jobs/tick call simply catches up.
 */
export function startAutomation(d: AutomationDeps) {
  deps = d;
  if (process.env.DISABLE_AUTOMATION === 'true') { console.log('[Automation] disabled by DISABLE_AUTOMATION=true'); return; }
  let lastBeat = '';
  timer = setInterval(() => {
    const { h, m } = sastParts(); const key = `${h}:${m}`; if (key === lastBeat) return; lastBeat = key;
    const hhmm = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    if (FIXTURE_TIMES.includes(hhmm)) { void syncFixturesAndPredict('schedule-' + hhmm); return; }
    if (m % 15 === 0) void tick('schedule-15min');
  }, 30000);
  (timer as any).unref?.();
  setTimeout(() => { void tick('startup'); }, Number(process.env.AUTOMATION_STARTUP_DELAY_MS ?? 15000));
  console.log('[Automation] scheduler started (Africa/Johannesburg): fixtures 05:30/11:30/16:30, results + learning every 15 min when matches are due.');
}
export function stopAutomation() { if (timer) { clearInterval(timer); timer = null; } }

export function getAutomationStatus() {
  const log = loadLog(); const state = loadVerifiedData(); const store = loadPredictions(); const due = dueItems();
  const budgetAF = Number(process.env.API_FOOTBALL_DAILY_BUDGET || 80), budgetSA = Number(process.env.SPORTAPI_DAILY_BUDGET || 200);
  const q = log.quota.date === utcDay() ? log.quota : { date: utcDay(), apiFootball: 0, sportApi: 0 };
  return {
    now: new Date().toISOString(), timezone: TZ, automationEnabled: process.env.DISABLE_AUTOMATION !== 'true' && timer !== null, running: [...running],
    schedule: ['Fixtures + predictions: 05:30, 11:30, 16:30 (SAST)', 'Results, settlement and learning: every 15 min while finished matches are waiting', 'Catch-up on every server start and on every /api/jobs/tick call'],
    lastRun: log.lastRun, recentRuns: log.runs.slice(-15).reverse(),
    sources: [
      { id: 'hollywoodbets-upload', kind: 'upload', configured: true, note: 'Upload your Hollywoodbets slate (CSV/Excel/paste) to predict exactly those matches.' },
      { id: 'football-data-co-uk', kind: 'free', configured: process.env.DISABLE_FREE_SOURCES !== 'true', note: 'Free CSV: European leagues, odds + results. No South Africa.' },
      { id: 'espn', kind: 'free', configured: process.env.DISABLE_FREE_SOURCES !== 'true', note: 'Free public scoreboard, no key. Leagues: ' + (process.env.ESPN_LEAGUES || DEFAULT_ESPN_LEAGUES.join(', ')) },
      { id: 'api-football', kind: 'key', configured: apiFootballConfigured(), note: `Used only as fallback. Today ${q.apiFootball}/${budgetAF} requests.` },
      { id: 'sportapi-ai', kind: 'key', configured: sportApiConfigured(), note: `Used only as fallback. Today ${q.sportApi}/${budgetSA} requests.` },
      ...buildConfiguredAdapters().map(a => ({ id: a.id, kind: 'key', configured: a.isConfigured(), note: a.name })),
    ],
    data: { fixtures: state.fixtures.length, results: state.results.length, predictions: store.predictions.length, pendingPredictions: store.predictions.filter(p => p.status === 'pending').length, ratedTeams: Object.keys(store.ratings).length, dataHash: canonicalDataHash(state).slice(0, 12), learning: store.learning },
    waiting: { predictionsAwaitingResult: due.preds.length, ticketLegsAwaitingResult: due.legs.length, pendingTickets: due.pendingTickets },
    persistence: { dataDir: DATA_DIR(), ephemeralHost: Boolean(process.env.K_SERVICE), warning: process.env.K_SERVICE ? 'This looks like Cloud Run: files can be lost when the instance restarts or scales to zero. Set DATA_DIR to a mounted volume, and use Backup in this panel regularly. Use an external pinger on /api/jobs/tick to keep jobs running.' : undefined },
  };
}

export const _test = { teamsSimilar };
