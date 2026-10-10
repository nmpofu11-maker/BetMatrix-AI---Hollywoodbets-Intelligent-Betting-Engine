import type { AdapterContext, HistoricalResult, SourceAdapter, VerifiedFixture } from './types';
import { makeProvenance, normaliseFixture } from './core';

function safeSourceUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (/(token|key|secret|auth|password|credential)/i.test(key)) url.searchParams.set(key, '[redacted]');
    }
    return url.toString();
  } catch {
    return '[configured endpoint]';
  }
}

async function fetchJson(url: string, sourceId: string, apiKey: string | undefined, context: AdapterContext = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs ?? 10000);
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (apiKey) {
      // Use the authentication contract documented by each provider.
      if (sourceId === 'sportmonks') {
        headers.authorization = apiKey;
      } else if (sourceId === 'therundown') {
        headers['X-TheRundown-Key'] = apiKey;
      } else {
        // Hollywoodbets integrations are feed-specific; confirm the authorised
        // feed's required authentication with the feed owner.
        headers['x-api-key'] = apiKey;
        headers.authorization = 'Bearer ' + apiKey;
      }
    }
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' from configured ' + sourceId + ' endpoint');
    return await response.json();
  } finally { clearTimeout(timeout); }
}

function resultMapper(payload: any, sourceId: string, sourceName: string, sourceUrl?: string): HistoricalResult[] {
  const rows = Array.isArray(payload) ? payload : (payload?.data || payload?.results || payload?.events || []);
  const provenance = makeProvenance({
    sourceId, sourceName, sourceKind: 'official_result', sourceUrl: safeSourceUrl(sourceUrl),
    evidenceStatus: 'verified', notes: 'Historical result supplied by configured source.',
  });
  return rows.map((r: any, i: number) => {
    const homeTeam = String(r.homeTeam?.name || r.home_team?.name || r.homeTeam || r.teams?.home?.name || r.home || '').trim();
    const awayTeam = String(r.awayTeam?.name || r.away_team?.name || r.awayTeam || r.teams?.away?.name || r.away || '').trim();
    const kickoff = String(r.kickoff || r.starting_at || r.utcDate || r.fixture?.date || r.date || '').trim();
    const homeGoals = Number(r.homeGoals ?? r.scores?.home?.score ?? r.score?.fulltime?.home ?? r.home_score);
    const awayGoals = Number(r.awayGoals ?? r.scores?.away?.score ?? r.score?.fulltime?.away ?? r.away_score);
    if (!homeTeam || !awayTeam || !kickoff || !Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) return null;
    return {
      id: String(r.id || r.fixtureId || r.fixture?.id || (homeTeam + '-' + awayTeam + '-' + kickoff + '-' + i)),
      fixtureId: r.fixtureId ? String(r.fixtureId) : (r.fixture?.id ? String(r.fixture.id) : undefined),
      kickoff, homeTeam, awayTeam, homeGoals, awayGoals,
      competition: String(r.competition?.name || r.league?.name || r.competition || r.league || ''),
      source: provenance,
    };
  }).filter(Boolean) as HistoricalResult[];
}

export class ConfiguredJsonAdapter implements SourceAdapter {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly kind: SourceAdapter['kind'],
    private readonly url: string | undefined,
    private readonly apiKey: string | undefined,
    private readonly mapFixtures: (payload: any) => any[],
    private readonly mapResults?: (payload: any) => HistoricalResult[],
  ) {}
  isConfigured(): boolean { return Boolean(this.url); }

  async fetchFixtures(context?: AdapterContext): Promise<VerifiedFixture[]> {
    if (!this.isConfigured()) return [];
    // Date-scoped providers such as TheRundown can use {date} in the configured
    // endpoint so a deployment doesn't silently keep requesting yesterday's events.
    const date = (context?.now ? new Date(context.now) : new Date()).toISOString().slice(0, 10);
    const requestUrl = this.id === 'therundown' ? this.url!.replace(/\{date\}/g, date) : this.url!;
    const payload = await fetchJson(requestUrl, this.id, this.apiKey, context);
    const provenance = makeProvenance({
      sourceId: this.id, sourceName: this.name, sourceKind: this.kind, sourceUrl: safeSourceUrl(this.url),
      evidenceStatus: 'verified', maxAgeSeconds: 6 * 3600, notes: 'Retrieved directly from configured source adapter.',
    });
    return (this.mapFixtures(payload) || []).map((item, i) => normaliseFixture(item, provenance, i)).filter((v): v is VerifiedFixture => Boolean(v));
  }

  async fetchResults(from: string, to: string, context?: AdapterContext): Promise<HistoricalResult[]> {
    if (!this.isConfigured() || !this.mapResults) return [];
    const url = new URL(this.url!);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    const payload = await fetchJson(url.toString(), this.id, this.apiKey, context);
    return this.mapResults(payload);
  }
}

function mapFixtureRows(payload: any): any[] {
  const rows = Array.isArray(payload) ? payload : (payload?.data || payload?.fixtures || payload?.events || []);
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any) => {
    // SportMonks fixtures commonly provide participants[] with meta.location.
    // TheRundown events can expose teams and markets as nested objects; do not
    // infer odds from scores or unrelated markets.
    const participants = Array.isArray(r.participants) ? r.participants : [];
    const homeParticipant = participants.find((p: any) => p?.meta?.location === 'home' || p?.location === 'home');
    const awayParticipant = participants.find((p: any) => p?.meta?.location === 'away' || p?.location === 'away');
    const teams = Array.isArray(r.teams) ? r.teams : [];
    const homeTeam = r.homeTeam?.name || r.homeTeam || r.home_team?.name || r.teams?.home?.name ||
      homeParticipant?.name || homeParticipant?.team?.name || teams.find((t: any) => t?.is_home || t?.side === 'home')?.name || r.home?.name || r.home;
    const awayTeam = r.awayTeam?.name || r.awayTeam || r.away_team?.name || r.teams?.away?.name ||
      awayParticipant?.name || awayParticipant?.team?.name || teams.find((t: any) => t?.is_away || t?.side === 'away')?.name || r.away?.name || r.away;
    const kickoff = r.kickoff || r.starting_at || r.utcDate || r.fixture?.date || r.date || r.commence_time || r.start_time;
    const odds = r.odds || {};
    const markets = r.markets || {};
    return {
      ...r,
      id: r.id ?? r.fixture_id ?? r.event_id,
      kickoff: typeof kickoff === 'string' ? kickoff : (r.starting_at_timestamp ? new Date(Number(r.starting_at_timestamp) * 1000).toISOString() : ''),
      homeTeam: typeof homeTeam === 'object' ? homeTeam?.name : homeTeam,
      awayTeam: typeof awayTeam === 'object' ? awayTeam?.name : awayTeam,
      league: r.league?.name || r.competition?.name || r.sport?.name || r.league || r.competition,
      homeOdds: r.homeOdds ?? markets.home ?? odds.home,
      drawOdds: r.drawOdds ?? markets.draw ?? odds.draw,
      awayOdds: r.awayOdds ?? markets.away ?? odds.away,
      over25Odds: r.over25Odds ?? markets.over25 ?? odds.over25,
      bttsOdds: r.bttsOdds ?? markets.bttsYes ?? odds.bttsYes,
    };
  });
}

export function buildConfiguredAdapters(): SourceAdapter[] {
  const adapters: SourceAdapter[] = [];

  if (process.env.HOLLYWOODBETS_FIXTURES_URL) {
    adapters.push(new ConfiguredJsonAdapter(
      'hollywoodbets', 'Hollywoodbets configured fixture feed', 'bookmaker',
      process.env.HOLLYWOODBETS_FIXTURES_URL, process.env.HOLLYWOODBETS_API_KEY,
      mapFixtureRows,
      payload => resultMapper(payload, 'hollywoodbets', 'Hollywoodbets configured fixture feed', process.env.HOLLYWOODBETS_FIXTURES_URL),
    ));
  }

  if (process.env.SPORTMONKS_FIXTURES_URL) {
    adapters.push(new ConfiguredJsonAdapter(
      'sportmonks', 'SportMonks', 'sports_api',
      process.env.SPORTMONKS_FIXTURES_URL, process.env.SPORTMONKS_API_KEY,
      mapFixtureRows,
      payload => resultMapper(payload, 'sportmonks', 'SportMonks', process.env.SPORTMONKS_FIXTURES_URL),
    ));
  }

  if (process.env.THERUNDOWN_FIXTURES_URL) {
    adapters.push(new ConfiguredJsonAdapter(
      'therundown', 'TheRundown', 'sports_api',
      process.env.THERUNDOWN_FIXTURES_URL, process.env.THERUNDOWN_API_KEY,
      mapFixtureRows,
      payload => resultMapper(payload, 'therundown', 'TheRundown', process.env.THERUNDOWN_FIXTURES_URL),
    ));
  }

  return adapters;
}
