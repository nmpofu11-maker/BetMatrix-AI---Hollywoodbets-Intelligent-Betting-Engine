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
  if (/1x2|match result|full.?time result|match winner|moneyline|\bwinner\b|\bresult\b/.test(market)) {
    const outcome = teamOutcome(homeGoals, awayGoals);
    if (/\b(draw|tie|x)\b/.test(pick) || pick === 'x') return outcome === 'draw' ? 'won' : 'lost';
    if (pick === '1' || /\bhome\b/.test(pick) || normaliseTeamName(selection) === normaliseTeamName(homeTeam)) return outcome === 'home' ? 'won' : 'lost';
    if (pick === '2' || /\baway\b/.test(pick) || normaliseTeamName(selection) === normaliseTeamName(awayTeam)) return outcome === 'away' ? 'won' : 'lost';
  }
  return null;
}
function matchesTeams(leg: any, result: MatchResultEvidence): boolean {
  const home = normaliseTeamName(leg.homeTeam), away = normaliseTeamName(leg.awayTeam);
  const resultHome = normaliseTeamName(result.homeTeam), resultAway = normaliseTeamName(result.awayTeam);
  return Boolean(home && away && ((home === resultHome && away === resultAway) || (home === resultAway && away === resultHome)));
}
function kickoffCompatible(leg: any, result: MatchResultEvidence): boolean {
  if (!leg.kickoffISO || !result.kickoff) return true;
  const expected = Date.parse(leg.kickoffISO), actual = Date.parse(result.kickoff);
  return Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(expected - actual) <= 36 * 60 * 60 * 1000;
}
export function settleTicketsFromResults(tickets: any[], results: MatchResultEvidence[], now = new Date().toISOString()): SettlementSummary {
  let checkedLegs = 0, settledCount = 0, updatedCount = 0;
  const updatedTickets = (Array.isArray(tickets) ? tickets : []).map((ticket: any) => {
    if (!ticket || ticket.status !== 'pending' || !Array.isArray(ticket.legs)) return ticket;
    let ticketChanged = false;
    const updatedLegs = ticket.legs.map((leg: any) => {
      if (!leg || leg.status !== 'pending') return leg;
      const candidates = results.filter(result => matchesTeams(leg, result) && kickoffCompatible(leg, result));
      if (candidates.length !== 1) return leg;
      const result = candidates[0];
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
      ...(nextStatus !== 'pending' ? { settledAt: now, actualPayoutZar: nextStatus === 'won' ? Number(ticket.potentialPayoutZar || 0) : 0,
        profitZar: nextStatus === 'won' ? Number(ticket.potentialPayoutZar || 0) - Number(ticket.stakeZar || 0) : -Number(ticket.stakeZar || 0) } : {}),
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
