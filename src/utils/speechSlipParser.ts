/**
 * Intelligent Speech Recognition Parser & Normalizer for Betting Slips
 * Converts spoken voice input (e.g. "Arsenal versus Chelsea home win 1.85 won,
 * Mamelodi Sundowns vs SuperSport Sundowns win 1.48 won, stake 200 rands")
 * into structured Hollywoodbets betting slip text.
 */

export interface RecognizedSpeechFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  targetTeam?: string;
  market: string;
  odds: number;
  status: 'won' | 'lost' | 'pending';
  rawPhrase: string;
}

export interface SpeechSlipParseResult {
  formattedSlipText: string;
  recognizedFixtures: RecognizedSpeechFixture[];
  detectedStakeZar?: number;
  detectedStatus?: 'won' | 'lost' | 'pending';
  detectedTicketId?: string;
}

// Canonical team mappings for South African PSL, EPL, and European football
const TEAM_ALIASES: Record<string, string> = {
  // South African PSL
  'mamelodi sundowns': 'Mamelodi Sundowns',
  'sundowns': 'Mamelodi Sundowns',
  'masandawana': 'Mamelodi Sundowns',
  'downs': 'Mamelodi Sundowns',
  'orlando pirates': 'Orlando Pirates',
  'pirates': 'Orlando Pirates',
  'bucs': 'Orlando Pirates',
  'sea robbers': 'Orlando Pirates',
  'kaizer chiefs': 'Kaizer Chiefs',
  'chiefs': 'Kaizer Chiefs',
  'amakhosi': 'Kaizer Chiefs',
  'supersport united': 'SuperSport United',
  'supersport': 'SuperSport United',
  'stellenbosch fc': 'Stellenbosch FC',
  'stellenbosch': 'Stellenbosch FC',
  'stellies': 'Stellenbosch FC',
  'cape town city': 'Cape Town City',
  'city fc': 'Cape Town City',
  'amazulu': 'AmaZulu',
  'amazulu fc': 'AmaZulu',
  'golden arrows': 'Golden Arrows',
  'chippa united': 'Chippa United',
  'chippa': 'Chippa United',
  'sekhukhune united': 'Sekhukhune United',
  'sekhukhune': 'Sekhukhune United',
  'polokwane city': 'Polokwane City',
  'polokwane': 'Polokwane City',
  'ts galaxy': 'TS Galaxy',
  'richards bay': 'Richards Bay',
  'moroka swallows': 'Moroka Swallows',
  'swallows': 'Moroka Swallows',
  'cape town spurs': 'Cape Town Spurs',
  'magesi': 'Magesi FC',

  // Premier League & International
  'arsenal': 'Arsenal',
  'gunners': 'Arsenal',
  'chelsea': 'Chelsea',
  'blues': 'Chelsea',
  'manchester united': 'Manchester United',
  'man united': 'Manchester United',
  'man u': 'Manchester United',
  'red devils': 'Manchester United',
  'manchester city': 'Manchester City',
  'man city': 'Manchester City',
  'liverpool': 'Liverpool',
  'reds': 'Liverpool',
  'tottenham': 'Tottenham Hotspur',
  'tottenham hotspur': 'Tottenham Hotspur',
  'spurs': 'Tottenham Hotspur',
  'aston villa': 'Aston Villa',
  'villa': 'Aston Villa',
  'newcastle': 'Newcastle United',
  'newcastle united': 'Newcastle United',
  'west ham': 'West Ham United',
  'west ham united': 'West Ham United',
  'brighton': 'Brighton',
  'bournemouth': 'Bournemouth',
  'wolverhampton': 'Wolverhampton',
  'wolves': 'Wolverhampton',
  'everton': 'Everton',
  'crystal palace': 'Crystal Palace',
  'palace': 'Crystal Palace',
  'fulham': 'Fulham',
  'brentford': 'Brentford',
  'nottingham forest': 'Nottingham Forest',
  'forest': 'Nottingham Forest',
  'leicester': 'Leicester City',
  'leicester city': 'Leicester City',
  'ipswich': 'Ipswich Town',
  'southampton': 'Southampton',
  'real madrid': 'Real Madrid',
  'barcelona': 'Barcelona',
  'barca': 'Barcelona',
  'bayern munich': 'Bayern Munich',
  'bayern': 'Bayern Munich',
  'paris saint-germain': 'PSG',
  'psg': 'PSG',
  'inter milan': 'Inter Milan',
  'ac milan': 'AC Milan',
  'juventus': 'Juventus',
};

// Spoken numbers to digits
const NUMBER_WORDS: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'ten': '10', 'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50',
  'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
  'hundred': '100', 'thousand': '1000'
};

/**
 * Normalizes numbers spoken phonetically (e.g. "one point four five" -> "1.45")
 */
export function normalizeSpokenNumbers(text: string): string {
  let cleaned = text;

  // "one point four five" -> "1.45"
  cleaned = cleaned.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine)\s+point\s+(zero|one|two|three|four|five|six|seven|eight|nine)(?:\s+(zero|one|two|three|four|five|six|seven|eight|nine))?\b/gi,
    (_, d1, d2, d3) => {
      const num1 = NUMBER_WORDS[d1.toLowerCase()] || d1;
      const num2 = NUMBER_WORDS[d2.toLowerCase()] || d2;
      const num3 = d3 ? (NUMBER_WORDS[d3.toLowerCase()] || d3) : '';
      return `${num1}.${num2}${num3}`;
    }
  );

  // "1 point 45" -> "1.45"
  cleaned = cleaned.replace(/\b(\d+)\s+point\s+(\d+)\b/gi, '$1.$2');

  // "fifty rands" / "two hundred rands"
  cleaned = cleaned.replace(/\b(fifty|hundred|two hundred|five hundred|one hundred)\s+(?:rands|rand|zar)\b/gi, (_, w) => {
    const val = w.toLowerCase().includes('five hundred') ? '500' :
                w.toLowerCase().includes('two hundred') ? '200' :
                w.toLowerCase().includes('one hundred') ? '100' :
                w.toLowerCase().includes('fifty') ? '50' : '100';
    return `R${val}`;
  });

  // "r 200" or "rand 200" -> "R200"
  cleaned = cleaned.replace(/\b(?:rands?|rand|zar)\s*(\d+)\b/gi, 'R$1');
  cleaned = cleaned.replace(/\b(\d+)\s*(?:rands?|rand|zar)\b/gi, 'R$1');

  return cleaned;
}

/**
 * Normalizes speech dictation and extracts betting fixtures & metadata.
 */
export function parseSpeechToBetSlip(speechTranscript: string): SpeechSlipParseResult {
  const normalized = normalizeSpokenNumbers(speechTranscript.trim());
  
  // Extract stake if spoken (e.g. "stake R200" or "stake 150")
  let detectedStakeZar: number | undefined;
  const stakeMatch = normalized.match(/(?:stake|amount|bet)[:\s]*R?(\d+(?:\.\d{2})?)/i) || normalized.match(/R(\d+)/i);
  if (stakeMatch) {
    detectedStakeZar = parseFloat(stakeMatch[1]);
  }

  // Extract ticket status if spoken
  let detectedStatus: 'won' | 'lost' | 'pending' | undefined;
  const lowerAll = normalized.toLowerCase();
  if (lowerAll.includes('pending') || lowerAll.includes('open slip') || lowerAll.includes('active bet')) {
    detectedStatus = 'pending';
  } else if (lowerAll.includes('won') && !lowerAll.includes('lost')) {
    detectedStatus = 'won';
  } else if (lowerAll.includes('lost')) {
    detectedStatus = 'lost';
  }

  // Split speech into potential sentences or leg clauses by commas, periods, semicolons, "next leg", "and then", or "leg"
  const rawSegments = normalized
    .split(/(?:\.|\n|;|\bnext(?:\s+leg)?\b|\bleg\s+\d+[:\.]?|\band\s+then\b)/i)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  const recognizedFixtures: RecognizedSpeechFixture[] = [];
  const teamKeys = Object.keys(TEAM_ALIASES).sort((a, b) => b.length - a.length);

  rawSegments.forEach((segment, idx) => {
    const lowerSeg = segment.toLowerCase();

    // Check for "vs", "versus", "verse", "against", "v"
    let homeTeam = '';
    let awayTeam = '';
    let market = 'Match 1X2';
    let targetTeam: string | undefined;
    let odds = 1.80;
    let status: 'won' | 'lost' | 'pending' = detectedStatus || 'pending';

    // Find teams mentioned in segment
    const foundTeams: { key: string; name: string; index: number }[] = [];
    teamKeys.forEach(tKey => {
      const pos = lowerSeg.indexOf(tKey);
      if (pos !== -1) {
        // Check word boundary
        const before = pos === 0 ? ' ' : lowerSeg[pos - 1];
        const after = pos + tKey.length >= lowerSeg.length ? ' ' : lowerSeg[pos + tKey.length];
        if (/[^a-z0-9]/.test(before) && /[^a-z0-9]/.test(after)) {
          // Avoid duplicate sub-team matches (e.g. "manchester united" vs "united")
          const alreadyMatched = foundTeams.some(f => Math.abs(f.index - pos) < 3);
          if (!alreadyMatched) {
            foundTeams.push({ key: tKey, name: TEAM_ALIASES[tKey], index: pos });
          }
        }
      }
    });

    // Sort by order of appearance
    foundTeams.sort((a, b) => a.index - b.index);

    if (foundTeams.length >= 2) {
      homeTeam = foundTeams[0].name;
      awayTeam = foundTeams[1].name;
    } else if (foundTeams.length === 1) {
      // Check if there is "vs" or "against"
      const matchSplit = lowerSeg.split(/\s+(?:vs|versus|verse|against|v)\s+/i);
      if (matchSplit.length >= 2) {
        const p1 = matchSplit[0].trim();
        const p2 = matchSplit[1].split(/[\s,-]/)[0]?.trim();
        homeTeam = foundTeams[0].name;
        awayTeam = p2.charAt(0).toUpperCase() + p2.slice(1);
      } else {
        homeTeam = foundTeams[0].name;
        awayTeam = 'Opponent';
      }
    }

    if (homeTeam && awayTeam) {
      // Extract Odds
      const oddsMatch = segment.match(/(?:odds|odd|@)[:\s]*(\d+\.\d{1,2})/i) || segment.match(/\b(\d+\.\d{2})\b/);
      if (oddsMatch) {
        odds = parseFloat(oddsMatch[1]);
      }

      // Extract Market & Target Team
      if (lowerSeg.includes('home win') || lowerSeg.includes(`${homeTeam.toLowerCase()} win`)) {
        market = 'Match 1X2 - Home Win';
        targetTeam = homeTeam;
      } else if (lowerSeg.includes('away win') || lowerSeg.includes(`${awayTeam.toLowerCase()} win`)) {
        market = 'Match 1X2 - Away Win';
        targetTeam = awayTeam;
      } else if (lowerSeg.includes('draw') || lowerSeg.includes('full time draw')) {
        market = 'Match 1X2 - Draw';
      } else if (lowerSeg.includes('both teams') || lowerSeg.includes('btts') || lowerSeg.includes('goal goal') || lowerSeg.includes('gg')) {
        market = 'Both Teams To Score (GG)';
      } else if (lowerSeg.includes('no goal') || lowerSeg.includes('ng')) {
        market = 'Both Teams To Score (NG)';
      } else if (lowerSeg.includes('double chance') || lowerSeg.includes('win or draw') || lowerSeg.includes('1x')) {
        market = `Double Chance (1X - ${homeTeam} or Draw)`;
        targetTeam = homeTeam;
      } else if (lowerSeg.includes('over 2.5') || lowerSeg.includes('over two point five')) {
        market = 'Total Goals - Over 2.5';
      } else if (lowerSeg.includes('under 2.5') || lowerSeg.includes('under two point five')) {
        market = 'Total Goals - Under 2.5';
      } else {
        // Default target team to first mentioned or home
        market = `${homeTeam} Win`;
        targetTeam = homeTeam;
      }

      // Check leg result
      if (lowerSeg.includes('lost') || lowerSeg.includes('lose') || lowerSeg.includes('loss') || lowerSeg.includes('failed') || lowerSeg.includes('busted')) {
        status = 'lost';
      } else if (lowerSeg.includes('won') || lowerSeg.includes('win') || lowerSeg.includes('success') || lowerSeg.includes('passed')) {
        status = 'won';
      } else if (lowerSeg.includes('pending') || lowerSeg.includes('upcoming') || lowerSeg.includes('not played')) {
        status = 'pending';
      }

      recognizedFixtures.push({
        id: `voice-leg-${Date.now()}-${idx}`,
        homeTeam,
        awayTeam,
        targetTeam,
        market,
        odds,
        status,
        rawPhrase: segment,
      });
    }
  });

  // Build structured formatted slip text ready for AI processing
  const ticketId = `HB-VOICE-${Date.now().toString().slice(-6)}`;
  const stake = detectedStakeZar || 100;
  
  let formattedSlipText = `Hollywoodbets Voice Ticket: ${ticketId}\n`;
  formattedSlipText += `Stake: R${stake.toFixed(2)}\n`;
  if (detectedStatus) {
    formattedSlipText += `Status: ${detectedStatus.toUpperCase()}\n`;
  }
  formattedSlipText += `Type: ${recognizedFixtures.length > 1 ? `${recognizedFixtures.length}-Leg Multibet` : 'Single Bet'}\n\nLegs:\n`;

  if (recognizedFixtures.length > 0) {
    recognizedFixtures.forEach((f, idx) => {
      formattedSlipText += `${idx + 1}. ${f.homeTeam} vs ${f.awayTeam} - ${f.market} (${f.odds.toFixed(2)}) - RESULT: ${f.status.toUpperCase()}\n`;
    });
  } else {
    // If no distinct fixtures could be segregated, pass the cleaned normalized text
    formattedSlipText += normalized;
  }

  return {
    formattedSlipText,
    recognizedFixtures,
    detectedStakeZar,
    detectedStatus,
    detectedTicketId: ticketId,
  };
}
