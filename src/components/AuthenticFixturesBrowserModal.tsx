import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, Calendar, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Trophy, PlayCircle, Clock } from 'lucide-react';
import { FixtureSchedule } from '../types/betting';

interface AuthenticFixturesBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFixtureIntoValidator: (fixture: FixtureSchedule) => void;
  onShowToast: (msg: string) => void;
}

export const AuthenticFixturesBrowserModal: React.FC<AuthenticFixturesBrowserModalProps> = ({
  isOpen,
  onClose,
  onLoadFixtureIntoValidator,
  onShowToast,
}) => {
  const [fixtures, setFixtures] = useState<FixtureSchedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sourceNote, setSourceNote] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');

  const fetchLiveFixtures = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/live-fixtures');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.fixtures)) {
          setFixtures(data.fixtures);
          setSourceNote(data.source || 'Live Sports Web Grounding');
          onShowToast(`Successfully fetched ${data.fixtures.length} authentic live fixtures chronologically.`);
        }
      } else {
        onShowToast('Failed to fetch authentic live fixtures.');
      }
    } catch (err: any) {
      console.error('Error fetching live fixtures:', err);
      onShowToast('Error fetching live sports data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && fixtures.length === 0) {
      fetchLiveFixtures();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const leagues = ['ALL', ...Array.from(new Set(fixtures.map(f => f.league)))];
  const filteredFixtures = selectedLeague === 'ALL' 
    ? fixtures 
    : fixtures.filter(f => f.league.toLowerCase() === selectedLeague.toLowerCase());

  // Chronological sorting: Live/HT first, then sorted by kickoff time & date string
  const sortedFixtures = [...filteredFixtures].sort((a, b) => {
    const aLive = a.liveStatus?.toLowerCase() === 'live' || a.liveStatus?.toLowerCase() === 'ht';
    const bLive = b.liveStatus?.toLowerCase() === 'live' || b.liveStatus?.toLowerCase() === 'ht';
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;

    return (a.kickoffTime || '').localeCompare(b.kickoffTime || '');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Authentic Live Fixtures & Scores Center
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Chronological Order Active
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Sorted strictly by starting times and dates across EPL, La Liga, Betway Premiership, and UEFA competitions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-2 rounded-xl transition-all"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold uppercase text-slate-400 mr-2 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> League:
            </span>
            {leagues.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLeague(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedLeague === l
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLiveFixtures}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Fetching Live Data...' : 'Refresh & Re-sort Fixtures'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs text-purple-300 bg-purple-950/40 border border-purple-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Showing <strong>{sortedFixtures.length}</strong> matches sorted chronologically by starting times and date.</span>
            </div>
            {sourceNote && <span className="text-slate-400">{sourceNote}</span>}
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
              <p className="text-white font-medium">Sorting and synchronizing authentic fixtures...</p>
            </div>
          ) : sortedFixtures.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-800/30 border border-slate-800 rounded-2xl">
              <p className="text-lg font-medium text-white">No live fixtures found</p>
              <p className="text-sm">Try refreshing or selecting a different league filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedFixtures.map((fixture, idx) => {
                const isLive = fixture.liveStatus?.toLowerCase() === 'live' || fixture.liveStatus?.toLowerCase() === 'ht';
                return (
                  <div
                    key={fixture.eventCode || idx}
                    className={`border rounded-2xl p-4 transition-all shadow-lg flex flex-col justify-between space-y-3 ${
                      isLive 
                        ? 'bg-slate-800/95 border-emerald-500/40 shadow-emerald-950/30' 
                        : 'bg-slate-800/70 border-slate-700/80 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-800/60">
                        {fixture.league}
                      </span>
                      <span className="text-xs text-amber-300 flex items-center gap-1 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        <Calendar className="w-3.5 h-3.5" /> {fixture.kickoffTime}
                      </span>
                    </div>

                    <div className="space-y-1.5 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{fixture.homeTeam}</span>
                        <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                          Home {fixture.homeOdds}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{fixture.awayTeam}</span>
                        <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                          Away {fixture.awayOdds}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                      <span className={`flex items-center gap-1.5 font-bold ${isLive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                        <PlayCircle className="w-3.5 h-3.5" />
                        {fixture.liveStatus || 'Upcoming'} {fixture.liveScore ? `(${fixture.liveScore})` : ''}
                      </span>
                      <button
                        onClick={() => {
                          onLoadFixtureIntoValidator(fixture);
                          onClose();
                          onShowToast(`Loaded ${fixture.homeTeam} vs ${fixture.awayTeam} into Bet Validator!`);
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow transition-all"
                      >
                        <span>Load into Validator</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 px-6 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Sorted Chronologically by Kickoff Time & Date</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all"
          >
            Close Browser
          </button>
        </div>
      </div>
    </div>
  );
};
