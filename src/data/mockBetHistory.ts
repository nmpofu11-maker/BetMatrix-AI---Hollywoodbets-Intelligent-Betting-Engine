import { BetTicket, FixtureSchedule, SuperLearningIntelligenceState, TodaysFeaturedSlip } from '../types/betting';

/**
 * Production starts empty. No historical tickets, fixtures, odds, bankroll, or AI conclusions
 * are fabricated. Users must import their own verified records or live source data.
 */
export const INITIAL_BET_HISTORY: BetTicket[] = [];

export const INITIAL_INTELLIGENCE_STATE: SuperLearningIntelligenceState = {
  sync_timestamp: new Date(0).toISOString(),
  model_engine: 'untrained',
  meta_improvement_notes: 'No verified historical betting data has been supplied yet. Learning metrics are unavailable until real settled tickets are imported.',
  team_intelligence_matrices: {},
};

export const DEFAULT_TODAYS_FEATURED_SLIPS: TodaysFeaturedSlip[] = [];

/** Only live/imported fixtures may enter the active slate. */
export const UPCOMING_FIXTURES: FixtureSchedule[] = [];
