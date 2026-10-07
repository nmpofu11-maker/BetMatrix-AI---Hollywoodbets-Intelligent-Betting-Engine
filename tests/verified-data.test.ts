import assert from 'node:assert/strict';
import test from 'node:test';
import { makeProvenance, normaliseFixture, scoreEvidencePrediction, verifyTicketArtifact, evaluateOutOfSample } from '../src/verified-data/index.ts';

const provenance = makeProvenance({
  sourceId: 'test-source',
  sourceName: 'Test source',
  sourceKind: 'sports_api',
  evidenceStatus: 'verified',
});

test('incomplete odds never become fabricated probabilities', () => {
  const fixture = normaliseFixture({
    id: 'x',
    kickoff: '2026-10-07T18:00:00Z',
    homeTeam: 'A',
    awayTeam: 'B',
    homeOdds: 1.8,
  }, provenance, 0)!;
  const prediction = scoreEvidencePrediction(fixture, []);
  assert.equal(prediction.probabilities.home, null);
  assert.equal(prediction.risk.level, 'UNKNOWN');
});

test('verified fixture probabilities are derived only from supplied odds', () => {
  const fixture = normaliseFixture({
    id: 'x',
    kickoff: '2026-10-07T18:00:00Z',
    homeTeam: 'A',
    awayTeam: 'B',
    homeOdds: 2,
    drawOdds: 3,
    awayOdds: 4,
  }, provenance, 0)!;
  const prediction = scoreEvidencePrediction(fixture, []);
  assert.ok(prediction.probabilities.home !== null);
  assert.ok(Math.abs((prediction.probabilities.home || 0) + (prediction.probabilities.draw || 0) + (prediction.probabilities.away || 0) - 1) < 1e-9);
  assert.equal(prediction.evidence.historicalMatchCount, 0);
});

test('ticket number alone cannot verify a ticket', () => {
  const ticket = verifyTicketArtifact({ id: 'T1', ticketNumber: '123456', platform: 'Hollywoodbets', status: 'won', stakeZar: 10 }, provenance);
  assert.equal(ticket, null);
});

test('ticket verification creates a content hash from supplied ticket evidence', () => {
  const ticket = verifyTicketArtifact({
    id: 'T1', ticketNumber: '123456', platform: 'Hollywoodbets', status: 'won', stakeZar: 10,
    legs: [{ match: 'A vs B', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A', odds: 2, result: 'won' }],
  }, provenance);
  assert.ok(ticket);
  assert.equal(ticket?.verification.method, 'artifact');
  assert.equal(ticket?.verification.contentHash.length, 64);
});

test('out-of-sample evaluator refuses small samples', () => {
  const rows = Array.from({length: 29}, (_, i) => ({
    fixtureId: String(i), predictionTime: '2026-01-01T10:00:00Z', outcomeTime: '2026-01-01T12:00:00Z',
    market: '1X2' as const, predicted: { home: .5, draw: .2, away: .3 }, actual: 'home',
    trainingCutoff: '2025-12-31T23:00:00Z'
  }));
  assert.equal(evaluateOutOfSample(rows)[0]?.status, 'insufficient');
});

test('out-of-sample evaluator excludes leaked training windows', () => {
  const rows = Array.from({length: 30}, (_, i) => ({
    fixtureId: String(i), predictionTime: '2026-01-01T10:00:00Z', outcomeTime: '2026-01-01T12:00:00Z',
    market: '1X2' as const, predicted: { home: .5, draw: .2, away: .3 }, actual: 'home',
    trainingCutoff: i === 0 ? '2026-01-01T11:00:00Z' : '2025-12-31T23:00:00Z'
  }));
  assert.equal(evaluateOutOfSample(rows)[0]?.records, 29);
});
