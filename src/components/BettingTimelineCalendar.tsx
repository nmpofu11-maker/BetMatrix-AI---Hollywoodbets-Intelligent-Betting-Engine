import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Flame,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Info,
  Layers,
  CalendarDays,
  Lock,
  Sparkles,
  Trash2,
  FileText,
  FileUp
} from 'lucide-react';
import { BetTicket, FixtureSchedule } from '../types/betting';
import { getDynamicDateWindow } from '../utils/fixtureStorage';

export interface CalendarMatchItem {
  id: string;
  dateKey: string; // YYYY-MM-DD
  dateObj: Date;
  match: string;
  homeTeam: string;
  awayTeam: string;
  targetTeam?: string;
  market: string;
  odds: number;
  status: 'won' | 'lost' | 'pending';
  faultContribution?: boolean;
  league?: string;
  score?: string;
  ticketId?: string;
  ticketType?: 'single' | 'multibet' | 'system';
  ticketStakeZar?: number;
  ticketProfitZar?: number;
  isFixtureOnly?: boolean;
  notes?: string;
}

interface BettingTimelineCalendarProps {
  tickets: BetTicket[];
  activeFixtures?: FixtureSchedule[];
  onNavigateTab?: (tab: string) => void;
  onDiagnoseMistakes?: (ticket: BetTicket) => void;
  onAdvisePendingTicket?: (ticket: BetTicket) => void;
  onDeleteFixture?: (fixtureId: string) => void;
  onPurgeSlates?: () => void;
  onOpenIngestionModal?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const BettingTimelineCalendar: React.FC<BettingTimelineCalendarProps> = ({
  tickets,
  activeFixtures = [],
  onNavigateTab,
  onDiagnoseMistakes,
  onAdvisePendingTicket,
  onDeleteFixture,
  onPurgeSlates,
  onOpenIngestionModal,
}) => {
  // 1. Dynamic Rolling Date Window (Zero hardcoded date cutoffs)
  const { todayKey, rolling48hStart, tomorrowKey } = useMemo(() => getDynamicDateWindow(), []);

  // 2. Strict Default Preset: TODAY (evaluated against dynamic client time new Date())
  // Application launch strictly defaults to 'today' to prevent future matches weeks/months ahead from usurping today's predictions
  const [presetId, setPresetId] = useState<'today' | '48h' | 'tomorrow' | 'all'>('today');

  useEffect(() => {
    localStorage.setItem('betmatrix_calendar_preset', presetId);
  }, [presetId]);

  // Extract all match items from tickets + upcoming fixtures with dynamic date parsing
  const allMatchItems = useMemo(() => {
    const items: CalendarMatchItem[] = [];

    // 1. Matches from bet tickets
    tickets.forEach((ticket) => {
      const ticketDate = new Date(ticket.placedAt);
      const dateKey = !isNaN(ticketDate.getTime())
        ? ticketDate.toISOString().split('T')[0]
        : todayKey;

      ticket.legs.forEach((leg) => {
        items.push({
          id: `${ticket.id}-${leg.id}`,
          dateKey,
          dateObj: isNaN(ticketDate.getTime()) ? new Date() : ticketDate,
          match: leg.match,
          homeTeam: leg.homeTeam,
          awayTeam: leg.awayTeam,
          targetTeam: leg.targetTeam,
          market: leg.market,
          odds: leg.odds,
          status: leg.status === 'void' ? 'pending' : leg.status,
          faultContribution: leg.faultContribution,
          league: leg.league || 'Football',
          score: leg.score,
          ticketId: ticket.id,
          ticketType: ticket.type,
          ticketStakeZar: ticket.stakeZar,
          ticketProfitZar: ticket.profitZar,
          notes: ticket.notes,
        });
      });
    });

    // 2. Scheduled matches from active server/persisted slate (Strict zero synthetic rule)
    const currentSlate = activeFixtures || [];
    currentSlate.forEach((fix: FixtureSchedule) => {
      let fixDate = new Date();
      if (fix.kickoffTime) {
        const parsed = new Date(fix.kickoffTime);
        if (!isNaN(parsed.getTime())) fixDate = parsed;
      } else if (fix.date?.toLowerCase().includes('today')) {
        fixDate = new Date();
      } else if (fix.date?.toLowerCase().includes('tomorrow')) {
        fixDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (fix.date) {
        const parsed = new Date(fix.date);
        if (!isNaN(parsed.getTime())) fixDate = parsed;
      }

      const dateKey = fixDate.toISOString().split('T')[0];

      // Avoid duplicating if already present in tickets
      const alreadyHasMatch = items.some(
        (i) => i.dateKey === dateKey && i.homeTeam === fix.homeTeam && i.awayTeam === fix.awayTeam
      );

      if (!alreadyHasMatch) {
        items.push({
          id: `fixture-${fix.id}`,
          dateKey,
          dateObj: fixDate,
          match: `${fix.homeTeam} vs ${fix.awayTeam}`,
          homeTeam: fix.homeTeam,
          awayTeam: fix.awayTeam,
          market: `1X2 (H: ${fix.homeOdds} | D: ${fix.drawOdds} | A: ${fix.awayOdds})`,
          odds: fix.homeOdds,
          status: 'pending',
          league: fix.league,
          isFixtureOnly: true,
          notes: `Hollywoodbets Market Event Code: ${fix.eventCode || 'N/A'} • Category: ${fix.category || 'Regional'}`,
        });
      }
    });

    return items;
  }, [tickets, activeFixtures, todayKey]);

  // Calendar strictly defaults to CURRENT MONTH & YEAR (not future months)
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [statusFilter, setStatusFilter] = useState<'all' | 'won' | 'lost' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setPresetId('today');
    setSelectedDateKey(todayKey);
  };

  // Filtered match items based on Preset (Strict isolation of Today's slate)
  const filteredMatches = useMemo(() => {
    return allMatchItems.filter((item) => {
      // 1. Date Scope Preset Filtering
      if (presetId === 'today') {
        if (item.dateKey !== todayKey) return false;
      } else if (presetId === '48h') {
        if (item.dateKey < rolling48hStart || item.dateKey > todayKey) return false;
      } else if (presetId === 'tomorrow') {
        if (item.dateKey !== tomorrowKey) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = (
          item.match +
          ' ' +
          item.homeTeam +
          ' ' +
          item.awayTeam +
          ' ' +
          (item.league || '') +
          ' ' +
          (item.ticketId || '')
        ).toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      return true;
    });
  }, [allMatchItems, presetId, todayKey, rolling48hStart, tomorrowKey, statusFilter, searchQuery]);

  // Matches in the currently selected month
  const currentMonthMatches = useMemo(() => {
    if (presetId !== 'all') {
      return filteredMatches;
    }
    return filteredMatches.filter((item) => {
      return (
        item.dateObj.getFullYear() === currentYear &&
        item.dateObj.getMonth() === currentMonth
      );
    });
  }, [filteredMatches, presetId, currentYear, currentMonth]);

  // Aggregate monthly stats for the active view
  const monthStats = useMemo(() => {
    let won = 0;
    let lost = 0;
    let pending = 0;
    let netProfit = 0;

    currentMonthMatches.forEach((item) => {
      if (item.status === 'won') {
        won++;
        if (item.ticketProfitZar && item.ticketProfitZar > 0) {
          netProfit += item.ticketProfitZar;
        }
      } else if (item.status === 'lost') {
        lost++;
        if (item.ticketStakeZar && item.faultContribution) {
          netProfit -= item.ticketStakeZar;
        }
      } else {
        pending++;
      }
    });

    const totalSettled = won + lost;
    const winRate = totalSettled > 0 ? Math.round((won / totalSettled) * 100) : 0;

    return {
      total: currentMonthMatches.length,
      won,
      lost,
      pending,
      winRate,
      netProfit,
    };
  }, [currentMonthMatches]);

  // Calendar Grid Day Calculations
  const calendarGridDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      matches: CalendarMatchItem[];
      isToday: boolean;
    }> = [];

    // Days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: 0,
        dateKey: `prev-${i}`,
        isCurrentMonth: false,
        matches: [],
        isToday: false,
      });
    }

    // Days in active month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(currentYear, currentMonth, day);
      const dateKey = dayDate.toISOString().split('T')[0];
      const isToday = dateKey === todayKey;

      const dayMatches = allMatchItems.filter((item) => item.dateKey === dateKey);

      days.push({
        dayNumber: day,
        dateKey,
        isCurrentMonth: true,
        matches: dayMatches,
        isToday,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayKey, allMatchItems]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDateKey) return [];
    return allMatchItems.filter((i) => i.dateKey === selectedDateKey);
  }, [allMatchItems, selectedDateKey]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
      {/* Top Header & Preset Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Daily Predictions & Match Timeline Calendar</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> TODAY LOCKED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Default scope strictly isolates today's active matches with a dynamic 48-hour rolling window. Future dates cannot displace today's slate.
              </p>
            </div>
          </div>
        </div>

        {/* View Controls & Date Stepper */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenIngestionModal && (
            <button
              onClick={onOpenIngestionModal}
              className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/60 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Upload PDF fixture sheets or guides"
            >
              <FileUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Fixture PDF</span>
            </button>
          )}

          {onPurgeSlates && (
            <button
              onClick={onPurgeSlates}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Purge and wipe all stored fixtures and memory caches"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge & Reset Slates</span>
            </button>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Timeline Feed</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Month Grid</span>
            </button>
          </div>

          {/* Jump to Today Button */}
          <button
            onClick={handleJumpToToday}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today's Slate</span>
          </button>
        </div>
      </div>

      {/* Date Filter Preset Bar (Requirement 1 & 4) */}
      <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-2 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" /> View Scope:
          </span>

          <button
            onClick={() => {
              setPresetId('today');
              setSelectedDateKey(todayKey);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              presetId === 'today'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Today's Matches ({allMatchItems.filter(i => i.dateKey === todayKey).length})</span>
          </button>

          <button
            onClick={() => setPresetId('48h')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              presetId === '48h'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>48-Hour Rolling Buffer</span>
          </button>

          <button
            onClick={() => setPresetId('tomorrow')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              presetId === 'tomorrow'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>Tomorrow ({allMatchItems.filter(i => i.dateKey === tomorrowKey).length})</span>
          </button>

          <button
            onClick={() => setPresetId('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              presetId === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>All Dates ({allMatchItems.length})</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1">
          {(['all', 'won', 'lost', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition ${
                statusFilter === s
                  ? s === 'won'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : s === 'lost'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : s === 'pending'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main View: Timeline or Grid */}
      {viewMode === 'timeline' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing <strong>{filteredMatches.length}</strong> active matches for scope: <strong className="text-amber-400 uppercase font-mono">{presetId}</strong></span>
            <span>Client Time: <strong className="text-white font-mono">{todayKey}</strong></span>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
              <Clock className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
              <p className="text-sm font-medium text-slate-300">No matches found matching active scope [{presetId}]</p>
              <p className="text-xs">Use the Raw Bookmaker Ingestion tool to paste today's match slate or switch scope.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredMatches.map((item, idx) => (
                <div
                  key={`timeline-item-${item.id}-${idx}`}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.status === 'won'
                      ? 'bg-emerald-950/20 border-emerald-900/50 hover:border-emerald-700/60'
                      : item.status === 'lost'
                      ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700/60'
                      : 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                        item.status === 'won'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : item.status === 'lost'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      {item.status === 'won' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : item.status === 'lost' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-white">{item.match}</strong>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.2 rounded font-mono border ${
                            item.status === 'won'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : item.status === 'lost'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Market: <strong className="text-slate-200">{item.market}</strong></span>
                        <span>Odds: <strong className="text-amber-300 font-mono">{item.odds}</strong></span>
                        {item.score && <span>Score: <strong className="text-white font-mono">{item.score}</strong></span>}
                        {item.league && <span className="text-purple-300 text-[11px] font-medium">{item.league}</span>}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-slate-300">
                        {item.dateKey}
                      </div>
                      {item.ticketId && (
                        <div className="text-[10px] font-mono text-purple-400 mt-0.5">
                          Ticket #{item.ticketId}
                        </div>
                      )}
                      {item.isFixtureOnly && (
                        <span className="inline-block mt-1 text-[9px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                          Scheduled Fixture
                        </span>
                      )}
                    </div>

                    {item.isFixtureOnly && onDeleteFixture && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const fixId = item.id.replace('fixture-', '');
                          if (confirm(`Remove match "${item.match}" from active slate and server disk?`)) {
                            onDeleteFixture(fixId);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800/60 transition cursor-pointer"
                        title="Delete this match from disk & active slate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Month Grid View */
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarGridDays.map((cell, idx) => {
              const hasMatches = cell.matches.length > 0;
              const isSelected = selectedDateKey === cell.dateKey;

              return (
                <div
                  key={`day-cell-${cell.dateKey}-${idx}`}
                  onClick={() => {
                    if (hasMatches) {
                      setSelectedDateKey(isSelected ? null : cell.dateKey);
                    }
                  }}
                  className={`min-h-[85px] p-2 rounded-xl border transition flex flex-col justify-between select-none ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-950/30 border-slate-900/50 text-slate-600 opacity-40'
                      : hasMatches
                      ? isSelected
                        ? 'bg-purple-950/60 border-amber-400/90 shadow-md ring-1 ring-amber-400/50 cursor-pointer'
                        : 'bg-slate-950/80 border-slate-800 hover:border-purple-600 hover:bg-slate-900/90 cursor-pointer'
                      : cell.isToday
                      ? 'bg-slate-950/90 border-purple-800/80 text-slate-300'
                      : 'bg-slate-950/40 border-slate-900/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        cell.isToday
                          ? 'w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center'
                          : cell.isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasMatches && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold">
                        {cell.matches.length}
                      </span>
                    )}
                  </div>

                  {hasMatches && (
                    <div className="space-y-1 my-1">
                      {cell.matches.slice(0, 2).map((m, mIdx) => (
                        <div
                          key={`chip-${m.id}-${mIdx}`}
                          className="text-[9px] truncate px-1.5 py-0.5 rounded border leading-tight flex items-center gap-1 bg-amber-950/70 border-amber-800 text-amber-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="truncate">{m.match}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day Match Inspector Panel */}
      {selectedDateKey && selectedDayItems.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/60 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-xs sm:text-sm text-white">
                Match Inspector for {selectedDateKey} ({selectedDayItems.length} match{selectedDayItems.length > 1 ? 'es' : ''})
              </h4>
            </div>
            <button
              onClick={() => setSelectedDateKey(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
            {selectedDayItems.map((item, idx) => (
              <div
                key={`inspector-item-${item.id}-${idx}`}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <strong className="text-white font-bold">{item.match}</strong>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {item.status}
                    </span>
                    {item.league && (
                      <span className="text-[10px] text-slate-400 font-mono">({item.league})</span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-3">
                    <span>Market: <strong>{item.market}</strong></span>
                    <span>Odds: <strong className="text-amber-300 font-mono">{item.odds}</strong></span>
                    {item.score && <span>Score: <strong className="text-white font-mono">{item.score}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.isFixtureOnly && onDeleteFixture && (
                    <button
                      type="button"
                      onClick={() => {
                        const fixId = item.id.replace('fixture-', '');
                        if (confirm(`Remove match "${item.match}" from active slate and server disk?`)) {
                          onDeleteFixture(fixId);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/60 transition cursor-pointer"
                      title="Delete this match from disk & active slate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {item.ticketId && onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('history')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
                    >
                      View Ticket #{item.ticketId}
                    </button>
                  )}
                  {item.status === 'pending' && onAdvisePendingTicket && (
                    <button
                      onClick={() => {
                        const t = tickets.find((tk) => tk.id === item.ticketId);
                        if (t) onAdvisePendingTicket(t);
                      }}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition shadow-sm cursor-pointer"
                    >
                      Advise Risk
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
