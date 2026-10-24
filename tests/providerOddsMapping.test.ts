import assert from 'node:assert/strict';
import test from 'node:test';
import { mapFixtureRows } from '../src/verified-data/adapters.ts';

test('TheRundown 1X2 mapping converts American prices and uses one affiliate', () => {
  const rows = mapFixtureRows({ events: [{
    event_id: 'event-1',
    event_date: '2026-10-11T15:00:00Z',
    teams: [{ name: 'Arsenal', is_home: true }, { name: 'Chelsea', is_home: false }],
    markets: [{
      market_id: 1, name: 'moneyline',
      participants: [
        { name: 'Arsenal', lines: [{ prices: { 'book-1': { price: 150 }, 'book-2': { price: 160 } } }] },
        { name: 'Draw', lines: [{ prices: { 'book-1': { price: 250 } } }] },
        { name: 'Chelsea', lines: [{ prices: { 'book-1': { price: 200 }, 'book-2': { price: 210 } } }] },
      ],
    }],
  }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].homeOdds, 2.5);
  assert.equal(rows[0].drawOdds, 3.5);
  assert.equal(rows[0].awayOdds, 3);
});

test('TheRundown mapping refuses to invent missing draw odds or mix books', () => {
  const rows = mapFixtureRows({ events: [{
    event_id: 'event-2',
    event_date: '2026-10-11T15:00:00Z',
    teams: [{ name: 'Arsenal', is_home: true }, { name: 'Chelsea', is_home: false }],
    markets: [{ market_id: 1, name: 'moneyline', participants: [
      { name: 'Arsenal', lines: [{ prices: { 'book-1': { price: 150 } } }] },
      { name: 'Draw', lines: [{ prices: { 'book-2': { price: 250 } } }] },
      { name: 'Chelsea', lines: [{ prices: { 'book-1': { price: 200 } } }] },
    ] }],
  }] });
  assert.equal(rows[0].homeOdds, undefined);
  assert.equal(rows[0].drawOdds, undefined);
  assert.equal(rows[0].awayOdds, undefined);
});

test('normalizeTheRundownEvent keeps empty bookmaker lines unavailable without substituting fake odds', async () => {
  const { normalizeTheRundownEvent } = await import('../src/services/serverTheRundown.ts');
  const normalized = normalizeTheRundownEvent({
    event_id: 'ev-1234',
    event_date: '2026-10-11T15:00:00Z',
    teams: [{ name: 'Liverpool', is_home: true }, { name: 'Everton', is_home: false }]
  });
  assert.equal(normalized.homeOdds, undefined);
  assert.equal(normalized.drawOdds, undefined);
  assert.equal(normalized.awayOdds, undefined);
});

test('normalizeSportApiFixture keeps missing odds undefined without substituting defaults', async () => {
  const { normalizeSportApiFixture } = await import('../src/services/serverSportApiAi.ts');
  const normalized = normalizeSportApiFixture({
    id: 998877,
    home_team: 'Kaizer Chiefs',
    away_team: 'Orlando Pirates',
    datetime: '2026-10-11 15:30:00',
    league: 'Betway Premiership'
  });
  assert.equal(normalized.homeOdds, undefined);
  assert.equal(normalized.drawOdds, undefined);
  assert.equal(normalized.awayOdds, undefined);
});

test('computeMathematicalProbabilities returns zero and refuses to fabricate probabilities when odds are missing', async () => {
  const { computeMathematicalProbabilities } = await import('../src/utils/fixtureStorage.ts');
  const result = computeMathematicalProbabilities(undefined as any, undefined as any, undefined as any);
  assert.equal(result.impliedProbHome, 0);
  assert.equal(result.impliedProbDraw, 0);
  assert.equal(result.impliedProbAway, 0);
  assert.equal(result.fairProbHome, 0);
  assert.equal(result.bookmakerMarginPct, 0);
});
