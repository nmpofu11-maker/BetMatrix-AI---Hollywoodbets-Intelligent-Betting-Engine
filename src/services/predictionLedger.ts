import fs from 'node:fs';
import path from 'node:path';
import type { HistoricalResult, VerifiedFixture } from '../verified-data/types';
import { canonicalTeamKey, teamsSimilar } from './teamNames';

/* ───────────────────────── types ───────────────────────── */
export type Outcome = 'home' | 'draw' | 'away';
export interface Probs { home: number; draw: number; away: number }
export interface PredictionRecord {
  id: string; fixtureId: string; eventCode?: string; createdAt: string; kickoff: string; league?: string; homeTeam: string; awayTeam: string;
  model: { method: 'market' | 'rating' | 'blend'; probs: Probs; marketProbs?: Probs; ratingProbs: Probs; ratingWeight: number; homeRatedMatches: number; awayRatedMatches: number };
  odds?: Probs; oddsSources?: string[]; pick: Outcome; pickLabel: string; pickProb: number; fairOdds: number; edge?: number; valuePick?: Outcome; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; evidence: string[];
  status: 'pending' | 'settled' | 'unresolved';
  result?: { homeGoals: number; awayGoals: number; outcome: Outcome; settledAt: string; source: string; correct: boolean; brier: number; logLoss: number; unitsOnPick?: number; unitsOnValue?: number; over25: boolean; btts: boolean };
}
interface TeamRating { r: number; n: number; name: string; last: string }
export interface LearningState {
  homeAdvantage: number; drawBase: number; ratingWeight: number; updatedAt: string; matchesLearned: number;
  calibration: { settled: number; marketBrier: number | null; ratingBrier: number | null; blendBrier: number | null; note: string };
}
export interface PredictionStore { version: 1; updatedAt: string; predictions: PredictionRecord[]; ratings: Record<string, TeamRating>; seen: string[]; learning: LearningState }

const DATA_DIR = () => process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = () => path.join(DATA_DIR(), 'predictions.json');
const ELO_START = 1500, SEEN_CAP = 6000;

export const initialLearning = (): LearningState => ({ homeAdvantage: 60, drawBase: 0.28, ratingWeight: 0.3, updatedAt: new Date(0).toISOString(), matchesLearned: 0, calibration: { settled: 0, marketBrier: null, ratingBrier: null, blendBrier: null, note: 'No settled predictions yet.' } });
export const emptyStore = (): PredictionStore => ({ version: 1, updatedAt: new Date(0).toISOString(), predictions: [], ratings: {}, seen: [], learning: initialLearning() });

export function loadPredictions(): PredictionStore {
  try {
    if (!fs.existsSync(FILE())) return emptyStore();
    const p = JSON.parse(fs.readFileSync(FILE(), 'utf8'));
    if (!p || !Array.isArray(p.predictions) || typeof p.ratings !== 'object') return emptyStore();
    return { ...emptyStore(), ...p, learning: { ...initialLearning(), ...(p.learning || {}) } };
  } catch { return emptyStore(); }
}
export function savePredictions(s: PredictionStore): void {
  fs.mkdirSync(DATA_DIR(), { recursive: true });
  const tmp = FILE() + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }), 'utf8'); fs.renameSync(tmp, FILE());
}

/* ───────────────────────── rating model (online Elo with learned home advantage) ───────────────────────── */
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const outcomeOf = (hg: number, ag: number): Outcome => (hg > ag ? 'home' : hg < ag ? 'away' : 'draw');

export function ratingProbs(l: LearningState, rHome: number, rAway: number): Probs {
  const e = 1 / (1 + Math.pow(10, -(rHome + l.homeAdvantage - rAway) / 400));
  const pD = clamp(l.drawBase * (1 - Math.pow(2 * e - 1, 2)), 0.05, 0.4);
  const h = clamp(e - pD / 2, 0.02, 0.95), a = clamp(1 - e - pD / 2, 0.02, 0.95);
  const t = h + a + pD; return { home: h / t, draw: pD / t, away: a / t };
}
export function marketProbs(o?: Partial<Probs>): Probs | undefined {
  if (!o || ![o.home, o.draw, o.away].every(v => typeof v === 'number' && (v as number) > 1)) return undefined;
  const r = [1 / o.home!, 1 / o.draw!, 1 / o.away!]; const t = r[0] + r[1] + r[2];
  return { home: r[0] / t, draw: r[1] / t, away: r[2] / t };
}
const blend = (m: Probs | undefined, r: Probs, w: number): Probs => {
  if (!m) return r; const p = { home: (1 - w) * m.home + w * r.home, draw: (1 - w) * m.draw + w * r.draw, away: (1 - w) * m.away + w * r.away };
  const t = p.home + p.draw + p.away; return { home: p.home / t, draw: p.draw / t, away: p.away / t };
};
const brier = (p: Probs, o: Outcome) => (['home', 'draw', 'away'] as Outcome[]).reduce((s, k) => s + Math.pow(p[k] - (k === o ? 1 : 0), 2), 0);

/** Learn from final scores. Idempotent: a match is only learned once (store.seen). */
export function learnFromResults(store: PredictionStore, results: HistoricalResult[]): { learned: number } {
  const seen = new Set(store.seen); let learned = 0;
  const fresh = results.filter(r => !r.conflict && Number.isInteger(r.homeGoals) && Number.isInteger(r.awayGoals)).sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
  for (const r of fresh) {
    const hk = canonicalTeamKey(r.homeTeam), ak = canonicalTeamKey(r.awayTeam); if (!hk || !ak) continue;
    const key = hk + '|' + ak + '|' + r.kickoff.slice(0, 10); if (seen.has(key)) continue;
    const L = store.learning;
    const H = store.ratings[hk] || (store.ratings[hk] = { r: ELO_START, n: 0, name: r.homeTeam, last: r.kickoff });
    const A = store.ratings[ak] || (store.ratings[ak] = { r: ELO_START, n: 0, name: r.awayTeam, last: r.kickoff });
    const exp = 1 / (1 + Math.pow(10, -(H.r + L.homeAdvantage - A.r) / 400)); const o = outcomeOf(r.homeGoals, r.awayGoals);
    const S = o === 'home' ? 1 : o === 'draw' ? 0.5 : 0; const gd = Math.abs(r.homeGoals - r.awayGoals);
    const G = gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8; const K = (H.n < 10 || A.n < 10 ? 32 : 20) * G;
    H.r += K * (S - exp); A.r -= K * (S - exp); H.n++; A.n++; H.last = A.last = r.kickoff; H.name = r.homeTeam; A.name = r.awayTeam;
    // online updates of the two global parameters
    L.homeAdvantage = clamp(L.homeAdvantage + 3 * (S - exp), 20, 120);
    const pD = clamp(L.drawBase * (1 - Math.pow(2 * exp - 1, 2)), 0.05, 0.4);
    L.drawBase = clamp(L.drawBase + 0.01 * ((o === 'draw' ? 1 : 0) - pD), 0.15, 0.38);
    L.matchesLearned++; seen.add(key); learned++;
  }
  store.seen = [...seen].slice(-SEEN_CAP);
  if (learned) store.learning.updatedAt = new Date().toISOString();
  return { learned };
}

/* ───────────────────────── prediction creation ───────────────────────── */
export function createPredictions(store: PredictionStore, fixtures: VerifiedFixture[], now = new Date()): { created: number; skippedStarted: number; refreshed: number } {
  let created = 0, skippedStarted = 0, refreshed = 0; const L = store.learning;
  for (const f of fixtures) {
    const ko = Date.parse(f.kickoff); if (!Number.isFinite(ko)) continue;
    const existing = store.predictions.find(p => p.fixtureId === f.id || (teamsSimilar(p.homeTeam, f.homeTeam) && teamsSimilar(p.awayTeam, f.awayTeam) && Math.abs(Date.parse(p.kickoff) - ko) < 4 * 3600000));
    if (existing && existing.status !== 'pending') continue;
    if (ko <= now.getTime() + 5 * 60000) { if (!existing) skippedStarted++; continue; } // never predict after (or at) kickoff: avoids leakage
    const hk = canonicalTeamKey(f.homeTeam), ak = canonicalTeamKey(f.awayTeam);
    const H = store.ratings[hk], A = store.ratings[ak];
    const rp = ratingProbs(L, H?.r ?? ELO_START, A?.r ?? ELO_START);
    const odds = [f.markets.home, f.markets.draw, f.markets.away].every(v => typeof v === 'number' && (v as number) > 1) ? { home: f.markets.home!, draw: f.markets.draw!, away: f.markets.away! } : undefined;
    const mp = marketProbs(odds); const nH = H?.n ?? 0, nA = A?.n ?? 0;
    const evidenceFactor = clamp(Math.min(nH, nA) / 10, 0, 1);
    const w = mp ? L.ratingWeight * evidenceFactor : 1; // no odds -> rating only
    const probs = blend(mp, rp, w);
    const order = (['home', 'draw', 'away'] as Outcome[]).sort((a, b) => probs[b] - probs[a]); const pick = order[0];
    const valueEdge = odds ? (['home', 'draw', 'away'] as Outcome[]).map(k => ({ k, e: probs[k] * odds[k] - 1 })).sort((a, b) => b.e - a.e)[0] : undefined;
    const evidence: string[] = [];
    evidence.push(mp ? `Market odds de-vigged from ${(f.provenance.map(p => p.sourceId).join(', '))}.` : 'No 1X2 odds supplied: rating-only estimate (lower trust).');
    evidence.push(`Ratings from ${nH} (home) / ${nA} (away) learned results.`);
    if (Math.min(nH, nA) < 5) evidence.push('Very few learned results for at least one team; treat as weak.');
    const pickProb = probs[pick];
    const confidence: PredictionRecord['confidence'] = Math.min(nH, nA) < 5 && !mp ? 'LOW' : pickProb >= 0.55 ? 'HIGH' : pickProb >= 0.42 ? 'MEDIUM' : 'LOW';
    const label = pick === 'home' ? f.homeTeam : pick === 'away' ? f.awayTeam : 'Draw';
    const rec: PredictionRecord = {
      id: f.id, fixtureId: f.id, eventCode: f.eventCode, createdAt: now.toISOString(), kickoff: f.kickoff, league: f.league, homeTeam: f.homeTeam, awayTeam: f.awayTeam,
      model: { method: !mp ? 'rating' : w > 0 ? 'blend' : 'market', probs, marketProbs: mp, ratingProbs: rp, ratingWeight: w, homeRatedMatches: nH, awayRatedMatches: nA },
      odds, oddsSources: odds ? f.provenance.map(p => p.sourceId) : undefined, pick, pickLabel: label, pickProb, fairOdds: 1 / pickProb,
      edge: odds ? pickProb * odds[pick] - 1 : undefined, valuePick: valueEdge && valueEdge.e > 0.03 ? valueEdge.k : undefined, confidence, evidence, status: 'pending',
    };
    if (existing) { Object.assign(existing, rec, { createdAt: existing.createdAt }); refreshed++; } else { store.predictions.push(rec); created++; }
  }
  return { created, skippedStarted, refreshed };
}

/* ───────────────────────── settlement of predictions ───────────────────────── */
export function settlePredictions(store: PredictionStore, results: HistoricalResult[], now = new Date()): { settled: number; unresolved: number } {
  let settled = 0, unresolved = 0;
  for (const p of store.predictions) {
    if (p.status !== 'pending') continue;
    const ko = Date.parse(p.kickoff);
    const matches = results.filter(r => !r.conflict && teamsSimilar(p.homeTeam, r.homeTeam) && teamsSimilar(p.awayTeam, r.awayTeam) && Math.abs(Date.parse(r.kickoff) - ko) <= 36 * 3600000);
    if (matches.length) {
      const r = matches[0]; const o = outcomeOf(r.homeGoals, r.awayGoals); const pr = p.model.probs;
      p.result = { homeGoals: r.homeGoals, awayGoals: r.awayGoals, outcome: o, settledAt: now.toISOString(), source: [r.source.sourceName, ...(r.corroboratedBy || [])].join(' + '), correct: p.pick === o,
        brier: brier(pr, o), logLoss: -Math.log(Math.max(1e-6, pr[o])), unitsOnPick: p.odds ? (p.pick === o ? p.odds[p.pick] - 1 : -1) : undefined,
        unitsOnValue: p.odds && p.valuePick ? (p.valuePick === o ? p.odds[p.valuePick] - 1 : -1) : undefined, over25: r.homeGoals + r.awayGoals > 2, btts: r.homeGoals > 0 && r.awayGoals > 0 };
      p.status = 'settled'; settled++;
    } else if (now.getTime() > ko + 72 * 3600000) { p.status = 'unresolved'; unresolved++; }
  }
  return { settled, unresolved };
}

/** Re-fit how much to trust ratings vs the market, using only settled predictions. */
export function recalibrate(store: PredictionStore): LearningState {
  const done = store.predictions.filter(p => p.status === 'settled' && p.result);
  const L = store.learning; const n = done.length;
  const avg = (f: (p: PredictionRecord) => number | null) => { const v = done.map(f).filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const withMarket = done.filter(p => p.model.marketProbs);
  const marketB = withMarket.length ? withMarket.reduce((s, p) => s + brier(p.model.marketProbs!, p.result!.outcome), 0) / withMarket.length : null;
  const ratingB = n ? done.reduce((s, p) => s + brier(p.model.ratingProbs, p.result!.outcome), 0) / n : null;
  const blendB = avg(p => p.result!.brier);
  let w = L.ratingWeight;
  if (withMarket.length >= 30) {
    let best = w, bestScore = Infinity;
    for (let c = 0; c <= 10; c++) { const cw = c / 10; const score = withMarket.reduce((s, p) => s + brier(blend(p.model.marketProbs, p.model.ratingProbs, cw), p.result!.outcome), 0) / withMarket.length; if (score < bestScore) { bestScore = score; best = cw; } }
    const shrink = withMarket.length / (withMarket.length + 50); w = clamp(0.3 * (1 - shrink) + best * shrink, 0, 0.9);
  }
  L.ratingWeight = w; L.updatedAt = new Date().toISOString();
  L.calibration = { settled: n, marketBrier: marketB, ratingBrier: ratingB, blendBrier: blendB,
    note: n < 30 ? `Only ${n} settled predictions: ratings are being learned, but accuracy figures are not yet statistically meaningful (need 30+).` : `Rating weight tuned on ${withMarket.length} settled predictions that had market odds.` };
  return L;
}

/* ───────────────────────── statistics & queries ───────────────────────── */
export interface Bucket { n: number; correct: number; accuracy: number | null; brier: number | null; logLoss: number | null; roiPick: number | null; oddsN: number; roiValue: number | null; valueN: number }
function bucket(list: PredictionRecord[]): Bucket {
  const d = list.filter(p => p.status === 'settled' && p.result); const n = d.length; const c = d.filter(p => p.result!.correct).length;
  const u = d.map(p => p.result!.unitsOnPick).filter((x): x is number => x !== undefined); const v = d.map(p => p.result!.unitsOnValue).filter((x): x is number => x !== undefined);
  return { n, correct: c, accuracy: n ? c / n : null, brier: n ? d.reduce((s, p) => s + p.result!.brier, 0) / n : null, logLoss: n ? d.reduce((s, p) => s + p.result!.logLoss, 0) / n : null,
    roiPick: u.length ? u.reduce((a, b) => a + b, 0) / u.length : null, oddsN: u.length, roiValue: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, valueN: v.length };
}
export function predictionStats(store: PredictionStore, now = new Date()) {
  const all = store.predictions; const since = (days: number) => all.filter(p => Date.parse(p.kickoff) >= now.getTime() - days * 86400000);
  const byLeague: Record<string, Bucket> = {}; for (const lg of [...new Set(all.map(p => p.league || 'Unknown'))]) byLeague[lg] = bucket(all.filter(p => (p.league || 'Unknown') === lg));
  const byConf: Record<string, Bucket> = {}; for (const c of ['HIGH', 'MEDIUM', 'LOW']) byConf[c] = bucket(all.filter(p => p.confidence === c));
  const settled = all.filter(p => p.status === 'settled');
  const baselineHome = settled.length ? settled.filter(p => p.result!.outcome === 'home').length / settled.length : null;
  return { total: all.length, pending: all.filter(p => p.status === 'pending').length, settled: settled.length, unresolved: all.filter(p => p.status === 'unresolved').length,
    overall: bucket(all), last7: bucket(since(7)), last30: bucket(since(30)), byLeague, byConfidence: byConf, baselineAlwaysHomeAccuracy: baselineHome,
    meaningful: settled.length >= 30, learning: store.learning, ratedTeams: Object.keys(store.ratings).length };
}
/** Date (YYYY-MM-DD) of an ISO instant in a given IANA time zone. */
export function localDate(iso: string | Date, tz = 'Africa/Johannesburg'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso; return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function predictionsForDate(store: PredictionStore, date: string, tz = 'Africa/Johannesburg'): PredictionRecord[] {
  return store.predictions.filter(p => localDate(p.kickoff, tz) === date).sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
}
