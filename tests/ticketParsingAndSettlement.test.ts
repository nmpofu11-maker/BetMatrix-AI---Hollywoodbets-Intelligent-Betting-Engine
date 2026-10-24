import assert from 'node:assert/strict';
import test from 'node:test';
import { settleTicketsFromResults } from '../src/services/ticketSettlement.ts';
import { VERIFIED_ARCHIVE_RESULTS } from '../src/services/providerResults.ts';

test('8-leg ticket settles correctly when results are provided and handles draws correctly', () => {
  const ticket = {
    id: 'HB-88888888',
    status: 'pending',
    stakeZar: 20,
    potentialPayoutZar: 1748.57,
    actualPayoutZar: 0,
    profitZar: -20,
    legs: [
      { id: 'leg-1', match: 'Cerro Largo FC vs Progreso', homeTeam: 'Cerro Largo FC', awayTeam: 'Progreso', targetTeam: 'Cerro Largo FC', market: 'Full Time - Cerro Largo FC', odds: 1.85, status: 'pending', league: 'Uruguay Primera Division', kickoffISO: '2026-10-08T20:00:00Z' },
      { id: 'leg-2', match: 'Shamrock Rovers vs Drogheda United', homeTeam: 'Shamrock Rovers', awayTeam: 'Drogheda United', targetTeam: 'Shamrock Rovers', market: 'Full Time - Shamrock Rovers', odds: 1.45, status: 'pending', league: 'League of Ireland', kickoffISO: '2026-10-08T19:45:00Z' },
    ]
  };

  const results = [
    { id: 'res-1', homeTeam: 'Cerro Largo', awayTeam: 'Progreso', kickoff: '2026-10-08T20:00:00Z', homeGoals: 2, awayGoals: 0, status: 'FT', source: 'TheRundown' },
    { id: 'res-2', homeTeam: 'Shamrock Rovers', awayTeam: 'Drogheda United', kickoff: '2026-10-08T19:45:00Z', homeGoals: 3, awayGoals: 1, status: 'FT', source: 'SportMonks' },
  ];

  const summary = settleTicketsFromResults([ticket], results, '2026-10-08T23:00:00Z');
  assert.equal(summary.tickets[0].status, 'won');
  assert.equal(summary.tickets[0].legs[0].status, 'won');
  assert.equal(summary.tickets[0].legs[1].status, 'won');
  assert.equal(summary.tickets[0].actualPayoutZar, 1748.57);
});

test('draw loses straight home-win selection in 1X2 market', () => {
  const ticket = {
    id: 'HB-DRAW',
    status: 'pending',
    stakeZar: 10,
    potentialPayoutZar: 30,
    legs: [
      { id: 'leg-1', match: 'Team A vs Team B', homeTeam: 'Team A', awayTeam: 'Team B', targetTeam: 'Team A', market: 'Full Time - Team A', odds: 3.0, status: 'pending', kickoffISO: '2026-10-08T18:00:00Z' }
    ]
  };

  const results = [
    { id: 'res-draw', homeTeam: 'Team A', awayTeam: 'Team B', kickoff: '2026-10-08T18:00:00Z', homeGoals: 1, awayGoals: 1, status: 'FT', source: 'TheRundown' }
  ];

  const summary = settleTicketsFromResults([ticket], results, '2026-10-08T20:00:00Z');
  assert.equal(summary.tickets[0].status, 'lost');
  assert.equal(summary.tickets[0].legs[0].status, 'lost');
});

test('reserve teams and suffix variants match correctly', () => {
  const ticket = {
    id: 'HB-RES',
    status: 'pending',
    stakeZar: 10,
    potentialPayoutZar: 20,
    legs: [
      { id: 'leg-res', match: 'Montevideo Wanderers Reserves vs Defensor Sporting Res', homeTeam: 'Montevideo Wanderers Reserves', awayTeam: 'Defensor Sporting Res', targetTeam: 'Montevideo Wanderers Reserves', market: '1X2', odds: 2.0, status: 'pending', kickoffISO: '2026-10-08T15:00:00Z' }
    ]
  };

  const results = [
    { id: 'res-res', homeTeam: 'Montevideo Wanderers FC', awayTeam: 'Defensor Sporting', kickoff: '2026-10-08T15:00:00Z', homeGoals: 2, awayGoals: 0, status: 'FT', source: 'SportMonks' }
  ];

  const summary = settleTicketsFromResults([ticket], results, '2026-10-08T18:00:00Z');
  assert.equal(summary.tickets[0].status, 'won');
  assert.equal(summary.tickets[0].legs[0].status, 'won');
});

test('Ticket #2083007794915693 8-leg audit: unverified legs remain pending and unrelated fixtures do not settle', () => {
  const ticket = {
    id: '2083007794915693',
    status: 'pending',
    stakeZar: 10,
    potentialPayoutZar: 1384.45,
    actualPayoutZar: 0,
    profitZar: -10,
    legs: [
      { id: 'leg-1', match: 'FC CFR 1907 Cluj vs FC Universitatea Cluj', homeTeam: 'FC CFR 1907 Cluj', awayTeam: 'FC Universitatea Cluj', targetTeam: 'FC CFR 1907 Cluj', market: 'Full Time - FC CFR 1907 Cluj', odds: 1.85, status: 'pending', league: 'Romania Liga I', kickoffISO: '2026-10-08T18:00:00Z' },
      { id: 'leg-2', match: 'Al Talaba vs Al Shorta SC', homeTeam: 'Al Talaba', awayTeam: 'Al Shorta SC', targetTeam: 'Al Shorta SC', market: 'Full Time - Al Shorta SC', odds: 1.95, status: 'pending', league: 'Iraq Super League', kickoffISO: '2026-10-08T18:30:00Z' },
      { id: 'leg-3', match: 'AS FAR Rabat vs Wydad Temara', homeTeam: 'AS FAR Rabat', awayTeam: 'Wydad Temara', targetTeam: 'AS FAR Rabat', market: 'Full Time - AS FAR Rabat', odds: 1.4, status: 'pending', league: 'Morocco Botola Pro', kickoffISO: '2026-10-08T19:00:00Z' },
      { id: 'leg-4', match: 'CD Godoy Cruz vs CA Barracas Central Reserve', homeTeam: 'CD Godoy Cruz', awayTeam: 'CA Barracas Central Reserve', targetTeam: 'CD Godoy Cruz', market: 'Full Time - CD Godoy Cruz', odds: 1.7, status: 'pending', league: 'Argentina Primera Division', kickoffISO: '2026-10-08T19:30:00Z' },
      { id: 'leg-5', match: 'CA Lanus vs CA Central Cordoba SE Reserve', homeTeam: 'CA Lanus', awayTeam: 'CA Central Cordoba SE Reserve', targetTeam: 'CA Lanus', market: 'Full Time - CA Lanus', odds: 1.65, status: 'pending', league: 'Argentina Primera Division', kickoffISO: '2026-10-08T20:00:00Z' },
      { id: 'leg-6', match: 'Cerro Largo FC vs Progreso', homeTeam: 'Cerro Largo FC', awayTeam: 'Progreso', targetTeam: 'Cerro Largo FC', market: 'Full Time - Cerro Largo FC', odds: 1.8, status: 'pending', league: 'Uruguay Primera Division', kickoffISO: '2026-10-08T20:30:00Z' },
      { id: 'leg-7', match: 'Shamrock Rovers vs Drogheda Utd', homeTeam: 'Shamrock Rovers', awayTeam: 'Drogheda Utd', targetTeam: 'Shamrock Rovers', market: 'Full Time - Shamrock Rovers', odds: 1.5, status: 'pending', league: 'Ireland Premier Division', kickoffISO: '2026-10-08T21:00:00Z' },
      { id: 'leg-8', match: 'Maghreb AS de Fes vs Raja Casablanca Athletic', homeTeam: 'Maghreb AS de Fes', awayTeam: 'Raja Casablanca Athletic', targetTeam: 'Maghreb AS de Fes', market: 'Full Time - Maghreb AS de Fes', odds: 2.1, status: 'pending', league: 'Morocco Botola Pro', kickoffISO: '2026-10-08T21:30:00Z' },
    ]
  };

  // Only legs 6 and 7 have verified evidence; legs 1-5 and 8 have no matching provider or archive evidence.
  // Unrelated archive results (Montevideo Wanderers, Penarol, etc.) should not match or settle any leg.
  const results = [
    { id: 'res-cerro-largo', homeTeam: 'Cerro Largo FC', awayTeam: 'Progreso', kickoff: '2026-10-08T20:30:00Z', homeGoals: 2, awayGoals: 0, status: 'FT', source: 'Archive' },
    { id: 'res-shamrock', homeTeam: 'Shamrock Rovers', awayTeam: 'Drogheda Utd', kickoff: '2026-10-08T21:00:00Z', homeGoals: 3, awayGoals: 1, status: 'FT', source: 'Archive' },
    { id: 'res-unrelated', homeTeam: 'Montevideo Wanderers', awayTeam: 'Defensor Sporting', kickoff: '2026-10-08T22:15:00Z', homeGoals: 1, awayGoals: 1, status: 'FT', source: 'Archive' },
  ];

  const summary = settleTicketsFromResults([ticket], results, '2026-10-08T23:59:00Z');
  const settledTicket = summary.tickets[0];

  assert.equal(settledTicket.status, 'pending'); // Ticket remains pending because 6 legs lack verified results
  assert.equal(settledTicket.legs[0].status, 'pending'); // Cluj vs U Cluj
  assert.equal(settledTicket.legs[1].status, 'pending'); // Al Talaba vs Al Shorta
  assert.equal(settledTicket.legs[2].status, 'pending'); // AS FAR vs Wydad Temara
  assert.equal(settledTicket.legs[3].status, 'pending'); // Godoy Cruz vs Barracas
  assert.equal(settledTicket.legs[4].status, 'pending'); // Lanus vs Central Cordoba
  assert.equal(settledTicket.legs[5].status, 'won'); // Cerro Largo vs Progreso (verified 2-0)
  assert.equal(settledTicket.legs[6].status, 'won'); // Shamrock Rovers vs Drogheda Utd (verified 3-1)
  assert.equal(settledTicket.legs[7].status, 'pending'); // Maghreb vs Raja
});

test('unverified fixtures remain pending with no guessed score', () => {
  const ticket = {
    id: 'HB-UNV',
    status: 'pending',
    stakeZar: 10,
    potentialPayoutZar: 20,
    legs: [
      { id: 'leg-1', match: 'Unknown FC vs Mystery SC', homeTeam: 'Unknown FC', awayTeam: 'Mystery SC', targetTeam: 'Unknown FC', market: 'Full Time - Unknown FC', odds: 2.0, status: 'pending', kickoffISO: '2026-10-08T20:00:00Z' }
    ]
  };
  const summary = settleTicketsFromResults([ticket], [], '2026-10-08T22:00:00Z');
  assert.equal(summary.tickets[0].status, 'pending');
  assert.equal(summary.tickets[0].legs[0].status, 'pending');
});

test('conflicting provider or archive scores remain pending', () => {
  const ticket = {
    id: 'HB-CONF',
    status: 'pending',
    stakeZar: 10,
    potentialPayoutZar: 20,
    legs: [
      { id: 'leg-1', match: 'Team A vs Team B', homeTeam: 'Team A', awayTeam: 'Team B', targetTeam: 'Team A', market: 'Full Time - Team A', odds: 2.0, status: 'pending', kickoffISO: '2026-10-08T18:00:00Z' }
    ]
  };
  const results = [
    { id: 'res-1', homeTeam: 'Team A', awayTeam: 'Team B', kickoff: '2026-10-08T18:00:00Z', homeGoals: 2, awayGoals: 0, status: 'FT', source: 'Provider A' },
    { id: 'res-2', homeTeam: 'Team A', awayTeam: 'Team B', kickoff: '2026-10-08T18:00:00Z', homeGoals: 0, awayGoals: 1, status: 'FT', source: 'Provider B' },
  ];
  const summary = settleTicketsFromResults([ticket], results, '2026-10-08T20:00:00Z');
  assert.equal(summary.tickets[0].status, 'pending');
  assert.equal(summary.tickets[0].legs[0].status, 'pending');
});

test('settlement is idempotent on repeat execution', () => {
  const ticket = {
    id: 'HB-IDEMP',
    status: 'pending',
    stakeZar: 10,
    potentialPayoutZar: 20,
    legs: [
      { id: 'leg-1', match: 'Team A vs Team B', homeTeam: 'Team A', awayTeam: 'Team B', targetTeam: 'Team A', market: 'Full Time - Team A', odds: 2.0, status: 'pending', kickoffISO: '2026-10-08T18:00:00Z' }
    ]
  };
  const results = [
    { id: 'res-1', homeTeam: 'Team A', awayTeam: 'Team B', kickoff: '2026-10-08T18:00:00Z', homeGoals: 2, awayGoals: 0, status: 'FT', source: 'Archive' }
  ];
  const firstPass = settleTicketsFromResults([ticket], results, '2026-10-08T20:00:00Z');
  const secondPass = settleTicketsFromResults(firstPass.tickets, results, '2026-10-08T20:00:00Z');
  assert.equal(secondPass.tickets[0].status, 'won');
  assert.equal(secondPass.settledCount, 0); // No new settlements on repeat execution
});

test('Ticket #2083007794915693 full 8-leg reconciliation: settles as lost via normal settlement rules with complete provenance', () => {
  const ticket = {
    id: '2083007794915693',
    status: 'pending',
    stakeZar: 10,
    potentialPayoutZar: 1384.45,
    actualPayoutZar: 0,
    profitZar: -10,
    legs: [
      { id: 'leg-1', match: 'FC CFR 1907 Cluj vs FC Universitatea Cluj', homeTeam: 'FC CFR 1907 Cluj', awayTeam: 'FC Universitatea Cluj', targetTeam: 'FC CFR 1907 Cluj', market: 'Full Time - FC CFR 1907 Cluj', odds: 1.85, status: 'pending', league: 'Romania Liga I', kickoffISO: '2026-10-08T18:00:00Z' },
      { id: 'leg-2', match: 'Al Talaba vs Al Shorta SC', homeTeam: 'Al Talaba', awayTeam: 'Al Shorta SC', targetTeam: 'Al Shorta SC', market: 'Full Time - Al Shorta SC', odds: 1.95, status: 'pending', league: 'Iraq Super League', kickoffISO: '2026-10-08T18:30:00Z' },
      { id: 'leg-3', match: 'AS FAR Rabat vs Wydad Temara', homeTeam: 'AS FAR Rabat', awayTeam: 'Wydad Temara', targetTeam: 'AS FAR Rabat', market: 'Full Time - AS FAR Rabat', odds: 1.4, status: 'pending', league: 'Morocco Botola Pro', kickoffISO: '2026-10-08T19:00:00Z' },
      { id: 'leg-4', match: 'CD Godoy Cruz vs CA Barracas Central Reserve', homeTeam: 'CD Godoy Cruz', awayTeam: 'CA Barracas Central Reserve', targetTeam: 'CD Godoy Cruz', market: 'Full Time - CD Godoy Cruz', odds: 1.7, status: 'pending', league: 'Argentina Primera Division', kickoffISO: '2026-10-08T19:30:00Z' },
      { id: 'leg-5', match: 'CA Lanus vs CA Central Cordoba SE Reserve', homeTeam: 'CA Lanus', awayTeam: 'CA Central Cordoba SE Reserve', targetTeam: 'CA Lanus', market: 'Full Time - CA Lanus', odds: 1.65, status: 'pending', league: 'Argentina Primera Division', kickoffISO: '2026-10-08T20:00:00Z' },
      { id: 'leg-6', match: 'Cerro Largo FC vs Progreso', homeTeam: 'Cerro Largo FC', awayTeam: 'Progreso', targetTeam: 'Cerro Largo FC', market: 'Full Time - Cerro Largo FC', odds: 1.8, status: 'pending', league: 'Uruguay Primera Division', kickoffISO: '2026-10-08T20:30:00Z' },
      { id: 'leg-7', match: 'Shamrock Rovers vs Drogheda Utd', homeTeam: 'Shamrock Rovers', awayTeam: 'Drogheda Utd', targetTeam: 'Shamrock Rovers', market: 'Full Time - Shamrock Rovers', odds: 1.5, status: 'pending', league: 'Ireland Premier Division', kickoffISO: '2026-10-08T21:00:00Z' },
      { id: 'leg-8', match: 'Maghreb AS de Fes vs Raja Casablanca Athletic', homeTeam: 'Maghreb AS de Fes', awayTeam: 'Raja Casablanca Athletic', targetTeam: 'Maghreb AS de Fes', market: 'Full Time - Maghreb AS de Fes', odds: 2.1, status: 'pending', league: 'Morocco Botola Pro', kickoffISO: '2026-10-08T21:30:00Z' },
    ]
  };

  const summary = settleTicketsFromResults([ticket], VERIFIED_ARCHIVE_RESULTS, '2026-10-10T17:36:39Z');
  const settledTicket = summary.tickets[0];

  assert.equal(settledTicket.status, 'lost');
  assert.equal(settledTicket.actualPayoutZar, 0);
  assert.equal(settledTicket.profitZar, -10);

  // Check individual leg outcomes and scores
  assert.equal(settledTicket.legs[0].status, 'lost'); // CFR Cluj 1-3 U Cluj
  assert.equal(settledTicket.legs[0].score, '1-3');
  assert.ok(settledTicket.legs[0].sourceUrl);

  assert.equal(settledTicket.legs[1].status, 'lost'); // Al Talaba 0-0 Al Shorta
  assert.equal(settledTicket.legs[1].score, '0-0');
  assert.ok(settledTicket.legs[1].sourceUrl);

  assert.equal(settledTicket.legs[2].status, 'won'); // AS FAR 1-0 Wydad Temara
  assert.equal(settledTicket.legs[2].score, '1-0');
  assert.ok(settledTicket.legs[2].sourceUrl);

  assert.equal(settledTicket.legs[3].status, 'lost'); // Godoy Cruz 0-0 Barracas
  assert.equal(settledTicket.legs[3].score, '0-0');
  assert.ok(settledTicket.legs[3].sourceUrl);

  assert.equal(settledTicket.legs[4].status, 'won'); // Lanus 3-0 Central Cordoba
  assert.equal(settledTicket.legs[4].score, '3-0');
  assert.ok(settledTicket.legs[4].sourceUrl);

  assert.equal(settledTicket.legs[5].status, 'won'); // Cerro Largo 2-0 Progreso
  assert.equal(settledTicket.legs[5].score, '2-0');

  assert.equal(settledTicket.legs[6].status, 'won'); // Shamrock Rovers 3-1 Drogheda Utd
  assert.equal(settledTicket.legs[6].score, '3-1');

  assert.equal(settledTicket.legs[7].status, 'lost'); // Maghreb 0-0 Raja
  assert.equal(settledTicket.legs[7].score, '0-0');
  assert.ok(settledTicket.legs[7].sourceUrl);

  // Verify idempotency
  const secondPass = settleTicketsFromResults(summary.tickets, VERIFIED_ARCHIVE_RESULTS, '2026-10-10T17:36:39Z');
  assert.equal(secondPass.tickets[0].status, 'lost');
  assert.equal(secondPass.settledCount, 0);
});

test('SportAPI.ai fixture mapping normalises team names, competition and kickoff without inventing odds', async () => {
  const { mapFixtureRows } = await import('../src/verified-data/adapters.ts');
  const rawSportApiPayload = [
    {
      id: 13596119,
      home_id: 28,
      away_id: 142,
      date: '2026-10-10',
      datetime: '2026-10-10 17:00:00',
      home_team: 'Grazer AK',
      away_team: 'Red Bull Salzburg',
      league_name: 'Austrian Bundesliga',
      status: 'SCHEDULED'
    }
  ];

  const mapped = mapFixtureRows(rawSportApiPayload);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].id, 13596119);
  assert.equal(mapped[0].homeTeam, 'Grazer AK');
  assert.equal(mapped[0].awayTeam, 'Red Bull Salzburg');
  assert.equal(mapped[0].league, 'Austrian Bundesliga');
  assert.equal(mapped[0].kickoff, '2026-10-10T17:00:00Z');

  // Verify missing odds are strictly undefined (never invented or default percentages)
  assert.equal(mapped[0].homeOdds, undefined);
  assert.equal(mapped[0].drawOdds, undefined);
  assert.equal(mapped[0].awayOdds, undefined);
});


