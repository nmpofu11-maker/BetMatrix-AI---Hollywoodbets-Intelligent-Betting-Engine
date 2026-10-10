import assert from 'node:assert/strict';
import test from 'node:test';
import { isFinalResult, normaliseTeamName, settleTicketsFromResults } from '../src/services/ticketSettlement.ts';
const finished = { id: 'event-1', homeTeam: 'Arsenal FC', awayTeam: 'Chelsea', kickoff: '2026-10-09T19:00:00Z', homeGoals: 2, awayGoals: 1, status: 'STATUS_FINAL', source: 'TheRundown' };
test('team normalization handles common club suffixes', () => {
  assert.equal(normaliseTeamName('Arsenal F.C.'), 'arsenal');
  assert.equal(normaliseTeamName('Chelsea FC'), 'chelsea');
});
test('only explicit final statuses with valid scores qualify', () => {
  assert.equal(isFinalResult(finished), true);
  assert.equal(isFinalResult({ ...finished, status: 'IN_PROGRESS' }), false);
  assert.equal(isFinalResult({ ...finished, homeGoals: null }), false);
});
test('a verified final result settles a supported match-result leg and ticket', () => {
  const ticket = { id: 'T1', status: 'pending', stakeZar: 10, potentialPayoutZar: 25, actualPayoutZar: 0, profitZar: -10,
    legs: [{ id: 'L1', status: 'pending', homeTeam: 'Arsenal', awayTeam: 'Chelsea', market: '1X2', selection: 'Arsenal', odds: 2.5, kickoffISO: finished.kickoff }] };
  const result = settleTicketsFromResults([ticket], [finished], '2026-10-10T07:00:00Z');
  assert.equal(result.tickets[0].status, 'won'); assert.equal(result.tickets[0].legs[0].status, 'won');
  assert.equal(result.tickets[0].actualPayoutZar, 25); assert.equal(result.settledCount, 1);
});
test('a final losing accumulator leg busts the ticket without waiting for other legs', () => {
  const ticket = { id: 'T2', status: 'pending', stakeZar: 20, potentialPayoutZar: 100, actualPayoutZar: 0, profitZar: -20,
    legs: [
      { id: 'L1', status: 'pending', homeTeam: 'Arsenal', awayTeam: 'Chelsea', market: '1X2', selection: 'Chelsea', odds: 3, kickoffISO: finished.kickoff },
      { id: 'L2', status: 'pending', homeTeam: 'Liverpool', awayTeam: 'Everton', market: '1X2', selection: 'Liverpool', odds: 2 },
    ] };
  const result = settleTicketsFromResults([ticket], [finished], '2026-10-10T07:00:00Z');
  assert.equal(result.tickets[0].status, 'lost'); assert.equal(result.tickets[0].actualPayoutZar, 0);
  assert.equal(result.tickets[0].profitZar, -20);
});
test('live scores, ambiguous matches, and unsupported markets never settle tickets', () => {
  const ticket = { id: 'T3', status: 'pending', stakeZar: 10, potentialPayoutZar: 20, actualPayoutZar: 0, profitZar: -10,
    legs: [{ id: 'L1', status: 'pending', homeTeam: 'Arsenal', awayTeam: 'Chelsea', market: 'Correct Score', selection: '2-1', odds: 8 }] };
  assert.equal(settleTicketsFromResults([ticket], [{ ...finished, status: 'IN_PROGRESS' }]).tickets[0].status, 'pending');
  assert.equal(settleTicketsFromResults([ticket], [finished, finished]).tickets[0].status, 'pending');
  assert.equal(settleTicketsFromResults([ticket], [finished]).tickets[0].status, 'pending');
});
test('incomplete fixture identity does not settle a leg', () => {
  const ticket = { id: 'T4', status: 'pending', stakeZar: 10, potentialPayoutZar: 20, legs: [{ status: 'pending', market: '1X2', selection: 'Arsenal' }] };
  assert.equal(settleTicketsFromResults([ticket], [finished]).tickets[0].status, 'pending');
});
