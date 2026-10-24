import type { HistoricalResult, VerifiedFixture } from '../verified-data/types';
import { teamsSimilar, canonicalTeamKey } from './teamNames';

const HOUR = 3600000;
/** Lower = more trusted for ODDS. Hollywoodbets / user uploads beat generic feeds. */
export function oddsPriority(f: VerifiedFixture): number {
  const ids = f.provenance.map(p => p.sourceId.toLowerCase());
  if (ids.some(i => i.includes('hollywood'))) return 0;
  if (f.provenance.some(p => p.sourceKind === 'bookmaker')) return 1;
  if (f.provenance.some(p => p.sourceKind === 'user_import')) return 2;
  return 3;
}
const kickoffMs = (iso: string) => Date.parse(iso);
const sameMatch = (a: { homeTeam: string; awayTeam: string; kickoff: string }, b: { homeTeam: string; awayTeam: string; kickoff: string }, windowH: number) =>
  teamsSimilar(a.homeTeam, b.homeTeam) && teamsSimilar(a.awayTeam, b.awayTeam) && Math.abs(kickoffMs(a.kickoff) - kickoffMs(b.kickoff)) <= windowH * HOUR;

export function mergeFixturesFuzzy(existing: VerifiedFixture[], incoming: VerifiedFixture[]): { fixtures: VerifiedFixture[]; added: number; merged: number } {
  const out = existing.map(f => ({ ...f, markets: { ...f.markets }, provenance: [...f.provenance] }));
  let added = 0, merged = 0;
  for (const inc of incoming) {
    const hit = out.find(e => e.id === inc.id || sameMatch(e, inc, 4));
    if (!hit) { out.push({ ...inc, markets: { ...inc.markets }, provenance: [...inc.provenance] }); added++; continue; }
    merged++;
    const incTrusted = oddsPriority(inc) < oddsPriority(hit);
    const incomingWins = oddsPriority(inc) < oddsPriority(hit) || (oddsPriority(inc) === oddsPriority(hit) && Date.parse(inc.provenance[0]?.retrievedAt || '') >= Date.parse(hit.provenance[0]?.retrievedAt || ''));
    const triple = (m: VerifiedFixture['markets']) => [m.home, m.draw, m.away].every(v => typeof v === 'number');
    // Never mix a 1X2 triple from two different books: the whole triple comes from one source.
    const winner = triple(inc.markets) && (incomingWins || !triple(hit.markets)) ? inc : hit;
    const loser = winner === inc ? hit : inc;
    const markets: VerifiedFixture['markets'] = {};
    if (triple(winner.markets)) { markets.home = winner.markets.home; markets.draw = winner.markets.draw; markets.away = winner.markets.away; }
    for (const k of ['over25', 'bttsYes', 'bttsNo'] as const) { const v = winner.markets[k] ?? loser.markets[k]; if (v !== undefined) markets[k] = v; }
    const prov = new Map<string, any>(); for (const p of [...hit.provenance, ...inc.provenance]) prov.set(p.sourceId + '|' + p.sourceKind, p);
    hit.markets = markets; hit.provenance = [...prov.values()];
    hit.eventCode = hit.eventCode || inc.eventCode; hit.league = (incTrusted ? inc.league : hit.league) || inc.league || hit.league;
    if (incTrusted) { hit.homeTeam = inc.homeTeam; hit.awayTeam = inc.awayTeam; hit.kickoff = inc.kickoff; }
  }
  return { fixtures: out, added, merged };
}

/** Group results of the same match from different sources; flag conflicting scores. */
export function mergeResultsFuzzy(existing: HistoricalResult[], incoming: HistoricalResult[]): { results: HistoricalResult[]; added: number; conflicts: number } {
  const out = existing.map(r => ({ ...r })); let added = 0, conflicts = 0;
  for (const inc of incoming) {
    const hit = out.find(e => e.id === inc.id || sameMatch(e, inc, 12));
    if (!hit) { out.push({ ...inc }); added++; continue; }
    if (hit.homeGoals === inc.homeGoals && hit.awayGoals === inc.awayGoals) {
      const srcs = new Set([...(hit.corroboratedBy || []), hit.source.sourceId, inc.source.sourceId]); srcs.delete(hit.source.sourceId); hit.corroboratedBy = [...srcs];
      if (hit.conflict) hit.conflict = hit.conflict; // stays flagged until a human resolves it
    } else if (hit.source.sourceId !== inc.source.sourceId) { hit.conflict = true; conflicts++; }
    else { hit.homeGoals = inc.homeGoals; hit.awayGoals = inc.awayGoals; } // same source corrected its own score
  }
  return { results: out, added, conflicts };
}

export const matchKey = (h: string, a: string, kickoffIso: string) => canonicalTeamKey(h) + '|' + canonicalTeamKey(a) + '|' + kickoffIso.slice(0, 10);
