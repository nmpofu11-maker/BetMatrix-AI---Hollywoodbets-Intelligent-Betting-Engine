import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  ArrowRight,
  ClipboardPaste,
  Flame,
  BrainCircuit,
  Info,
  Mic,
  MicOff,
  Volume2,
  Radio,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  FileUp,
  FileType
} from 'lucide-react';
import { BetTicket } from '../types/betting';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseSpeechToBetSlip, RecognizedSpeechFixture } from '../utils/speechSlipParser';

interface SlipImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTicket: (ticket: BetTicket, openMistakeAdvisor?: boolean) => void;
  existingTickets?: BetTicket[];
}

export const SlipImporterModal: React.FC<SlipImporterModalProps> = ({
  isOpen,
  onClose,
  onImportTicket,
  existingTickets = [],
}) => {
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTicket, setParsedTicket] = useState<BetTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [showVoiceTips, setShowVoiceTips] = useState(false);

  // Web Speech API hook
  const {
    isListening,
    isSupported: isSpeechSupported,
    transcript: speechTranscript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    setManualTranscript,
  } = useSpeechRecognition();

  // Combine speech final & interim transcripts
  const fullSpokenText = useMemo(() => {
    return [speechTranscript, interimTranscript].filter(Boolean).join(' ').trim();
  }, [speechTranscript, interimTranscript]);

  // Real-time fixture parsing from dictated speech
  const parsedFromSpeech = useMemo(() => {
    if (!fullSpokenText) return null;
    return parseSpeechToBetSlip(fullSpokenText);
  }, [fullSpokenText]);

  // Auto-sync speech to textarea if user is actively dictating
  useEffect(() => {
    if (parsedFromSpeech && parsedFromSpeech.formattedSlipText) {
      setRawText(parsedFromSpeech.formattedSlipText);
    }
  }, [parsedFromSpeech]);

  // Stop listening on modal close
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  };

  const getCleanTeamSet = (matchStr: string) => {
    const cleanStr = matchStr.toLowerCase()
      .replace(/\s+(?:vs|v|vs\.|-)\s+/gi, ' vs ')
      .replace(/[\d.)]+/g, '');
    const parts = cleanStr.split(/\s+vs\s+/);
    return parts.map(p => 
      p.replace(/[^a-z0-9]/g, '')
       .replace(/\b(?:fc|united|city|rovers|hotspur|town|athletic|premium|premiership|league)\b/gi, '')
       .trim()
    ).filter(Boolean).sort();
  };

  const isLegDuplicate = (legA: any, legB: any) => {
    const teamsA = getCleanTeamSet(legA.match || `${legA.homeTeam || ''} vs ${legA.awayTeam || ''}`);
    const teamsB = getCleanTeamSet(legB.match || `${legB.homeTeam || ''} vs ${legB.awayTeam || ''}`);
    
    if (teamsA.length === 0 || teamsB.length === 0 || teamsA.join('') !== teamsB.join('')) {
      return false;
    }
    
    const oddsA = Number(legA.odds) || 0;
    const oddsB = Number(legB.odds) || 0;
    return Math.abs(oddsA - oddsB) < 0.05;
  };

  const isAlreadyImported = parsedTicket ? existingTickets.some(
    (t) => {
      // 1. Direct ID comparison (normalized)
      const idA = t.id.toLowerCase().replace(/[^0-9]/g, '');
      const idB = parsedTicket.id.toLowerCase().replace(/[^0-9]/g, '');
      
      if (idA && idB && idA.length >= 6 && idB.length >= 6 && idA === idB) {
        return true;
      }
      
      const rawIdA = t.id.toLowerCase().trim();
      const rawIdB = parsedTicket.id.toLowerCase().trim();
      if (rawIdA === rawIdB) {
        return true;
      }

      // 2. Leg Selections comparison (order-independent)
      if (t.legs.length === parsedTicket.legs.length && t.legs.length > 0) {
        const matchedIndices = new Set<number>();
        
        const allMatched = parsedTicket.legs.every((parsedLeg) => {
          const matchIdx = t.legs.findIndex((existingLeg, idx) => {
            if (matchedIndices.has(idx)) return false;
            return isLegDuplicate(existingLeg, parsedLeg);
          });
          
          if (matchIdx !== -1) {
            matchedIndices.add(matchIdx);
            return true;
          }
          return false;
        });

        if (allMatched) {
          return true;
        }
      }
      return false;
    }
  ) : false;

  if (!isOpen) return null;

  // Preset quick-paste templates for easy testing and pasting
  const quickTemplates = [
    {
      title: 'Ticket #2083007778205468 (Hollywoodbets Mobile Web)',
      desc: '9-Leg Multibet (R30 Stake -> R584.87 Potential Return)',
      text: `Payout R 584,87/R 30,00 Stake
Full Time - FC MASAR
24 September 2026 | 15:26
Pending
Egypt - 2. Division A - FC MASAR vs PROXY SC
0.35
Full Time- FC MASAR
15:30 Today

Pending
United Arab Emirates - United Arab Emirates League U21 - Al Jazira U21 Vs Al Orooba U21
0.3
Full Time- Al Jazira U21
15:30 Today

Pending
Qatar - Qatar League U20 - Al Gharafa U20 vs Al-Khor SC U20
0.4
Full Time- Al Gharafa U20
15:45 Today

Pending
Finland - Kolmonen - JYTY TURKU vs ABO CLUB DE FUTBOL
0.45
Full Time- JYTY TURKU
17:15 Today

Pending
Israel - Israel Liga Bet - SC Ramla Vs Ironi Kiryat Gat
0.25
Full Time- SC Ramla
17:30 Today

Pending
International - Gulf Cup - UNITED ARAB EMIRATES vs YEMEN
0.25
Full Time- UNITED ARAB EMIRATES
17:55 Today

Pending
Qatar - Qatar League U20 - Al-Arabi Doha U20 vs Al Duhail U20
0.55
Full Time- Al-Arabi Doha U20
17:55 Today

Pending
Finland - Kolmonen - EIF AKADEMI vs HOOGEE
0.4
Full Time- EIF AKADEMI
18:00 Today

Pending
Jordan - Jordan 1st Division - AL-AHLY AMMAN vs MAAN SC
0.55
Full Time- AL-AHLY AMMAN
18:00 Today

Ticket Number: 2083007778205468
More info
24 September 2026 | 15:26:22`,
    },
    {
      title: 'Ticket #2083007775089873 (Past Retail Slip)',
      desc: 'Chelsea away & Chiefs collapse (-R200)',
      text: `Hollywoodbets Retail Ticket: 2083007775089873
Date Placed: 2024-09-14 15:20 SAST
Type: 4-Leg Multibet
Stake: R200.00
Combined Odds: 6.18
Status: LOST

Legs:
1. Arsenal vs Wolverhampton - Match 1X2: Arsenal Win (1.35) - RESULT: WON
2. Mamelodi Sundowns vs SuperSport United - Match 1X2: Sundowns Win (1.48) - RESULT: WON
3. Bournemouth vs Chelsea - Match 1X2: Chelsea Win (1.75) - RESULT: LOST
4. Kaizer Chiefs vs Stellenbosch FC - Match 1X2: Chiefs Win (1.78) - RESULT: LOST`,
    },
    {
      title: 'Active Pending Slip (Trap Hazard Warning)',
      desc: 'Sundowns banker + Chelsea away risky leg',
      text: `Hollywoodbets Ticket: HB-PENDING-99412
Date Placed: Today
Type: 2-Leg Multibet
Stake: R450.00
Total Odds: 6.84
Status: PENDING

Legs:
1. Arsenal vs Chelsea - Match 1X2: Chelsea Win (3.80) - STATUS: PENDING
2. Mamelodi Sundowns vs Orlando Pirates - Match 1X2: Sundowns Win (1.80) - STATUS: PENDING`,
    },
    {
      title: 'Hollywoodbets SMS Confirmation',
      desc: 'Mobile betting SMS text format',
      text: `Hollywoodbets confirmation: Ticket HB-771239 accepted.
Stake: R150.00. Potential Return: R725.00. Odds: 4.83.
1. Man City vs Fulham - Home Win (1.28) [WON]
2. Liverpool vs Crystal Palace - Home Win (1.45) [WON]
3. Man United vs Tottenham - Home Win (2.60) [LOST - 0-3]`,
    },
  ];

  const handlePdfSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const res = await fetch('/api/parse-fixture-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.fixtures && data.fixtures.length > 0) {
            const formatted = data.fixtures
              .map((f: any) => `${f.homeTeam} vs ${f.awayTeam} (${f.league}) - Odds 1: ${f.homeOdds} X: ${f.drawOdds} 2: ${f.awayOdds}`)
              .join('\n');
            setRawText(`PDF Imported Fixture Document: ${file.name}\n${formatted}`);
            handleParseRawText(`Ticket PDF: ${file.name}\n${formatted}`);
          } else {
            setErrorMsg('Could not extract structured selections from PDF file. Please paste text directly.');
          }
        } else {
          setErrorMsg('Failed to process PDF file.');
        }
      } catch (err) {
        console.error('PDF upload error:', err);
        setErrorMsg('Error processing PDF file.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleParseRawText = async (textToParse?: string) => {
    const text = (textToParse !== undefined ? textToParse : rawText).trim();
    if (!text) {
      setErrorMsg('Please paste your Hollywoodbets slip text, receipt, or ticket reference into the box.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setParsedTicket(null);
    setAllowDuplicate(false);

    try {
      const res = await fetch('/api/ai/import-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawSlipText: text }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse ticket text');
      }

      const data = await res.json();
      setParsedTicket(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to parse the slip text. Please verify the format or use one of the quick templates.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = (openMistakeAdvisor: boolean = true) => {
    if (!parsedTicket) return;
    onImportTicket(parsedTicket, openMistakeAdvisor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-purple-900/60 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-4 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-purple-950 text-amber-400 border border-purple-800">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Paste Hollywoodbets Bet Slip</h3>
              <p className="text-xs text-slate-400">
                Paste any ticket text, retail receipt, SMS, or ticket summary. AI will parse & diagnose selection mistakes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Insert Templates */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Insert Templates:
            </span>
            <button
              type="button"
              onClick={() => {
                setShowVoicePanel(!showVoicePanel);
                if (!showVoicePanel && !isListening) {
                  startListening();
                }
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{showVoicePanel ? 'Hide Voice Dictation' : 'Open Voice Dictation HUD'}</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {quickTemplates.map((t, idx) => (
              <button
                key={`quick-template-${t.title}-${idx}`}
                type="button"
                onClick={() => {
                  setRawText(t.text);
                  handleParseRawText(t.text);
                }}
                className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-600/80 hover:bg-purple-950/20 text-left transition group"
              >
                <span className="font-bold text-xs text-amber-300 block truncate group-hover:text-amber-200">
                  {t.title}
                </span>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Dictation HUD / Panel */}
        {(showVoicePanel || isListening || fullSpokenText) && (
          <div className="p-4 rounded-xl bg-slate-950 border border-purple-600/60 shadow-xl space-y-3 animate-in fade-in transition">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isListening ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' : 'bg-purple-900/50 text-amber-400'}`}>
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-white">Voice Dictation Mode</span>
                    {isListening && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        Listening for fixtures...
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Dictate match fixtures, markets, odds, results, and stake. Web Speech AI will automatically normalize team names.
                  </p>
                </div>
              </div>

              {/* Audio Equalizer animation while listening */}
              <div className="flex items-center gap-1.5">
                {isListening && (
                  <div className="flex items-center gap-0.5 px-2 py-1 bg-rose-950/40 rounded border border-rose-800/60 mr-2">
                    <span className="w-1 h-3 bg-rose-400 animate-pulse rounded-full" />
                    <span className="w-1 h-5 bg-rose-400 animate-pulse delay-75 rounded-full" />
                    <span className="w-1 h-2 bg-rose-400 animate-pulse delay-150 rounded-full" />
                    <span className="w-1 h-4 bg-rose-400 animate-pulse delay-100 rounded-full" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowVoiceTips(!showVoiceTips)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition"
                  title="Voice tips & syntax"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Voice Dictation Syntax Tips */}
            {showVoiceTips && (
              <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 space-y-1.5 animate-in fade-in">
                <span className="font-bold text-amber-300 block">🎙️ Voice Dictation Tips:</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                  <li><strong>Fixtures:</strong> Say <em>"Arsenal vs Wolverhampton"</em> or <em>"Sundowns against Pirates"</em>.</li>
                  <li><strong>Market & Odds:</strong> Say <em>"Arsenal win 1.35"</em>, <em>"Both teams to score 1.90"</em>, or <em>"Draw 3.20"</em>.</li>
                  <li><strong>Status:</strong> State <em>"won"</em>, <em>"lost"</em>, or <em>"pending"</em> after the leg.</li>
                  <li><strong>Stake:</strong> Say <em>"stake 200 rands"</em> or <em>"stake R150"</em>.</li>
                </ul>
              </div>
            )}

            {/* Live Spoken Transcript Stream */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 text-xs font-mono min-h-[50px] relative">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Live Speech Transcript:
              </span>
              {fullSpokenText ? (
                <p className="text-amber-200 leading-relaxed">
                  {fullSpokenText}
                  {isListening && <span className="inline-block w-2 h-3.5 bg-amber-400 animate-pulse ml-1 align-middle" />}
                </p>
              ) : (
                <p className="text-slate-500 italic">
                  {isListening ? 'Speak now into your microphone... (e.g. "Arsenal vs Wolves Arsenal win 1.35 won")' : 'Click "Start Microphone" to speak your betting slip.'}
                </p>
              )}
            </div>

            {/* Live Detected Fixtures Display */}
            {parsedFromSpeech && parsedFromSpeech.recognizedFixtures.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Speech Recognizer Detected ({parsedFromSpeech.recognizedFixtures.length}) Fixtures:
                  </span>
                  {parsedFromSpeech.detectedStakeZar && (
                    <span className="text-amber-400 font-mono">
                      Stake: R{parsedFromSpeech.detectedStakeZar}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {parsedFromSpeech.recognizedFixtures.map((fix, fIdx) => (
                    <div
                      key={`speech-fix-${fix.id}-${fIdx}`}
                      className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-white block truncate">
                          {fix.homeTeam} vs {fix.awayTeam}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {fix.market} · <strong className="text-amber-300 font-mono">{fix.odds}x</strong>
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        fix.status === 'won' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        fix.status === 'lost' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      }`}>
                        {fix.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Speech Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {isListening ? (
                  <button
                    type="button"
                    onClick={stopListening}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Stop Recording</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startListening()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{fullSpokenText ? 'Continue Speaking' : 'Start Microphone'}</span>
                  </button>
                )}

                {fullSpokenText && (
                  <button
                    type="button"
                    onClick={() => {
                      resetTranscript();
                      setRawText('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1 transition"
                    title="Clear dictated transcript"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Sample dictation simulations for quick testing without physical mic */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">Try Demo:</span>
                <button
                  type="button"
                  onClick={() => {
                    const demoText = "Arsenal versus Wolverhampton Arsenal win 1.35 won. Mamelodi Sundowns versus SuperSport Sundowns win 1.48 won. Bournemouth versus Chelsea Chelsea win 1.75 lost. Kaizer Chiefs versus Stellenbosch Chiefs win 1.78 lost. Stake 200 rands.";
                    setManualTranscript(demoText);
                  }}
                  className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] text-amber-300 transition border border-slate-700 font-medium"
                >
                  ⚡ PSL & EPL Slip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const demoText = "Mamelodi Sundowns versus Orlando Pirates Sundowns win 1.80 pending. Arsenal versus Chelsea Chelsea win 3.80 pending. Stake 450 rands.";
                    setManualTranscript(demoText);
                  }}
                  className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] text-purple-300 transition border border-slate-700 font-medium"
                >
                  ⚡ Pending Slip
                </button>
              </div>
            </div>

            {/* Direct AI Parse action from voice HUD */}
            {fullSpokenText && (
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening();
                  if (parsedFromSpeech && parsedFromSpeech.formattedSlipText) {
                    handleParseRawText(parsedFromSpeech.formattedSlipText);
                  } else {
                    handleParseRawText(rawText || fullSpokenText);
                  }
                }}
                disabled={isProcessing}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-purple-600/30"
              >
                <BrainCircuit className="w-4 h-4 text-amber-300" />
                <span>Parse Dictated Slip with AI & Detect Mistakes</span>
              </button>
            )}
          </div>
        )}

        {/* Speech Recognition Error Notice */}
        {speechError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong className="block font-semibold">Microphone Speech Notice:</strong>
                <span>{speechError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const demoText = "Arsenal versus Wolverhampton Arsenal win 1.35 won. Mamelodi Sundowns versus SuperSport Sundowns win 1.48 won. Stake 200 rands.";
                setManualTranscript(demoText);
              }}
              className="text-[10px] bg-rose-900/60 hover:bg-rose-800 text-rose-200 px-2 py-1 rounded shrink-0 font-bold"
            >
              Use Voice Demo
            </button>
          </div>
        )}

        {/* Text Area for Pasting or Dictating */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <label htmlFor="slipText" className="font-semibold text-slate-300">
                Bet Slip Text / Structured Selections:
              </label>
              {fullSpokenText && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/60">
                  Dictated from Voice
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="pdf-slip-input"
                className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Upload PDF Fixture / Slip Document"
              >
                <FileUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload PDF</span>
              </label>
              <input
                id="pdf-slip-input"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdfSlipUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    setShowVoicePanel(true);
                    startListening();
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-md shadow-rose-600/30'
                    : 'bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 hover:text-white'
                }`}
                title={isListening ? 'Click to stop dictating' : 'Click to dictate betting slip with microphone'}
              >
                {isListening ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-white animate-spin" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dictate with Mic</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <textarea
            id="slipText"
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste your Hollywoodbets ticket here or click 'Dictate with Mic'... E.g.:&#10;Ticket: 2083007775089873&#10;Stake: R200&#10;Arsenal vs Wolves - Arsenal Win 1.35 (WON)&#10;Bournemouth vs Chelsea - Chelsea Win 1.75 (LOST)"
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-xs font-mono text-slate-200 resize-none placeholder:text-slate-600 outline-none"
          />

          <button
            onClick={() => handleParseRawText()}
            disabled={isProcessing || !rawText.trim()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <BrainCircuit className="w-4 h-4 animate-spin text-amber-300" />
                <span>AI Parsing Slip & Detecting Selection Mistakes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Parse Slip with AI & Detect Mistakes</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed Result Preview */}
        {parsedTicket && (
          <div className="p-4 rounded-xl bg-slate-950 border border-purple-800/80 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white">
                  Parsed Ticket #{parsedTicket.id}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    parsedTicket.status === 'won'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : parsedTicket.status === 'pending'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {parsedTicket.status}
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-400">Total Odds: </span>
                <span className="font-mono font-bold text-amber-400">{parsedTicket.totalOdds}x</span>
              </div>
            </div>

            {isAlreadyImported && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/70 text-xs text-amber-200 flex flex-col gap-2.5 shadow-lg shadow-amber-950/50 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-extrabold text-amber-300 flex items-center gap-1">
                      ⚠️ DUPLICATE TICKET DETECTED
                    </span>
                    <p className="text-[11px] text-amber-100/90 leading-relaxed font-medium">
                      This bet slip (or an identical selection set) has <strong className="text-white underline">already been imported</strong> into your BetMatrix ledger. Saving it again will duplicate your statistics.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 bg-slate-950/60 p-2 rounded-lg border border-amber-500/30">
                  <input
                    type="checkbox"
                    id="allowDuplicateCheck"
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900 cursor-pointer"
                  />
                  <label htmlFor="allowDuplicateCheck" className="text-[11px] font-bold text-amber-200 select-none cursor-pointer">
                    I understand, allow importing this duplicate ticket
                  </label>
                </div>
              </div>
            )}

            {/* Financial Overview */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Stake</span>
                <span className="font-bold text-white font-mono">R{parsedTicket.stakeZar}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Potential Payout</span>
                <span className="font-bold text-amber-400 font-mono">R{parsedTicket.potentialPayoutZar}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Result Profit</span>
                <span
                  className={`font-bold font-mono ${
                    parsedTicket.status === 'won'
                      ? 'text-emerald-400'
                      : parsedTicket.status === 'pending'
                      ? 'text-purple-300'
                      : 'text-rose-400'
                  }`}
                >
                  {parsedTicket.status === 'won'
                    ? `+R${parsedTicket.profitZar}`
                    : parsedTicket.status === 'pending'
                    ? 'Pending'
                    : `-R${Math.abs(parsedTicket.profitZar)}`}
                </span>
              </div>
            </div>

            {/* Instant Mistake Audit Banner */}
            {parsedTicket.legs.some(l => 
              l.targetTeam?.toLowerCase().includes('chelsea') || 
              l.targetTeam?.toLowerCase().includes('manchester united') ||
              (parsedTicket.status === 'lost' && l.status === 'lost')
            ) && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-300 block">AI Mistake Flagged on Parsed Selections:</span>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {parsedTicket.status === 'lost'
                      ? 'Contains known high-volatility trap team(s) that caused this loss. Deep post-mortem advice available.'
                      : 'Contains high-variance selections that violate conservative bankroll protocols. Pre-emptive advice recommended.'}
                  </p>
                </div>
              </div>
            )}

            {/* Legs Preview */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>Selections ({parsedTicket.legs.length} Legs):</span>
                <span className="text-[10px] text-slate-500 font-normal">Click status button to toggle result</span>
              </div>
              {parsedTicket.legs.map((leg, i) => (
                <div
                  key={`${leg.id || 'leg'}-${i}`}
                  className={`p-2.5 rounded-lg text-xs flex items-center justify-between transition ${
                    leg.status === 'won'
                      ? 'bg-emerald-950/30 text-emerald-200 border border-emerald-900/50'
                      : leg.status === 'pending'
                      ? 'bg-purple-950/30 text-purple-200 border border-purple-900/50'
                      : 'bg-rose-950/30 text-rose-200 border border-rose-900/50'
                  }`}
                >
                  <div>
                    <span className="font-bold text-white">{leg.match || `${leg.homeTeam} vs ${leg.awayTeam}`}</span>
                    <span className="text-[11px] text-slate-400 ml-2 font-medium">({leg.market})</span>
                    {leg.targetTeam && (
                      <span className="text-[10px] font-mono text-amber-300 ml-2">Target: {leg.targetTeam}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-300">{leg.odds}x</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextStatus = leg.status === 'won' ? 'lost' : (leg.status === 'lost' ? 'pending' : 'won');
                        const updatedLegs = [...parsedTicket.legs];
                        updatedLegs[i] = {
                          ...leg,
                          status: nextStatus,
                          faultContribution: nextStatus === 'lost',
                        };
                        const anyLost = updatedLegs.some(l => l.status === 'lost');
                        const anyPending = updatedLegs.some(l => l.status === 'pending');
                        const overallStatus = anyLost ? 'lost' : (anyPending ? 'pending' : 'won');
                        const bustedTeams = updatedLegs.filter(l => l.status === 'lost').map(l => l.targetTeam || l.homeTeam);
                        const payout = overallStatus === 'won' ? parsedTicket.potentialPayoutZar : 0;
                        const profit = overallStatus === 'won' ? (payout - parsedTicket.stakeZar) : (overallStatus === 'lost' ? -parsedTicket.stakeZar : 0);
                        
                        setParsedTicket({
                          ...parsedTicket,
                          status: overallStatus,
                          actualPayoutZar: payout,
                          profitZar: profit,
                          legs: updatedLegs,
                          bustedByTeams: bustedTeams,
                        });
                      }}
                      className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded cursor-pointer transition border ${
                        leg.status === 'won'
                          ? 'bg-emerald-600 text-slate-950 border-emerald-400'
                          : leg.status === 'pending'
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-rose-600 text-white border-rose-400'
                      }`}
                      title="Click to cycle status: WON -> LOST -> PENDING"
                    >
                      {leg.status.toUpperCase()} ⟳
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={() => handleConfirmImport(true)}
                disabled={isAlreadyImported && !allowDuplicate}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:opacity-55 disabled:cursor-not-allowed text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-500/20"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Save & Diagnose Selection Mistakes (AI)</span>
              </button>

              <button
                onClick={() => handleConfirmImport(false)}
                disabled={isAlreadyImported && !allowDuplicate}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-800 disabled:cursor-not-allowed text-slate-300 font-bold text-xs transition border border-slate-700"
              >
                Save Only
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
