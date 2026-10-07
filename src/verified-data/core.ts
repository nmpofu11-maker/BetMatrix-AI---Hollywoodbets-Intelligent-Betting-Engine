import crypto from 'node:crypto';
import type { EvidencePrediction, HistoricalResult, Provenance, VerifiedFixture, VerifiedTicket } from './types';

export function sha256(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function makeProvenance(input: Omit<Provenance, 'retrievedAt'> & { retrievedAt?: string }): Provenance {
  return { ...input, retrievedAt: input.retrievedAt || new Date().toISOString() };
}

function validOdds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 1;
}

export function normaliseFixture(raw: any, provenance: Provenance, index: number): VerifiedFixture | null {
  if (!raw || typeof raw.homeTeam !== 'string' || typeof raw.awayTeam !== 'string' || typeof raw.kickoff !== 'string') return null;
  const markets = {
    home: validOdds(raw.markets?.home ?? raw.homeOdds) ? Number(raw.markets?.home ?? raw.homeOdds) : undefined,
    draw: validOdds(raw.markets?.draw ?? raw.drawOdds) ? Number(raw.markets?.draw ?? raw.drawOdds) : undefined,
    away: validOdds(raw.markets?.away ?? raw.awayOdds) ? Number(raw.markets?.away ?? raw.awayOdds) : undefined,
    over25: validOdds(raw.markets?.over25 ?? raw.over25Odds) ? Number(raw.markets?.over25 ?? raw.over25Odds) : undefined,
    bttsYes: validOdds(raw.markets?.bttsYes ?? raw.bttsOdds) ? Number(raw.markets?.bttsYes ?? raw.bttsOdds) : undefined,
    bttsNo: validOdds(raw.markets?.bttsNo) ? Number(raw.markets?.bttsNo) : undefined,
  };
  const id = String(raw.id || raw.eventCode || (raw.homeTeam + '-' + raw.awayTeam + '-' + raw.kickoff + '-' + index)).trim();
  return {
    id, eventCode: raw.eventCode ? String(raw.eventCode) : undefined,
    kickoff: raw.kickoff, homeTeam: raw.homeTeam.trim(), awayTeam: raw.awayTeam.trim(),
    league: raw.league ? String(raw.league) : undefined, markets, provenance: [provenance],
  };
}

export function mergeFixtures(fixtures: VerifiedFixture[]): VerifiedFixture[] {
  const map = new Map<string, VerifiedFixture>();
  for (const fixture of fixtures) {
    const existing = map.get(fixture.id);
    if (!existing) { map.set(fixture.id, fixture); continue; }
    map.set(fixture.id, {
      ...existing, ...fixture,
      markets: { ...existing.markets, ...Object.fromEntries(Object.entries(fixture.markets).filter(([, v]) => v !== undefined)) },
      provenance: [...existing.provenance, ...fixture.provenance],
    });
  }
  return [...map.values()];
}

export function verifyTicketArtifact(ticket: any, provenance: Provenance): VerifiedTicket | null {
  if (!ticket || typeof ticket.id !== 'string' || typeof ticket.platform !== 'string') return null;
  if (!Array.isArray(ticket.legs) || ticket.legs.length === 0) return null;
  if (!['won', 'lost', 'void', 'pending'].includes(ticket.status)) return null;
  if (typeof ticket.stakeZar !== 'number' || !Number.isFinite(ticket.stakeZar) || ticket.stakeZar < 0) return null;

  const legs = ticket.legs.map((leg: any) => ({
    match: String(leg.match || ((leg.homeTeam || '') + ' vs ' + (leg.awayTeam || ''))).trim(),
    homeTeam: leg.homeTeam ? String(leg.homeTeam) : undefined,
    awayTeam: leg.awayTeam ? String(leg.awayTeam) : undefined,
    market: String(leg.market || '').trim(),
    selection: String(leg.selection || leg.targetTeam || '').trim(),
    odds: Number(leg.odds),
    result: ['won', 'lost', 'void', 'pending'].includes(leg.result || leg.status) ? (leg.result || leg.status) : undefined,
  })).filter((leg: any) => leg.match && leg.market && leg.selection && Number.isFinite(leg.odds) && leg.odds > 1);

  if (legs.length !== ticket.legs.length) return null;
  const base = {
    id: ticket.id, ticketNumber: ticket.ticketNumber ? String(ticket.ticketNumber) : undefined,
    placedAt: ticket.placedAt ? String(ticket.placedAt) : undefined, settledAt: ticket.settledAt ? String(ticket.settledAt) : undefined,
    stakeZar: ticket.stakeZar, payoutZar: typeof ticket.payoutZar === 'number' ? ticket.payoutZar : undefined,
    status: ticket.status, platform: ticket.platform, legs, provenance,
  };
  return { ...base, verification: { method: 'artifact', verifiedAt: new Date().toISOString(), contentHash: sha256(base) } };
}

function clamp(n: number, min: number, max: number): number { return Math.min(max, Math.max(min, n)); }

export function scoreEvidencePrediction(fixture: VerifiedFixture, historical: HistoricalResult[]): EvidencePrediction {
  const homeOdds = fixture.markets.home, drawOdds = fixture.markets.draw, awayOdds = fixture.markets.away;
  const sourceCount = new Set(fixture.provenance.map(p => p.sourceId)).size;
  const relevant = historical.filter(r => {
    const home = r.homeTeam.toLowerCase(), away = r.awayTeam.toLowerCase();
    return home === fixture.homeTeam.toLowerCase() || away === fixture.homeTeam.toLowerCase() ||
           home === fixture.awayTeam.toLowerCase() || away === fixture.awayTeam.toLowerCase();
  }).slice(-100);

  if (![homeOdds, drawOdds, awayOdds].every(validOdds)) {
    return {
      fixtureId: fixture.id, market: '1X2',
      probabilities: { home: null, draw: null, away: null }, fairOdds: { home: null, draw: null, away: null },
      risk: { score: null, level: 'UNKNOWN', reasons: ['Verified 1X2 odds are incomplete.'] },
      evidence: { sourceCount, historicalMatchCount: relevant.length, oddsAvailable: false, method: 'No fabricated probabilities; incomplete market data.' },
    };
  }

  const raw = [1 / homeOdds!, 1 / drawOdds!, 1 / awayOdds!];
  const total = raw.reduce((a, b) => a + b, 0);
  const probs = raw.map(v => v / total);
  const margin = Math.max(0, total - 1);
  const sampleFactor = clamp(relevant.length / 20, 0, 1);
  const sourceFactor = clamp(sourceCount / 2, 0, 1);
  const riskScore = Math.round(clamp(100 - (sampleFactor * 35 + sourceFactor * 25) + Math.min(30, margin * 100), 0, 100));
  const level = riskScore < 30 ? 'LOW' : riskScore < 55 ? 'MODERATE' : 'HIGH';
  const reasons = [
    'Historical evidence: ' + relevant.length + ' relevant result(s).',
    'Fixture source evidence: ' + sourceCount + ' source(s).',
    'Observed 1X2 overround: ' + (margin * 100).toFixed(2) + '%.',
  ];
  if (relevant.length < 10) reasons.push('Historical sample is small; do not treat the estimate as robust.');
  if (sourceCount < 2) reasons.push('Only one source is available; independent corroboration is unavailable.');

  return {
    fixtureId: fixture.id, market: '1X2',
    probabilities: { home: probs[0], draw: probs[1], away: probs[2] },
    fairOdds: { home: 1 / probs[0], draw: 1 / probs[1], away: 1 / probs[2] },
    risk: { score: riskScore, level, reasons },
    evidence: {
      sourceCount, historicalMatchCount: relevant.length, oddsAvailable: true,
      method: 'Normalised verified bookmaker odds plus evidence-quality risk scoring; historical sample affects risk, not fabricated win probability.',
    },
  };
}
