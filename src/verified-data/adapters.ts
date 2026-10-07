import type { AdapterContext, HistoricalResult, SourceAdapter, VerifiedFixture } from './types';
import { makeProvenance, normaliseFixture } from './core';

async function fetchJson(url: string, apiKey: string | undefined, context: AdapterContext = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs ?? 10000);
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
      headers.authorization = 'Bearer ' + apiKey;
    }
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + url);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

function resultMapper(payload: any, sourceId: string, sourceName: string, sourceUrl?: string): HistoricalResult[] {
  const rows = Array.isArray(payload) ? payload : (payload?.data || payload?.results || payload?.events || []);
  const provenance = makeProvenance({
    sourceId, sourceName, sourceKind: 'official_result', sourceUrl,
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
    const payload = await fetchJson(this.url!, this.apiKey, context);
    const provenance = makeProvenance({
      sourceId: this.id, sourceName: this.name, sourceKind: this.kind, sourceUrl: this.url,
      evidenceStatus: 'verified', notes: 'Retrieved directly from configured source adapter.',
    });
    return (this.mapFixtures(payload) || []).map((item, i) => normaliseFixture(item, provenance, i)).filter((v): v is VerifiedFixture => Boolean(v));
  }

  async fetchResults(from: string, to: string, context?: AdapterContext): Promise<HistoricalResult[]> {
    if (!this.isConfigured() || !this.mapResults) return [];
    const url = new URL(this.url!);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    const payload = await fetchJson(url.toString(), this.apiKey, context);
    return this.mapResults(payload);
  }
}

function mapFixtureRows(payload: any): any[] {
  const rows = Array.isArray(payload) ? payload : (payload?.data || payload?.fixtures || payload?.events || []);
  return rows.map((r: any) => ({
    ...r,
    kickoff: r.kickoff || r.starting_at || r.utcDate || r.fixture?.date || r.date,
    homeTeam: r.homeTeam || r.home_team?.name || r.teams?.home?.name || r.home,
    awayTeam: r.awayTeam || r.away_team?.name || r.teams?.away?.name || r.away,
    league: r.league || r.competition?.name || r.league?.name,
    homeOdds: r.homeOdds ?? r.markets?.home ?? r.odds?.home,
    drawOdds: r.drawOdds ?? r.markets?.draw ?? r.odds?.draw,
    awayOdds: r.awayOdds ?? r.markets?.away ?? r.odds?.away,
    over25Odds: r.over25Odds ?? r.markets?.over25 ?? r.odds?.over25,
    bttsOdds: r.bttsOdds ?? r.markets?.bttsYes ?? r.odds?.bttsYes,
  }));
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
