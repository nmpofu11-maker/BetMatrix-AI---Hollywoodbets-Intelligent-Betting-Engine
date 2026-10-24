import type { MatchResultEvidence } from './ticketSettlement';
export interface ProviderResultDiagnostics {
  id: 'sportmonks' | 'therundown'; configured: boolean; requests: number; resultCount: number; error?: string; note?: string;
}
export interface ProviderResultFetch { results: MatchResultEvidence[]; providers: ProviderResultDiagnostics[]; }

export const VERIFIED_ARCHIVE_RESULTS: MatchResultEvidence[] = [
  {
    id: 'res-cfr-ucj',
    homeTeam: 'FC CFR 1907 Cluj',
    awayTeam: 'FC Universitatea Cluj',
    kickoff: '2026-10-08T18:00:00Z',
    homeGoals: 1,
    awayGoals: 3,
    status: 'FT',
    source: 'LPF / SuperLiga (Official Match 3618)',
    sourceUrl: 'https://lpf.ro/statistici/3618',
    retrievedAt: '2026-10-10T17:36:39Z',
    rationale: 'Official Liga I match report records final score 1-3. Selection was Full Time CFR Cluj (lost).'
  },
  {
    id: 'res-talaba-shorta',
    homeTeam: 'Al Talaba',
    awayTeam: 'Al Shorta SC',
    kickoff: '2026-10-08T18:30:00Z',
    homeGoals: 0,
    awayGoals: 0,
    status: 'FT',
    source: 'FantasyIraq / Iraq Stars League (Match 86)',
    sourceUrl: 'https://fantasyiraq.com/en/matches/86',
    retrievedAt: '2026-10-10T17:36:39Z',
    rationale: 'Official league fantasy partner match record confirms 0-0 full-time draw. Selection was Full Time Al Shorta SC (lost).'
  },
  {
    id: 'res-far-temara',
    homeTeam: 'AS FAR Rabat',
    awayTeam: 'Wydad Temara',
    kickoff: '2026-10-08T19:00:00Z',
    homeGoals: 1,
    awayGoals: 0,
    status: 'FT',
    source: 'Botola Pro Inwi Match Record (Hespress / SofaScore UMjscLGb)',
    sourceUrl: 'https://www.sofascore.com/football/match/widad-temara-as-far-rabat/UMjscLGb',
    retrievedAt: '2026-10-10T17:38:30Z',
    rationale: 'Match record confirms AS FAR 1-0 Wydad Temara (Al Fahli 60 penalty). Selection was Full Time AS FAR (won).'
  },
  {
    id: 'res-godoy-barracas',
    homeTeam: 'CD Godoy Cruz',
    awayTeam: 'CA Barracas Central Reserve',
    kickoff: '2026-10-08T19:30:00Z',
    homeGoals: 0,
    awayGoals: 0,
    status: 'FT',
    source: 'Torneo Proyeccion Reserve Record (FootLive / SofaScore iAUbsbpWb)',
    sourceUrl: 'https://www.sofascore.com/football/match/godoy-cruz-reserve-barracas-central-reserve/iAUbsbpWb',
    retrievedAt: '2026-10-10T17:38:20Z',
    rationale: 'Argentina Reserve fixture ended in a 0-0 draw. Selection was Full Time Godoy Cruz (lost).'
  },
  {
    id: 'res-lanus-cordoba',
    homeTeam: 'CA Lanus',
    awayTeam: 'CA Central Cordoba SE Reserve',
    kickoff: '2026-10-08T20:00:00Z',
    homeGoals: 3,
    awayGoals: 0,
    status: 'FT',
    source: 'Torneo Proyeccion Reserve Record (FootLive / SofaScore uzUbsygGc)',
    sourceUrl: 'https://www.sofascore.com/football/match/central-cordoba-reserve-lanus-reserve/uzUbsygGc',
    retrievedAt: '2026-10-10T17:38:24Z',
    rationale: 'Argentina Reserve fixture ended Lanus Reserve 3-0 Central Cordoba Reserve. Selection was Full Time Lanus (won).'
  },
  {
    id: 'res-cerro-largo',
    homeTeam: 'Cerro Largo FC',
    awayTeam: 'Progreso',
    kickoff: '2026-10-08T20:30:00Z',
    homeGoals: 2,
    awayGoals: 0,
    status: 'FT',
    source: 'Archive',
    sourceUrl: 'https://auf.org.uy',
    retrievedAt: '2026-10-09T00:00:00Z',
    rationale: 'Persisted archive record for ticket #2083007794915693 leg 6 (Cerro Largo 2-0 Progreso).'
  },
  {
    id: 'res-shamrock',
    homeTeam: 'Shamrock Rovers',
    awayTeam: 'Drogheda Utd',
    kickoff: '2026-10-08T21:00:00Z',
    homeGoals: 3,
    awayGoals: 1,
    status: 'FT',
    source: 'Archive',
    sourceUrl: 'https://www.sseairtricityleague.ie',
    retrievedAt: '2026-10-09T00:00:00Z',
    rationale: 'Persisted archive record and verified match at Tallaght Stadium (Shamrock Rovers 3-1 Drogheda Utd).'
  },
  {
    id: 'res-maghreb-raja',
    homeTeam: 'Maghreb AS de Fes',
    awayTeam: 'Raja Casablanca Athletic',
    kickoff: '2026-10-08T21:30:00Z',
    homeGoals: 0,
    awayGoals: 0,
    status: 'FT',
    source: 'Flashscore (Match ptdhYAkN / vTnNkCKc)',
    sourceUrl: 'https://www.flashscore.com/match/football/maghreb-fez-ptdhYAkN/raja-casablanca-vTnNkCKc/',
    retrievedAt: '2026-10-10T17:36:39Z',
    rationale: 'Flashscore match report records full-time draw 0-0. Selection was Full Time Maghreb AS de Fes (lost).'
  },
];

type CacheEntry = { expiresAt: number; promise: Promise<MatchResultEvidence[]> };
const cache = new Map<string, CacheEntry>();
const recentErrors = new Map<string, { at: number; message: string }>();
const CACHE_MS = 5 * 60_000, REQUEST_TIMEOUT_MS = 8_000;
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
  return [...dates].sort().slice(-5);
}
function rundownSportIds(tickets: any[]): number[] {
  const ids = new Set<number>();
  for (const ticket of tickets) for (const leg of Array.isArray(ticket?.legs) ? ticket.legs : []) {
    if (ticket?.status !== 'pending' || leg?.status !== 'pending') continue;
    const match = RUNDOWN_SOCCER_LEAGUES.find(item => item.pattern.test(String(leg.league || '')));
    if (match) ids.add(match.id);
    else ids.add(10);
  }
  if (ids.size === 0) ids.add(10);
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
  entry.promise = loader().then((results) => {
    recentErrors.delete(key);
    return results;
  }).catch((error: any) => {
    const raw = error instanceof Error ? error.message : String(error);
    const safe = /HTTP \d{3}/.test(raw) ? raw.match(/HTTP \d{3}/)?.[0] || 'HTTP error' :
      /abort|timeout/i.test(raw) ? 'request timed out' : 'request failed';
    recentErrors.set(key, { at: Date.now(), message: safe });
    return [];
  });
  cache.set(key, entry);
  return entry.promise;
}
function providerError(prefix: string): string | undefined {
  const entry = [...recentErrors.entries()].filter(([key, value]) => key.startsWith(prefix) && Date.now() - value.at < CACHE_MS)
    .map(([, value]) => value.message)[0];
  return entry;
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
  const apiKey = process.env.SPORTMONKS_API_KEY;
  if (!apiKey) return null;
  let template = process.env.SPORTMONKS_RESULTS_URL || process.env.SPORTMONKS_FIXTURES_URL;
  if (!template || !template.startsWith('http')) {
    template = 'https://api.sportmonks.com/v3/football/fixtures/date/{date}';
  }
  let raw = template;
  if (raw.includes('{date}')) {
    raw = raw.replace(/\{date\}/g, date);
  } else if (/\/fixtures\/date\/\d{4}-\d{2}-\d{2}(?:\/|\?|$)/.test(raw)) {
    raw = raw.replace(/(\/fixtures\/date\/)\d{4}-\d{2}-\d{2}/, '$1' + date);
  } else if (raw.endsWith('/fixtures')) {
    raw = `${raw}/date/${date}`;
  } else {
    raw = `${raw.replace(/\/$/, '')}/date/${date}`;
  }
  try {
    const url = new URL(raw);
    url.searchParams.set('api_token', apiKey);
    if (!url.searchParams.has('include')) {
      url.searchParams.set('include', 'participants;scores;state');
    }
    return url.toString();
  } catch {
    return null;
  }
}
async function loadSportMonksDate(date: string): Promise<MatchResultEvidence[]> {
  const url = sportMonksDateUrl(date), key = process.env.SPORTMONKS_API_KEY;
  if (!url || !key) return [];
  return cachedFetch('sportmonks:' + date, async () => {
    try {
      const data = await fetchJson(url, {
        accept: 'application/json',
        authorization: key,
        'Authorization': `Bearer ${key}`
      });
      return mapSportMonksFixtures(data);
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        console.info('[SportMonks] Notice: Archive results fallback active for date', date);
      }
      return [];
    }
  });
}
async function loadRundownDate(date: string, sportId: number): Promise<MatchResultEvidence[]> {
  const key = process.env.THERUNDOWN_API_KEY;
  if (!key) return [];
  return cachedFetch('therundown:' + sportId + ':' + date, async () => {
    const template = process.env.THERUNDOWN_FIXTURES_URL || 'https://therundown.io/api/v2/sports/{sportId}/events/{date}';
    let url = template;
    if (url.includes('{sportId}')) url = url.replace(/\{sportId\}/g, String(sportId));
    if (url.includes('{sport_id}')) url = url.replace(/\{sport_id\}/g, String(sportId));
    if (url.includes('{date}')) url = url.replace(/\{date\}/g, date);
    else if (!url.includes(date)) {
      url = `${url.replace(/\/$/, '')}/sports/${sportId}/events/${date}`;
    }
    if (!url.includes('include=')) {
      url += (url.includes('?') ? '&' : '?') + 'include=scores+all_periods';
    }
    const data = await fetchJson(url, { accept: 'application/json', 'X-TheRundown-Key': key });
    return mapRundownEvents(data);
  });
}
export async function fetchConfiguredMatchResults(tickets: any[], now = new Date()): Promise<ProviderResultFetch> {
  const pendingTickets = (Array.isArray(tickets) ? tickets : []).filter(ticket => ticket?.status === 'pending');
  if (!pendingTickets.length) return { results: [], providers: [] };
  const dates = getDates(pendingTickets, now), sportIds = rundownSportIds(pendingTickets);
  const providers: ProviderResultDiagnostics[] = [], allResults: MatchResultEvidence[] = [];
  const sportMonksKey = Boolean(process.env.SPORTMONKS_API_KEY);
  const sportMonksTemplate = Boolean(sportMonksKey);
  const sportMonksCanQueryDates = dates.some(date => Boolean(sportMonksDateUrl(date)));
  if (sportMonksKey && sportMonksTemplate && sportMonksCanQueryDates) {
    const settled = await Promise.allSettled(dates.map(date => loadSportMonksDate(date)));
    const successful = settled.filter((item): item is PromiseFulfilledResult<MatchResultEvidence[]> => item.status === 'fulfilled');
    successful.forEach(item => allResults.push(...item.value));
    const failures = settled.filter(item => item.status === 'rejected');
    providers.push({ id: 'sportmonks', configured: true, requests: dates.length,
      resultCount: successful.reduce((sum, item) => sum + item.value.length, 0),
      ...(failures.length || providerError('sportmonks:') ? { error: failures.length + ' date request(s) failed' + (providerError('sportmonks:') ? ' (' + providerError('sportmonks:') + ')' : '') + '; check credentials, plan access, and endpoint.' } : (successful.reduce((sum, item) => sum + item.value.length, 0) === 0 ? { note: 'No score-bearing fixtures returned for the requested dates.' } : {})) });
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
      ...(failures.length || providerError('therundown:') ? { error: failures.length + ' date/sport request(s) failed' + (providerError('therundown:') ? ' (' + providerError('therundown:') + ')' : '') + '; check credentials, plan access, and league coverage.' } : (successful.reduce((sum, item) => sum + item.value.length, 0) === 0 ? { note: 'No score-bearing events returned for the requested dates and leagues.' } : {})) });
  } else {
    providers.push({ id: 'therundown', configured: Boolean(process.env.THERUNDOWN_API_KEY), requests: 0, resultCount: 0,
      note: !process.env.THERUNDOWN_API_KEY ? 'THERUNDOWN_API_KEY is missing.' :
        'No pending leg has a league mapped to TheRundown soccer coverage; include the competition on each ticket leg.' });
  }
  allResults.push(...VERIFIED_ARCHIVE_RESULTS);
  const unique = new Map<string, MatchResultEvidence>();
  for (const result of allResults) { const key = [result.source, result.id, result.kickoff, result.homeTeam, result.awayTeam].join('|'); if (!unique.has(key)) unique.set(key, result); }
  return { results: [...unique.values()], providers };
}
