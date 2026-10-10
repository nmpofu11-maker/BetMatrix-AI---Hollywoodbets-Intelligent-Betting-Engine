import type { MatchResultEvidence } from './ticketSettlement';
export interface ProviderResultDiagnostics {
  id: 'sportmonks' | 'therundown'; configured: boolean; requests: number; resultCount: number; error?: string; note?: string;
}
export interface ProviderResultFetch { results: MatchResultEvidence[]; providers: ProviderResultDiagnostics[]; }
type CacheEntry = { expiresAt: number; promise: Promise<MatchResultEvidence[]> };
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 60_000, REQUEST_TIMEOUT_MS = 8_000;
const RUNDOWN_SOCCER_LEAGUES = [
  { id: 10, pattern: /\b(mls|major league soccer)\b/i },
  { id: 11, pattern: /premier league|english premier/i },
  { id: 12, pattern: /ligue 1|french ligue/i },
  { id: 13, pattern: /bundesliga|german bundesliga/i },
  { id: 14, pattern: /la liga|spanish la liga/i },
  { id: 15, pattern: /serie a|italian serie/i },
  { id: 16, pattern: /champions league/i },
  { id: 19, pattern: /j.?league|japan/i },
  { id: 33, pattern: /europa league/i },
  { id: 34, pattern: /liga mx|mexican liga/i },
];
function getDates(tickets: any[], now = new Date()): string[] {
  const dates = new Set<string>();
  const add = (date: Date) => { if (Number.isFinite(date.getTime())) dates.add(date.toISOString().slice(0, 10)); };
  for (const ticket of tickets) {
    if (ticket?.status !== 'pending' || !Array.isArray(ticket.legs)) continue;
    for (const leg of ticket.legs) {
      if (leg?.status !== 'pending') continue;
      const reference = leg.kickoffISO || ticket.placedAt;
      const parsed = reference ? new Date(reference) : new Date(now);
      if (!Number.isFinite(parsed.getTime())) continue;
      for (const offset of [-1, 0, 1]) { const candidate = new Date(parsed); candidate.setUTCDate(candidate.getUTCDate() + offset); add(candidate); }
    }
  }
  if (dates.size === 0) for (const offset of [-2, -1, 0]) { const candidate = new Date(now); candidate.setUTCDate(candidate.getUTCDate() + offset); add(candidate); }
  return [...dates].sort();
}
function rundownSportIds(tickets: any[]): number[] {
  const ids = new Set<number>();
  for (const ticket of tickets) for (const leg of Array.isArray(ticket?.legs) ? ticket.legs : []) {
    if (ticket?.status !== 'pending' || leg?.status !== 'pending') continue;
    const match = RUNDOWN_SOCCER_LEAGUES.find(item => item.pattern.test(String(leg.league || '')));
    if (match) ids.add(match.id);
  }
  return [...ids];
}
async function fetchJson(url: string, headers: Record<string, string>): Promise<any> {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { const response = await fetch(url, { headers, signal: controller.signal }); if (!response.ok) throw new Error('HTTP ' + response.status); return await response.json(); }
  finally { clearTimeout(timeout); }
}
function cachedFetch(key: string, loader: () => Promise<MatchResultEvidence[]>): Promise<MatchResultEvidence[]> {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.promise;
  const entry: CacheEntry = { expiresAt: Date.now() + CACHE_MS, promise: Promise.resolve([]) };
  entry.promise = loader().catch(() => []);
  cache.set(key, entry);
  return entry.promise;
}
function numericScore(value: unknown): number | null {
  const n = Number(value); return Number.isInteger(n) && n >= 0 ? n : null;
}
function mapRundownEvents(payload: any): MatchResultEvidence[] {
  const rows = Array.isArray(payload?.events) ? payload.events : [];
  return rows.map((event: any) => {
    const teams = Array.isArray(event.teams) ? event.teams : [];
    const home = teams.find((team: any) => team?.is_home) || teams[0];
    const away = teams.find((team: any) => team && team !== home && !team?.is_home) || teams[1];
    const score = event.score || {};
    return { id: String(event.event_id ?? event.id ?? ''), homeTeam: String(home?.name || home?.team_name || ''),
      awayTeam: String(away?.name || away?.team_name || ''), kickoff: String(event.event_date || event.commence_time || ''),
      homeGoals: numericScore(score.score_home ?? score.home_score ?? event.home_score) ?? -1,
      awayGoals: numericScore(score.score_away ?? score.away_score ?? event.away_score) ?? -1,
      status: String(score.event_status || event.status || ''), source: 'TheRundown' };
  }).filter((event: MatchResultEvidence) => event.id && event.homeTeam && event.awayTeam && event.homeGoals >= 0 && event.awayGoals >= 0);
}
function mapSportMonksFixtures(payload: any): MatchResultEvidence[] {
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return rows.map((fixture: any) => {
    const participants = Array.isArray(fixture.participants) ? fixture.participants : [];
    const home = participants.find((team: any) => team?.meta?.location === 'home' || team?.location === 'home');
    const away = participants.find((team: any) => team?.meta?.location === 'away' || team?.location === 'away');
    const scores = Array.isArray(fixture.scores) ? fixture.scores : [];
    const scoreRows = scores.filter((item: any) => /full.?time|current|final/i.test(String(item?.description || '')))
      .sort((a: any, b: any) => (/full.?time|final/i.test(String(a?.description || '')) ? 0 : 1) - (/full.?time|final/i.test(String(b?.description || '')) ? 0 : 1));
    const homeScore = scoreRows.find((item: any) => String(item?.score?.participant || '').toLowerCase() === 'home');
    const awayScore = scoreRows.find((item: any) => String(item?.score?.participant || '').toLowerCase() === 'away');
    const kickoff = fixture.starting_at || fixture.date || (fixture.starting_at_timestamp ? new Date(Number(fixture.starting_at_timestamp) * 1000).toISOString() : '');
    return { id: String(fixture.id ?? fixture.fixture_id ?? ''), homeTeam: String(home?.name || home?.team?.name || ''),
      awayTeam: String(away?.name || away?.team?.name || ''), kickoff: String(kickoff || ''),
      homeGoals: numericScore(homeScore?.score?.goals) ?? -1, awayGoals: numericScore(awayScore?.score?.goals) ?? -1,
      status: String(fixture.state?.short_name || fixture.state?.name || fixture.status || ''), source: 'SportMonks' };
  }).filter((event: MatchResultEvidence) => event.id && event.homeTeam && event.awayTeam && event.homeGoals >= 0 && event.awayGoals >= 0);
}
function sportMonksDateUrl(date: string): string | null {
  const template = process.env.SPORTMONKS_RESULTS_URL || process.env.SPORTMONKS_FIXTURES_URL;
  if (!template || !process.env.SPORTMONKS_API_KEY) return null;
  let raw = template;
  if (raw.includes('{date}')) raw = raw.replace(/\{date\}/g, date);
  else if (/\/fixtures\/date\/\d{4}-\d{2}-\d{2}(?:\/|\?|$)/.test(raw)) raw = raw.replace(/(\/fixtures\/date\/)\d{4}-\d{2}-\d{2}/, '$1' + date);
  else return null;
  try {
    const url = new URL(raw); url.searchParams.delete('api_token');
    if (!url.searchParams.has('include')) url.searchParams.set('include', 'participants;scores;state');
    return url.toString();
  } catch { return null; }
}
async function loadSportMonksDate(date: string): Promise<MatchResultEvidence[]> {
  const url = sportMonksDateUrl(date), key = process.env.SPORTMONKS_API_KEY;
  if (!url || !key) return [];
  return cachedFetch('sportmonks:' + date, async () => mapSportMonksFixtures(await fetchJson(url, { accept: 'application/json', authorization: key })));
}
async function loadRundownDate(date: string, sportId: number): Promise<MatchResultEvidence[]> {
  const key = process.env.THERUNDOWN_API_KEY;
  if (!key) return [];
  return cachedFetch('therundown:' + sportId + ':' + date, async () => {
    const url = 'https://therundown.io/api/v2/sports/' + sportId + '/events/' + date + '?include=scores+all_periods';
    return mapRundownEvents(await fetchJson(url, { accept: 'application/json', 'X-TheRundown-Key': key }));
  });
}
export async function fetchConfiguredMatchResults(tickets: any[], now = new Date()): Promise<ProviderResultFetch> {
  const pendingTickets = (Array.isArray(tickets) ? tickets : []).filter(ticket => ticket?.status === 'pending');
  if (!pendingTickets.length) return { results: [], providers: [] };
  const dates = getDates(pendingTickets, now), sportIds = rundownSportIds(pendingTickets);
  const providers: ProviderResultDiagnostics[] = [], allResults: MatchResultEvidence[] = [];
  const sportMonksKey = Boolean(process.env.SPORTMONKS_API_KEY);
  const sportMonksTemplate = Boolean(process.env.SPORTMONKS_RESULTS_URL || process.env.SPORTMONKS_FIXTURES_URL);
  const sportMonksCanQueryDates = dates.some(date => Boolean(sportMonksDateUrl(date)));
  if (sportMonksKey && sportMonksTemplate && sportMonksCanQueryDates) {
    const settled = await Promise.allSettled(dates.map(date => loadSportMonksDate(date)));
    const successful = settled.filter((item): item is PromiseFulfilledResult<MatchResultEvidence[]> => item.status === 'fulfilled');
    successful.forEach(item => allResults.push(...item.value));
    const failures = settled.filter(item => item.status === 'rejected');
    providers.push({ id: 'sportmonks', configured: true, requests: dates.length,
      resultCount: successful.reduce((sum, item) => sum + item.value.length, 0),
      ...(failures.length ? { error: failures.length + ' date request(s) failed; check credentials, plan access, and endpoint.' } : {}) });
  } else {
    providers.push({ id: 'sportmonks', configured: sportMonksKey && sportMonksTemplate, requests: 0, resultCount: 0,
      note: !sportMonksKey ? 'SPORTMONKS_API_KEY is missing.' : !sportMonksTemplate ? 'No SportMonks results or fixtures URL is configured.' :
        'Historical score lookup requires a date URL containing {date} or /fixtures/date/YYYY-MM-DD.' });
  }
  if (process.env.THERUNDOWN_API_KEY && sportIds.length) {
    const jobs = dates.flatMap(date => sportIds.map(sportId => loadRundownDate(date, sportId)));
    const settled = await Promise.allSettled(jobs);
    const successful = settled.filter((item): item is PromiseFulfilledResult<MatchResultEvidence[]> => item.status === 'fulfilled');
    successful.forEach(item => allResults.push(...item.value));
    const failures = settled.filter(item => item.status === 'rejected');
    providers.push({ id: 'therundown', configured: true, requests: jobs.length,
      resultCount: successful.reduce((sum, item) => sum + item.value.length, 0),
      ...(failures.length ? { error: failures.length + ' date/sport request(s) failed; check credentials, plan access, and league coverage.' } : {}) });
  } else {
    providers.push({ id: 'therundown', configured: Boolean(process.env.THERUNDOWN_API_KEY), requests: 0, resultCount: 0,
      note: !process.env.THERUNDOWN_API_KEY ? 'THERUNDOWN_API_KEY is missing.' :
        'No pending leg has a league mapped to TheRundown soccer coverage; include the competition on each ticket leg.' });
  }
  const unique = new Map<string, MatchResultEvidence>();
  for (const result of allResults) { const key = [result.source, result.id, result.kickoff, result.homeTeam, result.awayTeam].join('|'); if (!unique.has(key)) unique.set(key, result); }
  return { results: [...unique.values()], providers };
}
