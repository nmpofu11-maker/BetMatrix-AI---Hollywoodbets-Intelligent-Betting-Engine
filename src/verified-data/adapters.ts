import type { AdapterContext, HistoricalResult, SourceAdapter, VerifiedFixture } from './types';
import { makeProvenance, normaliseFixture } from './core';

async function fetchJson(url: string, context: AdapterContext = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs ?? 10000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + url);
    return await response.json();
  } finally { clearTimeout(timeout); }
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
  isConfigured(): boolean { return Boolean(this.url && (!this.apiKey || this.apiKey.length > 0)); }
  async fetchFixtures(context?: AdapterContext): Promise<VerifiedFixture[]> {
    if (!this.isConfigured()) return [];
    const payload = await fetchJson(this.url!, context);
    const provenance = makeProvenance({
      sourceId: this.id, sourceName: this.name, sourceKind: this.kind, sourceUrl: this.url,
      evidenceStatus: 'verified', notes: 'Retrieved directly from configured source adapter.',
    });
    return (this.mapFixtures(payload) || []).map((item, i) => normaliseFixture(item, provenance, i)).filter((v): v is VerifiedFixture => Boolean(v));
  }
  async fetchResults(from: string, to: string, context?: AdapterContext): Promise<HistoricalResult[]> {
    if (!this.isConfigured() || !this.mapResults) return [];
    const url = new URL(this.url!); url.searchParams.set('from', from); url.searchParams.set('to', to);
    const payload = await fetchJson(url.toString(), context);
    return this.mapResults(payload);
  }
}

export function buildConfiguredAdapters(): SourceAdapter[] {
  const adapters: SourceAdapter[] = [];
  if (process.env.HOLLYWOODBETS_FIXTURES_URL) adapters.push(new ConfiguredJsonAdapter(
    'hollywoodbets', 'Hollywoodbets configured fixture feed', 'bookmaker',
    process.env.HOLLYWOODBETS_FIXTURES_URL, process.env.HOLLYWOODBETS_API_KEY,
    payload => Array.isArray(payload) ? payload : (payload.fixtures || payload.events || []),
  ));
  if (process.env.SPORTMONKS_FIXTURES_URL) adapters.push(new ConfiguredJsonAdapter(
    'sportmonks', 'SportMonks', 'sports_api', process.env.SPORTMONKS_FIXTURES_URL, process.env.SPORTMONKS_API_KEY,
    payload => payload.data || payload.fixtures || [], payload => payload.data || payload.results || [],
  ));
  if (process.env.THERUNDOWN_FIXTURES_URL) adapters.push(new ConfiguredJsonAdapter(
    'therundown', 'TheRundown', 'sports_api', process.env.THERUNDOWN_FIXTURES_URL, process.env.THERUNDOWN_API_KEY,
    payload => payload.events || payload.data || payload.fixtures || [], payload => payload.results || payload.data || [],
  ));
  return adapters;
}
