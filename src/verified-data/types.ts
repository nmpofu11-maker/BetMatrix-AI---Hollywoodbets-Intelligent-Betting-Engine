export type SourceKind = 'bookmaker' | 'sports_api' | 'user_import' | 'official_result';
export type EvidenceStatus = 'verified' | 'partial' | 'unverified' | 'rejected';

export interface Provenance {
  sourceId: string;
  sourceName: string;
  sourceKind: SourceKind;
  sourceUrl?: string;
  retrievedAt: string;
  sourceVersion?: string;
  evidenceStatus: EvidenceStatus;
  rawHash?: string;
  notes?: string;
}

export interface VerifiedFixture {
  id: string;
  eventCode?: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  markets: {
    home?: number;
    draw?: number;
    away?: number;
    over25?: number;
    bttsYes?: number;
    bttsNo?: number;
  };
  provenance: Provenance[];
}

export interface HistoricalResult {
  id: string;
  fixtureId?: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  competition?: string;
  source: Provenance;
}

export interface VerifiedTicketLeg {
  match: string;
  homeTeam?: string;
  awayTeam?: string;
  market: string;
  selection: string;
  odds: number;
  result?: 'won' | 'lost' | 'void' | 'pending';
}

export interface VerifiedTicket {
  id: string;
  ticketNumber?: string;
  placedAt?: string;
  settledAt?: string;
  stakeZar: number;
  payoutZar?: number;
  status: 'won' | 'lost' | 'void' | 'pending';
  platform: string;
  legs: VerifiedTicketLeg[];
  provenance: Provenance;
  verification: {
    method: 'artifact' | 'api' | 'ledger';
    verifiedAt: string;
    contentHash: string;
  };
}

export interface AdapterContext { now?: string; timeoutMs?: number; }

export interface SourceAdapter {
  id: string;
  name: string;
  kind: SourceKind;
  isConfigured(): boolean;
  fetchFixtures(context?: AdapterContext): Promise<VerifiedFixture[]>;
  fetchResults?(from: string, to: string, context?: AdapterContext): Promise<HistoricalResult[]>;
}

export interface EvidencePrediction {
  fixtureId: string;
  market: '1X2';
  probabilities: { home: number | null; draw: number | null; away: number | null };
  fairOdds: { home: number | null; draw: number | null; away: number | null };
  risk: { score: number | null; level: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN'; reasons: string[] };
  evidence: { sourceCount: number; historicalMatchCount: number; oddsAvailable: boolean; method: string };
}
