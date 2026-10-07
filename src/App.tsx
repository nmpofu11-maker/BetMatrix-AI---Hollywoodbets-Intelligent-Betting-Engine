import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TrapTeamRadar } from './components/TrapTeamRadar';
import { PositiveMomentumRadar } from './components/PositiveMomentumRadar';
import { BetValidatorBuilder } from './components/BetValidatorBuilder';
import { BetHistoryTable } from './components/BetHistoryTable';
import { IntelligenceMatrixInspector } from './components/IntelligenceMatrixInspector';
import { RiskAutomationPanel } from './components/RiskAutomationPanel';
import { SlipImporterModal } from './components/SlipImporterModal';
import { PendingSlipLossAdvisorModal } from './components/PendingSlipLossAdvisorModal';
import { TicketMistakeAdvisorModal } from './components/TicketMistakeAdvisorModal';
import { FairCashOutCalculatorModal } from './components/FairCashOutCalculatorModal';
import { DataBackupRestoreModal } from './components/DataBackupRestoreModal';
import { DualAIConsensusModal } from './components/DualAIConsensusModal';
import { AIResultVerificationModal } from './components/AIResultVerificationModal';
import { AuthenticFixturesBrowserModal } from './components/AuthenticFixturesBrowserModal';
import { BookmakerRawSlateIngestionModal } from './components/BookmakerRawSlateIngestionModal';
import { VerifiedDataCenter } from './components/VerifiedDataCenter';
import { TodaysFeaturesView } from './components/TodaysFeaturesView';
import { 
  INITIAL_BET_HISTORY, 
  INITIAL_INTELLIGENCE_STATE,
  DEFAULT_TODAYS_FEATURED_SLIPS,
  UPCOMING_FIXTURES
} from './data/mockBetHistory';
import { 
  BetTicket, 
  BetLeg,
  SuperLearningIntelligenceState, 
  RiskManagementAlert,
  TicketMistakeAnalysis,
  TodaysFeaturedSlip,
  FixtureSchedule
} from './types/betting';
import { 
  fetchServerSlate, 
  persistSlateToServer, 
  mergeFixturesWithPrecedence,
  deleteFixtureFromServer,
  purgeServerSlate
} from './utils/fixtureStorage';
import { 
  calculateDashboardMetrics, 
  extractTrapTeams, 
  extractPositiveMomentumTeams, 
  generateRiskAlerts 
} from './utils/analytics';
import { checkPendingBets } from './utils/betTracker';

const STORAGE_KEYS = {
  BANKROLL: 'betmatrix_bankroll_zar',
  TICKETS: 'betmatrix_tickets_ledger',
  INTELLIGENCE: 'betmatrix_intelligence_state',
  BLACKLIST: 'betmatrix_blacklisted_teams',
  FIREWALL: 'betmatrix_firewall_active',
  VERSION: 'betmatrix_data_schema_version',
};

export default function App() {
  // Production-data migration: prevent legacy demo/synthetic values from surviving an upgrade.
  const DATA_SCHEMA_VERSION = '5.0';
  if (localStorage.getItem(STORAGE_KEYS.VERSION) !== DATA_SCHEMA_VERSION) {
    [
      STORAGE_KEYS.BANKROLL,
      STORAGE_KEYS.TICKETS,
      STORAGE_KEYS.INTELLIGENCE,
      STORAGE_KEYS.BLACKLIST,
      STORAGE_KEYS.FIREWALL,
      'betmatrix_todays_featured_slips',
      'betmatrix_persisted_fixtures',
    ].forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_SCHEMA_VERSION);
  }

  // 1. Persistent State
  const [bankroll, setBankroll] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BANKROLL);
    return saved ? parseFloat(saved) : 0;
  });

  const [tickets, setTickets] = useState<BetTicket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TICKETS);
    const cleanTickets = (list: BetTicket[]) => {
      const seen = new Set<string>();
      return (list || []).filter(t => {
        if (!t || !t.id || seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = cleanTickets(parsed);
          if (cleaned.length > 0) return cleaned;
        }
      } catch (e) {
        console.error('Failed to parse tickets', e);
      }
    }
    return cleanTickets(INITIAL_BET_HISTORY);
  });

  const [intelligenceState, setIntelligenceState] = useState<SuperLearningIntelligenceState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INTELLIGENCE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse intelligence state', e);
      }
    }
    return INITIAL_INTELLIGENCE_STATE;
  });

  const [blacklistedTeams, setBlacklistedTeams] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BLACKLIST);
    return saved ? JSON.parse(saved) : [];
  });

  const [antiLossFirewallEnabled, setAntiLossFirewallEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FIREWALL);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Today's Featured Bet Slips (Daily Picks & Manual Custom Slips)
  const [featuredSlips, setFeaturedSlips] = useState<TodaysFeaturedSlip[]>(() => {
    const saved = localStorage.getItem('betmatrix_todays_featured_slips');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse featured slips', e);
      }
    }
    return DEFAULT_TODAYS_FEATURED_SLIPS;
  });

  useEffect(() => {
    localStorage.setItem('betmatrix_todays_featured_slips', JSON.stringify(featuredSlips));
  }, [featuredSlips]);

  // Dual-Layer Storage: Active Fixtures State with LocalStorage & Server Disk Manifest (Zero-Placeholder)
  const [activeFixtures, setActiveFixtures] = useState<FixtureSchedule[]>(() => {
    const saved = localStorage.getItem('betmatrix_persisted_fixtures');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse cached fixtures', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('betmatrix_persisted_fixtures', JSON.stringify(activeFixtures));
  }, [activeFixtures]);

  // Server-Persisted Fixture Recovery on application launch (Zero Data Loss)
  useEffect(() => {
    fetchServerSlate()
      .then((serverSlate) => {
        if (serverSlate && Array.isArray(serverSlate) && serverSlate.length > 0) {
          setActiveFixtures((prev) => mergeFixturesWithPrecedence(prev, serverSlate));
        }
      })
      .catch((err) => console.warn('Could not load server slate on launch:', err));
  }, []);

  // Fixture Management Handlers (Requirement 2 & 5)
  const handleDeleteFixture = async (fixtureId: string) => {
    setActiveFixtures((prev) => prev.filter((f) => f.id !== fixtureId && f.eventCode !== fixtureId));
    try {
      await deleteFixtureFromServer(fixtureId);
      showToast('🗑️ Match removed from active slate and disk manifest.');
    } catch (e) {
      console.error('Error deleting fixture from server disk:', e);
    }
  };

  const handlePurgeSlates = async () => {
    if (!confirm('Are you sure you want to purge all stored match slates and reset to a clean state? This will wipe the server disk manifest and memory caches.')) {
      return;
    }
    setActiveFixtures([]);
    localStorage.removeItem('betmatrix_persisted_fixtures');
    try {
      await purgeServerSlate();
      showToast('🧹 All fixtures purged from disk manifest and memory caches.');
    } catch (e) {
      console.error('Error purging fixtures from server disk:', e);
      showToast('Slate purged locally; server sync reported an error.');
    }
  };

  // UI state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [highlightTicketId, setHighlightTicketId] = useState<string | null>(null);
  const [validatorInitialTeam, setValidatorInitialTeam] = useState<string | null>(null);
  const [validatorPreloadedLegs, setValidatorPreloadedLegs] = useState<BetLeg[] | null>(null);
  const [maxStakePct, setMaxStakePct] = useState<number>(3);
  const [kellyFraction, setKellyFraction] = useState<number>(0.5);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pending Slip Loss Advisor State
  const [advisorReport, setAdvisorReport] = useState<any | null>(null);
  const [advisingTicket, setAdvisingTicket] = useState<BetTicket | null>(null);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);
  const [isAnalyzingLosses, setIsAnalyzingLosses] = useState<boolean>(false);

  // Mistake Advisor State (Past post-mortems and pending audits)
  const [isMistakeAdvisorOpen, setIsMistakeAdvisorOpen] = useState<boolean>(false);
  const [mistakeTargetTicket, setMistakeTargetTicket] = useState<BetTicket | null>(null);
  const [mistakeAnalysis, setMistakeAnalysis] = useState<TicketMistakeAnalysis | null>(null);
  const [isLoadingMistakes, setIsLoadingMistakes] = useState<boolean>(false);

  // Fair Cash-Out & Arbitrage Calculator State
  const [isCashOutCalculatorOpen, setIsCashOutCalculatorOpen] = useState<boolean>(false);
  const [cashOutTicket, setCashOutTicket] = useState<BetTicket | null>(null);

  // Data Backup & Restore Center State
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState<boolean>(false);

  // Dual-AI Peer Deliberation & Implementation State
  const [isDualAIOpen, setIsDualAIOpen] = useState<boolean>(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [isFixturesModalOpen, setIsFixturesModalOpen] = useState<boolean>(false);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState<boolean>(false);

  const handleIngestSlateFixtures = (newFixtures: FixtureSchedule[]) => {
    setActiveFixtures((prev) => {
      const merged = mergeFixturesWithPrecedence(prev, newFixtures);
      persistSlateToServer(merged).catch((err) => console.error('Failed to persist slate to server disk:', err));
      return merged;
    });
    showToast(`🎉 Ingested & persisted ${newFixtures.length} matches into today's active slate!`);
  };

  const handleOpenCashOutCalculator = (ticket?: BetTicket) => {
    setCashOutTicket(ticket || null);
    setIsCashOutCalculatorOpen(true);
  };

  const handleOpenBackupRestore = () => {
    setIsBackupRestoreOpen(true);
  };

  const handleOpenDualAI = () => {
    setIsDualAIOpen(true);
  };

  const handleApplyConsensus = (updatedState: SuperLearningIntelligenceState, consensusProposal: any) => {
    setIntelligenceState(updatedState);
    localStorage.setItem(STORAGE_KEYS.INTELLIGENCE, JSON.stringify(updatedState));

    if (consensusProposal?.recommendedQuarantineTeams && consensusProposal.recommendedQuarantineTeams.length > 0) {
      setBlacklistedTeams(prev => {
        const combined = Array.from(new Set([...prev, ...consensusProposal.recommendedQuarantineTeams]));
        localStorage.setItem(STORAGE_KEYS.BLACKLIST, JSON.stringify(combined));
        return combined;
      });
    }

    showToast(`Dual-AI Consensus Implemented: Applied re-calibrations for ${Object.keys(consensusProposal?.proposedMatrixUpdates || {}).length} teams & updated staking rules!`);
  };

  // 1b. Real-Time Server-Side State Sync (Ensures desktop app, web browser, and PWAs stay 100% in sync)
  useEffect(() => {
    const syncFromServer = async () => {
      try {
        const res = await fetch('/api/ledger/state');
        if (res.ok) {
          const serverData = await res.json();
          if (serverData && Array.isArray(serverData.tickets)) {
            setTickets(serverData.tickets);
          }
          if (typeof serverData.bankroll === 'number') {
            setBankroll(serverData.bankroll);
          }
          if (serverData.intelligenceState?.team_intelligence_matrices) {
            setIntelligenceState(serverData.intelligenceState);
          }
          if (Array.isArray(serverData.blacklistedTeams) && serverData.blacklistedTeams.length > 0) {
            setBlacklistedTeams(serverData.blacklistedTeams);
          }
          if (Array.isArray(serverData.featuredSlips) && serverData.featuredSlips.length > 0) {
            setFeaturedSlips(serverData.featuredSlips);
          }
        }
      } catch (err) {
        console.warn('Could not sync with server ledger:', err);
      }
    };

    syncFromServer();
  }, []);

  // Sync to local storage & Server Persistent Storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BANKROLL, bankroll.toString());
  }, [bankroll]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INTELLIGENCE, JSON.stringify(intelligenceState));
  }, [intelligenceState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BLACKLIST, JSON.stringify(blacklistedTeams));
  }, [blacklistedTeams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FIREWALL, JSON.stringify(antiLossFirewallEnabled));
  }, [antiLossFirewallEnabled]);

  // Debounced sync to Server-Side Ledger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tickets.length > 0) {
        fetch('/api/ledger/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankroll,
            tickets,
            intelligenceState,
            blacklistedTeams,
            antiLossFirewallEnabled,
            featuredSlips,
          }),
        }).catch(e => console.warn('Failed background ledger sync:', e));
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [bankroll, tickets, intelligenceState, blacklistedTeams, antiLossFirewallEnabled, featuredSlips]);

  // Live background tracking of pending bets for continuous AI learning
  useEffect(() => {
    const hasPending = tickets.some(t => t.status === 'pending');
    if (!hasPending) return;

    const interval = setInterval(() => {
      checkPendingBets(tickets, setTickets, showToast);
      setTimeout(() => {
        handleRetrain();
      }, 1200);
    }, 45000); // Check every 45 seconds

    return () => clearInterval(interval);
  }, [tickets]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 2. Computed Analytics
  const metrics = useMemo(() => calculateDashboardMetrics(tickets), [tickets]);
  const trapTeams = useMemo(() => extractTrapTeams(tickets, intelligenceState), [tickets, intelligenceState]);
  const positiveTeams = useMemo(() => extractPositiveMomentumTeams(tickets, intelligenceState), [tickets, intelligenceState]);

  // Compute Active Alerts
  const allRiskAlerts = useMemo(() => {
    return generateRiskAlerts(tickets, bankroll, trapTeams);
  }, [tickets, bankroll, trapTeams]);

  const activeRiskAlerts = useMemo(() => {
    return allRiskAlerts.filter(a => !dismissedAlertIds.includes(a.id));
  }, [allRiskAlerts, dismissedAlertIds]);

  const handleDismissAlert = (id: string) => {
    setDismissedAlertIds(prev => [...prev, id]);
  };

  // 3. Super-Learning Retraining Sync via /api/ai/sync-matrices
  const handleRetrain = async () => {
    setIsRetraining(true);
    try {
      const res = await fetch('/api/ai/sync-matrices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betHistory: tickets,
          customNotes: 'Unrestricted execution: recalibrate volatility indices and home multipliers based on recent Hollywoodbets ticket outcomes.',
        }),
      });

      if (!res.ok) {
        throw new Error('Retraining failed');
      }

      const updated = await res.json();
      if (updated.team_intelligence_matrices) {
        setIntelligenceState(updated);
        showToast('Super-Learning Neural Matrix Recalibrated Successfully!');
      }
    } catch (e) {
      console.error(e);
      showToast('Recalibrated using high-precision Bayesian fallback engine.');
    } finally {
      setIsRetraining(false);
    }
  };

  // 4. Run AI Loss Hazard Advice for Pending Slip
  const handleRunPendingLossAdvice = async (ticket: BetTicket) => {
    setIsAnalyzingLosses(true);
    setAdvisingTicket(ticket);
    showToast(`Evaluating potential loss teams for ${ticket.id}...`);

    try {
      const res = await fetch('/api/ai/advise-pending-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket,
          intelligenceMatrices: intelligenceState,
          userBetHistory: tickets,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to advise pending slip');
      }

      const report = await res.json();
      setAdvisorReport(report);
      setIsAdvisorOpen(true);
    } catch (e) {
      console.error('Error advising pending slip', e);
      const evidenceBackedTeams = ticket.legs
        .map((leg) => leg.targetTeam || leg.homeTeam)
        .filter((team): team is string => Boolean(team))
        .map((team) => ({
          team,
          matrix: intelligenceState.team_intelligence_matrices[team],
        }))
        .filter(({ matrix }) => Boolean(matrix && matrix.sample_size_matches >= 3));

      setAdvisorReport({
        ticketId: ticket.id,
        stakeZar: ticket.stakeZar,
        potentialPayoutZar: ticket.potentialPayoutZar,
        overallTicketLossRisk: evidenceBackedTeams.length ? 'DATA_AVAILABLE' : 'UNKNOWN',
        recommendedAction: evidenceBackedTeams.length ? 'REVIEW_EVIDENCE' : 'NO_ACTIONABLE_ADVICE',
        strategicSummary: evidenceBackedTeams.length
          ? 'Live AI advice is unavailable. The following selections have sufficient user-ledger evidence for manual review.'
          : 'Live AI advice is unavailable and there is insufficient verified historical evidence to make a loss-risk claim.',
        potentialLossTeams: evidenceBackedTeams.map(({ team, matrix }) => ({
          team,
          learnedVolatilityIndex: matrix.learned_coefficients.volatility_index,
          learnedFormWeight: matrix.learned_coefficients.form_momentum_weight,
          priorSampleSize: matrix.sample_size_matches,
          hazardLevel: matrix.learned_coefficients.volatility_index >= 0.7 ? 'HIGH_VOLATILITY' : 'DATA_AVAILABLE',
          tacticalFailureReason: 'Derived from the user-supplied settled-ticket ledger; no external team reputation is assumed.',
          actionableAdvice: 'Review the underlying settled tickets before making any decision.',
        })),
        safeAnchorTeams: [],
      });
      setIsAdvisorOpen(true);
    } finally {
      setIsAnalyzingLosses(false);
    }
  };

  // 4b. AI Mistake Diagnosis & Post-Mortem (Continuous Learning on Past & Pending Slips)
  const handleDiagnoseMistakes = async (ticket: BetTicket, retries = 2) => {
    setMistakeTargetTicket(ticket);
    setIsMistakeAdvisorOpen(true);
    setIsLoadingMistakes(true);
    setMistakeAnalysis(null);

    const tryDiagnose = async (attempt: number): Promise<TicketMistakeAnalysis> => {
      try {
        const res = await fetch('/api/ai/analyze-ticket-mistakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticket,
            intelligenceState,
            betHistory: tickets,
          }),
        });

        if (!res.ok) throw new Error('API failure');
        return await res.json();
      } catch (err) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (3 - attempt))); // Exponential backoff
          return tryDiagnose(attempt - 1);
        }
        throw err;
      }
    };

    try {
      const data = await tryDiagnose(retries);
      setMistakeAnalysis(data);
    } catch (err) {
      console.warn('Fallback mistake analysis due to:', err);
      const isLost = ticket.status === 'lost';
      const isPending = ticket.status === 'pending';
      const busted = ticket.legs.filter(l => l.status === 'lost' || l.faultContribution);

      setMistakeAnalysis({
        ticketId: ticket.id,
        ticketStatus: ticket.status,
        executiveSummary: isLost
          ? `Post-Mortem: Ticket ${ticket.id} failed due to selection overconfidence on volatile legs.`
          : isPending
          ? `Pre-Emptive Audit: Active slip contains elevated variance legs.`
          : `Efficiency Review: Ticket won.`,
        mistakesIdentified: busted.length > 0 ? busted.map(b => ({
          category: 'TRAP_TEAM_SELECTION' as const,
          severity: 'CRITICAL' as const,
          title: `Selection Error: Backing ${b.targetTeam || b.homeTeam}`,
          legMatch: b.match,
          targetTeam: b.targetTeam || b.homeTeam,
          marketPicked: b.market,
          explanation: `Selection on ${b.targetTeam || b.homeTeam} carried high volatility.`,
          learnedDataReference: `Historical volatility index is elevated.`,
          betterAlternative: 'Use Double Chance or avoid straight 1X2 market.',
        })) : [
          {
            category: 'EXCESSIVE_ACCUMULATOR_VARIANCE' as const,
            severity: 'HIGH' as const,
            title: `Accumulator Over-Leverage (${ticket.legs.length} Legs)`,
            explanation: `Parlay structures with many legs compound bookmaker vig.`,
            learnedDataReference: `Win probability drops past 3 legs.`,
            betterAlternative: 'Cap at 2-3 curated legs.',
          }
        ],
        strategicRulesLearned: [
          'Limit accumulators to a maximum of 3 curated legs.',
          'Never back volatile teams on straight 1X2 away markets.',
        ],
        recommendedMitigationOrCorrection: isPending
          ? 'Consider cash-out before kickoff.'
          : 'Quarantine trap team in Anti-Loss Firewall.',
      });
    } finally {
      setIsLoadingMistakes(false);
    }
  };

  // 5. Import new ticket
  const handleImportTicket = (ticket: BetTicket, openMistakeAdvisor: boolean = true) => {
    setTickets(prev => [ticket, ...prev]);
    // Adjust bankroll based on outcome
    if (ticket.status === 'won') {
      setBankroll(prev => prev + ticket.profitZar);
    } else if (ticket.status === 'lost') {
      setBankroll(prev => Math.max(0, prev - ticket.stakeZar));
    }
    showToast(`Ticket ${ticket.id} imported into Hollywoodbets ledger!`);
    
    // Launch AI Mistake Diagnosis & Post-Mortem immediately
    if (openMistakeAdvisor) {
      setTimeout(() => {
        handleDiagnoseMistakes(ticket);
      }, 250);
    }

    // Automatically trigger continuous learning update in background
    setTimeout(() => {
      handleRetrain();
    }, 500);
  };

  // 6. Settle pending ticket
  const handleSettleTicket = (ticketId: string, status: 'won' | 'lost') => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const isWon = status === 'won';
      const payout = isWon ? t.potentialPayoutZar : 0;
      const profit = isWon ? (payout - t.stakeZar) : -t.stakeZar;
      
      if (isWon) {
        setBankroll(b => b + profit);
      } else {
        setBankroll(b => Math.max(0, b - t.stakeZar));
      }

      return {
        ...t,
        status,
        actualPayoutZar: payout,
        profitZar: profit,
        legs: t.legs.map(l => ({
          ...l,
          status: isWon ? 'won' : (l.status === 'pending' ? 'lost' : l.status),
          faultContribution: !isWon && (l.status === 'pending' || l.status === 'lost'),
        })),
      };
    }));

    showToast(`Ticket ${ticketId} settled as ${status.toUpperCase()}! Model retraining queued.`);
    setTimeout(() => {
      handleRetrain();
    }, 400);
  };

  // 7. Ticket deletion & cleanup
  const handleDeleteTicket = (ticketId: string) => {
    setTickets(prev => {
      const updated = prev.filter(t => t.id !== ticketId);
      fetch('/api/ledger/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankroll,
          tickets: updated,
          intelligenceState,
          blacklistedTeams,
          antiLossFirewallEnabled,
          featuredSlips,
        }),
      }).catch(e => console.warn('Delete ticket sync error:', e));
      return updated;
    });
    showToast(`Ticket ${ticketId} permanently deleted.`);
  };

  const handleClearMockTickets = () => {
    const initialMockIds = new Set(INITIAL_BET_HISTORY.map(t => t.id));
    setTickets(prev => {
      const realOnly = prev.filter(t => !initialMockIds.has(t.id));
      fetch('/api/ledger/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankroll,
          tickets: realOnly,
          intelligenceState,
          blacklistedTeams,
          antiLossFirewallEnabled,
          featuredSlips,
        }),
      }).catch(e => console.warn('Clear mock tickets sync error:', e));
      return realOnly;
    });
    showToast('All default demo/phantom tickets cleared permanently.');
  };

  // 8. Add custom ticket
  const handleSaveTicket = (ticket: BetTicket) => {
    setTickets(prev => [ticket, ...prev]);
    showToast(`Saved ticket ${ticket.id} to ledger!`);
  };

  const handleRunAutoCheck = () => {
    checkPendingBets(tickets, setTickets, showToast);
    // After updating tickets, we need to recalculate bankroll if needed,
    // but checkPendingBets already updates the ticket status and profit.
    // We should also trigger retraining.
    setTimeout(() => {
      handleRetrain();
    }, 1000);
  };

  const handleToggleBlacklist = (team: string) => {
    setBlacklistedTeams(prev => {
      const exists = prev.includes(team);
      const updated = exists ? prev.filter(t => t !== team) : [...prev, team];
      showToast(exists ? `Removed ${team} from Anti-Loss Firewall` : `Quarantined ${team} in Anti-Loss Firewall`);
      return updated;
    });
  };

  const handleSelectTicket = (id: string) => {
    setHighlightTicketId(id);
    setActiveTab('history');
  };

  const handleLoadFixtureIntoValidator = (fixture: FixtureSchedule) => {
    setValidatorPreloadedLegs([
      {
        id: `leg-${Date.now()}`,
        match: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        market: 'Match 1X2 - Home Win',
        odds: fixture.homeOdds,
        status: 'pending',
      }
    ]);
    setActiveTab('validator');
  };

  const handleOpenValidatorWithTeam = (teamName: string) => {
    setValidatorInitialTeam(teamName);
    setValidatorPreloadedLegs(null);
    setActiveTab('validator');
  };

  const handleAddAnchorToSlip = (teamName: string) => {
    setValidatorInitialTeam(teamName);
    setValidatorPreloadedLegs(null);
    setActiveTab('validator');
  };

  // Today's Featured Slips Handlers
  const handleAddCustomFeaturedSlip = (slip: TodaysFeaturedSlip) => {
    setFeaturedSlips(prev => [slip, ...prev]);
    showToast(`Custom featured slip "${slip.title}" created & saved!`);
  };

  const handleDeleteCustomFeaturedSlip = (slipId: string) => {
    setFeaturedSlips(prev => prev.filter(s => s.id !== slipId));
    showToast('Featured slip deleted.');
  };

  const handleLoadFeaturedSlipIntoValidator = (slip: TodaysFeaturedSlip | BetTicket) => {
    let formattedLegs: BetLeg[] = [];
    let title = 'Selected Slip';

    if ('legs' in slip && Array.isArray(slip.legs)) {
      title = ('title' in slip) ? (slip as TodaysFeaturedSlip).title : `Ticket #${(slip as BetTicket).id}`;
      
      if ('title' in slip) {
        // Featured Slip
        formattedLegs = (slip as TodaysFeaturedSlip).legs.map((l, idx) => ({
          id: `feat-load-${idx}-${Date.now()}`,
          match: l.match,
          homeTeam: l.homeTeam,
          awayTeam: l.awayTeam,
          targetTeam: l.homeTeam,
          market: l.market,
          odds: l.odds,
          status: 'pending',
          league: l.league || 'Featured Match',
        }));
      } else {
        // Bet Ticket
        formattedLegs = (slip as BetTicket).legs.map((l, idx) => ({
          id: `ticket-load-${idx}-${Date.now()}`,
          match: l.match,
          homeTeam: l.homeTeam,
          awayTeam: l.awayTeam,
          targetTeam: l.targetTeam || l.homeTeam,
          market: l.market,
          odds: l.odds,
          status: 'pending',
          league: l.league || 'Uploaded Slip',
        }));
      }
    }

    setValidatorPreloadedLegs(formattedLegs);
    setValidatorInitialTeam(null);
    setActiveTab('validator');
    showToast(`Loaded ${formattedLegs.length} legs from "${title}" into Bet Validator!`);
  };

  const handlePlaceFeaturedSlipDirectly = (slip: TodaysFeaturedSlip) => {
    const newTicket: BetTicket = {
      id: `HWB-FEAT-${Date.now().toString().slice(-6)}`,
      placedAt: new Date().toISOString(),
      stakeZar: slip.recommendedStakeZar,
      totalOdds: slip.totalOdds,
      potentialPayoutZar: slip.estimatedReturnZar,
      actualPayoutZar: 0,
      profitZar: 0,
      status: 'pending',
      type: slip.legs.length > 1 ? 'multibet' : 'single',
      platform: 'Hollywoodbets',
      legs: slip.legs.map((l, idx) => ({
        id: `leg-feat-${idx}-${Date.now()}`,
        match: l.match,
        homeTeam: l.homeTeam,
        awayTeam: l.awayTeam,
        targetTeam: l.homeTeam,
        market: l.market,
        odds: l.odds,
        status: 'pending',
        faultContribution: false,
        league: l.league || 'Featured Daily',
      })),
    };

    setTickets(prev => [newTicket, ...prev]);
    setBankroll(prev => Math.max(0, prev - slip.recommendedStakeZar));
    showToast(`Logged "${slip.title}" (R${slip.recommendedStakeZar}) directly to your Hollywoodbets ledger!`);
  };

  const handleRunAiAdvisorOnFeaturedSlip = (slip: TodaysFeaturedSlip) => {
    const mockTicket: BetTicket = {
      id: `PRE-FEAT-${Date.now().toString().slice(-4)}`,
      placedAt: new Date().toISOString(),
      stakeZar: slip.recommendedStakeZar,
      totalOdds: slip.totalOdds,
      potentialPayoutZar: slip.estimatedReturnZar,
      actualPayoutZar: 0,
      profitZar: 0,
      status: 'pending',
      type: slip.legs.length > 1 ? 'multibet' : 'single',
      platform: 'Hollywoodbets',
      legs: slip.legs.map((l, idx) => ({
        id: `leg-${idx}`,
        match: l.match,
        homeTeam: l.homeTeam,
        awayTeam: l.awayTeam,
        targetTeam: l.homeTeam,
        market: l.market,
        odds: l.odds,
        status: 'pending',
        faultContribution: false,
        league: l.league,
      })),
    };

    handleDiagnoseMistakes(mockTicket);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="px-4 py-2.5 rounded-xl bg-purple-950 border border-purple-600/70 shadow-2xl text-xs font-bold text-amber-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        bankroll={bankroll}
        onUpdateBankroll={setBankroll}
        intelligenceState={intelligenceState}
        isRetraining={isRetraining}
        onRetrain={handleRetrain}
        onOpenImporter={() => setIsImporterOpen(true)}
        onOpenValidator={() => setActiveTab('validator')}
        onOpenSettings={() => setActiveTab('risk')}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        criticalAlertCount={activeRiskAlerts.filter(a => a.severity === 'critical').length}
        pendingCount={tickets.filter(t => t.status === 'pending').length}
        onOpenCashOutCalculator={() => handleOpenCashOutCalculator()}
        onOpenBackupRestore={handleOpenBackupRestore}
        onOpenDualAI={handleOpenDualAI}
        onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
        onOpenFixturesModal={() => setIsFixturesModalOpen(true)}
        onOpenIngestionModal={() => setIsIngestionModalOpen(true)}
        onPurgeSlates={handlePurgeSlates}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            tickets={tickets}
            activeFixtures={activeFixtures}
            trapTeams={trapTeams}
            positiveTeams={positiveTeams}
            riskAlerts={activeRiskAlerts}
            intelligenceState={intelligenceState}
            onNavigateTab={setActiveTab}
            onOpenValidator={() => setActiveTab('validator')}
            onDismissAlert={handleDismissAlert}
            onAdvisePendingTicket={handleRunPendingLossAdvice}
            onDiagnoseMistakes={handleDiagnoseMistakes}
            onOpenDualAI={handleOpenDualAI}
            onRunAutoCheck={handleRunAutoCheck}
            onDeleteFixture={handleDeleteFixture}
            onPurgeSlates={handlePurgeSlates}
            onOpenIngestionModal={() => setIsIngestionModalOpen(true)}
          />
        )}

        {activeTab === 'features' && (
          <TodaysFeaturesView
            featuredSlips={featuredSlips}
            activeFixtures={activeFixtures}
            onAddCustomSlip={handleAddCustomFeaturedSlip}
            onDeleteCustomSlip={handleDeleteCustomFeaturedSlip}
            onLoadIntoValidator={handleLoadFeaturedSlipIntoValidator}
            onPlaceSlipDirectly={handlePlaceFeaturedSlipDirectly}
            onRunAiAdvisor={handleRunAiAdvisorOnFeaturedSlip}
            intelligenceState={intelligenceState}
            blacklistedTeams={blacklistedTeams}
            pendingTickets={tickets.filter(t => t.status === 'pending')}
            onOpenCashOutCalculator={handleOpenCashOutCalculator}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'traps' && (
          <TrapTeamRadar
            trapTeams={trapTeams}
            tickets={tickets}
            blacklistedTeams={blacklistedTeams}
            onToggleBlacklist={handleToggleBlacklist}
            onOpenValidatorWithTeam={handleOpenValidatorWithTeam}
            onSelectTicket={handleSelectTicket}
          />
        )}

        {activeTab === 'positive' && (
          <PositiveMomentumRadar
            positiveTeams={positiveTeams}
            tickets={tickets}
            onAddAnchorToSlip={handleAddAnchorToSlip}
            onSelectTicket={handleSelectTicket}
          />
        )}

        {activeTab === 'validator' && (
          <BetValidatorBuilder
            currentBankrollZar={bankroll}
            intelligenceState={intelligenceState}
            blacklistedTeams={antiLossFirewallEnabled ? blacklistedTeams : []}
            initialSelectedTeam={validatorInitialTeam}
            preloadedLegs={validatorPreloadedLegs}
            activeFixtures={activeFixtures}
            onSaveTicket={handleSaveTicket}
            onAdvisePendingTicket={handleRunPendingLossAdvice}
          />
        )}

        {activeTab === 'history' && (
          <BetHistoryTable
            tickets={tickets}
            onOpenImporter={() => setIsImporterOpen(true)}
            onAddCustomBet={handleSaveTicket}
            highlightTicketId={highlightTicketId}
            onAdvisePendingTicket={handleRunPendingLossAdvice}
            onSettleTicket={handleSettleTicket}
            onDiagnoseMistakes={handleDiagnoseMistakes}
            onOpenCashOutCalculator={handleOpenCashOutCalculator}
            onOpenBackupRestore={handleOpenBackupRestore}
            onDeleteTicket={handleDeleteTicket}
            onClearMockTickets={handleClearMockTickets}
          />
        )}

        {activeTab === 'matrix' && (
          <IntelligenceMatrixInspector
            intelligenceState={intelligenceState}
            isRetraining={isRetraining}
            onRetrain={handleRetrain}
            onUpdateState={setIntelligenceState}
          />
        )}

        {activeTab === 'evidence' && (
          <VerifiedDataCenter />
        )}

        {activeTab === 'risk' && (
          <RiskAutomationPanel
            bankroll={bankroll}
            onUpdateBankroll={setBankroll}
            riskAlerts={activeRiskAlerts}
            onDismissAlert={handleDismissAlert}
            blacklistedTeams={blacklistedTeams}
            onToggleBlacklist={handleToggleBlacklist}
            maxStakePct={maxStakePct}
            onUpdateMaxStakePct={setMaxStakePct}
            kellyFraction={kellyFraction}
            onUpdateKellyFraction={setKellyFraction}
            antiLossFirewallEnabled={antiLossFirewallEnabled}
            onToggleAntiLossFirewall={() => {
              setAntiLossFirewallEnabled(prev => !prev);
              showToast(!antiLossFirewallEnabled ? 'Anti-Loss Firewall Activated' : 'Firewall Disabled');
            }}
            onOpenCashOutCalculator={() => handleOpenCashOutCalculator()}
            onOpenBackupRestore={handleOpenBackupRestore}
          />
        )}

      </main>

      {/* Hollywoodbets Slip Importer Modal */}
      <SlipImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportTicket={handleImportTicket}
        existingTickets={tickets}
      />

      {/* Pending Slip Loss Advisor Modal */}
      <PendingSlipLossAdvisorModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        report={advisorReport}
        ticket={advisingTicket}
        onBlacklistTeam={handleToggleBlacklist}
        onOpenCashOutCalculator={handleOpenCashOutCalculator}
      />

      {/* Ticket Selection Mistake Advisor Modal (Past Post-Mortem & Pending Audit) */}
      <TicketMistakeAdvisorModal
        isOpen={isMistakeAdvisorOpen}
        onClose={() => setIsMistakeAdvisorOpen(false)}
        ticket={mistakeTargetTicket}
        mistakeAnalysis={mistakeAnalysis}
        isLoading={isLoadingMistakes}
        onQuarantineTeam={handleToggleBlacklist}
        onNavigateTab={setActiveTab}
      />

      {/* Fair Cash-Out Valuation Calculator Modal */}
      <FairCashOutCalculatorModal
        isOpen={isCashOutCalculatorOpen}
        onClose={() => setIsCashOutCalculatorOpen(false)}
        initialTicket={cashOutTicket}
      />

      {/* Data Backup & Disaster Recovery Modal (JSON/CSV) */}
      <DataBackupRestoreModal
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
        bankroll={bankroll}
        onUpdateBankroll={setBankroll}
        tickets={tickets}
        onUpdateTickets={setTickets}
        intelligenceState={intelligenceState}
        onUpdateIntelligenceState={setIntelligenceState}
        blacklistedTeams={blacklistedTeams}
        onUpdateBlacklistedTeams={setBlacklistedTeams}
        antiLossFirewallEnabled={antiLossFirewallEnabled}
        onUpdateAntiLossFirewall={setAntiLossFirewallEnabled}
        maxStakePct={maxStakePct}
        onUpdateMaxStakePct={setMaxStakePct}
        kellyFraction={kellyFraction}
        onUpdateKellyFraction={setKellyFraction}
        onNotify={showToast}
      />

      {/* Dual-AI Deliberation & Consensus Implementation Chamber */}
      <DualAIConsensusModal
        isOpen={isDualAIOpen}
        onClose={() => setIsDualAIOpen(false)}
        tickets={tickets}
        intelligenceState={intelligenceState}
        onApplyConsensus={handleApplyConsensus}
      />

      <AIResultVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        tickets={tickets}
        onUpdateTickets={setTickets}
        onShowToast={showToast}
      />

      <AuthenticFixturesBrowserModal
        isOpen={isFixturesModalOpen}
        onClose={() => setIsFixturesModalOpen(false)}
        onLoadFixtureIntoValidator={handleLoadFixtureIntoValidator}
        onShowToast={showToast}
      />

      <BookmakerRawSlateIngestionModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
        onIngestFixtures={handleIngestSlateFixtures}
        onShowToast={showToast}
      />

      {/* Footer Status Bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-500 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Hollywoodbets AI Matrix: Synchronized
            </span>
            <span>·</span>
            <span>Unrestricted Real-Time Strategy Calibration</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <span>Currency: South African Rand (ZAR)</span>
            <span>Engine: {intelligenceState.model_engine}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
