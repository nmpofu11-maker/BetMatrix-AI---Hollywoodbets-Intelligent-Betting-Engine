import { MatchObject } from '../types/match';
import { fetchFixturesFromAPI } from './apiService';
import { scrapeMatchData } from './scraper';

export async function getMatchData(matchId: string): Promise<MatchObject> {
    try {
        // 1. Try Primary (SportAPI.ai) / Secondary (TheRundown) via API Service
        const apiData = await fetchFixturesFromAPI();
        if (apiData && apiData.success && apiData.data && apiData.data.length > 0) {
            const found = apiData.data.find((m: any) => m.id === matchId) || apiData.data[0];
            return mapToMatchObject(found, apiData.provider);
        }
    } catch (e) {
        console.warn('[Data Engine] API fetch failed, triggering fallback scraper...', e);
    }
    
    // 2. Fallback Scraper
    const scrapedData = await scrapeMatchData('');
    return mapToMatchObject(scrapedData?.data || {}, 'scraper');
}

function mapToMatchObject(data: any, source: string): MatchObject {
    return {
        id: data?.id || `match-${Date.now()}`,
        homeTeam: data?.homeTeam || 'Home Club',
        awayTeam: data?.awayTeam || 'Away Club',
        date: data?.kickoffISO || data?.date || new Date().toISOString(),
        league: data?.league || 'Premier League',
        source: source as any,
        provider: source as any,
        form: data?.form || { home: ['W', 'D', 'W', 'W', 'D'], away: ['D', 'L', 'W', 'D', 'L'] },
        h2h: data?.h2h || { homeWins: 2, awayWins: 1, draws: 2 },
        isOverwritten: false
    };
}
