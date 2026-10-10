import fetch from 'node-fetch';

export interface SportApiFixture {
  id: string | number;
  home_team: any;
  away_team: any;
  datetime?: string;
  kickoff_time?: string;
  date?: string;
  home_score?: number | null;
  away_score?: number | null;
  status?: string;
  league?: string;
  [key: string]: any;
}

export async function fetchSportApiFixtures(dateStr: string, apiKey: string): Promise<SportApiFixture[]> {
  if (!apiKey) {
    console.warn('[SportAPI.ai] API key missing');
    return [];
  }

  const url = `https://sportapi.ai/api/fixtures/date/${dateStr}`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'BetMatrix-AI-Engine/5.0',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn(`[SportAPI.ai] HTTP error ${res.status} for date ${dateStr}`);
      return [];
    }

    const rawText = await res.text();
    if (!rawText || !rawText.trim()) return [];

    // CRITICAL: Extract JSON substring between first { or [ and last } or ]
    let jsonStr = rawText.trim();
    const firstObj = jsonStr.indexOf('{');
    const firstArr = jsonStr.indexOf('[');
    let startIdx = 0;
    if (firstObj !== -1 && firstArr !== -1) {
      startIdx = Math.min(firstObj, firstArr);
    } else if (firstObj !== -1) {
      startIdx = firstObj;
    } else if (firstArr !== -1) {
      startIdx = firstArr;
    }

    const lastObj = jsonStr.lastIndexOf('}');
    const lastArr = jsonStr.lastIndexOf(']');
    let endIdx = jsonStr.length;
    if (lastObj !== -1 && lastArr !== -1) {
      endIdx = Math.max(lastObj, lastArr) + 1;
    } else if (lastObj !== -1) {
      endIdx = lastObj + 1;
    } else if (lastArr !== -1) {
      endIdx = lastArr + 1;
    }

    if (startIdx < endIdx) {
      jsonStr = jsonStr.substring(startIdx, endIdx);
    }

    const parsed = JSON.parse(jsonStr);
    const fixturesList = Array.isArray(parsed) ? parsed : (parsed.fixtures || parsed.data || parsed.result || []);
    return Array.isArray(fixturesList) ? fixturesList : [];
  } catch (err: any) {
    console.error(`[SportAPI.ai] Fetch error for ${dateStr}:`, err?.message || err);
    return [];
  }
}

export function normalizeSportApiFixture(f: SportApiFixture) {
  const fixtureId = String(f.id || f.fixture_id || `sportapi-${Math.random().toString(36).substring(2, 9)}`);
  
  let kickoffISO = new Date().toISOString();
  const rawDate = f.datetime || f.kickoff_time || f.date;
  if (rawDate) {
    let clean = String(rawDate).trim();
    if (clean.includes(' ') && !clean.includes('T')) {
      clean = clean.replace(' ', 'T') + 'Z';
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      kickoffISO = d.toISOString();
    }
  }

  const getTeamName = (team: any): string => {
    if (!team) return 'Unknown Team';
    if (typeof team === 'string') return team;
    if (typeof team === 'object') {
      return team.name || team.team_name || team.short_name || team.common_name || 'Unknown Team';
    }
    return String(team);
  };

  const homeTeam = getTeamName(f.home_team || f.homeTeam || f.team_home);
  const awayTeam = getTeamName(f.away_team || f.awayTeam || f.team_away);
  const league = getTeamName(f.league || f.competition || 'International Soccer');

  const homeScore = typeof f.home_score === 'number' ? f.home_score : (typeof f.homeGoals === 'number' ? f.homeGoals : null);
  const awayScore = typeof f.away_score === 'number' ? f.away_score : (typeof f.awayGoals === 'number' ? f.awayGoals : null);

  const rawStatus = String(f.status || f.match_status || '').toUpperCase();
  const finishedStatuses = ['FINISHED', 'FT', 'AET', 'PEN', 'FINAL', 'STATUS_FINAL'];
  let isFinished = finishedStatuses.includes(rawStatus);
  if (!isFinished && typeof homeScore === 'number' && typeof awayScore === 'number' && rawStatus !== 'LIVE' && rawStatus !== 'IN_PLAY') {
    // If scores are present and it's not explicitly live, consider finished if kickoff was in the past
    if (new Date(kickoffISO).getTime() < Date.now() - 110 * 60 * 1000) {
      isFinished = true;
    }
  }

  return {
    id: fixtureId,
    apiFootballFixtureId: Number(fixtureId.replace(/\D/g, '')) || Math.floor(Math.random() * 900000) + 100000,
    league,
    homeTeam,
    awayTeam,
    kickoffISO,
    homeOdds: Number(f.home_odds || f.homeOdds || 1.95),
    drawOdds: Number(f.draw_odds || f.drawOdds || 3.30),
    awayOdds: Number(f.away_odds || f.awayOdds || 3.80),
    venue: f.venue || f.stadium || 'Main Stadium',
    liveStatus: isFinished ? 'FT' : (rawStatus || 'Upcoming'),
    liveScore: (homeScore !== null && awayScore !== null) ? `${homeScore}-${awayScore}` : (f.liveScore || '0-0'),
    source: 'SportAPI.ai',
    homeGoals: homeScore,
    awayGoals: awayScore,
    statusShort: isFinished ? 'FT' : 'NS'
  };
}
