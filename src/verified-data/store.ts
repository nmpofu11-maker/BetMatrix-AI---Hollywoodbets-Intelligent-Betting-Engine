import fs from 'node:fs';
import path from 'node:path';
import type { HistoricalResult, VerifiedFixture, VerifiedTicket } from './types';
import { mergeFixtures, sha256 } from './core';

const DATA_DIR = path.join(process.cwd(), 'data');
const VERIFIED_FILE = path.join(DATA_DIR, 'verified-data.json');

export interface VerifiedDataState {
  version: 1;
  updatedAt: string;
  fixtures: VerifiedFixture[];
  results: HistoricalResult[];
  tickets: VerifiedTicket[];
}

const emptyState = (): VerifiedDataState => ({ version: 1, updatedAt: new Date(0).toISOString(), fixtures: [], results: [], tickets: [] });

export function loadVerifiedData(): VerifiedDataState {
  try {
    if (!fs.existsSync(VERIFIED_FILE)) return emptyState();
    const parsed = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8'));
    if (!parsed || !Array.isArray(parsed.fixtures) || !Array.isArray(parsed.results) || !Array.isArray(parsed.tickets)) return emptyState();
    return parsed;
  } catch { return emptyState(); }
}

export function saveVerifiedData(state: VerifiedDataState): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = VERIFIED_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  fs.renameSync(tmp, VERIFIED_FILE);
}

export function ingestFixtures(state: VerifiedDataState, fixtures: VerifiedFixture[]): VerifiedDataState {
  return { ...state, fixtures: mergeFixtures([...state.fixtures, ...fixtures]), updatedAt: new Date().toISOString() };
}

export function ingestResults(state: VerifiedDataState, results: HistoricalResult[]): VerifiedDataState {
  const byId = new Map(state.results.map(r => [r.id, r]));
  for (const result of results) byId.set(result.id, result);
  return { ...state, results: [...byId.values()], updatedAt: new Date().toISOString() };
}

export function ingestTickets(state: VerifiedDataState, tickets: VerifiedTicket[]): VerifiedDataState {
  const byId = new Map(state.tickets.map(t => [t.id, t]));
  for (const ticket of tickets) byId.set(t.id, t);
  return { ...state, tickets: [...byId.values()], updatedAt: new Date().toISOString() };
}

export function canonicalDataHash(state: VerifiedDataState): string {
  return sha256({ fixtures: state.fixtures, results: state.results, tickets: state.tickets });
}
