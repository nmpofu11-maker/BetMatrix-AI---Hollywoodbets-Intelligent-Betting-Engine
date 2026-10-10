import fetch from 'node-fetch';

export const THE_RUNDOWN_SOCCER_SPORTS = [
  { id: 11, name: 'English Premier League' },
  { id: 17, name: 'Spanish La Liga' },
  { id: 16, name: 'Italian Serie A' },
  { id: 18, name: 'German Bundesliga' },
  { id: 19, name: 'French Ligue 1' },
  { id: 10, name: 'MLS' },
  { id: 12, name: 'UEFA Champions League' },
  { id: 13, name: 'UEFA Europa League' },
];

export async function fetchTheRundownEvents(dateStr: string, apiKey: string): Promise<any[]> {
  if (!apiKey) {
    console.warn('[TheRundown.io] API key missing');
    return [];
  }

  const allEvents: any[] = [];
  
  for (const sport of THE_RUNDOWN_SOCCER_SPORTS) {
    const url = `https://therundown.io/api/v2/sports/${sport.id}/events/${dateStr}?include=scores+all_periods`;
    try {
      const res = await fetch(url, {
        headers: {
          'X-TheRundown-Key': apiKey,
          'User-Agent': 'BetMatrix-AI-Engine/5.0',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json() as any;
      const events = data?.events || [];
      if (Array.isArray(events)) {
        for (const ev of events) {
          allEvents.push({
            ...ev,
            leagueName: sport.name
          });
        }
      }
    } catch (err: any) {
      console.warn(`[TheRundown.io] Error fetching sport ${sport.id} for ${dateStr}:`, err?.message || err);
    }
  }

  return allEvents;
}

export function normalizeTheRundownEvent(ev: any) {
  const eventId = String(ev.event_id || ev.id || `rundown-${Math.random().toString(36).substring(2, 9)}`);
  
  let kickoffISO = new Date().toISOString();
  if (ev.event_date) {
    const d = new Date(ev.event_date);
    if (!isNaN(d.getTime())) {
      kickoffISO = d.toISOString();
    }
  }

  const teams = ev.teams || [];
  const homeTeamObj = teams.find((t: any) => t.is_home) || teams[0] || { name: 'Home Team' };
  const awayTeamObj = teams.find((t: any) => !t.is_home) || teams[1] || { name: 'Away Team' };

  const homeTeam = homeTeamObj.name || homeTeamObj.team_name || 'Home Team';
  const awayTeam = awayTeamObj.name || awayTeamObj.team_name || 'Away Team';
  const league = ev.leagueName || 'International Soccer';

  const scores = ev.score || {};
  const homeScore = typeof scores.score_home === 'number' ? scores.score_home : (typeof scores.home_score === 'number' ? scores.home_score : null);
  const awayScore = typeof scores.score_away === 'number' ? scores.score_away : (typeof scores.away_score === 'number' ? scores.away_score : null);

  const statusStr = String(ev.score?.event_status || ev.status || '').toUpperCase();
  const isFinished = statusStr === 'STATUS_FINAL' || statusStr === 'FINAL' || statusStr === 'FT' || statusStr === 'FINISHED';

  return {
    id: eventId,
    apiFootballFixtureId: Number(eventId.replace(/\D/g, '')) || Math.floor(Math.random() * 900000) + 100000,
    league,
    homeTeam,
    awayTeam,
    kickoffISO,
    homeOdds: 1.90,
    drawOdds: 3.40,
    awayOdds: 3.70,
    venue: ev.venue?.name || 'Main Stadium',
    liveStatus: isFinished ? 'FT' : (statusStr || 'Upcoming'),
    liveScore: (homeScore !== null && awayScore !== null) ? `${homeScore}-${awayScore}` : '0-0',
    source: 'TheRundown.io',
    homeGoals: homeScore,
    awayGoals: awayScore,
    statusShort: isFinished ? 'FT' : 'NS'
  };
}
