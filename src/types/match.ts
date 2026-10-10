export interface MatchObject {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // ISO string
  league: string;
  source: 'sportapi_ai' | 'therundown' | 'api' | 'scraper';
  provider?: string;
  form: {
    home: string[]; // e.g., ['W', 'W', 'L', 'D', 'W']
    away: string[];
  };
  h2h: {
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  predictedScore?: {
    home: number;
    away: number;
  };
  isOverwritten: boolean; // For manual override
}
