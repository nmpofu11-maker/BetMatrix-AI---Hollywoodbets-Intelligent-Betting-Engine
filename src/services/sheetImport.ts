import zlib from 'node:zlib';
import * as cheerio from 'cheerio';
import type { HistoricalResult, VerifiedFixture } from '../verified-data/types';
import { makeProvenance } from '../verified-data/core';
import { canonicalTeamKey } from './teamNames';

/* ───────────────────────── delimited text ───────────────────────── */

export function parseDelimited(input: string): string[][] {
  let text = input.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts: Array<[string, number]> = [[',', 0], [';', 0], ['\t', 0], ['|', 0]];
  for (const ch of firstLine) { const c = counts.find(x => x[0] === ch); if (c) c[1]++; }
  const delim = counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ',';
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(c => c.trim() !== '')) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}

export function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));
  return rows.slice(1).map(r => { const o: Record<string, string> = {}; header.forEach((h, i) => { if (h && o[h] === undefined) o[h] = (r[i] ?? '').trim(); }); return o; });
}

/* ───────────────────────── minimal XLSX reader ───────────────────────── */

function unzip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a valid .xlsx (zip) file.');
  const count = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + compSize);
    if (method === 0) files.set(name, Buffer.from(raw)); else if (method === 8) files.set(name, zlib.inflateRawSync(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function colIndex(ref: string): number { let n = 0; for (const ch of ref.replace(/[0-9]/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }

export function parseXlsx(buf: Buffer): string[][] {
  const files = unzip(buf);
  const shared: string[] = [];
  const ss = files.get('xl/sharedStrings.xml');
  if (ss) { const $ = cheerio.load(ss.toString('utf8'), { xmlMode: true }); $('si').each((_, si) => { shared.push($(si).find('t').map((__, t) => $(t).text()).get().join('')); }); }
  const sheetName = [...files.keys()].filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0];
  if (!sheetName) throw new Error('No worksheet found in .xlsx file.');
  const $ = cheerio.load(files.get(sheetName)!.toString('utf8'), { xmlMode: true });
  const rows: string[][] = [];
  $('sheetData > row').each((_, r) => {
    const out: string[] = [];
    $(r).find('> c').each((__, c) => {
      const idx = colIndex($(c).attr('r') || 'A1'); const t = $(c).attr('t'); const v = $(c).find('> v').text();
      let val = '';
      if (t === 's') val = shared[Number(v)] ?? ''; else if (t === 'inlineStr') val = $(c).find('t').text(); else val = v;
      out[idx] = val;
    });
    for (let i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = '';
    if (out.some(x => String(x).trim() !== '')) rows.push(out);
  });
  return rows;
}

/* ───────────────────────── dates & time zones ───────────────────────── */

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function tzOffsetMs(utcMs: number, tz: string): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const parts = Object.fromEntries(f.formatToParts(new Date(utcMs)).map(p => [p.type, p.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - utcMs;
}
export function zonedToUtcIso(y: number, mo: number, d: number, h: number, mi: number, tz: string): string {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - tzOffsetMs(guess, tz);
  utc = guess - tzOffsetMs(utc, tz);
  return new Date(utc).toISOString();
}

export function parseDateParts(raw: string): { y: number; mo: number; d: number; h?: number; mi?: number } | null {
  const s = String(raw ?? '').trim(); if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/))) return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : undefined, mi: m[5] ? +m[5] : undefined };
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/))) {
    let y = +m[3]; if (y < 100) y += 2000; return { y, mo: +m[2], d: +m[1], h: m[4] ? +m[4] : undefined, mi: m[5] ? +m[5] : undefined };
  }
  const dm = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  if (dm) { const mo = MONTHS[dm[2].slice(0, 3).toLowerCase()]; if (mo) return { y: +dm[3], mo, d: +dm[1] }; }
  if (/^\d{5}(\.\d+)?$/.test(s)) { // Excel serial
    const serial = Number(s); const ms = Math.round((serial - 25569) * 86400000); const dt = new Date(ms);
    const hasTime = serial % 1 > 0.0005;
    return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: hasTime ? dt.getUTCHours() : undefined, mi: hasTime ? dt.getUTCMinutes() : undefined };
  }
  return null;
}
export function parseTimeParts(raw: string): { h: number; mi: number } | null {
  const s = String(raw ?? '').trim(); if (!s) return null;
  if (/^0?\.\d+$|^\d\.\d+$/.test(s) && Number(s) < 1) { const mins = Math.round(Number(s) * 1440); return { h: Math.floor(mins / 60), mi: mins % 60 }; }
  const m = s.match(/(\d{1,2})[:h.](\d{2})\s*(am|pm)?/i); if (!m) return null;
  let h = +m[1]; const mi = +m[2]; const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
  return h < 24 && mi < 60 ? { h, mi } : null;
}

/* ───────────────────────── row mappers ───────────────────────── */

const num = (v: unknown): number | undefined => { const n = Number(String(v ?? '').replace(',', '.').trim()); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : undefined; };
const isNumeric = (v: string) => v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.')));
const pickText = (row: Record<string, string>, keys: string[]) => { for (const k of keys) { const v = row[k]; if (v && !isNumeric(v)) return v.trim(); } return ''; };
const pickRaw = (row: Record<string, string>, keys: string[]) => { for (const k of keys) { const v = row[k]; if (v !== undefined && v !== '') return v.trim(); } return ''; };
const pickOdds = (row: Record<string, string>, keys: string[]) => { for (const k of keys) { const n = num(row[k]); if (n !== undefined && n > 1) return n; } return undefined; };

const K = {
  date: ['date', 'match date', 'kickoff date', 'kick off date', 'day', 'datum'],
  time: ['time', 'kickoff', 'kick off', 'ko', 'kickoff time', 'kick off time', 'start time', 'ko time'],
  datetime: ['datetime', 'kickoff datetime', 'start', 'starting_at', 'commence_time', 'utcdate', 'date time'],
  league: ['league', 'competition', 'comp', 'div', 'division', 'tournament', 'country/league'],
  home: ['home team', 'hometeam', 'home_team', 'home', 'team 1', 'team1', 'team a'],
  away: ['away team', 'awayteam', 'away_team', 'away', 'team 2', 'team2', 'team b'],
  match: ['match', 'fixture', 'event', 'game', 'event name', 'description'],
  code: ['event code', 'eventcode', 'code', 'event id', 'match id', 'id'],
  oh: ['home odds', 'homeodds', 'odds home', 'home win', '1', 'h', 'b365h', 'avgh', 'psh', 'maxh', 'whh', 'bwh', 'home'],
  od: ['draw odds', 'drawodds', 'odds draw', 'draw', 'x', 'd', 'b365d', 'avgd', 'psd', 'maxd', 'whd', 'bwd'],
  oa: ['away odds', 'awayodds', 'odds away', 'away win', '2', 'a', 'b365a', 'avga', 'psa', 'maxa', 'wha', 'bwa', 'away'],
  over: ['over 2.5', 'over2.5', 'over25', 'over 2,5', 'o2.5', 'b365>2.5', 'avg>2.5', 'p>2.5', 'max>2.5', 'over_2_5', 'over odds'],
  btts: ['btts', 'btts yes', 'gg', 'both teams to score', 'btts_yes', 'bttsyes'],
  hg: ['fthg', 'hg', 'home goals', 'homegoals', 'home score', 'home_score', 'score home', 'hs', 'ft home'],
  ag: ['ftag', 'ag', 'away goals', 'awaygoals', 'away score', 'away_score', 'score away', 'as', 'ft away'],
  score: ['score', 'ft', 'full time', 'result score', 'final score', 'ft score'],
};

export interface SheetOptions { sourceId: string; sourceName: string; tz?: string; defaultLeague?: string; maxAgeSeconds?: number; }

function kickoffFrom(row: Record<string, string>, tz: string): string | null {
  const dtRaw = pickRaw(row, K.datetime);
  let date = parseDateParts(dtRaw || pickRaw(row, K.date));
  if (!date) return null;
  let time = parseTimeParts(pickRaw(row, K.time)) || (date.h !== undefined ? { h: date.h, mi: date.mi ?? 0 } : null);
  if (!time) time = { h: 12, mi: 0 };
  // ISO strings with an explicit zone are trusted as-is
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(dtRaw)) { const t = Date.parse(dtRaw); if (Number.isFinite(t)) return new Date(t).toISOString(); }
  return zonedToUtcIso(date.y, date.mo, date.d, time.h, time.mi, tz);
}

function teamsFrom(row: Record<string, string>): { home: string; away: string } | null {
  let home = pickText(row, K.home), away = pickText(row, K.away);
  if (!home || !away) {
    const label = pickRaw(row, K.match); const m = label.split(/\s+(?:vs\.?|v|-|–|—)\s+/i);
    if (m.length === 2) { home = home || m[0].trim(); away = away || m[1].trim(); }
  }
  return home && away ? { home, away } : null;
}

export function fixtureId(sourceId: string, kickoffIso: string, home: string, away: string): string {
  return sourceId + ':' + kickoffIso.slice(0, 10).replace(/-/g, '') + ':' + canonicalTeamKey(home).replace(/ /g, '-') + '__' + canonicalTeamKey(away).replace(/ /g, '-');
}

export function mapFixtureRows(rows: Array<Record<string, string>>, opts: SheetOptions): { fixtures: VerifiedFixture[]; skipped: number } {
  const tz = opts.tz || 'Africa/Johannesburg';
  const provenance = makeProvenance({ sourceId: opts.sourceId, sourceName: opts.sourceName, sourceKind: 'user_import', evidenceStatus: 'verified', maxAgeSeconds: opts.maxAgeSeconds ?? 36 * 3600, notes: 'Loaded from a sheet/CSV/free feed; odds exactly as supplied.' });
  const fixtures: VerifiedFixture[] = []; let skipped = 0;
  for (const row of rows) {
    const teams = teamsFrom(row); const kickoff = kickoffFrom(row, tz);
    if (!teams || !kickoff) { skipped++; continue; }
    // a row that already carries a final score is a result, not a fixture
    if (num(row['fthg']) !== undefined && num(row['ftag']) !== undefined && !pickOdds(row, K.oh)) { skipped++; continue; }
    const code = pickRaw(row, K.code);
    const markets = { home: pickOdds(row, K.oh), draw: pickOdds(row, K.od), away: pickOdds(row, K.oa), over25: pickOdds(row, K.over), bttsYes: pickOdds(row, K.btts) };
    fixtures.push({
      id: fixtureId(opts.sourceId, kickoff, teams.home, teams.away), eventCode: code && !/^\d{1,3}$/.test(code) ? code : undefined, kickoff, homeTeam: teams.home, awayTeam: teams.away,
      league: pickRaw(row, K.league) || opts.defaultLeague || undefined, markets, provenance: [provenance],
    });
  }
  return { fixtures, skipped };
}

export function mapResultRows(rows: Array<Record<string, string>>, opts: SheetOptions): { results: HistoricalResult[]; skipped: number } {
  const tz = opts.tz || 'Africa/Johannesburg';
  const provenance = makeProvenance({ sourceId: opts.sourceId, sourceName: opts.sourceName, sourceKind: 'official_result', evidenceStatus: 'verified', notes: 'Final score loaded from a sheet/CSV/free feed.' });
  const results: HistoricalResult[] = []; let skipped = 0;
  for (const row of rows) {
    const teams = teamsFrom(row); const kickoff = kickoffFrom(row, tz);
    let hg = num(pickRaw(row, K.hg)), ag = num(pickRaw(row, K.ag));
    if ((hg === undefined || ag === undefined)) {
      const m = pickRaw(row, K.score).match(/(\d+)\s*[-:–]\s*(\d+)/); if (m) { hg = +m[1]; ag = +m[2]; }
    }
    if (!teams || !kickoff || hg === undefined || ag === undefined || !Number.isInteger(hg) || !Number.isInteger(ag) || hg < 0 || ag < 0) { skipped++; continue; }
    results.push({ id: fixtureId(opts.sourceId, kickoff, teams.home, teams.away), kickoff, homeTeam: teams.home, awayTeam: teams.away, homeGoals: hg, awayGoals: ag, competition: pickRaw(row, K.league) || opts.defaultLeague || undefined, source: provenance });
  }
  return { results, skipped };
}

/** Decode an upload (base64 or plain text) into row objects. */
export function sheetToObjects(input: { filename?: string; contentBase64?: string; text?: string }): Array<Record<string, string>> {
  const name = String(input.filename || '').toLowerCase();
  if (input.contentBase64) {
    const buf = Buffer.from(input.contentBase64, 'base64');
    if (name.endsWith('.xlsx') || (buf.length > 3 && buf[0] === 0x50 && buf[1] === 0x4b)) return rowsToObjects(parseXlsx(buf));
    if (name.endsWith('.xls')) throw new Error('Legacy .xls is not supported. In Excel choose File → Save As → CSV (or .xlsx) and upload that.');
    return rowsToObjects(parseDelimited(buf.toString('utf8')));
  }
  return rowsToObjects(parseDelimited(String(input.text || '')));
}
