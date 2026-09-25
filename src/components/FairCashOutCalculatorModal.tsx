import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  X, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Coins, 
  ArrowRight, 
  Percent, 
  HelpCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { BetTicket, BetLeg } from '../types/betting';

interface RemainingLeg {
  id: string;
  match: string;
  market: string;
  odds: number;
  impliedProb: number;
  isWon?: boolean;
}

interface FairCashOutCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTicket?: BetTicket | null;
}

export const FairCashOutCalculatorModal: React.FC<FairCashOutCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialTicket,
}) => {
  // Inputs
  const [stakeZar, setStakeZar] = useState<number>(initialTicket?.stakeZar || 100);
  const [potentialPayoutZar, setPotentialPayoutZar] = useState<number>(initialTicket?.potentialPayoutZar || 1200);
  const [offeredCashOutZar, setOfferedCashOutZar] = useState<number>(550);
  const [counterHedgeOdds, setCounterHedgeOdds] = useState<number>(2.40);

  // Remaining legs state
  const [remainingLegs, setRemainingLegs] = useState<RemainingLeg[]>([
    {
      id: 'leg-1',
      match: 'South Africa vs Guinea',
      market: 'South Africa Win',
      odds: 1.80,
      impliedProb: 55.5,
      isWon: false,
    },
  ]);

  // Sync when initialTicket changes
  useEffect(() => {
    if (initialTicket) {
      setStakeZar(initialTicket.stakeZar);
      setPotentialPayoutZar(initialTicket.potentialPayoutZar);

      const pendingOrAll = initialTicket.legs.filter(l => l.status === 'pending');
      const legsToUse = pendingOrAll.length > 0 ? pendingOrAll : initialTicket.legs;

      const mapped: RemainingLeg[] = legsToUse.map((l, idx) => ({
        id: l.id || `leg-${idx}`,
        match: l.match || `${l.homeTeam} vs ${l.awayTeam}`,
        market: l.market,
        odds: l.odds,
        impliedProb: parseFloat(((1 / Math.max(1.01, l.odds)) * 100).toFixed(1)),
        isWon: l.status === 'won',
      }));

      setRemainingLegs(mapped);
      // Rough default offered cashout approximation (~60-70% of fair value)
      const combinedProb = mapped.reduce((acc, leg) => acc * (leg.impliedProb / 100), 1);
      const estFair = initialTicket.potentialPayoutZar * combinedProb;
      setOfferedCashOutZar(Math.round(estFair * 0.78));
    }
  }, [initialTicket, isOpen]);

  if (!isOpen) return null;

  // Calculations
  // 1. Joint probability of remaining legs winning
  const jointWinProbability = remainingLegs.reduce((acc, leg) => {
    return acc * (Math.max(1, Math.min(99, leg.impliedProb)) / 100);
  }, 1);

  // 2. True Statistical Equity (Fair Cash-Out Value)
  const trueFairCashOut = potentialPayoutZar * jointWinProbability;

  // 3. Haircut / Extortion Vig taken by Bookmaker
  const cashOutDifference = trueFairCashOut - offeredCashOutZar;
  const bookmakerHaircutPct = trueFairCashOut > 0 ? (cashOutDifference / trueFairCashOut) * 100 : 0;

  // 4. Guaranteed Counter-Hedge Calculation
  // If user hedges against remaining risk with counter-market at counterHedgeOdds:
  // Let H = hedge stake. If ticket wins: payout - stake - H. If ticket loses: H * counterHedgeOdds - stake - H.
  // Equating returns: payout - H = H * (counterHedgeOdds - 1) => H = payout / counterHedgeOdds.
  const optimalHedgeStake = counterHedgeOdds > 1 ? Math.round(potentialPayoutZar / counterHedgeOdds) : 0;
  const guaranteedProfitWithHedge = potentialPayoutZar > 0 && counterHedgeOdds > 1 
    ? Math.round(potentialPayoutZar - optimalHedgeStake - stakeZar) 
    : 0;
  const netCashOutProfit = offeredCashOutZar - stakeZar;
  const hedgeAdvantageZar = guaranteedProfitWithHedge - netCashOutProfit;

  // Decision & Recommendation
  let recommendationBadge: { label: string; color: string; desc: string; icon: any };
  if (bookmakerHaircutPct >= 20) {
    recommendationBadge = {
      label: 'EXCESSIVE HAIRCUT — REJECT OFFER',
      color: 'bg-rose-950 text-rose-300 border-rose-700',
      desc: `Hollywoodbets is charging an unfair ${bookmakerHaircutPct.toFixed(1)}% penalty fee (R${Math.round(cashOutDifference)} below true statistical equity). Either let it ride or execute the guaranteed counter-hedge below.`,
      icon: AlertTriangle,
    };
  } else if (bookmakerHaircutPct >= 10) {
    recommendationBadge = {
      label: 'MODERATE VIG — SUB-OPTIMAL',
      color: 'bg-amber-950 text-amber-300 border-amber-700',
      desc: `The bookmaker is taking a ${bookmakerHaircutPct.toFixed(1)}% haircut. Acceptable only if this bet represents an outsized portion of your bankroll and you wish to eliminate variance.`,
      icon: Scale,
    };
  } else if (bookmakerHaircutPct > 0) {
    recommendationBadge = {
      label: 'FAIR MARKET CASHOUT',
      color: 'bg-purple-950 text-purple-300 border-purple-700',
      desc: `Offer is reasonably aligned with true equity (only ${bookmakerHaircutPct.toFixed(1)}% bookmaker margin). Safe to take if satisfied with current profit.`,
      icon: CheckCircle2,
    };
  } else {
    recommendationBadge = {
      label: 'PREMIUM OVERPAY — CASH OUT NOW',
      color: 'bg-emerald-950 text-emerald-300 border-emerald-700',
      desc: `Bookmaker algorithm has mispriced this ticket! The offered cashout is higher than true mathematical equity by +${Math.abs(bookmakerHaircutPct).toFixed(1)}%. Take the money immediately.`,
      icon: Zap,
    };
  }

  const handleUpdateLegOdds = (id: string, newOdds: number) => {
    setRemainingLegs(prev => prev.map(leg => {
      if (leg.id !== id) return leg;
      const validOdds = Math.max(1.01, newOdds);
      return {
        ...leg,
        odds: validOdds,
        impliedProb: parseFloat(((1 / validOdds) * 100).toFixed(1)),
      };
    }));
  };

  const handleUpdateLegProb = (id: string, newProb: number) => {
    setRemainingLegs(prev => prev.map(leg => {
      if (leg.id !== id) return leg;
      const validProb = Math.max(1, Math.min(99, newProb));
      return {
        ...leg,
        impliedProb: validProb,
        odds: parseFloat((100 / validProb).toFixed(2)),
      };
    }));
  };

  const handleAddLeg = () => {
    const newId = `leg-${Date.now()}`;
    setRemainingLegs(prev => [
      ...prev,
      {
        id: newId,
        match: 'Upcoming Leg',
        market: 'Match Winner',
        odds: 1.75,
        impliedProb: 57.1,
      },
    ]);
  };

  const handleRemoveLeg = (id: string) => {
    if (remainingLegs.length <= 1) return;
    setRemainingLegs(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-purple-900/60 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-white tracking-wide">
                Fair Cash-Out & Arbitrage Hedging Calculator
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Compute true statistical equity of your ticket and verify if Hollywoodbets is offering fair value or a heavy haircut.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: True Fair Value */}
          <div className="p-4 rounded-xl bg-slate-950 border border-purple-800/50 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>True Mathematical Equity:</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800">
                FAIR VALUE
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-purple-300">
              R {Math.round(trueFairCashOut).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Based on {(jointWinProbability * 100).toFixed(1)}% joint win probability of remaining legs.
            </div>
          </div>

          {/* Card 2: Bookmaker Offer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Bookmaker Cash-Out Offer:</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                HOLLYWOODBETS
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              R {offeredCashOutZar.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Net Profit if accepted: <strong className={netCashOutProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {netCashOutProfit >= 0 ? '+' : ''}R {netCashOutProfit.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Card 3: Vig / Haircut Extraction */}
          <div className={`p-4 rounded-xl border shadow-inner ${
            bookmakerHaircutPct >= 18 
              ? 'bg-rose-950/40 border-rose-800/80' 
              : bookmakerHaircutPct >= 8 
              ? 'bg-amber-950/40 border-amber-800/80' 
              : 'bg-emerald-950/40 border-emerald-800/80'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Bookmaker Margin / Haircut:</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${
                bookmakerHaircutPct >= 18 ? 'bg-rose-900 text-rose-200 border-rose-700' : 'bg-black/40 text-white'
              }`}>
                {bookmakerHaircutPct >= 0 ? 'HAIRCUT' : 'BONUS'}
              </span>
            </div>
            <div className={`text-2xl font-black font-mono ${
              bookmakerHaircutPct >= 18 ? 'text-rose-400' : bookmakerHaircutPct >= 8 ? 'text-amber-300' : 'text-emerald-400'
            }`}>
              {bookmakerHaircutPct >= 0 ? `-${bookmakerHaircutPct.toFixed(1)}%` : `+${Math.abs(bookmakerHaircutPct).toFixed(1)}%`}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Value difference: <span className="font-bold text-slate-200">R {Math.abs(Math.round(cashOutDifference)).toLocaleString()}</span>
            </div>
          </div>

        </div>

        {/* AI & Mathematical Verdict Banner */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${recommendationBadge.color}`}>
          <recommendationBadge.icon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-black text-sm tracking-wide">{recommendationBadge.label}</div>
            <p className="leading-relaxed opacity-95">{recommendationBadge.desc}</p>
          </div>
        </div>

        {/* Interactive Controls & Ticket Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Ticket Figures & Offer */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-4 text-xs">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Ticket Financial Parameters</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Total Stake Placed (ZAR):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-bold">R</span>
                  <input
                    type="number"
                    value={stakeZar}
                    onChange={(e) => setStakeZar(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Total Potential Payout (ZAR):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-bold">R</span>
                  <input
                    type="number"
                    value={potentialPayoutZar}
                    onChange={(e) => setPotentialPayoutZar(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-amber-400 font-bold block mb-1">
                Hollywoodbets Cash-Out Offer (ZAR):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-amber-500 font-bold">R</span>
                <input
                  type="number"
                  value={offeredCashOutZar}
                  onChange={(e) => setOfferedCashOutZar(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-lg pl-7 pr-3 py-1.5 text-amber-300 font-mono text-sm font-black focus:outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Enter the exact cashout amount shown on your mobile Hollywoodbets ticket.
              </span>
            </div>

            {/* Quick Cash-Out vs Let It Ride EV comparison */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>Hold / Let It Ride EV:</span>
                <span className="font-mono font-bold text-white">R {Math.round(trueFairCashOut)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Accept Cash-Out Offer:</span>
                <span className="font-mono font-bold text-amber-300">R {offeredCashOutZar}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Value Lost to Bookmaker Vig:</span>
                <span className="font-mono font-bold text-rose-400">
                  {cashOutDifference > 0 ? `-R ${Math.round(cashOutDifference)}` : '+R 0'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Remaining Legs Breakdown */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-400" />
                <span>Pending Leg Odds & Probabilities ({remainingLegs.length})</span>
              </h3>
              <button
                onClick={handleAddLeg}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 underline"
              >
                + Add Leg
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {remainingLegs.map((leg, index) => (
                <div
                  key={`fair-cashout-leg-${leg.id || 'leg'}-${index}`}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate text-xs">{leg.match}</div>
                    <div className="text-[10px] text-slate-400 truncate">{leg.market}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16">
                      <label className="text-[9px] text-slate-500 block">Odds</label>
                      <input
                        type="number"
                        step="0.05"
                        value={leg.odds}
                        onChange={(e) => handleUpdateLegOdds(leg.id, parseFloat(e.target.value) || 1.05)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold text-purple-300"
                      />
                    </div>

                    <div className="w-16">
                      <label className="text-[9px] text-slate-500 block">Win Prob %</label>
                      <input
                        type="number"
                        step="1"
                        value={leg.impliedProb}
                        onChange={(e) => handleUpdateLegProb(leg.id, parseFloat(e.target.value) || 50)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold text-emerald-400"
                      />
                    </div>

                    {remainingLegs.length > 1 && (
                      <button
                        onClick={() => handleRemoveLeg(leg.id)}
                        className="text-slate-500 hover:text-rose-400 font-bold p-1 text-xs"
                        title="Remove leg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-900/40 text-[11px] flex items-center justify-between">
              <span className="text-slate-300">Combined Ticket Survival Rate:</span>
              <span className="font-mono font-bold text-amber-300 text-xs">
                {(jointWinProbability * 100).toFixed(1)}%
              </span>
            </div>
          </div>

        </div>

        {/* Smart Counter-Hedging Section (Beat the Cash-Out Offer) */}
        <div className="bg-slate-950 border border-emerald-900/50 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">
                Smart Counter-Hedge Engine (Lock in Guaranteed Risk-Free Profit)
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Arbitrage Protection
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Instead of surrendering a {bookmakerHaircutPct.toFixed(1)}% haircut to Hollywoodbets, you can place a counter-bet on the opposing outcome (e.g. Draw or Opponent) to lock in guaranteed profit regardless of which team wins.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-slate-400 block mb-1">Counter-Market Odds (Decimal):</label>
              <input
                type="number"
                step="0.05"
                value={counterHedgeOdds}
                onChange={(e) => setCounterHedgeOdds(Math.max(1.05, parseFloat(e.target.value) || 2.0))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">e.g. Draw or Opponent Win</span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Recommended Hedge Stake:</label>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono font-bold text-amber-300 text-sm">
                R {optimalHedgeStake.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Stake on counter-market</span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Guaranteed Risk-Free Profit:</label>
              <div className="p-2 rounded-lg bg-slate-900 border border-emerald-800/80 font-mono font-bold text-emerald-400 text-sm">
                +R {guaranteedProfitWithHedge.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-1 block">
                {hedgeAdvantageZar > 0 ? `+R ${hedgeAdvantageZar} more than cashout!` : 'Compared to cashout'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-500">
            BetMatrix AI • Hollywoodbets Fair Value Mathematical Model
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close Calculator
          </button>
        </div>

      </div>
    </div>
  );
};
