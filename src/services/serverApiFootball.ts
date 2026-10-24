import fetch from 'node-fetch';

export async function fetchApiFootballOdds(fixtureId: string, apiKey: string): Promise<{ home?: number; draw?: number; away?: number } | undefined> {
  if (!apiKey) return undefined;

  const url = `https://v3.football.api-sports.io/odds?fixture=${fixtureId}`;
  try {
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn(`[API-Football] HTTP error ${res.status} for fixture ${fixtureId}`);
      return undefined;
    }

    const data = await res.json() as any;
    if (!data.response || (data.response as any[]).length === 0) return undefined;

    // Use a reliable bookmaker if available (e.g., Pinnacle, Bet365)
    // For now, take the first one that has odds, if it's reputable.
    const reputableBookmakers = ['Pinnacle', 'Bet365', 'William Hill'];
    
    for (const bookmakerName of reputableBookmakers) {
      const bookmaker = (data.response[0] as any).bookmakers.find((b: any) => b.name === bookmakerName);
      if (bookmaker) {
        const matchWinner = bookmaker.bets.find((bet: any) => bet.id === 1); // 1 is Match Winner
        if (matchWinner && matchWinner.values) {
          const home = matchWinner.values.find((v: any) => v.value === 'Home')?.odd;
          const draw = matchWinner.values.find((v: any) => v.value === 'Draw')?.odd;
          const away = matchWinner.values.find((v: any) => v.value === 'Away')?.odd;
          
          if (home && draw && away) {
            return {
              home: Number(home),
              draw: Number(draw),
              away: Number(away)
            };
          }
        }
      }
    }
    
    return undefined;
  } catch (err: any) {
    console.error(`[API-Football] Error fetching odds for ${fixtureId}:`, err?.message || err);
    return undefined;
  }
}
