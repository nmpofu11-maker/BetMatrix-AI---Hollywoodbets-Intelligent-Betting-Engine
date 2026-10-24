/**
 * Team-name matching shared by settlement, prediction settlement and importers.
 * Bookmaker names ("Man Utd", "Lamontville Golden Arrows") rarely equal data-provider
 * names ("Manchester United", "Golden Arrows"); exact-equality matching leaves tickets
 * pending forever. This keeps matching strict (both teams must match) but tolerant.
 */
const STOP_TOKENS = new Set(['fc', 'afc', 'sc', 'cf', 'ac', 'as', 'ssc', 'fk', 'sk', 'bk', 'if', 'cd', 'ud', 'sv', 'vfl', 'vfb', 'fsv', 'rb', 'football', 'club', 'soccer', 'the', 'de', 'of', 'and']);
const GENERIC_TOKENS = new Set(['united', 'utd', 'city', 'town', 'rovers', 'athletic', 'real', 'sporting', 'st', 'new', 'north', 'south', 'east', 'west', 'county', 'albion', 'wanderers', 'hotspur', 'inter']);

// alias (normalised) -> canonical (normalised)
const ALIASES: Record<string, string> = {
  'man utd': 'manchester united', 'man united': 'manchester united', 'manchester utd': 'manchester united',
  'man city': 'manchester city', 'spurs': 'tottenham', 'tottenham hotspur': 'tottenham',
  'wolves': 'wolverhampton wanderers', 'wolverhampton': 'wolverhampton wanderers',
  'newcastle utd': 'newcastle united', 'newcastle': 'newcastle united',
  'nottm forest': 'nottingham forest', 'nott m forest': 'nottingham forest', 'nott forest': 'nottingham forest',
  'west ham utd': 'west ham united', 'west ham': 'west ham united', 'sheff utd': 'sheffield united', 'sheff wed': 'sheffield wednesday',
  'leeds utd': 'leeds united', 'leeds': 'leeds united', 'brighton and hove albion': 'brighton', 'brighton hove albion': 'brighton',
  'leicester city': 'leicester', 'norwich city': 'norwich', 'bournemouth': 'afc bournemouth',
  'bayern munich': 'bayern', 'bayern munchen': 'bayern', 'fc bayern': 'bayern', 'dortmund': 'borussia dortmund', 'bvb': 'borussia dortmund',
  'leverkusen': 'bayer leverkusen', 'gladbach': 'borussia monchengladbach', 'monchengladbach': 'borussia monchengladbach',
  'psg': 'paris saint germain', 'paris sg': 'paris saint germain', 'paris saint-germain': 'paris saint germain',
  'inter milan': 'inter', 'internazionale': 'inter', 'ac milan': 'milan', 'atletico madrid': 'atletico', 'atl madrid': 'atletico',
  'real betis': 'betis', 'athletic bilbao': 'athletic club', 'real sociedad': 'sociedad',
  // South Africa (PSL / Betway Premiership)
  'sundowns': 'mamelodi sundowns', 'masandawana': 'mamelodi sundowns', 'chiefs': 'kaizer chiefs', 'pirates': 'orlando pirates',
  'golden arrows': 'lamontville golden arrows', 'arrows': 'lamontville golden arrows', 'supersport': 'supersport united',
  'sekhukhune': 'sekhukhune united', 'galaxy': 'ts galaxy', 'stellenbosch': 'stellenbosch', 'cape town city': 'cape town city',
  'amazulu': 'amazulu', 'royal am': 'siwelele', 'siwelele': 'siwelele', 'richards bay': 'richards bay', 'chippa': 'chippa united',
  'polokwane': 'polokwane city', 'magesi': 'magesi', 'orbit college': 'orbit college', 'marumo gallants': 'marumo gallants',
};

export function plainTeamName(value: unknown): string {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/['’`.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function tokens(plain: string): string[] {
  return plain.split(' ').filter(t => t && !STOP_TOKENS.has(t));
}

export function canonicalTeamKey(value: unknown): string {
  const plain = plainTeamName(value);
  const direct = ALIASES[plain] || ALIASES[tokens(plain).join(' ')];
  return tokens(direct || plain).join(' ');
}

function bigrams(s: string): Map<string, number> {
  const out = new Map<string, number>(); const t = s.replace(/ /g, '');
  for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); }
  return out;
}
export function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0; if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b); let inter = 0, total = 0;
  for (const [, n] of A) total += n; for (const [, n] of B) total += n;
  for (const [g, n] of A) inter += Math.min(n, B.get(g) || 0);
  return total ? (2 * inter) / total : 0;
}

/** True when two names very probably refer to the same club. */
export function teamsSimilar(a: unknown, b: unknown): boolean {
  const ka = canonicalTeamKey(a), kb = canonicalTeamKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const ta = tokens(ka), tb = tokens(kb);
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  // every token of the shorter name appears in the longer one, and at least one is distinctive
  if (small.length && small.every(t => big.includes(t)) && small.some(t => !GENERIC_TOKENS.has(t) && t.length >= 4)) return true;
  return ka.length >= 6 && kb.length >= 6 && diceSimilarity(ka, kb) >= 0.88;
}

/** Split "Home vs Away" style strings. */
export function splitMatchLabel(label: unknown): { home: string; away: string } | null {
  const m = String(label ?? '').split(/\s+(?:vs\.?|v|-|–|—)\s+/i);
  return m.length === 2 && m[0].trim() && m[1].trim() ? { home: m[0].trim(), away: m[1].trim() } : null;
}
