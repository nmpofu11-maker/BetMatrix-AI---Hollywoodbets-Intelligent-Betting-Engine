export interface LearnedCoefficients {
  home_advantage_multiplier: number;
  form_momentum_weight: number;
  volatility_index: number;
  fatigue_penalty_modifier: number;
}

export interface TeamIntelligenceMatrixEntry {
  sample_size_matches: number;
  learned_coefficients: LearnedCoefficients;
}

export interface SuperLearningIntelligenceState {
  sync_timestamp: string;
  model_engine: string;
  meta_improvement_notes: string;
  team_intelligence_matrices: Record<string, TeamIntelligenceMatrixEntry>;
}

export interface BetLeg {
  id: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  targetTeam?: string; // Team bet is placed on or affected by
  market: string;
  odds: number;
  status: 'won' | 'lost' | 'pending' | 'void';
  faultContribution?: boolean; // True if this leg lost and busted the multibet
  league?: string;
  score?: string;
}

export interface BetTicket {
  id: string; // e.g. "HB-2409-918231"
  placedAt: string;
  type: 'single' | 'multibet' | 'system';
  legs: BetLeg[];
  totalOdds: number;
  stakeZar: number;
  potentialPayoutZar: number;
  actualPayoutZar: number;
  status: 'won' | 'lost' | 'pending';
  profitZar: number;
  platform: string; // "Hollywoodbets"
  bustedByTeams?: string[]; // Teams whose legs failed
  notes?: string;
}

export interface TrapTeamAnalysis {
  teamName: string;
  totalLossZar: number;
  bustCount: number;
  totalMatchesBet: number;
  lossRatePercent: number;
  volatilityIndex: number;
  primaryTrapFactor: string; // e.g., "Away Underperformance", "Vig Overpriced", "Late Goal Concessions"
  affordabilityStatus: 'STRICT_AVOID' | 'HIGH_EXPOSURE_CAP' | 'DOUBLE_CHANCE_ONLY';
  maxAllowedStakeZar: number;
  lastBustTicketId?: string;
}

export interface PositiveMomentumTeamAnalysis {
  teamName: string;
  totalProfitZar: number;
  winCount: number;
  totalMatchesBet: number;
  winRatePercent: number;
  formWeight: number;
  bankerRating: 'ELITE_ANCHOR' | 'SOLID_VALUE' | 'HOME_SPECIALIST';
  suggestedRole: string; // e.g., "Primary Multibet Anchor", "Single Heavy Stake"
}

export interface RiskManagementAlert {
  id: string;
  type: 'trap_team_detected' | 'chasing_losses' | 'bankroll_threshold' | 'excessive_legs' | 'volatility_warning';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionRecommendation: string;
  timestamp: string;
}

export interface FixtureSchedule {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  over25Odds: number;
  bttsOdds: number;
  category?: 'Major' | 'South Africa (Pro & Amateur)' | 'UK Non-League & Semi-Pro' | 'European Minor Leagues' | 'Reserves & Youth' | 'Amateur & Minor' | string;
  eventCode?: string;
  dayGroup?: string;
  kickoffTime?: string;
  liveStatus?: string;
  liveScore?: string;
  score?: string;
  venue?: string;
  verifiedHollywoodbets?: boolean;
  isBookmakerProtected?: boolean;
}

export interface SelectionMistake {
  category: 'TRAP_TEAM_SELECTION' | 'MARKET_OVERCONFIDENCE' | 'EXCESSIVE_ACCUMULATOR_VARIANCE' | 'AWAY_FAVORITE_BIAS' | 'UNDERVALUED_DRAW_RISK' | 'POOR_ODDS_RISK_RATIO';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  title: string;
  legMatch?: string;
  targetTeam?: string;
  marketPicked?: string;
  explanation: string;
  learnedDataReference: string;
  betterAlternative: string;
}

export interface TicketMistakeAnalysis {
  ticketId: string;
  ticketStatus: 'won' | 'lost' | 'pending';
  executiveSummary: string;
  mistakesIdentified: SelectionMistake[];
  strategicRulesLearned: string[];
  recommendedMitigationOrCorrection: string;
}

export interface AIDiscussionTurn {
  speaker: 'sentinel_risk' | 'apex_value' | 'arbiter_synthesis';
  speakerName: string;
  speakerRole: string;
  stance: string;
  message: string;
  timestamp: string;
  keyPoints: string[];
}

export interface AIDualConsensusProposal {
  sessionTitle: string;
  coreDebateSummary: string;
  finalResolution: string;
  consensusRules: string[];
  recommendedQuarantineTeams: string[];
  recommendedAnchorTeams: string[];
  proposedMatrixUpdates: Record<string, {
    form_momentum_weight: number;
    volatility_index: number;
    home_advantage_multiplier: number;
    fatigue_penalty_modifier: number;
    reasoning: string;
  }>;
  optimalStakingGuideline: {
    maxSingleStakeZar: number;
    maxAccumulatorStakeZar: number;
    recommendedKellyFraction: number;
    maxLegsPerAccumulator: number;
  };
}

export interface AIDiscussionSession {
  sessionId: string;
  timestamp: string;
  topic: string;
  turns: AIDiscussionTurn[];
  consensus: AIDualConsensusProposal;
}

export interface FeaturedBetLeg {
  id: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  odds: number;
  reasoning: string;
  confidenceScore: number; // 1-100
  isAnchor?: boolean;
  kickoffTime?: string;
  eventCode?: string;
}

export interface TodaysFeaturedSlip {
  id: string;
  title: string;
  strategyCategory: 'SAFE_BANKER' | 'VALUE_TRIAD' | 'DEFENSIVE_DOUBLE_CHANCE' | 'GOLD_ANCHOR_MULTI' | 'HIGH_EV_SINGLE' | 'COMMUNITY_CURATED' | 'CUSTOM_MANUAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'CALCULATED_HIGH';
  confidenceScore: number; // 0-100
  totalOdds: number;
  recommendedStakeZar: number;
  estimatedReturnZar: number;
  aiRationale: string;
  trapCheckStatus: 'PASSED_ZERO_TRAPS' | 'TACTICAL_DOUBLE_CHANCE_APPLIED' | 'MANUAL_AUDITED';
  legs: FeaturedBetLeg[];
  curatedBy: 'AI_SUPER_LEARNING_ENGINE' | 'MANUAL_PUNTER' | 'DUAL_CONSENSUS';
  dateAdded: string;
}

export interface PendingLegBestSelection {
  legId: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  targetTeam?: string;
  league?: string;
  originalMarket: string;
  originalOdds: number;
  bestSuggestedMarket: string;
  bestSuggestedOdds: number;
  recommendationType: 'KEEP_ORIGINAL' | 'RECOMMEND_DOUBLE_CHANCE' | 'RECOMMEND_GOALS_MARKET' | 'SWAP_TARGET' | 'AVOID_OR_CASHOUT';
  recommendationBadge: string;
  confidenceScore: number; // 0-100
  expectedValue: string; // e.g., "+18.5% EV"
  reasoning: string;
  volatilityIndex: number;
}

export interface PendingSlipBestSelectionsReport {
  ticketId: string;
  stakeZar: number;
  potentialPayoutZar: number;
  originalTotalOdds: number;
  suggestedTotalOdds: number;
  winProbabilityBoostPercent: number;
  overallStrategyVerdict: 'HOLD_AND_LET_RIDE' | 'APPLY_TACTICAL_DOUBLE_CHANCE' | 'EXECUTE_EARLY_CASHOUT' | 'REBUILD_OPTIMIZED_ACCUMULATOR';
  strategicAdviceSummary: string;
  legBestSelections: PendingLegBestSelection[];
}

