import type { HistoricalResult, VerifiedFixture } from '../verified-data/types';
import { makeProvenance } from '../verified-data/core';
import { mapFixtureRows, mapResultRows, parseDelimited, rowsToObjects, fixtureId } from './sheetImport';

/**
 * Data-source adapters. Rules:
 *  - never invent odds, venues, ids or kickoff times; missing stays undefined
 *  - every call has a timeout and returns diagnostics instead of throwing
 *  - endpoints can be overridden through env vars (useful for tests / proxies)
 */
export interface SourceRun<T> { id: string; ok: boolean; items: T[]; note?: string; requests: number; }

const TIMEOUT = 15000;
async function getText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'BetMatrix-AI/1.0', ...headers }, signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}
const safe = (e: unknown) => { const m = e instanceof Error ? e.message : String(e); return /HTTP \d{3}/.test(m) ? m.match(/HTTP \d{3}/)![0] : /abort/i.test(m) ? 'timed out' : 'request failed'; };
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/* ─────────── football-data.co.uk (free CSV, no key) ─────────── */
const FD_BASE = () => process.env.FOOTBALL_DATA_CO_UK_BASE || 'https://www.football-data.co.uk';
const FD_DIVS: Record<string, string> = { E0: 'England Premier League', E1: 'England Championship', SC0: 'Scotland Premiership', D1: 'Germany Bundesliga', I1: 'Italy Serie A', SP1: 'Spain La Liga', F1: 'France Ligue 1', N1: 'Netherlands Eredivisie', B1: 'Belgium Pro League', P1: 'Portugal Primeira Liga', T1: 'Turkey Super Lig', G1: 'Greece Super League' };
export function footballDataSeasonCode(now = new Date()): string {
  const y = now.getUTCFullYear(), start = now.getUTCMonth() >= 6 ? y : y - 1; // season rolls over in July/August
  return String(start).slice(2) + String(start + 1).slice(2);
}
function labelDiv(rows: Array<Record<string, string>>): Array<Record<string, string>> {
  return rows.map(r => ({ ...r, league: FD_DIVS[r['div']] || r['div'] || '' }));
}
export async function fetchFootballDataFixtures(): Promise<SourceRun<VerifiedFixture>> {
  try {
    const rows = labelDiv(rowsToObjects(parseDelimited(await getText(FD_BASE() + '/fixtures.csv'))));
    const { fixtures } = mapFixtureRows(rows, { sourceId: 'football-data-co-uk', sourceName: 'football-data.co.uk fixtures.csv (free)', tz: 'Europe/London', maxAgeSeconds: 48 * 3600 });
    return { id: 'football-data-co-uk', ok: true, items: fixtures, requests: 1, note: fixtures.length ? undefined : 'fixtures.csv returned no upcoming rows (international break or between rounds).' };
  } catch (e) { return { id: 'football-data-co-uk', ok: false, items: [], requests: 1, note: safe(e) }; }
}
export async function fetchFootballDataResults(now = new Date(), lookbackDays = 14): Promise<SourceRun<HistoricalResult>> {
  const season = footballDataSeasonCode(now); const out: HistoricalResult[] = []; let requests = 0; const fails: string[] = [];
  const since = addDays(now, -lookbackDays).getTime();
  for (const div of Object.keys(FD_DIVS)) {
    requests++;
    try {
      const rows = labelDiv(rowsToObjects(parseDelimited(await getText(`${FD_BASE()}/mmz4281/${season}/${div}.csv`))));
      const { results } = mapResultRows(rows, { sourceId: 'football-data-co-uk', sourceName: 'football-data.co.uk results (free)', tz: 'Europe/London' });
      out.push(...results.filter(r => Date.parse(r.kickoff) >= since));
    } catch (e) { fails.push(div + ':' + safe(e)); }
  }
  return { id: 'football-data-co-uk', ok: out.length > 0 || fails.length < Object.keys(FD_DIVS).length, items: out, requests, note: fails.length ? 'Failed: ' + fails.join(', ') : undefined };
}

/* ─────────── ESPN public scoreboard (no key, unofficial) ─────────── */
const ESPN_BASE = () => process.env.ESPN_BASE || 'https://site.api.espn.com/apis/site/v2/sports/soccer';
export const DEFAULT_ESPN_LEAGUES = ['rsa.1', 'eng.1', 'eng.2', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'ned.1', 'por.1', 'sco.1'];
const espnLeagues = () => (process.env.ESPN_LEAGUES ? process.env.ESPN_LEAGUES.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_ESPN_LEAGUES);
const americanToDecimal = (v: unknown): number | undefined => { const n = Number(v); if (!Number.isFinite(n) || n === 0) return undefined; const d = n >= 100 ? 1 + n / 100 : n <= -100 ? 1 + 100 / Math.abs(n) : NaN; return Number.isFinite(d) && d > 1 ? Number(d.toFixed(3)) : undefined; };

export function mapEspnEvents(payload: any, slug: string): { fixtures: VerifiedFixture[]; results: HistoricalResult[] } {
  const fixtures: VerifiedFixture[] = [], results: HistoricalResult[] = [];
  const leagueName = payload?.leagues?.[0]?.name || slug;
  const fp = makeProvenance({ sourceId: 'espn', sourceName: 'ESPN public scoreboard (free)', sourceKind: 'sports_api', evidenceStatus: 'verified', maxAgeSeconds: 12 * 3600, notes: 'Schedule from ESPN. Any odds shown come from ESPN, not Hollywoodbets.' });
  const rp = makeProvenance({ sourceId: 'espn', sourceName: 'ESPN public scoreboard (free)', sourceKind: 'official_result', evidenceStatus: 'verified', notes: 'Final score reported by ESPN (status completed).' });
  for (const ev of Array.isArray(payload?.events) ? payload.events : []) {
    const comp = ev?.competitions?.[0]; const cs = Array.isArray(comp?.competitors) ? comp.competitors : [];
    const home = cs.find((c: any) => c?.homeAway === 'home'), away = cs.find((c: any) => c?.homeAway === 'away');
    const homeTeam = home?.team?.displayName || home?.team?.name, awayTeam = away?.team?.displayName || away?.team?.name;
    const kickoffMs = Date.parse(ev?.date || comp?.date || ''); if (!homeTeam || !awayTeam || !Number.isFinite(kickoffMs)) continue;
    const kickoff = new Date(kickoffMs).toISOString();
    const state = String(comp?.status?.type?.state || ev?.status?.type?.state || ''), completed = Boolean(comp?.status?.type?.completed ?? ev?.status?.type?.completed);
    const statusName = String(comp?.status?.type?.name || ev?.status?.type?.name || '');
    const id = fixtureId('espn', kickoff, homeTeam, awayTeam);
    if (state === 'post' && completed && /FULL_TIME|FINAL|FT|AET|PEN/i.test(statusName)) {
      const hg = Number(home?.score), ag = Number(away?.score);
      if (Number.isInteger(hg) && Number.isInteger(ag) && hg >= 0 && ag >= 0) results.push({ id, fixtureId: String(ev.id || ''), kickoff, homeTeam, awayTeam, homeGoals: hg, awayGoals: ag, competition: leagueName, source: rp });
    } else if (state === 'pre') {
      const o = Array.isArray(comp?.odds) ? comp.odds[0] : undefined;
      const markets = { home: americanToDecimal(o?.homeTeamOdds?.moneyLine), draw: americanToDecimal(o?.drawOdds?.moneyLine), away: americanToDecimal(o?.awayTeamOdds?.moneyLine) };
      fixtures.push({ id, kickoff, homeTeam, awayTeam, league: leagueName, markets, provenance: [fp] });
    }
  }
  return { fixtures, results };
}
export async function fetchEspn(dates: Date[]): Promise<{ fixtures: SourceRun<VerifiedFixture>; results: SourceRun<HistoricalResult> }> {
  const fixtures: VerifiedFixture[] = [], results: HistoricalResult[] = []; let requests = 0; let okCalls = 0; const notes: string[] = [];
  for (const slug of espnLeagues()) {
    let leagueOk = false;
    for (const d of dates) {
      requests++;
      try {
        const payload = JSON.parse(await getText(`${ESPN_BASE()}/${slug}/scoreboard?dates=${ymd(d).replace(/-/g, '')}`));
        const m = mapEspnEvents(payload, slug); fixtures.push(...m.fixtures); results.push(...m.results); okCalls++; leagueOk = true;
      } catch (e) { if (!/HTTP 404/.test(String(e))) notes.push(slug + ':' + safe(e)); }
    }
    if (!leagueOk) notes.push(slug + ': no response (league slug may be wrong or unavailable)');
  }
  const note = notes.length ? notes.slice(0, 6).join('; ') : undefined;
  return { fixtures: { id: 'espn', ok: okCalls > 0, items: fixtures, requests, note }, results: { id: 'espn', ok: okCalls > 0, items: results, requests, note } };
}

/* ─────────── API-Football (your own key; free plan = 100 req/day) ─────────── */
export function apiFootballConfigured(): boolean { return Boolean(process.env.API_FOOTBALL_KEY || process.env.FOOTBALL_API_KEY); }
export function mapApiFootball(payload: any): { fixtures: VerifiedFixture[]; results: HistoricalResult[] } {
  const fixtures: VerifiedFixture[] = [], results: HistoricalResult[] = [];
  const fp = makeProvenance({ sourceId: 'api-football', sourceName: 'API-Football', sourceKind: 'sports_api', evidenceStatus: 'verified', maxAgeSeconds: 12 * 3600, notes: 'Schedule only; no odds requested (saves daily quota).' });
  const rp = makeProvenance({ sourceId: 'api-football', sourceName: 'API-Football', sourceKind: 'official_result', evidenceStatus: 'verified', notes: 'Final score (status FT/AET/PEN).' });
  for (const row of Array.isArray(payload?.response) ? payload.response : []) {
    const homeTeam = row?.teams?.home?.name, awayTeam = row?.teams?.away?.name; const ms = Date.parse(row?.fixture?.date || '');
    if (!homeTeam || !awayTeam || !Number.isFinite(ms)) continue;
    const kickoff = new Date(ms).toISOString(); const short = String(row?.fixture?.status?.short || '');
    const id = fixtureId('api-football', kickoff, homeTeam, awayTeam); const league = row?.league?.name ? String(row.league.name) + (row?.league?.country ? ' (' + row.league.country + ')' : '') : undefined;
    if (['FT', 'AET', 'PEN'].includes(short)) {
      const hg = Number(row?.goals?.home), ag = Number(row?.goals?.away);
      if (Number.isInteger(hg) && Number.isInteger(ag)) results.push({ id, fixtureId: String(row.fixture.id), kickoff, homeTeam, awayTeam, homeGoals: hg, awayGoals: ag, competition: league, source: rp });
    } else if (short === 'NS' || short === 'TBD') fixtures.push({ id, kickoff, homeTeam, awayTeam, league, markets: {}, provenance: [fp] });
  }
  return { fixtures, results };
}
export async function fetchApiFootball(dates: Date[]): Promise<{ fixtures: SourceRun<VerifiedFixture>; results: SourceRun<HistoricalResult> }> {
  const key = process.env.API_FOOTBALL_KEY || process.env.FOOTBALL_API_KEY;
  const none = (note: string) => ({ fixtures: { id: 'api-football', ok: false, items: [], requests: 0, note }, results: { id: 'api-football', ok: false, items: [], requests: 0, note } });
  if (!key) return none('API_FOOTBALL_KEY not set.');
  const base = process.env.API_FOOTBALL_BASE || 'https://v3.football.api-sports.io';
  const headers: Record<string, string> = /rapidapi/i.test(base) ? { 'x-rapidapi-key': key, 'x-rapidapi-host': new URL(base).host } : { 'x-apisports-key': key };
  const fixtures: VerifiedFixture[] = [], results: HistoricalResult[] = []; let requests = 0; const notes: string[] = [];
  for (const d of dates) {
    requests++;
    try {
      const payload = JSON.parse(await getText(`${base}/fixtures?date=${ymd(d)}&timezone=UTC`, headers));
      const errs = payload?.errors; if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length)) { notes.push(ymd(d) + ': ' + JSON.stringify(errs).slice(0, 160)); continue; }
      const m = mapApiFootball(payload); fixtures.push(...m.fixtures); results.push(...m.results);
    } catch (e) { notes.push(ymd(d) + ': ' + safe(e)); }
  }
  const note = notes.length ? notes.join('; ') + ' (free plans only expose some seasons; check the plan on your API-Football dashboard)' : undefined;
  return { fixtures: { id: 'api-football', ok: fixtures.length > 0 || !notes.length, items: fixtures, requests, note }, results: { id: 'api-football', ok: results.length > 0 || !notes.length, items: results, requests, note } };
}

/* ─────────── SportAPI.ai (your key). Defensive mapping, no defaults invented ─────────── */
export function sportApiConfigured(): boolean { return Boolean(process.env.SPORTAPI_AI_KEY || process.env.SPORTAPI_KEY); }
const teamName = (t: any): string => (t && typeof t === 'object') ? String(t.name || t.team_name || t.short_name || '') : String(t || '');
export function mapSportApi(payload: any): { fixtures: VerifiedFixture[]; results: HistoricalResult[] } {
  const rows = Array.isArray(payload) ? payload : (payload?.fixtures || payload?.data || payload?.result || []);
  const fixtures: VerifiedFixture[] = [], results: HistoricalResult[] = [];
  const fp = makeProvenance({ sourceId: 'sportapi-ai', sourceName: 'SportAPI.ai', sourceKind: 'sports_api', evidenceStatus: 'verified', maxAgeSeconds: 12 * 3600 });
  const rp = makeProvenance({ sourceId: 'sportapi-ai', sourceName: 'SportAPI.ai', sourceKind: 'official_result', evidenceStatus: 'verified', notes: 'Final score only when status is finished.' });
  for (const f of Array.isArray(rows) ? rows : []) {
    const homeTeam = teamName(f.home_team ?? f.homeTeam ?? f.team_home), awayTeam = teamName(f.away_team ?? f.awayTeam ?? f.team_away);
    let raw = String(f.datetime || f.kickoff_time || f.date || '').trim(); if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) raw = raw.replace(' ', 'T') + 'Z';
    const ms = Date.parse(raw); if (!homeTeam || !awayTeam || !Number.isFinite(ms)) continue;
    const kickoff = new Date(ms).toISOString(); const id = fixtureId('sportapi-ai', kickoff, homeTeam, awayTeam);
    const league = f.league ? teamName(f.league) : f.competition ? teamName(f.competition) : undefined;
    const status = String(f.status || f.match_status || '').toUpperCase();
    const hg = typeof f.home_score === 'number' ? f.home_score : undefined, ag = typeof f.away_score === 'number' ? f.away_score : undefined;
    if (['FINISHED', 'FT', 'AET', 'PEN', 'FINAL', 'STATUS_FINAL'].includes(status) && hg !== undefined && ag !== undefined) results.push({ id, fixtureId: String(f.id ?? ''), kickoff, homeTeam, awayTeam, homeGoals: hg, awayGoals: ag, competition: league, source: rp });
    else if (ms > Date.now() - 3600000) { const o = (v: any) => (typeof v === 'number' && v > 1 ? v : undefined); fixtures.push({ id, kickoff, homeTeam, awayTeam, league, markets: { home: o(f.home_odds), draw: o(f.draw_odds), away: o(f.away_odds) }, provenance: [fp] }); }
  }
  return { fixtures, results };
}
export async function fetchSportApi(dates: Date[]): Promise<{ fixtures: SourceRun<VerifiedFixture>; results: SourceRun<HistoricalResult> }> {
  const key = process.env.SPORTAPI_AI_KEY || process.env.SPORTAPI_KEY;
  const none = (note: string) => ({ fixtures: { id: 'sportapi-ai', ok: false, items: [], requests: 0, note }, results: { id: 'sportapi-ai', ok: false, items: [], requests: 0, note } });
  if (!key) return none('SPORTAPI_AI_KEY not set.');
  const base = process.env.SPORTAPI_AI_BASE || 'https://sportapi.ai/api/fixtures/date';
  const fixtures: VerifiedFixture[] = [], results: HistoricalResult[] = []; let requests = 0; const notes: string[] = [];
  for (const d of dates) {
    requests++;
    try { const m = mapSportApi(JSON.parse(await getText(`${base}/${ymd(d)}`, { 'X-Api-Key': key, authorization: 'Bearer ' + key, accept: 'application/json' }))); fixtures.push(...m.fixtures); results.push(...m.results); }
    catch (e) { notes.push(ymd(d) + ': ' + safe(e)); }
  }
  const note = notes.length ? notes.join('; ') : undefined;
  return { fixtures: { id: 'sportapi-ai', ok: fixtures.length > 0 || !notes.length, items: fixtures, requests, note }, results: { id: 'sportapi-ai', ok: results.length > 0 || !notes.length, items: results, requests, note } };
}

/** One ranged call per league (used to backfill ratings: season-to-date results). */
export async function fetchEspnRange(from: Date, to: Date): Promise<SourceRun<HistoricalResult>> {
  const results: HistoricalResult[] = []; let requests = 0, ok = 0; const notes: string[] = [];
  const range = ymd(from).replace(/-/g, '') + '-' + ymd(to).replace(/-/g, '');
  for (const slug of espnLeagues()) {
    requests++;
    try { const payload = JSON.parse(await getText(`${ESPN_BASE()}/${slug}/scoreboard?dates=${range}&limit=1000`)); results.push(...mapEspnEvents(payload, slug).results); ok++; }
    catch (e) { if (!/HTTP 404/.test(String(e))) notes.push(slug + ':' + safe(e)); }
  }
  return { id: 'espn', ok: ok > 0, items: results, requests, note: notes.length ? notes.slice(0, 5).join('; ') : (ok ? undefined : 'No ESPN league responded.') };
}
