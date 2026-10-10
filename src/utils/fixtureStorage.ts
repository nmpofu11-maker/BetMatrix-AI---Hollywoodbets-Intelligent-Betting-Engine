import { FixtureSchedule } from '../types/betting';

export interface ParsedBookmakerFixture extends FixtureSchedule {
  impliedProbHome: number; // e.g. 54 (54%)
  impliedProbDraw: number;
  impliedProbAway: number;
  bookmakerMarginPct: number; // Overround % (e.g. 5.8%)
  fairProbHome: number; // Normalized true probability
  fairProbDraw: number;
  fairProbAway: number;
  verifiedHollywoodbets?: boolean;
  isBookmakerProtected?: boolean;
}

/**
 * Known competition and league suffixes to strip from raw team strings
 */
export const KNOWN_COMPETITION_SUFFIXES: string[] = [
  'Chinese Super League',
  'DSTV Premiership',
  'Betway Premiership',
  'Premier Soccer League',
  'South African Premiership',
  'Motsepe Foundation Championship',
  'UEFA Champions League',
  'UEFA Europa League',
  'UEFA Conference League',
  'UEFA Nations League',
  'English Premier League',
  'Premier League',
  'EFL Championship',
  'EFL League One',
  'EFL League Two',
  'FA Cup',
  'Carabao Cup',
  'EFL Cup',
  'La Liga',
  'La Liga 2',
  'Copa del Rey',
  'Serie A',
  'Serie B',
  'Coppa Italia',
  'Bundesliga',
  '2. Bundesliga',
  'DFB-Pokal',
  'Ligue 1',
  'Ligue 2',
  'Coupe de France',
  'Eredivisie',
  'Primeira Liga',
  'Liga Portugal',
  'Scottish Premiership',
  'Scottish Championship',
  'Saudi Pro League',
  'Major League Soccer',
  'MLS',
  'Brasileirao',
  'Argentine Primera Division',
  'CAF Champions League',
  'CAF Confederation Cup',
  'CAF Super Cup',
  'Nedbank Cup',
  'MTN 8',
  'Carling Knockout',
  'Allsvenskan',
  'Superettan',
  'Eliteserien',
  'Super Lig',
  'Belgian Pro League',
  'A-League',
  'J-League',
  'K-League',
  'Indian Super League',
];

/**
 * Canonical Club Directory for consistent normalization and deduplication
 */
export const CANONICAL_CLUB_DIRECTORY: Record<string, string> = {
  'mamelodi sundowns': 'Mamelodi Sundowns',
  'sundowns': 'Mamelodi Sundowns',
  'orlando pirates': 'Orlando Pirates',
  'pirates': 'Orlando Pirates',
  'kaizer chiefs': 'Kaizer Chiefs',
  'chiefs': 'Kaizer Chiefs',
  'stellenbosch': 'Stellenbosch FC',
  'stellenbosch fc': 'Stellenbosch FC',
  'sekhukhune united': 'Sekhukhune United',
  'sekhukhune': 'Sekhukhune United',
  'supersport united': 'SuperSport United',
  'supersport': 'SuperSport United',
  'cape town city': 'Cape Town City',
  'ct city': 'Cape Town City',
  'ts galaxy': 'TS Galaxy',
  'golden arrows': 'Golden Arrows',
  'lamontville golden arrows': 'Golden Arrows',
  'richards bay': 'Richards Bay FC',
  'richards bay fc': 'Richards Bay FC',
  'amazulu': 'AmaZulu FC',
  'amazulu fc': 'AmaZulu FC',
  'polokwane city': 'Polokwane City',
  'chippa united': 'Chippa United',
  'royal am': 'Royal AM',
  'magesi': 'Magesi FC',
  'magesi fc': 'Magesi FC',
  'beijing guoan': 'Beijing Guoan',
  'shanghai port': 'Shanghai Port',
  'shanghai shenhua': 'Shanghai Shenhua',
  'shandong taishan': 'Shandong Taishan',
  'chengdu rongcheng': 'Chengdu Rongcheng',
  'arsenal': 'Arsenal',
  'chelsea': 'Chelsea',
  'liverpool': 'Liverpool',
  'man city': 'Manchester City',
  'manchester city': 'Manchester City',
  'man united': 'Manchester United',
  'man utd': 'Manchester United',
  'manchester united': 'Manchester United',
  'tottenham': 'Tottenham Hotspur',
  'tottenham hotspur': 'Tottenham Hotspur',
  'spurs': 'Tottenham Hotspur',
  'aston villa': 'Aston Villa',
  'newcastle': 'Newcastle United',
  'newcastle united': 'Newcastle United',
  'brighton': 'Brighton & Hove Albion',
  'brighton and hove albion': 'Brighton & Hove Albion',
  'west ham': 'West Ham United',
  'west ham united': 'West Ham United',
  'real madrid': 'Real Madrid',
  'barcelona': 'Barcelona',
  'atletico madrid': 'Atletico Madrid',
  'bayern munich': 'Bayern Munich',
  'borussia dortmund': 'Borussia Dortmund',
  'paris saint germain': 'Paris Saint-Germain',
  'psg': 'Paris Saint-Germain',
  'inter milan': 'Inter Milan',
  'ac milan': 'AC Milan',
  'juventus': 'Juventus',
};

/**
 * Robustly strips competition/league suffixes from team names
 * e.g. "Beijing Guoan Chinese Super League" -> { cleanTeam: "Beijing Guoan", extractedCompetition: "Chinese Super League" }
 */
export function extractCompetitionAndCleanTeam(
  rawTeam: string,
  currentContextLeague?: string
): { cleanTeam: string; extractedCompetition: string } {
  if (!rawTeam || typeof rawTeam !== 'string') {
    return { cleanTeam: '', extractedCompetition: currentContextLeague || 'General League' };
  }

  // 1. Strip event codes, timestamps, timezones, odds, and numbers
  let text = rawTeam
    .replace(/(?:HWB|EVT|Event|Code|#)[-:\s]?\d{3,6}\b/gi, '')
    .replace(/\b(?:Event|HWB|EVT|Code):?\b/gi, '')
    .replace(/\b[0-2]?\d:[0-5]\d\b/g, '')
    .replace(/\b(?:SAST|CAT|UTC|GMT|BST|EET|CET)\b/gi, '')
    .replace(/\b(?:\d+\.\d{1,2}|\d+\/\d+|\d{1,2}-\d{1,3})\b/g, '')
    .replace(/\b\d{3,6}\b/g, '')
    .trim();

  let extractedCompetition = currentContextLeague || '';

  // 2. Check against known competition list (case-insensitive substring/suffix search)
  for (const comp of KNOWN_COMPETITION_SUFFIXES) {
    const compRegex = new RegExp(`\\b${comp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (compRegex.test(text)) {
      extractedCompetition = comp;
      text = text.replace(compRegex, '').trim();
      break;
    }
  }

  // 3. Strip tournament/youth annotations e.g. (W), (U21), (Res), - Football, etc.
  text = text
    .replace(/\s*-\s*football\b/gi, '')
    .replace(/\s*\((?:w|women|u21|u23|u19|res|reserves)\)/gi, '')
    .replace(/[^a-zA-Z0-9\s&'.-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 4. Match against canonical dictionary for clean casing and standard naming
  const lookupKey = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  if (CANONICAL_CLUB_DIRECTORY[lookupKey]) {
    text = CANONICAL_CLUB_DIRECTORY[lookupKey];
  }

  return {
    cleanTeam: text,
    extractedCompetition: extractedCompetition || 'Hollywoodbets Verified League',
  };
}

/**
 * Canonical team normalization for composite deduplication keys
 */
export function normalizeTeam(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const lower = name.toLowerCase().trim();
  const stripped = lower.replace(/[^a-z0-9 ]/g, '').trim();
  
  if (CANONICAL_CLUB_DIRECTORY[stripped]) {
    return CANONICAL_CLUB_DIRECTORY[stripped].toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  return stripped
    .replace(/\b(fc|afc|cf|sc|united|city|town|wanderers|rovers|hotspur|athletic)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Composite deduplication key: `${normalize(homeTeam)}_vs_${normalize(awayTeam)}_${kickoffDate}`
 */
export function getCompositeFixtureKey(fix: {
  homeTeam: string;
  awayTeam: string;
  date?: string;
  kickoffTime?: string;
}): string {
  const home = normalizeTeam(fix.homeTeam);
  const away = normalizeTeam(fix.awayTeam);
  const rawDate = fix.date || fix.kickoffTime || '';
  // Extract YYYY-MM-DD if present, otherwise extract date phrase or fallback to dynamic today ISO
  const dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
  const dateKey = dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 10);
  return `${home}_vs_${away}_${dateKey}`;
}

/**
 * Dynamic rolling date calculations
 */
export function getDynamicDateWindow() {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const rolling48hStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tomorrowKey = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    now,
    todayKey,
    rolling48hStart,
    tomorrowKey,
  };
}

/**
 * Parses fractional odds like "7/4", "11/10", "1/2", "5/2" to decimal odds
 */
export function parseFractionalOrDecimalOdds(oddsStr: string): number {
  if (!oddsStr) return 1.85;
  const clean = oddsStr.trim();
  
  // 1. Slash fractional format e.g. "5/2"
  if (clean.includes('/')) {
    const parts = clean.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den > 0) {
      return Number(((num / den) + 1).toFixed(2));
    }
  }

  // 2. Hollywoodbets South African dash fractional format e.g. "33-10", "42-100", "17-4", "5-10"
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den > 0) {
        return Number(((num / den) + 1).toFixed(2));
      }
    }
  }

  // 3. Standard decimal odds e.g. "1.85"
  const dec = parseFloat(clean);
  return isNaN(dec) || dec <= 1 ? 1.85 : Number(dec.toFixed(2));
}

/**
 * Computes implied probabilities and removes bookmaker overround (vig)
 */
export function computeMathematicalProbabilities(homeOdds: number, drawOdds: number, awayOdds: number) {
  const hOdds = Math.max(1.01, homeOdds || 1.85);
  const dOdds = Math.max(1.01, drawOdds || 3.10);
  const aOdds = Math.max(1.01, awayOdds || 4.20);

  const impH = 1 / hOdds;
  const impD = 1 / dOdds;
  const impA = 1 / aOdds;
  const totalImplied = impH + impD + impA;
  const marginPct = Number(((totalImplied - 1) * 100).toFixed(1));

  // Fair true probability distribution without vig
  const fairH = Number(((impH / totalImplied) * 100).toFixed(1));
  const fairD = Number(((impD / totalImplied) * 100).toFixed(1));
  const fairA = Number(((impA / totalImplied) * 100).toFixed(1));

  return {
    impliedProbHome: Number((impH * 100).toFixed(1)),
    impliedProbDraw: Number((impD * 100).toFixed(1)),
    impliedProbAway: Number((impA * 100).toFixed(1)),
    bookmakerMarginPct: Math.max(0, marginPct),
    fairProbHome: fairH,
    fairProbDraw: fairD,
    fairProbAway: fairA,
  };
}

/**
 * Raw text bookmaker regex parser engine with competition stripping
 */
export function parseRawBookmakerText(rawText: string): ParsedBookmakerFixture[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: ParsedBookmakerFixture[] = [];
  const { todayKey } = getDynamicDateWindow();

  // Pattern 1: Match line with "vs", "v", or "-" with team names
  const matchSeparatorRegex = /\b(vs?\.?|v|-)\b/i;
  // Pattern 2: Decimal odds (e.g. 1.85, 2.10) or fractional odds (e.g. 5/2, 10/11) or SA Hollywoodbets dash odds (e.g. 42-100, 33-10, 17-4, 5-10)
  const oddsRegex = /\b(?:\d+\.\d{1,2}|\d+\/\d+|\d{1,2}-\d{1,3})\b/g;
  // Pattern 3: Event codes (e.g. HWB-4001, Event: 4921, #12093, 4001)
  const eventCodeRegex = /\b(?:HWB|EVT|Event|#)?[-:\s]?(\d{4,6})\b/i;
  // Pattern 4: Kickoff time (e.g. 15:30, 20:45)
  const timeRegex = /\b([0-2]?\d:[0-5]\d)\b/;

  let currentContextLeague = 'Hollywoodbets Verified League';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect league headers
    for (const comp of KNOWN_COMPETITION_SUFFIXES) {
      if (line.toLowerCase().includes(comp.toLowerCase())) {
        currentContextLeague = comp;
        break;
      }
    }

    if (matchSeparatorRegex.test(line)) {
      const parts = line.split(matchSeparatorRegex);
      if (parts.length >= 3) {
        // Strip out any trailing numbers or odds from the team name parts
        const rawHome = parts[0].replace(oddsRegex, '').replace(/Event\s*\d+/gi, '').replace(/[0-2]?\d:[0-5]\d/g, '').trim();
        const rawAway = parts[2].replace(oddsRegex, '').replace(/Event\s*\d+/gi, '').replace(/[0-2]?\d:[0-5]\d/g, '').trim();

        const homeCleaned = extractCompetitionAndCleanTeam(rawHome, currentContextLeague);
        const awayCleaned = extractCompetitionAndCleanTeam(rawAway, homeCleaned.extractedCompetition || currentContextLeague);

        const homeTeam = homeCleaned.cleanTeam;
        const awayTeam = awayCleaned.cleanTeam;
        const finalCompetition = awayCleaned.extractedCompetition || homeCleaned.extractedCompetition || currentContextLeague;

        if (homeTeam.length >= 2 && awayTeam.length >= 2) {
          // Look for odds in current line or next line
          const combinedSearchText = `${line} ${lines[i + 1] || ''}`;
          const oddsMatches = combinedSearchText.match(oddsRegex) || [];
          if (oddsMatches.length < 5) continue;
          const homeOdds = parseFractionalOrDecimalOdds(oddsMatches[0]!);
          const drawOdds = parseFractionalOrDecimalOdds(oddsMatches[1]!);
          const awayOdds = parseFractionalOrDecimalOdds(oddsMatches[2]!);
          const over25Odds = parseFractionalOrDecimalOdds(oddsMatches[3]!);
          const bttsOdds = parseFractionalOrDecimalOdds(oddsMatches[4]!);

          const eventCodeMatch = combinedSearchText.match(eventCodeRegex);
          const eventCode = eventCodeMatch ? `HWB-${eventCodeMatch[1]}` : `HWB-${4000 + results.length + 1}`;

          const timeMatch = combinedSearchText.match(timeRegex);
          const kickoff = timeMatch ? `${timeMatch[1]} SAST` : '15:30 SAST';

          const probs = computeMathematicalProbabilities(homeOdds, drawOdds, awayOdds);

          results.push({
            id: `bookmaker-ingest-${Date.now()}-${results.length + 1}`,
            eventCode,
            homeTeam,
            awayTeam,
            league: finalCompetition,
            category: finalCompetition.toLowerCase().includes('premiership') || finalCompetition.toLowerCase().includes('south africa')
              ? 'South Africa (Pro & Amateur)'
              : 'Major',
            date: `Today, ${kickoff}`,
            kickoffTime: `${todayKey}T${kickoff.slice(0, 5)}:00+02:00`,
            homeOdds,
            drawOdds,
            awayOdds,
            over25Odds,
            bttsOdds,
            verifiedHollywoodbets: true,
            isBookmakerProtected: true,
            ...probs,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Hardened Ingestion Protection:
 * Preserves regional, amateur, and bookmaker-protected slates from being overwritten.
 */
export function mergeFixturesWithPrecedence(
  existingFixtures: FixtureSchedule[],
  incomingFixtures: FixtureSchedule[]
): FixtureSchedule[] {
  const mergedMap = new Map<string, FixtureSchedule>();

  // 1. Insert existing fixtures (preserving bookmaker-protected slates)
  for (const fix of existingFixtures) {
    const key = getCompositeFixtureKey(fix);
    mergedMap.set(key, fix);
  }

  // 2. Merge incoming fixtures. If existing fixture is bookmaker protected, do not overwrite protected metadata
  for (const inc of incomingFixtures) {
    const key = getCompositeFixtureKey(inc);
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      if (existing.isBookmakerProtected && !inc.isBookmakerProtected) {
        // Automated feed cannot overwrite user's verified bookmaker match
        mergedMap.set(key, {
          ...inc,
          ...existing,
          score: inc.score || existing.score,
          liveStatus: inc.liveStatus || existing.liveStatus,
        });
      } else {
        mergedMap.set(key, {
          ...existing,
          ...inc,
          isBookmakerProtected: existing.isBookmakerProtected || inc.isBookmakerProtected,
        });
      }
    } else {
      mergedMap.set(key, inc);
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Asynchronously persists the fixture slate directly to the server filesystem data/fixtures-manifest.json
 */
export async function persistSlateToServer(
  fixtures: FixtureSchedule[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const res = await fetch('/api/fixtures/ingest-slate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fixtures,
        source: 'client_active_slate_sync',
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, count: fixtures.length, error: errData.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, count: data.count || fixtures.length };
  } catch (err: any) {
    console.error('[Slate Persistence] Failed to reach server disk endpoint:', err);
    return { success: false, count: fixtures.length, error: err?.message || 'Network error' };
  }
}

/**
 * Fetches the durable server-persisted fixture manifest from data/fixtures-manifest.json
 */
export async function fetchServerSlate(): Promise<FixtureSchedule[] | null> {
  try {
    const res = await fetch('/api/fixtures/persisted');
    if (!res.ok) return null;
    const data = await res.json();
    if (data && Array.isArray(data.fixtures)) {
      return data.fixtures;
    }
  } catch (e) {
    console.warn('[Slate Persistence] Could not fetch server slate:', e);
  }
  return null;
}

/**
 * Purges all fixtures from server disk and memory caches
 */
export async function purgeServerSlate(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/fixtures/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Slate Purge] Error purging slate:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Parses uploaded PDF fixture files by calling the backend server multimodal endpoint /api/parse-fixture-pdf
 */
export async function parsePdfFixtureSlate(
  pdfBase64: string,
  pdfText?: string
): Promise<{ success: boolean; fixtures: ParsedBookmakerFixture[]; count: number; error?: string }> {
  try {
    const res = await fetch('/api/parse-fixture-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64, pdfText }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, fixtures: [], count: 0, error: errData.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      fixtures: (data.fixtures || []).filter((f: any) =>
        Number.isFinite(f?.homeOdds) && Number.isFinite(f?.drawOdds) && Number.isFinite(f?.awayOdds) &&
        Number.isFinite(f?.over25Odds) && Number.isFinite(f?.bttsOdds)
      ),
      count: (data.fixtures || []).filter((f: any) =>
        Number.isFinite(f?.homeOdds) && Number.isFinite(f?.drawOdds) && Number.isFinite(f?.awayOdds) &&
        Number.isFinite(f?.over25Odds) && Number.isFinite(f?.bttsOdds)
      ).length,
    };
  } catch (err: any) {
    console.error('[PDF Fixture Parser] Error calling /api/parse-fixture-pdf:', err);
    return { success: false, fixtures: [], count: 0, error: err?.message || 'Failed to process PDF' };
  }
}

/**
 * Deletes an individual fixture by ID from server disk
 */
export async function deleteFixtureFromServer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/fixtures/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Fixture Delete] Error deleting fixture:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}
