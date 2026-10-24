import { teamsSimilar, splitMatchLabel } from './teamNames';
export interface MatchResultEvidence {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff?: string;
  homeGoals: number;
  awayGoals: number;
  status: string;
  source: string;
}
export interface SettlementSummary { tickets: any[]; checkedLegs: number; settledCount: number; updatedCount: number; }
const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN', 'FINAL', 'FINISHED', 'STATUS_FINAL', 'FULL_TIME', 'FULLTIME']);
export function normaliseTeamName(value: unknown): string {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/\./g, '').replace(/\b(football club|soccer club|fc|afc|sc|cf)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
export function isFinalResult(result: MatchResultEvidence): boolean {
  const status = String(result.status || '').toUpperCase().replace(/[\s-]+/g, '_');
  return FINAL_STATUSES.has(status) && Number.isInteger(result.homeGoals) && result.homeGoals >= 0 &&
    Number.isInteger(result.awayGoals) && result.awayGoals >= 0 &&
    Boolean(normaliseTeamName(result.homeTeam)) && Boolean(normaliseTeamName(result.awayTeam));
}
function teamOutcome(homeGoals: number, awayGoals: number): 'home' | 'draw' | 'away' {
  return homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw';
}
function resolveSelectionOutcome(leg: any, homeGoals: number, awayGoals: number, homeTeam: string, awayTeam: string): 'won' | 'lost' | null {
  const market = String(leg.market || '').toLowerCase().replace(/[_-]+/g, ' ');
  const selection = String(leg.selection || leg.targetTeam || leg.pick || '').trim();
  const pick = selection.toLowerCase().replace(/[_-]+/g, ' ');
  if (!market || !selection) return null;
  const combined = market + ' ' + pick;
  if (/both teams to score|\bbtts\b/.test(combined)) {
    const scoredBoth = homeGoals > 0 && awayGoals > 0;
    if (/\b(no|not|false)\b/.test(pick) || /\bbtts no\b/.test(combined)) return scoredBoth ? 'lost' : 'won';
    if (/\b(yes|true)\b/.test(pick) || /\bbtts yes\b/.test(combined)) return scoredBoth ? 'won' : 'lost';
    return null;
  }
  if (/over.?under|total goals|goals over|goals under|\bo\/u\b/.test(combined)) {
    const thresholdMatch = combined.match(/(?:over|under|o\/u|total goals)[^0-9]{0,8}(\d+(?:\.\d+)?)/) || combined.match(/(\d+(?:\.\d+)?)[^a-z]{0,5}(?:over|under)/);
    const threshold = thresholdMatch ? Number(thresholdMatch[1]) : NaN;
    if (!Number.isFinite(threshold)) return null;
    if (/\bover\b/.test(pick) || (/\bover\b/.test(market) && !/\bunder\b/.test(pick))) return homeGoals + awayGoals > threshold ? 'won' : 'lost';
    if (/\bunder\b/.test(pick) || (/\bunder\b/.test(market) && !/\bover\b/.test(pick))) return homeGoals + awayGoals < threshold ? 'won' : 'lost';
    return null;
  }
  if (/double chance/.test(market)) {
    const outcome = teamOutcome(homeGoals, awayGoals);
    if (/\b(1x|home or draw|home\/draw|1 or x)\b/.test(pick)) return outcome === 'home' || outcome === 'draw' ? 'won' : 'lost';
    if (/\b(x2|draw or away|draw\/away|x or 2)\b/.test(pick)) return outcome === 'away' || outcome === 'draw' ? 'won' : 'lost';
    if (/\b(12|home or away|home\/away|1 or 2)\b/.test(pick)) return outcome !== 'draw' ? 'won' : 'lost';
    return null;
  }
  if (/half|1st|2nd|corner|card|handicap|draw no bet|\bdnb\b|first goal|anytime|correct score/.test(combined)) return null;
  if (/1x2|match result|full.?time|match winner|moneyline|\bwinner\b|\bresult\b|to win|home win|away win|\bdraw\b|match odds|\bwin\b/.test(combined)) {
    const outcome = teamOutcome(homeGoals, awayGoals);
    const selIsHome = teamsSimilar(selection, homeTeam), selIsAway = teamsSimilar(selection, awayTeam);
    let wanted: 'home' | 'draw' | 'away' | null = null;
    if (/\b(draw|tie)\b/.test(pick) || pick === 'x') wanted = 'draw';
    else if (pick === '1' || /\bhome\b/.test(pick)) wanted = 'home';
    else if (pick === '2' || /\baway\b/.test(pick)) wanted = 'away';
    else if (selIsHome !== selIsAway) wanted = selIsHome ? 'home' : 'away';
    const fromMarket: 'home' | 'draw' | 'away' | null = /home win/.test(market) ? 'home' : /away win/.test(market) ? 'away' : /\bdraw\b/.test(market) ? 'draw' : null;
    // Contradictory evidence (e.g. market says Home Win but selection is the away side): never guess.
    if (wanted && fromMarket && wanted !== fromMarket) return null;
    const final = wanted || fromMarket;
    if (!final) return null;
    return outcome === final ? 'won' : 'lost';
  }
  return null;
}
function legTeams(leg: any): { home: string; away: string } {
  const home = String(leg?.homeTeam || ''), away = String(leg?.awayTeam || '');
  if (home && away) return { home, away };
  return splitMatchLabel(leg?.match) || { home, away };
}
function matchesTeams(leg: any, result: MatchResultEvidence): boolean {
  const { home, away } = legTeams(leg);
  if (!home || !away) return false;
  return (teamsSimilar(home, result.homeTeam) && teamsSimilar(away, result.awayTeam)) ||
         (teamsSimilar(home, result.awayTeam) && teamsSimilar(away, result.homeTeam));
}
function kickoffCompatible(leg: any, result: MatchResultEvidence, ticket?: any): boolean {
  const actual = result.kickoff ? Date.parse(result.kickoff) : NaN;
  if (leg.kickoffISO && result.kickoff) {
    const expected = Date.parse(leg.kickoffISO);
    return Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(expected - actual) <= 36 * 60 * 60 * 1000;
  }
  // No kickoff on the leg: a result can only belong to the bet if the match was played after
  // the bet was placed (small allowance for in-play bets) and within a week of placement.
  const placed = ticket?.placedAt ? Date.parse(ticket.placedAt) : NaN;
  if (Number.isFinite(placed) && Number.isFinite(actual)) return actual >= placed - 3 * 3600000 && actual <= placed + 7 * 86400000;
  return !result.kickoff || !Number.isFinite(actual) ? true : false;
}
function payoutOf(ticket: any): number {
  const declared = Number(ticket.potentialPayoutZar || 0);
  if (declared > 0) return declared;
  const stake = Number(ticket.stakeZar || 0);
  const odds = Number(ticket.totalOdds) > 1 ? Number(ticket.totalOdds) : (Array.isArray(ticket.legs) ? ticket.legs.reduce((a: number, l: any) => a * (Number(l?.odds) > 1 ? Number(l.odds) : 1), 1) : 1);
  return Number((stake * odds).toFixed(2));
}
export function settleTicketsFromResults(tickets: any[], results: MatchResultEvidence[], now = new Date().toISOString()): SettlementSummary {
  let checkedLegs = 0, settledCount = 0, updatedCount = 0;
  const updatedTickets = (Array.isArray(tickets) ? tickets : []).map((ticket: any) => {
    if (!ticket || ticket.status !== 'pending' || !Array.isArray(ticket.legs)) return ticket;
    let ticketChanged = false;
    const updatedLegs = ticket.legs.map((leg: any) => {
      if (!leg || leg.status !== 'pending') return leg;
      const candidates = results.filter(result => matchesTeams(leg, result) && kickoffCompatible(leg, result, ticket));
      if (candidates.length === 0) return leg;
      // Multiple providers may report the same match. Agreeing final evidence is
      // corroboration, not ambiguity; conflicting scores/statuses must remain pending.
      const evidenceSignature = (result: MatchResultEvidence) => {
        const legHomeIsResultHome = teamsSimilar(legTeams(leg).home, result.homeTeam);
        const homeGoals = legHomeIsResultHome ? result.homeGoals : result.awayGoals;
        const awayGoals = legHomeIsResultHome ? result.awayGoals : result.homeGoals;
        const status = String(result.status || '').toUpperCase().replace(/[\s-]+/g, '_');
        return [homeGoals, awayGoals, status].join('|');
      };
      if (new Set(candidates.map(evidenceSignature)).size !== 1) return leg;
      const result = { ...candidates[0], source: [...new Set(candidates.map(item => item.source))].join(' + ') };
      checkedLegs++;
      if (!isFinalResult(result)) return leg;
      const score = result.homeGoals + '-' + result.awayGoals;
      const outcome = resolveSelectionOutcome(leg, result.homeGoals, result.awayGoals, result.homeTeam, result.awayTeam);
      const nextLeg = { ...leg, score, actualScore: score, matchStatus: String(result.status).toUpperCase(),
        verificationSource: result.source, ...(outcome ? { status: outcome } : {}) };
      if (JSON.stringify(nextLeg) !== JSON.stringify(leg)) ticketChanged = true;
      return nextLeg;
    });
    const losingLeg = updatedLegs.find((leg: any) => leg.status === 'lost' && FINAL_STATUSES.has(String(leg.matchStatus || '').toUpperCase().replace(/[\s-]+/g, '_')));
    const allWon = updatedLegs.length > 0 && updatedLegs.every((leg: any) => leg.status === 'won');
    const nextStatus = losingLeg ? 'lost' : allWon ? 'won' : 'pending';
    const finalTicket = {
      ...ticket, legs: updatedLegs, status: nextStatus,
      ...(nextStatus !== 'pending' ? { settledAt: now, actualPayoutZar: nextStatus === 'won' ? payoutOf(ticket) : 0,
        profitZar: nextStatus === 'won' ? payoutOf(ticket) - Number(ticket.stakeZar || 0) : -Number(ticket.stakeZar || 0) } : {}),
      ...(losingLeg ? { bustedByTeams: Array.from(new Set([...(Array.isArray(ticket.bustedByTeams) ? ticket.bustedByTeams : []),
        String(losingLeg.targetTeam || losingLeg.homeTeam || losingLeg.awayTeam || 'Verified losing selection')])) } : {}),
      ...(ticketChanged ? { notes: [ticket.notes || '', 'Final score checked against ' +
        String(updatedLegs.find((leg: any) => leg.verificationSource)?.verificationSource || 'configured sports-data provider')].filter(Boolean).join(' | ') } : {}),
    };
    if (nextStatus !== 'pending' && nextStatus !== ticket.status) settledCount++;
    if (ticketChanged || nextStatus !== ticket.status) updatedCount++;
    return finalTicket;
  });
  return { tickets: updatedTickets, checkedLegs, settledCount, updatedCount };
}
