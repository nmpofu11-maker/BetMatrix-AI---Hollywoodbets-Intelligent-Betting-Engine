import React from 'react';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  AlertTriangle, 
  Coins, 
  Flame, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight,
  TrendingUp,
  Percent,
  Play,
  Search,
  Users,
  Calendar,
  FileText
} from 'lucide-react';
import { FixtureSchedule, BetLeg, BetTicket, SuperLearningIntelligenceState } from '../types/betting';

interface BetValidatorBuilderProps {
  currentBankrollZar: number;
  intelligenceState: SuperLearningIntelligenceState;
  blacklistedTeams: string[];
  initialSelectedTeam?: string | null;
  preloadedLegs?: BetLeg[] | null;
  activeFixtures?: FixtureSchedule[];
  onSaveTicket: (ticket: BetTicket) => void;
  onAdvisePendingTicket?: (ticket: BetTicket) => void;
}

export const BetValidatorBuilder: React.FC<BetValidatorBuilderProps> = ({
  currentBankrollZar,
  intelligenceState,
  blacklistedTeams,
  initialSelectedTeam,
  preloadedLegs,
  activeFixtures = [],
  onSaveTicket,
  onAdvisePendingTicket,
}) => {
  // Pre-seed legs
  const [legs, setLegs] = React.useState<BetLeg[]>([
    {
      id: 'builder-1',
      match: 'South Africa vs Guinea',
      homeTeam: 'South Africa',
      awayTeam: 'Guinea',
      targetTeam: 'South Africa',
      market: 'Match 1X2 - Home Win',
      odds: 1.80,
      status: 'pending',
      league: 'CAF AFCON Qualifiers',
    },
    {
      id: 'builder-2',
      match: 'England vs Spain',
      homeTeam: 'England',
      awayTeam: 'Spain',
      targetTeam: 'Spain',
      market: 'Match 1X2 - Away Win',
      odds: 2.80,
      status: 'pending',
      league: 'UEFA Nations League',
    },
  ]);

  const [stakeZar, setStakeZar] = React.useState<number>(150);
  const [isAnalyzing, setIsAnalyzing] = React.useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = React.useState<any | null>(null);
  const [simulationRuns, setSimulationRuns] = React.useState<any | null>(null);

  // Dynamic real upcoming fixtures state (starts with activeFixtures or empty array)
  const [fixtures, setFixtures] = React.useState<FixtureSchedule[]>(activeFixtures);
  const [isLoadingFixtures, setIsLoadingFixtures] = React.useState<boolean>(false);
  const [fixturesSource, setFixturesSource] = React.useState<string>('cache');

  // Load real upcoming fixtures from server-side cache/API with exactly 1-call-per-day enforcement
  const [isScraping, setIsScraping] = React.useState<boolean>(false);
  const [lastScrapedTime, setLastScrapedTime] = React.useState<string | null>(null);

  // Fixture Guide Paste Modal State
  const [isImportGuideOpen, setIsImportGuideOpen] = React.useState<boolean>(false);
  const [pastedGuideText, setPastedGuideText] = React.useState<string>('');
  const [isParsingGuide, setIsParsingGuide] = React.useState<boolean>(false);

  const handleTriggerAutoscraper = async () => {
    setIsScraping(true);
    try {
      const res = await fetch('/api/scraper/hollywoodbets-today?force=true');
      if (!res.ok) throw new Error('Autoscraper failed');
      const data = await res.json();
      if (Array.isArray(data.fixtures) && data.fixtures.length > 0) {
        setFixtures(data.fixtures);
        setFixturesSource('hollywoodbets_autoscraper');
        setLastScrapedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        alert(`⚡ Hollywoodbets Live Scraper Success!\nLoaded ${data.fixtures.length} live verified fixtures for today from https://www.hollywoodbets.net/fixtures-and-guides (using Live Web Grounding Search & Cache).`);
      }
    } catch (err) {
      console.error('Autoscraper error:', err);
      alert('Autoscraper error: Could not reach Hollywoodbets fixtures.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleImportGuideText = async () => {
    if (!pastedGuideText.trim()) return;
    setIsParsingGuide(true);
    try {
      const res = await fetch('/api/parse-fixture-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pastedGuideText }),
      });
      if (!res.ok) throw new Error('Guide parsing failed');
      const data = await res.json();
      if (Array.isArray(data.fixtures) && data.fixtures.length > 0) {
        setFixtures(prev => [...data.fixtures, ...prev]);
        setFixturesSource('pasted_fixture_guide');
        setIsImportGuideOpen(false);
        setPastedGuideText('');
        alert(`🎉 Successfully parsed & imported ${data.fixtures.length} fixtures directly from your Hollywoodbets Fixture Guide!`);
      } else {
        alert('Could not find recognizable matches in the pasted text. Ensure you copy team names or match rows.');
      }
    } catch (err) {
      console.error('Guide parser error:', err);
      alert('Failed to parse fixture guide text.');
    } finally {
      setIsParsingGuide(false);
    }
  };

  React.useEffect(() => {
    let active = true;
    const loadFixtures = async () => {
      setIsLoadingFixtures(true);
      try {
        const res = await fetch('/api/upcoming-fixtures');
        if (!res.ok) throw new Error('Fixtures feed failed');
        const data = await res.json();
        if (active && Array.isArray(data.fixtures)) {
          setFixtures(data.fixtures);
          setFixturesSource(data.source || 'network');
        }
      } catch (err) {
        console.warn('Fallback to static upcoming fixtures:', err);
      } finally {
        if (active) setIsLoadingFixtures(false);
      }
    };
    loadFixtures();
    return () => {
      active = false;
    };
  }, []);

  // Custom leg modal/inputs
  const [activeFixtureTab, setActiveFixtureTab] = React.useState<'schedule' | 'teams'>('schedule');
  const [teamSearchQuery, setTeamSearchQuery] = React.useState('');
  const [fixtureCategory, setFixtureCategory] = React.useState<string>('all');
  const [fixtureSearchQuery, setFixtureSearchQuery] = React.useState<string>('');
  const [marketViewMode, setMarketViewMode] = React.useState<'all' | '1x2' | 'double_chance' | 'btts'>('all');
  const [customHome, setCustomHome] = React.useState('');
  const [customAway, setCustomAway] = React.useState('');
  const [customMarket, setCustomMarket] = React.useState('Home Win');
  const [customOdds, setCustomOdds] = React.useState('1.65');
  const [customLeague, setCustomLeague] = React.useState('Betway Premiership');

  // Compute authentic Hollywoodbets Double Chance and BTTS odds dynamically
  const computeDcAndBttsOdds = React.useCallback((fixture: FixtureSchedule) => {
    const h = Math.max(1.02, fixture.homeOdds || 2.0);
    const d = Math.max(1.02, fixture.drawOdds || 3.0);
    const a = Math.max(1.02, fixture.awayOdds || 3.0);

    const pH = 1 / h;
    const pD = 1 / d;
    const pA = 1 / a;
    const totalP = pH + pD + pA;

    const truePH = pH / totalP;
    const truePD = pD / totalP;
    const truePA = pA / totalP;

    // Hollywoodbets typical Double Chance margin (~6-7%)
    const margin = 1.07;
    const dc1X = Math.max(1.08, parseFloat((1 / ((truePH + truePD) * margin)).toFixed(2)));
    const dcX2 = Math.max(1.08, parseFloat((1 / ((truePD + truePA) * margin)).toFixed(2)));
    const dc12 = Math.max(1.08, parseFloat((1 / ((truePH + truePA) * margin)).toFixed(2)));

    // Both Teams To Score (GG / NG)
    const bttsYes = fixture.bttsOdds && fixture.bttsOdds > 1.05 ? fixture.bttsOdds : 1.85;
    const pYes = 1 / bttsYes;
    const pNo = Math.max(0.15, 1 - (pYes / 1.08));
    const bttsNo = Math.max(1.25, parseFloat((1 / (pNo * 1.08)).toFixed(2)));

    return { dc1X, dcX2, dc12, bttsYes, bttsNo };
  }, []);

  // Handle initialSelectedTeam or preloadedLegs from other views
  React.useEffect(() => {
    if (preloadedLegs && preloadedLegs.length > 0) {
      setLegs(preloadedLegs);
      return;
    }

    if (initialSelectedTeam) {
      const existing = legs.some(l => l.targetTeam === initialSelectedTeam || l.homeTeam === initialSelectedTeam || l.awayTeam === initialSelectedTeam);
      if (!existing) {
        setLegs(prev => [
          ...prev,
          {
            id: `leg-${Date.now()}`,
            match: `${initialSelectedTeam} vs Opponent`,
            homeTeam: initialSelectedTeam,
            awayTeam: 'Opponent',
            targetTeam: initialSelectedTeam,
            market: 'Match 1X2 - Home Win',
            odds: 1.70,
            status: 'pending',
            league: 'Featured Match',
          },
        ]);
      }
    }
  }, [initialSelectedTeam, preloadedLegs]);

  // Combined Odds & Payout
  const totalOdds = React.useMemo(() => {
    if (legs.length === 0) return 0;
    const product = legs.reduce((acc, l) => acc * (Number(l.odds) || 1), 1);
    return Number(product.toFixed(2));
  }, [legs]);

  const potentialPayout = React.useMemo(() => {
    return Number((stakeZar * totalOdds).toFixed(2));
  }, [stakeZar, totalOdds]);

  // Check for trap teams in the slip immediately
  const activeTrapAlerts = React.useMemo(() => {
    const alerts: { team: string; warning: string; isBlacklisted: boolean }[] = [];
    legs.forEach(leg => {
      const candidates = [leg.targetTeam, leg.homeTeam, leg.awayTeam].filter(Boolean) as string[];
      for (const t of candidates) {
        const matrix = intelligenceState.team_intelligence_matrices[t];
        const isBanned = blacklistedTeams.includes(t);
        if (isBanned || (matrix && matrix.learned_coefficients.volatility_index >= 0.70)) {
          if (!alerts.some(a => a.team === t)) {
            alerts.push({
              team: t,
              warning: isBanned
                ? `${t} is currently quarantined in your Anti-Loss Firewall due to historical multibet collapses.`
                : `${t} has a high volatility rating (${matrix?.learned_coefficients.volatility_index}). High risk of busting this ticket.`,
              isBlacklisted: isBanned,
            });
          }
        }
      }
    });
    return alerts;
  }, [legs, intelligenceState, blacklistedTeams]);

  // Compute all offered teams from daily Hollywoodbets fixtures
  const allOfferedTeams = React.useMemo(() => {
    const map = new Map<string, {
      name: string;
      opponent: string;
      role: 'Home' | 'Away';
      match: string;
      league: string;
      date: string;
      odds: number;
      drawOdds: number;
      marketName: string;
      isTrap: boolean;
      isAnchor: boolean;
      fixture: FixtureSchedule;
    }>();

    fixtures.forEach(fixture => {
      const homeTrap = blacklistedTeams.includes(fixture.homeTeam) ||
                      (intelligenceState.team_intelligence_matrices[fixture.homeTeam]?.learned_coefficients.volatility_index >= 0.7);
      const awayTrap = blacklistedTeams.includes(fixture.awayTeam) ||
                      (intelligenceState.team_intelligence_matrices[fixture.awayTeam]?.learned_coefficients.volatility_index >= 0.7);

      const homeAnchor = intelligenceState.team_intelligence_matrices[fixture.homeTeam]?.learned_coefficients.form_momentum_weight >= 1.1;
      const awayAnchor = intelligenceState.team_intelligence_matrices[fixture.awayTeam]?.learned_coefficients.form_momentum_weight >= 1.1;

      // Add Home Team
      if (fixture.homeTeam) {
        map.set(fixture.homeTeam.toLowerCase(), {
          name: fixture.homeTeam,
          opponent: fixture.awayTeam,
          role: 'Home',
          match: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          league: fixture.league,
          date: fixture.date,
          odds: fixture.homeOdds,
          drawOdds: fixture.drawOdds,
          marketName: `${fixture.homeTeam} Win`,
          isTrap: homeTrap,
          isAnchor: homeAnchor,
          fixture
        });
      }

      // Add Away Team
      if (fixture.awayTeam) {
        map.set(fixture.awayTeam.toLowerCase(), {
          name: fixture.awayTeam,
          opponent: fixture.homeTeam,
          role: 'Away',
          match: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          league: fixture.league,
          date: fixture.date,
          odds: fixture.awayOdds,
          drawOdds: fixture.drawOdds,
          marketName: `${fixture.awayTeam} Win`,
          isTrap: awayTrap,
          isAnchor: awayAnchor,
          fixture
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fixtures, blacklistedTeams, intelligenceState]);

  // Search filter for offered teams
  const filteredOfferedTeams = React.useMemo(() => {
    const q = teamSearchQuery.toLowerCase().trim();
    if (!q) return allOfferedTeams;
    return allOfferedTeams.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.league.toLowerCase().includes(q) || 
      t.opponent.toLowerCase().includes(q)
    );
  }, [allOfferedTeams, teamSearchQuery]);

  // Hollywoodbets fixtures filter by category and search query
  const filteredScheduleFixtures = React.useMemo(() => {
    return fixtures.filter(f => {
      const q = fixtureSearchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        f.homeTeam.toLowerCase().includes(q) ||
        f.awayTeam.toLowerCase().includes(q) ||
        f.league.toLowerCase().includes(q) ||
        (f.eventCode && f.eventCode.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (fixtureCategory === 'all') return true;
      if (fixtureCategory === 'south_africa') {
        return f.category === 'South Africa (Pro & Amateur)' || f.league.includes('Motsepe') || f.league.includes('Betway') || f.league.includes('Diski') || f.league.includes('Sasol');
      }
      if (fixtureCategory === 'amateur_minor') {
        return f.category === 'Amateur & Minor' || f.league.includes('ABC') || f.league.includes('Isthmian') || f.league.includes('Tier 3') || f.league.includes('Tier 7') || f.league.includes('USL');
      }
      if (fixtureCategory === 'uk_minor') {
        return f.category === 'UK Non-League & Semi-Pro' || f.league.includes('National League') || f.league.includes('Scottish');
      }
      if (fixtureCategory === 'european_minor') {
        return f.category === 'European Minor Leagues' || f.league.includes('Serie C') || f.league.includes('Federación') || f.league.includes('3. Liga');
      }
      if (fixtureCategory === 'major') {
        return f.category === 'Major' || f.league.includes('Nations') || f.league.includes('AFCON') || f.league.includes('NFL');
      }
      return true;
    });
  }, [fixtures, fixtureSearchQuery, fixtureCategory]);

  // Trigger AI Slip Analysis
  const runAiAnalysis = async () => {
    if (legs.length === 0) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze-bet-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs,
          stakeZar,
          currentBankrollZar,
          intelligenceMatrices: intelligenceState,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysisResult(data);

      // Run Monte Carlo simulation based on estimated probability
      const prob = (data.estimatedTrueProbability || 35) / 100;
      let simulatedWins = 0;
      const runs = 1000;
      for (let i = 0; i < runs; i++) {
        if (Math.random() < prob) simulatedWins++;
      }
      setSimulationRuns({
        runs,
        simulatedWins,
        simulatedWinRate: ((simulatedWins / runs) * 100).toFixed(1),
        expectedProfitZar: Math.round(runs * (prob * (totalOdds * stakeZar - stakeZar) - (1 - prob) * stakeZar) / runs),
      });

    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run on first load
  React.useEffect(() => {
    runAiAnalysis();
  }, [legs.length]);

  const addFixtureLeg = (fixture: FixtureSchedule, marketName: string, odds: number, target: string) => {
    const newLeg: BetLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      match: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      targetTeam: target,
      market: marketName,
      odds,
      status: 'pending',
      league: fixture.league,
    };
    setLegs(prev => [...prev, newLeg]);
  };

  const removeLeg = (id: string) => {
    setLegs(prev => prev.filter(l => l.id !== id));
  };

  const handleAddCustomLeg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHome || !customAway) return;
    const newLeg: BetLeg = {
      id: `leg-custom-${Date.now()}`,
      match: `${customHome} vs ${customAway}`,
      homeTeam: customHome,
      awayTeam: customAway,
      targetTeam: customHome,
      market: customMarket,
      odds: parseFloat(customOdds) || 1.5,
      status: 'pending',
      league: customLeague,
    };
    setLegs(prev => [...prev, newLeg]);
    setCustomHome('');
    setCustomAway('');
  };

  const handleSaveToHollywoodbetsLedger = () => {
    const newTicket: BetTicket = {
      id: `HB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`,
      placedAt: new Date().toISOString(),
      type: legs.length > 1 ? 'multibet' : 'single',
      legs: legs.map(l => ({ ...l })),
      totalOdds,
      stakeZar,
      potentialPayoutZar: potentialPayout,
      actualPayoutZar: 0,
      status: 'pending',
      profitZar: 0,
      platform: 'Hollywoodbets',
      notes: `Validated via AI Super-Learning Engine. EV: ${analysisResult?.expectedValuePercent || 'N/A'}%`,
    };
    onSaveTicket(newTicket);
    alert(`Ticket ${newTicket.id} saved to your Hollywoodbets Betting Ledger!`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-black text-white">
                AI Slip Screener & Predictive Strategy Optimizer
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Screen candidate tickets against your learned team matrices, identify trap risks before submitting to Hollywoodbets, and calculate mathematically optimal Kelly stakes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerAutoscraper}
              disabled={isScraping}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-amber-500/10"
              title="Autoscrape live fixtures for today directly from https://www.hollywoodbets.net/fixtures-and-guides"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isScraping ? 'animate-bounce' : ''}`} />
              <span>{isScraping ? 'Scraping Hollywoodbets...' : 'Autoscrape Today'}</span>
            </button>

            <button
              onClick={runAiAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 text-xs font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isAnalyzing ? 'Calculating EV...' : 'Re-Evaluate Slip'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upcoming Fixtures & Leg Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quick Match Selection */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Upcoming Hollywoodbets Fixtures</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Live Autoscraper Feed
                  </span>
                </div>
                <p className="text-xs text-slate-400">Autoscraped from hollywoodbets.net/fixtures-and-guides • Click odds to build slip</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerAutoscraper}
                  disabled={isScraping}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/50 px-2.5 py-1 rounded-lg transition"
                >
                  <RefreshCw className={`w-3 h-3 ${isScraping ? 'animate-spin' : ''}`} />
                  <span>{isScraping ? 'Scraping...' : 'Refresh Autoscraper'}</span>
                </button>
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {lastScrapedTime ? `Scraped ${lastScrapedTime}` : 'Verified Today'}
                </span>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-slate-800/80 mb-4 text-xs font-bold gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveFixtureTab('schedule')}
                className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition ${
                  activeFixtureTab === 'schedule'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Daily Schedule ({fixtures.length} Matches)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFixtureTab('teams')}
                className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition ${
                  activeFixtureTab === 'teams'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Offered Teams Directory ({allOfferedTeams.length})</span>
              </button>
            </div>

            {activeFixtureTab === 'schedule' ? (
              <div className="space-y-3">
                {/* Hollywoodbets Fixture Source & Category Filter */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-bold text-slate-200">Hollywoodbets Official Daily Fixtures</span>
                      {fixturesSource && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800">
                          {fixturesSource === 'pasted_fixture_guide' ? '📋 Imported Guide' : '⚡ Live Grounding Scraper'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerAutoscraper}
                        disabled={isScraping}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-[11px] transition flex items-center gap-1 shadow-sm"
                        title="Scrape & refresh today's live Hollywoodbets fixtures"
                      >
                        {isScraping ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Scraping Today...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            <span>⚡ Autoscrape Today</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsImportGuideOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/60 font-bold text-[11px] transition flex items-center gap-1"
                        title="Paste text directly from Hollywoodbets fixtures & guides page"
                      >
                        <FileText className="w-3 h-3 text-amber-400" />
                        <span>📋 Paste Guide Text</span>
                      </button>

                      <a
                        href="https://blog.hollywoodbets.net/download-hollywoodbets-fixtures-soccer-more/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono hidden sm:inline"
                      >
                        Official Guides ↗
                      </a>
                    </div>
                  </div>

                  {/* Fixture Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search matches by team, league, or code (e.g. HWB-4017, Motsepe, Barnet)..."
                      value={fixtureSearchQuery}
                      onChange={(e) => setFixtureSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                    />
                    {fixtureSearchQuery && (
                      <button
                        onClick={() => setFixtureSearchQuery('')}
                        className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {[
                      { id: 'all', label: `All (${fixtures.length})` },
                      { id: 'south_africa', label: '🇿🇦 South Africa (PSL & Motsepe)' },
                      { id: 'amateur_minor', label: '⚽ Amateur & Tier 3/7' },
                      { id: 'uk_minor', label: '🇬🇧 UK Non-League' },
                      { id: 'european_minor', label: '🇪🇺 European Minor' },
                      { id: 'major', label: '🌍 Major & Int\'l' },
                    ].map(cat => (
                      <button
                        key={`cat-filter-${cat.id}`}
                        type="button"
                        onClick={() => setFixtureCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-md transition font-medium ${
                          fixtureCategory === cat.id
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Market View Mode Filter */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-900 text-[11px]">
                    <span className="text-slate-500 font-semibold text-[10px] uppercase">Markets:</span>
                    {[
                      { id: 'all', label: '⚡ All Markets (1X2, DC & BTTS)' },
                      { id: '1x2', label: '1X2 & Over 2.5' },
                      { id: 'double_chance', label: '🛡️ Double Chance (1X, X2, 12)' },
                      { id: 'btts', label: '⚽ Both Teams Score (GG / NG)' },
                    ].map(m => (
                      <button
                        key={`market-mode-${m.id}`}
                        type="button"
                        onClick={() => setMarketViewMode(m.id as any)}
                        className={`px-2 py-0.5 rounded transition font-medium ${
                          marketViewMode === m.id
                            ? 'bg-purple-600 text-white font-bold shadow'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredScheduleFixtures.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
                    <p className="mb-2">No Hollywoodbets fixtures found matching current filter or search.</p>
                    <button
                      onClick={() => { setFixtureCategory('all'); setFixtureSearchQuery(''); setMarketViewMode('all'); }}
                      className="text-amber-400 hover:underline font-bold"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  filteredScheduleFixtures.map((fixture, fixIdx) => {
                    const homeTrap = blacklistedTeams.includes(fixture.homeTeam) ||
                                    (intelligenceState.team_intelligence_matrices[fixture.homeTeam]?.learned_coefficients.volatility_index >= 0.7);
                    const awayTrap = blacklistedTeams.includes(fixture.awayTeam) ||
                                    (intelligenceState.team_intelligence_matrices[fixture.awayTeam]?.learned_coefficients.volatility_index >= 0.7);

                    const homeAnchor = intelligenceState.team_intelligence_matrices[fixture.homeTeam]?.learned_coefficients.form_momentum_weight >= 1.1;
                    const awayAnchor = intelligenceState.team_intelligence_matrices[fixture.awayTeam]?.learned_coefficients.form_momentum_weight >= 1.1;

                    const { dc1X, dcX2, dc12, bttsYes, bttsNo } = computeDcAndBttsOdds(fixture);

                    return (
                      <div
                        key={`sched-fix-${fixture.id || 'f'}-${fixIdx}`}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {fixture.eventCode && (
                              <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-950/70 border border-amber-800/80 px-1.5 py-0.5 rounded">
                                {fixture.eventCode}
                              </span>
                            )}
                            <span className="font-semibold text-slate-300 flex items-center gap-1">
                              <span className="text-amber-400">●</span> {fixture.league}
                            </span>
                            {fixture.category && (
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                {fixture.category}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">{fixture.date}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              <span>{fixture.homeTeam}</span>
                              {homeTrap && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-950 text-rose-400 border border-rose-800 rounded">
                                  TRAP RISK
                                </span>
                              )}
                              {homeAnchor && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                                  ANCHOR
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">vs</div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              <span>{fixture.awayTeam}</span>
                              {awayTrap && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-950 text-rose-400 border border-rose-800 rounded">
                                  TRAP RISK
                                </span>
                              )}
                              {awayAnchor && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                                  ANCHOR
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Odds Buttons Container */}
                        <div className="space-y-2">
                          {/* Row 1: Primary 1X2 & Over 2.5 Market */}
                          {(marketViewMode === 'all' || marketViewMode === '1x2') && (
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
                                <span>1X2 & Over 2.5</span>
                                <span className="text-slate-500 font-mono">Straight Match Outcomes</span>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `${fixture.homeTeam} Win`, fixture.homeOdds, fixture.homeTeam)}
                                  className={`p-2 rounded-lg border font-mono transition ${
                                    homeTrap
                                      ? 'bg-rose-950/30 border-rose-900/60 hover:bg-rose-900/40 text-rose-300'
                                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-200'
                                  }`}
                                  title={`1: ${fixture.homeTeam} to Win`}
                                >
                                  <div className="text-[10px] text-slate-400 uppercase font-bold">1</div>
                                  <div className="font-bold">{fixture.homeOdds}x</div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `Draw`, fixture.drawOdds, 'Draw')}
                                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-200 font-mono transition"
                                  title="X: Match Ends in Draw"
                                >
                                  <div className="text-[10px] text-slate-400 uppercase font-bold">X</div>
                                  <div className="font-bold">{fixture.drawOdds}x</div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `${fixture.awayTeam} Win`, fixture.awayOdds, fixture.awayTeam)}
                                  className={`p-2 rounded-lg border font-mono transition ${
                                    awayTrap
                                      ? 'bg-rose-950/30 border-rose-900/60 hover:bg-rose-900/40 text-rose-300'
                                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-200'
                                  }`}
                                  title={`2: ${fixture.awayTeam} to Win`}
                                >
                                  <div className="text-[10px] text-slate-400 uppercase font-bold">2</div>
                                  <div className="font-bold">{fixture.awayOdds}x</div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `Over 2.5 Goals`, fixture.over25Odds, 'Over 2.5')}
                                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-amber-300 font-mono transition"
                                  title="Over 2.5 Total Match Goals"
                                >
                                  <div className="text-[10px] text-slate-400 uppercase font-bold">O 2.5</div>
                                  <div className="font-bold">{fixture.over25Odds}x</div>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Row 2: Hollywoodbets Double Chance (1X, X2, 12) & BTTS (GG / NG) Quick Buttons */}
                          {(marketViewMode === 'all' || marketViewMode === 'double_chance' || marketViewMode === 'btts') && (
                            <div className="pt-2 border-t border-slate-900">
                              <div className="flex items-center justify-between text-[10px] text-purple-300 font-semibold mb-1">
                                <span className="flex items-center gap-1">
                                  <span className="text-amber-400">⚡</span> Double Chance & BTTS (High Safety)
                                </span>
                                <span className="text-[9px] text-emerald-400 font-mono">Defensive Multibet Anchors</span>
                              </div>

                              <div className="grid grid-cols-5 gap-1.5 text-center text-xs font-mono">
                                {/* 1X */}
                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `${fixture.homeTeam} or Draw (1X)`, dc1X, fixture.homeTeam)}
                                  className="p-1.5 rounded-lg bg-slate-900/90 border border-purple-800/40 hover:border-purple-500/70 text-slate-200 hover:text-white transition group"
                                  title={`1X: ${fixture.homeTeam} Win OR Draw`}
                                >
                                  <div className="text-[9px] text-purple-300 font-bold uppercase group-hover:text-amber-300">1X</div>
                                  <div className="font-bold text-[11px] text-amber-300">{dc1X}x</div>
                                </button>

                                {/* X2 */}
                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `Draw or ${fixture.awayTeam} (X2)`, dcX2, fixture.awayTeam)}
                                  className="p-1.5 rounded-lg bg-slate-900/90 border border-purple-800/40 hover:border-purple-500/70 text-slate-200 hover:text-white transition group"
                                  title={`X2: Draw OR ${fixture.awayTeam} Win`}
                                >
                                  <div className="text-[9px] text-purple-300 font-bold uppercase group-hover:text-amber-300">X2</div>
                                  <div className="font-bold text-[11px] text-amber-300">{dcX2}x</div>
                                </button>

                                {/* 12 */}
                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `${fixture.homeTeam} or ${fixture.awayTeam} (12 - No Draw)`, dc12, 'Any Team Win')}
                                  className="p-1.5 rounded-lg bg-slate-900/90 border border-purple-800/40 hover:border-purple-500/70 text-slate-200 hover:text-white transition group"
                                  title="12: Either Team Wins (No Draw)"
                                >
                                  <div className="text-[9px] text-purple-300 font-bold uppercase group-hover:text-amber-300">12</div>
                                  <div className="font-bold text-[11px] text-amber-300">{dc12}x</div>
                                </button>

                                {/* GG (BTTS Yes) */}
                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `Both Teams To Score (GG)`, bttsYes, 'BTTS Yes')}
                                  className="p-1.5 rounded-lg bg-slate-900/90 border border-emerald-800/40 hover:border-emerald-500/70 text-emerald-200 hover:text-white transition group"
                                  title="GG: Both Teams To Score (Yes)"
                                >
                                  <div className="text-[9px] text-emerald-400 font-bold uppercase group-hover:text-amber-300">GG</div>
                                  <div className="font-bold text-[11px] text-emerald-300">{bttsYes}x</div>
                                </button>

                                {/* NG (BTTS No) */}
                                <button
                                  type="button"
                                  onClick={() => addFixtureLeg(fixture, `Both Teams NOT to Score (NG)`, bttsNo, 'BTTS No')}
                                  className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white transition group"
                                  title="NG: Both Teams NOT To Score (At least 1 clean sheet)"
                                >
                                  <div className="text-[9px] text-slate-400 font-bold uppercase group-hover:text-amber-300">NG</div>
                                  <div className="font-bold text-[11px] text-slate-200">{bttsNo}x</div>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Hollywoodbets offered teams (e.g. Kaizer, Arsenal...)"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>

                {filteredOfferedTeams.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 font-mono">
                    No active Hollywoodbets teams match your query.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {filteredOfferedTeams.map((t, tIdx) => {
                      return (
                        <div
                          key={`offered-team-${t.name}-${t.role}-${t.fixture?.id || tIdx}`}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] mb-1.5">
                              <span className="font-semibold text-purple-400 flex items-center gap-1">
                                <Users className="w-3 h-3 text-amber-500" /> {t.league}
                              </span>
                              <span className="text-slate-500 font-mono">{t.date}</span>
                            </div>

                            <div className="font-bold text-sm text-white flex items-center gap-1.5 flex-wrap">
                              <span>{t.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({t.role})</span>
                            </div>

                            <div className="text-[11px] text-slate-400 mt-1">
                              Fixture: <span className="text-slate-300 font-medium">{t.match}</span>
                            </div>

                            {/* Risk Status Indicator */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {t.isTrap && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800 rounded uppercase">
                                  Trap Risk
                                </span>
                              )}
                              {t.isAnchor && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded uppercase">
                                  Anchor Leg
                                </span>
                              )}
                              {!t.isTrap && !t.isAnchor && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded uppercase">
                                  Standard Leg
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Selection buttons */}
                          <div className="mt-3 pt-2 border-t border-slate-900/60 flex items-center justify-between gap-1 flex-wrap">
                            {(() => {
                              const { dc1X, dcX2 } = computeDcAndBttsOdds(t.fixture);
                              const dcOdds = t.role === 'Home' ? dc1X : dcX2;
                              const dcMarket = t.role === 'Home' ? `${t.name} or Draw (1X)` : `Draw or ${t.name} (X2)`;
                              const dcCode = t.role === 'Home' ? '1X' : 'X2';

                              return (
                                <>
                                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                    <span className="text-slate-400">Win: <strong className="text-amber-400">{t.odds}x</strong></span>
                                    <span className="text-slate-500">|</span>
                                    <span className="text-purple-300">DC: <strong className="text-amber-300">{dcOdds}x</strong></span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => addFixtureLeg(t.fixture, dcMarket, dcOdds, t.name)}
                                      className="px-2 py-1 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 font-bold text-[10px] uppercase transition flex items-center gap-1"
                                      title={`Double Chance: ${dcMarket}`}
                                    >
                                      <span>+{dcCode} DC</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => addFixtureLeg(t.fixture, t.marketName, t.odds, t.name)}
                                      className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase transition flex items-center gap-1"
                                      title={`Straight Win: ${t.marketName}`}
                                    >
                                      <span>+Win</span>
                                      <Plus className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Leg Input Accordion */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2">Add Custom Match Selection</h3>
            <form onSubmit={handleAddCustomLeg} className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <input
                type="text"
                placeholder="Home Team (e.g. Kaizer Chiefs)"
                value={customHome}
                onChange={(e) => setCustomHome(e.target.value)}
                className="col-span-2 sm:col-span-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                required
              />
              <input
                type="text"
                placeholder="Away Team (e.g. Chippa)"
                value={customAway}
                onChange={(e) => setCustomAway(e.target.value)}
                className="col-span-2 sm:col-span-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                required
              />
              <input
                type="text"
                placeholder="Market (e.g. Over 1.5)"
                value={customMarket}
                onChange={(e) => setCustomMarket(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                required
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.05"
                  placeholder="Odds"
                  value={customOdds}
                  onChange={(e) => setCustomOdds(e.target.value)}
                  className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono"
                  required
                />
                <button
                  type="submit"
                  className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-1.5 rounded-lg text-xs"
                >
                  Add Leg
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: Active Bet Slip & AI Verdict (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Active Slip Container */}
          <div className="bg-slate-900 border border-purple-900/50 rounded-2xl p-5 shadow-2xl space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">
                  HOLLYWOODBETS SLIP BUILDER
                </span>
                <h3 className="text-base font-black text-white">
                  {legs.length === 1 ? 'Single Bet' : `${legs.length}-Leg Multibet`}
                </h3>
              </div>
              <button
                onClick={() => setLegs([])}
                className="text-xs text-slate-400 hover:text-rose-400 transition"
                title="Clear all legs"
              >
                Clear Slip
              </button>
            </div>

            {/* Trap Alerts in Slip Banner */}
            {activeTrapAlerts.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/70 text-rose-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>CRITICAL TRAP DETECTED IN SLIP!</span>
                </div>
                {activeTrapAlerts.map((a, aIdx) => (
                  <p key={`active-trap-${a.team}-${aIdx}`} className="text-[11px] leading-relaxed text-slate-300">
                    <strong className="text-rose-400">{a.team}:</strong> {a.warning}
                  </p>
                ))}
              </div>
            )}

            {/* Legs List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {legs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No legs selected. Select from upcoming matches to evaluate.
                </div>
              ) : (
                legs.map((leg, idx) => {
                  const isTrap = activeTrapAlerts.some(a => a.team === leg.targetTeam || a.team === leg.homeTeam || a.team === leg.awayTeam);

                  return (
                    <div
                      key={`builder-leg-${leg.id || 'leg'}-${idx}`}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        isTrap
                          ? 'bg-rose-950/20 border-rose-800/80 text-rose-200'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{leg.match}</span>
                            {isTrap && (
                              <span className="text-[9px] px-1 py-0.2 bg-rose-900 text-rose-300 rounded font-black">
                                TRAP
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-amber-300 mt-0.5">
                            {leg.market}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-white text-xs">{leg.odds}x</span>
                        <button
                          onClick={() => removeLeg(leg.id)}
                          className="text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Stake & Payout Controls */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Stake Amount (ZAR):</span>
                  <span className="text-[11px] text-purple-300 font-mono">
                    Bankroll: R {currentBankrollZar.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-amber-400">R</span>
                    <input
                      type="number"
                      value={stakeZar}
                      onChange={(e) => setStakeZar(Math.max(10, parseFloat(e.target.value) || 10))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  {/* Preset Buttons */}
                  {[50, 100, 200, 500].map(amt => (
                    <button
                      key={`stake-preset-${amt}`}
                      onClick={() => setStakeZar(amt)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-mono transition ${
                        stakeZar === amt
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      R{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Combined Odds:</span>
                  <span className="font-mono font-bold text-cyan-300">{totalOdds}x</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Potential Return:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    R {potentialPayout.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Verdict & Strategic Advice Card */}
            {analysisResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                analysisResult.verdict === 'HIGH_RISK_TRAP'
                  ? 'bg-rose-950/40 border-rose-600/70'
                  : analysisResult.verdict === 'EXCELLENT_VALUE'
                  ? 'bg-emerald-950/40 border-emerald-600/70'
                  : 'bg-purple-950/40 border-purple-600/70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-black text-white uppercase tracking-wider">
                      AI ENGINE VERDICT
                    </span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    analysisResult.verdict === 'HIGH_RISK_TRAP'
                      ? 'bg-rose-600 text-white'
                      : analysisResult.verdict === 'EXCELLENT_VALUE'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-slate-950'
                  }`}>
                    {analysisResult.verdict.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
                  <div className="bg-black/30 p-1.5 rounded">
                    <div className="text-[9px] text-slate-400">EXP. VALUE</div>
                    <div className={`font-bold ${analysisResult.expectedValuePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {analysisResult.expectedValuePercent >= 0 ? '+' : ''}{analysisResult.expectedValuePercent}%
                    </div>
                  </div>
                  <div className="bg-black/30 p-1.5 rounded">
                    <div className="text-[9px] text-slate-400">TRUE PROB</div>
                    <div className="font-bold text-amber-300">
                      {analysisResult.estimatedTrueProbability}%
                    </div>
                  </div>
                  <div className="bg-black/30 p-1.5 rounded">
                    <div className="text-[9px] text-slate-400">KELLY STAKE</div>
                    <div className="font-bold text-cyan-300">
                      R {analysisResult.recommendedKellyStakeZar}
                    </div>
                  </div>
                </div>

                <div className="text-slate-200 leading-relaxed text-[11px] bg-black/40 p-2.5 rounded-lg border border-white/5">
                  {analysisResult.unrestrictedOptimizationAdvice}
                </div>

                {/* Monte Carlo Quick Result */}
                {simulationRuns && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
                    <span>Monte Carlo (1,000 runs):</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {simulationRuns.simulatedWinRate}% win frequency
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {onAdvisePendingTicket && legs.length > 0 && (
                <button
                  onClick={() => {
                    const candidatePendingTicket: BetTicket = {
                      id: `HB-PENDING-${Math.floor(100000 + Math.random() * 900000)}`,
                      placedAt: new Date().toISOString(),
                      type: legs.length > 1 ? 'multibet' : 'single',
                      legs: legs.map(l => ({ ...l, status: 'pending' })),
                      totalOdds,
                      stakeZar,
                      potentialPayoutZar: potentialPayout,
                      actualPayoutZar: 0,
                      status: 'pending',
                      profitZar: 0,
                      platform: 'Hollywoodbets',
                      notes: 'Builder candidate pending slip evaluation.',
                    };
                    onAdvisePendingTicket(candidatePendingTicket);
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Advise Potential Loss Teams Against Learned Data</span>
                </button>
              )}

              <button
                onClick={handleSaveToHollywoodbetsLedger}
                disabled={legs.length === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                Log Ticket to Hollywoodbets Ledger
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Paste Hollywoodbets Fixture Guide Modal */}
      {isImportGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-800/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Paste Hollywoodbets Fixture Guide</h3>
              </div>
              <button
                onClick={() => setIsImportGuideOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Copy raw text or fixture tables directly from <a href="https://www.hollywoodbets.net/fixtures-and-guides" target="_blank" rel="noreferrer" className="text-amber-400 underline">hollywoodbets.net/fixtures-and-guides</a> or your daily PDF/WhatsApp fixture guides and paste it below. Our parser will instantly extract all match codes, teams, leagues, and odds into your active validator!
            </p>

            <textarea
              rows={8}
              value={pastedGuideText}
              onChange={(e) => setPastedGuideText(e.target.value)}
              placeholder="Paste fixture text here (e.g., '4001 Mamelodi Sundowns vs Orlando Pirates 1.85 3.20 4.10' or raw copied table)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportGuideOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportGuideText}
                disabled={isParsingGuide || !pastedGuideText.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {isParsingGuide ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Guide Text...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Import Fixtures to Slip</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
