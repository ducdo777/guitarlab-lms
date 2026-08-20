import React, { useState, useCallback } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { CHORD_DATABASE } from '../../data/musicData';
import { Ear, Volume2, CheckCircle2, XCircle, Shuffle, Trophy } from 'lucide-react';

interface Round {
  chordSymbol: string;
  chordName: string;
  notes: string[];
  options: string[];
}

const generateRound = (): Round => {
  audioEngine.instrument = 'guitar';
  // Pick 4 random chords for choices
  const shuffled = [...CHORD_DATABASE].sort(() => Math.random() - 0.5).slice(0, 4);
  const target = shuffled[Math.floor(Math.random() * 4)];
  return {
    chordSymbol: target.symbol,
    chordName: target.name,
    notes: target.notes,
    options: shuffled.map((c) => c.symbol),
  };
};

export const EarTrainer: React.FC = () => {
  const [round, setRound] = useState<Round>(generateRound());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);

  const playChord = useCallback(() => {
    setIsPlaying(true);
    audioEngine.instrument = 'guitar';
    round.notes.forEach((note, idx) => {
      setTimeout(() => {
        audioEngine.playNote(note, 0.85);
        if (idx === round.notes.length - 1) {
          setTimeout(() => setIsPlaying(false), 800);
        }
      }, idx * 70);
    });
  }, [round]);

  const handleSelect = (symbol: string) => {
    if (selectedOption) return;
    setSelectedOption(symbol);
    const correct = symbol === round.chordSymbol;
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    setStreak((prev) => (correct ? prev + 1 : 0));
  };

  const nextRound = () => {
    setSelectedOption(null);
    setRound(generateRound());
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="glass-panel-3d p-8 flex flex-col items-center gap-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
          <Ear className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white">🎸 Luyện Tai Nghe Guitar</h2>
        <p className="text-sm text-slate-400">Nghe hợp âm guitar rồi đoán xem đó là hợp âm gì?</p>
      </div>

      {/* Score Tracker */}
      <div className="flex items-center gap-6 w-full justify-center">
        <div className="flex flex-col items-center bg-slate-950 p-3 rounded-2xl border border-white/10 min-w-[80px]">
          <Trophy className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-xl font-black text-white font-mono">{score.correct}</span>
          <span className="text-[10px] text-slate-400 font-bold">ĐÚNG</span>
        </div>
        <div className="flex flex-col items-center bg-slate-950 p-3 rounded-2xl border border-white/10 min-w-[80px]">
          <span className="text-xl font-black font-mono" style={{
            color: accuracy >= 80 ? '#4ade80' : accuracy >= 50 ? '#fbbf24' : '#f87171'
          }}>
            {accuracy}%
          </span>
          <span className="text-[10px] text-slate-400 font-bold">CHÍNH XÁC</span>
        </div>
        <div className="flex flex-col items-center bg-slate-950 p-3 rounded-2xl border border-white/10 min-w-[80px]">
          <span className="text-xl font-black text-orange-400 font-mono">🔥{streak}</span>
          <span className="text-[10px] text-slate-400 font-bold">LIÊN TIẾP</span>
        </div>
        <div className="flex flex-col items-center bg-slate-950 p-3 rounded-2xl border border-white/10 min-w-[80px]">
          <span className="text-xl font-black text-slate-300 font-mono">{score.total}</span>
          <span className="text-[10px] text-slate-400 font-bold">TỔNG</span>
        </div>
      </div>

      {/* Play Button */}
      <button
        onClick={playChord}
        disabled={isPlaying}
        className={`btn-3d btn-3d-cyan text-base px-8 py-4 rounded-3xl transition-transform ${isPlaying ? 'scale-110 opacity-80' : ''}`}
      >
        <Volume2 className={`w-6 h-6 ${isPlaying ? 'animate-pulse' : ''}`} />
        <span className="font-black">{isPlaying ? 'Đang phát...' : 'Nghe Hợp Âm'}</span>
      </button>

      <p className="text-xs text-slate-400 font-mono -mt-4">
        {selectedOption ? '' : '👆 Nhấn nút trên rồi chọn hợp âm đúng bên dưới'}
      </p>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-4 w-full">
        {round.options.map((symbol) => {
          const chord = CHORD_DATABASE.find((c) => c.symbol === symbol)!;
          const isSelected = selectedOption === symbol;
          const isCorrect = symbol === round.chordSymbol;
          const revealed = selectedOption !== null;

          let style = 'bg-slate-900 border-white/10 hover:border-cyan-500/40 text-slate-300';
          if (revealed) {
            if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500 text-emerald-200 font-bold shadow-neon-green';
            else if (isSelected) style = 'bg-rose-500/15 border-rose-500 text-rose-200';
            else style = 'bg-slate-900/60 border-white/10 text-slate-500';
          }

          return (
            <button
              key={symbol}
              onClick={() => handleSelect(symbol)}
              disabled={!!selectedOption}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${style}`}
            >
              <span className="text-3xl font-black font-mono">{symbol}</span>
              <span className="text-xs font-bold opacity-70">{chord.name}</span>
              {revealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1" />}
              {revealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Feedback & Next */}
      {selectedOption && (
        <div className="w-full flex flex-col gap-3">
          <div className={`text-center p-4 rounded-2xl font-bold text-sm ${
            selectedOption === round.chordSymbol
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {selectedOption === round.chordSymbol
              ? `✅ Chính xác! Đó là ${round.chordName} (${round.chordSymbol})`
              : `❌ Sai rồi! Đáp án đúng là ${round.chordName} (${round.chordSymbol})`
            }
          </div>
          <button onClick={nextRound} className="btn-3d btn-3d-cyan w-full justify-center">
            <Shuffle className="w-4 h-4" />
            <span>Hợp Âm Tiếp Theo</span>
          </button>
        </div>
      )}
    </div>
  );
};
