import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { teamsSimilar } from '../src/services/teamNames.ts';
import { parseDelimited, rowsToObjects, mapFixtureRows, mapResultRows, sheetToObjects, zonedToUtcIso } from '../src/services/sheetImport.ts';
import { mergeFixturesFuzzy, mergeResultsFuzzy } from '../src/services/dataMerge.ts';
import { createPredictions, emptyStore, learnFromResults, recalibrate, settlePredictions, predictionStats } from '../src/services/predictionLedger.ts';
import { settleTicketsFromResults } from '../src/services/ticketSettlement.ts';
import { mergeTicketLists } from '../src/utils/ledgerMerge.ts';
import { mapEspnEvents, mapApiFootball, footballDataSeasonCode } from '../src/services/freeSources.ts';

test('team names: bookmaker vs provider names match, different clubs do not', () => {
  assert.ok(teamsSimilar('Man Utd', 'Manchester United'));
  assert.ok(teamsSimilar('Lamontville Golden Arrows', 'Golden Arrows'));
  assert.ok(teamsSimilar('Nott\'m Forest', 'Nottingham Forest'));
  assert.ok(teamsSimilar('Bayern München', 'Bayern Munich'));
  assert.ok(!teamsSimilar('Manchester United', 'Manchester City'));
  assert.ok(!teamsSimilar('Arsenal', 'Aston Villa'));
  assert.ok(!teamsSimilar('Inter', 'Inter Miami'));
});

test('csv: quotes, semicolons, BOM and SAST kickoff conversion', () => {
  const rows = rowsToObjects(parseDelimited('\uFEFFDate;Time;Home Team;Away Team;Home Odds;Draw Odds;Away Odds\n24/10/2026;15:30;"Chiefs, Kaizer";Pirates;2,60;3,10;2,75\n'));
  const { fixtures } = mapFixtureRows(rows, { sourceId: 'hollywoodbets-upload', sourceName: 'x' });
  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].kickoff, '2026-10-24T13:30:00.000Z'); // SAST = UTC+2
  assert.deepEqual([fixtures[0].markets.home, fixtures[0].markets.draw, fixtures[0].markets.away], [2.6, 3.1, 2.75]);
  assert.equal(zonedToUtcIso(2026, 7, 1, 15, 0, 'Europe/London'), '2026-07-01T14:00:00.000Z'); // BST
});

test('xlsx: real Excel file with date/time cells and text dates', () => {
  const buf = fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'slate.xlsx'));
  const rows = sheetToObjects({ filename: 'slate.xlsx', contentBase64: buf.toString('base64') });
  const { fixtures } = mapFixtureRows(rows, { sourceId: 'hollywoodbets-upload', sourceName: 'x' });
  assert.equal(fixtures.length, 2);
  assert.equal(fixtures[0].kickoff, '2026-10-24T13:30:00.000Z');
  assert.equal(fixtures[0].homeTeam, 'Kaizer Chiefs');
  assert.equal(fixtures[1].kickoff, '2026-10-25T16:00:00.000Z');
  assert.equal(fixtures[1].markets.away, 2.1);
});

test('results sheet: goals columns and "2-1" score column', () => {
  const a = mapResultRows(rowsToObjects(parseDelimited('Date,Home,Away,FTHG,FTAG\n24/10/2026,Chiefs,Pirates,1,1\n')), { sourceId: 'r', sourceName: 'r' });
  const b = mapResultRows(rowsToObjects(parseDelimited('Date,Home Team,Away Team,Score\n2026-10-24,Chiefs,Pirates,2 - 0\n')), { sourceId: 'r', sourceName: 'r' });
  assert.equal(a.results[0].homeGoals, 1); assert.equal(b.results[0].homeGoals, 2); assert.equal(b.results[0].awayGoals, 0);
});

test('merge: Hollywoodbets odds win over feed odds and names are unified', () => {
  const hb = mapFixtureRows(rowsToObjects(parseDelimited('Date,Time,Home Team,Away Team,Home Odds,Draw Odds,Away Odds\n2026-10-24,15:30,Man Utd,Arsenal,3.4,3.5,2.1\n')), { sourceId: 'hollywoodbets-upload', sourceName: 'HB' }).fixtures;
  const feed = mapFixtureRows(rowsToObjects(parseDelimited('Date,Time,Home Team,Away Team,Home Odds,Draw Odds,Away Odds\n2026-10-24,13:30,Manchester United,Arsenal,3.2,3.6,2.2\n')), { sourceId: 'espn', sourceName: 'ESPN', tz: 'UTC' }).fixtures;
  const m = mergeFixturesFuzzy(feed, hb);
  assert.equal(m.fixtures.length, 1); assert.equal(m.fixtures[0].markets.home, 3.4); assert.equal(m.fixtures[0].homeTeam, 'Man Utd');
});

test('merge: conflicting scores from two sources are flagged, not trusted', () => {
  const mk = (id: string, hg: number) => mapResultRows(rowsToObjects(parseDelimited(`Date,Home,Away,FTHG,FTAG\n2026-10-24,Chiefs,Pirates,${hg},0\n`)), { sourceId: id, sourceName: id }).results;
  const m = mergeResultsFuzzy(mk('a', 1), mk('b', 2));
  assert.equal(m.results.length, 1); assert.equal(m.results[0].conflict, true); assert.equal(m.conflicts, 1);
});

test('learning loop: predict -> settle -> learn -> ratings move, no leakage after kickoff', () => {
  const store = emptyStore();
  const past = mapResultRows(rowsToObjects(parseDelimited('Date,Home,Away,FTHG,FTAG\n' + Array.from({ length: 12 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')},Strong FC,Weak FC,3,0`).join('\n'))), { sourceId: 's', sourceName: 's' }).results;
  assert.equal(learnFromResults(store, past).learned, 12);
  assert.equal(learnFromResults(store, past).learned, 0, 'idempotent');
  assert.ok(store.ratings['strong'].r > store.ratings['weak'].r + 50);
  const now = new Date('2026-10-23T08:00:00Z');
  const fx = mapFixtureRows(rowsToObjects(parseDelimited('Date,Time,Home Team,Away Team,Home Odds,Draw Odds,Away Odds\n2026-10-24,15:30,Strong FC,Weak FC,1.5,4,6\n2026-10-23,09:00,Strong FC,Weak FC,1.5,4,6\n')), { sourceId: 'hollywoodbets-upload', sourceName: 'HB' }).fixtures;
  const c = createPredictions(store, fx, now);
  assert.equal(c.created, 1); assert.equal(c.skippedStarted, 1);
  const p = store.predictions[0]; assert.equal(p.pick, 'home'); assert.ok(p.model.ratingWeight > 0);
  const res = mapResultRows(rowsToObjects(parseDelimited('Date,Time,Home,Away,FTHG,FTAG\n2026-10-24,15:30,Strong FC,Weak FC,2,1\n')), { sourceId: 'x', sourceName: 'x' }).results;
  const s = settlePredictions(store, res, new Date('2026-10-24T20:00:00Z'));
  assert.equal(s.settled, 1); assert.equal(store.predictions[0].result!.correct, true); assert.ok(store.predictions[0].result!.unitsOnPick! > 0);
  recalibrate(store); const st = predictionStats(store); assert.equal(st.settled, 1); assert.equal(st.meaningful, false);
});

test('ticket settlement: fuzzy names, and old matches cannot settle a newer bet', () => {
  const ticket: any = { id: 't1', status: 'pending', placedAt: '2026-10-24T08:00:00Z', stake: 10, legs: [{ id: 'l1', status: 'pending', match: 'Man Utd vs Arsenal', homeTeam: 'Man Utd', awayTeam: 'Arsenal', market: 'Match 1X2 - Home Win', targetTeam: 'Man Utd', odds: 3.4 }] };
  const old = { id: 'o', homeTeam: 'Manchester United', awayTeam: 'Arsenal', kickoff: '2026-09-01T15:00:00Z', homeGoals: 0, awayGoals: 3, status: 'FT', source: 'x' };
  const good = { id: 'g', homeTeam: 'Manchester United', awayTeam: 'Arsenal', kickoff: '2026-10-24T15:30:00Z', homeGoals: 2, awayGoals: 1, status: 'FT', source: 'x' };
  assert.equal(settleTicketsFromResults([ticket], [old as any], '2026-10-25T00:00:00Z').settledCount, 0);
  const r = settleTicketsFromResults([ticket], [old as any, good as any], '2026-10-25T00:00:00Z');
  assert.equal(r.settledCount, 1); assert.equal(r.tickets[0].status, 'won');
});

test('ledger merge: a stale pending copy cannot overwrite a server settlement', () => {
  const server = [{ id: 't1', status: 'won', settledAt: 'x', actualPayoutZar: 34, legs: [{ id: 'l1', status: 'won', actualScore: '2-1' }] }];
  const client = [{ id: 't1', status: 'pending', note: 'mine', legs: [{ id: 'l1', status: 'pending' }] }];
  const m = mergeTicketLists(server, client)[0];
  assert.equal(m.status, 'won'); assert.equal(m.legs[0].status, 'won'); assert.equal(m.note, 'mine'); assert.equal(m.actualPayoutZar, 34);
});

test('provider payload mappers never invent odds and only settle finished games', () => {
  const espn = mapEspnEvents({ leagues: [{ name: 'Test League' }], events: [
    { id: '1', date: '2026-10-24T13:30Z', competitions: [{ status: { type: { state: 'post', completed: true, name: 'STATUS_FULL_TIME' } }, competitors: [{ homeAway: 'home', score: '2', team: { displayName: 'A' } }, { homeAway: 'away', score: '1', team: { displayName: 'B' } }] }] },
    { id: '2', date: '2026-10-25T13:30Z', competitions: [{ status: { type: { state: 'pre', completed: false, name: 'STATUS_SCHEDULED' } }, competitors: [{ homeAway: 'home', team: { displayName: 'C' } }, { homeAway: 'away', team: { displayName: 'D' } }] }] },
    { id: '3', date: '2026-10-24T13:30Z', competitions: [{ status: { type: { state: 'in', completed: false, name: 'STATUS_FIRST_HALF' } }, competitors: [{ homeAway: 'home', score: '1', team: { displayName: 'E' } }, { homeAway: 'away', score: '0', team: { displayName: 'F' } }] }] }] }, 'x.1');
  assert.equal(espn.results.length, 1); assert.equal(espn.fixtures.length, 1); assert.equal(espn.fixtures[0].markets.home, undefined);
  const af = mapApiFootball({ response: [{ fixture: { id: 9, date: '2026-10-24T13:30:00+00:00', status: { short: '1H' } }, teams: { home: { name: 'A' }, away: { name: 'B' } }, goals: { home: 1, away: 0 }, league: { name: 'L' } }] });
  assert.equal(af.results.length, 0);
  assert.equal(footballDataSeasonCode(new Date('2026-10-23')), '2627'); assert.equal(footballDataSeasonCode(new Date('2027-03-01')), '2627');
});
