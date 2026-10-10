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
