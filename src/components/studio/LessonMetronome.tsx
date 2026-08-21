import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { Play, Pause, Volume2, VolumeX, Sparkles, RefreshCw, Zap } from 'lucide-react';

interface LessonMetronomeProps {
  initialBpm?: number;
  initialTimeSignature?: number;
  sessionTitle?: string;
  onBpmChange?: (bpm: number) => void;
}

const TEMPO_LABELS: { range: [number, number]; label: string; desc: string }[] = [
  { range: [40, 59], label: 'Largo', desc: 'Chậm rãi, thích hợp luyện bấm thế tay mới' },
  { range: [60, 75], label: 'Adagio', desc: 'Nhịp điệu Ballad, rải dây mượt mà' },
  { range: [76, 95], label: 'Andante', desc: 'Tốc độ vừa phải, đệm hát thông dụng' },
  { range: [96, 115], label: 'Moderato', desc: 'Nhịp điệu vừa nhanh, quạt chả Pop / Disco' },
  { range: [116, 140], label: 'Allegro', desc: 'Sôi động, tốc độ đệm hát nhanh' },
  { range: [141, 170], label: 'Vivace', desc: 'Nhanh & dứt khoát, quạt Disco nâng cao' },
  { range: [171, 220], label: 'Presto', desc: 'Tốc độ rất nhanh, luyện ngón solo' },
];

const QUICK_PRESETS = [
  { bpm: 60, label: 'Luyện Bấm (60)', icon: '🐢' },
  { bpm: 75, label: 'Ballad (75)', icon: '🎸' },
  { bpm: 90, label: 'Đệm Hát (90)', icon: '🎵' },
  { bpm: 105, label: 'Disco (105)', icon: '⚡' },
  { bpm: 125, label: 'Solo (125)', icon: '🔥' },
];

export const LessonMetronome: React.FC<LessonMetronomeProps> = ({
  initialBpm = 80,
  initialTimeSignature = 4,
  sessionTitle,
  onBpmChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(initialBpm);
  const [timeSignature, setTimeSignature] = useState(initialTimeSignature);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync initial props when session changes
  useEffect(() => {
    if (initialBpm && initialBpm >= 40 && initialBpm <= 220) {
      setBpm(initialBpm);
    }
    if (initialTimeSignature && [2, 3, 4, 6].includes(initialTimeSignature)) {
      setTimeSignature(initialTimeSignature);
    }
  }, [initialBpm, initialTimeSignature]);

  // Handle metronome playback
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = (60 / bpm) * 1000;
      timerRef.current = setInterval(() => {
        setCurrentBeat((prev) => {
          const next = (prev % timeSignature) + 1;
          if (!isMuted) {
            audioEngine.playClick(next === 1);
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentBeat(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm, timeSignature, isMuted]);

  const updateBpm = (newBpm: number) => {
    const clamped = Math.max(40, Math.min(220, newBpm));
    setBpm(clamped);
    if (onBpmChange) onBpmChange(clamped);
  };

  const handleTap = () => {
    const now = Date.now();
    const taps = [...tapTimes, now].slice(-4);
    setTapTimes(taps);
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b) / intervals.length;
      const calc = Math.round(60000 / avg);
      if (calc >= 40 && calc <= 220) {
        updateBpm(calc);
      }
    }
  };

  const currentTempoInfo = TEMPO_LABELS.find(
    ({ range }) => bpm >= range[0] && bpm <= range[1]
  ) || TEMPO_LABELS[2];

  const bpmPercent = ((bpm - 40) / (220 - 40)) * 100;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-[#1b2a47] to-[#0f172a] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/10 relative overflow-hidden space-y-6">
      
      {/* Background Decorative Glow */}
      <div 
        className={`absolute -right-16 -top-16 w-60 h-60 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isPlaying ? 'bg-amber-500/20 scale-125' : 'bg-blue-500/10 scale-100'
        }`}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-black text-xl shadow-inner">
            ⏱️
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              Bộ Giữ Nhịp Metronome Thực Hành
              {isPlaying && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
                  Đang Giữ Nhịp
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-300">
              {sessionTitle ? `Căn nhịp chuẩn cho ${sessionTitle}` : 'Luyện tập giữ đúng nhịp phách, tăng độ chuẩn xác ngón tay'}
            </p>
          </div>
        </div>

        {/* Time Signature Selector */}
        <div className="flex items-center gap-2 bg-white/10 p-1 rounded-2xl border border-white/10 shrink-0">
          <span className="text-[11px] font-bold text-slate-300 px-2">Nhịp:</span>
          {[2, 3, 4, 6].map((ts) => (
            <button
              key={ts}
              onClick={() => setTimeSignature(ts)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                timeSignature === ts
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {ts}/4
            </button>
          ))}
        </div>
      </div>

      {/* Main Display: BPM Counter & Beat Pulsers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
        
        {/* Left: Big BPM Display */}
        <div className="text-center md:text-left space-y-1">
          <div className="flex items-baseline justify-center md:justify-start gap-3">
            <span className={`font-black text-6xl sm:text-7xl font-mono tracking-tight transition-colors duration-200 ${
              isPlaying ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 'text-white'
            }`}>
              {bpm}
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">BPM</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs text-amber-300 font-bold border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTempoInfo.label}</span>
            <span className="text-slate-400 font-normal">({currentTempoInfo.desc})</span>
          </div>
        </div>

        {/* Center: Interactive Beat LED Indicator Dots */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
            {Array.from({ length: timeSignature }).map((_, i) => {
              const beatNumber = i + 1;
              const isCurrent = currentBeat === beatNumber;
              const isAccent = beatNumber === 1;

              return (
                <div
                  key={i}
                  className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-black transition-all duration-150 border ${
                    isCurrent
                      ? isAccent
                        ? 'bg-gradient-to-t from-amber-500 to-amber-400 text-slate-950 border-amber-300 scale-110 shadow-lg shadow-amber-500/50 -translate-y-1'
                        : 'bg-gradient-to-t from-emerald-500 to-emerald-400 text-slate-950 border-emerald-300 scale-105 shadow-md shadow-emerald-500/40 -translate-y-0.5'
                      : 'bg-white/10 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-base sm:text-lg">{beatNumber}</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                    {isAccent ? 'Phách 1' : 'Phách'}
                  </span>
                </div>
              );
            })}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {isPlaying ? `Đang đếm phách ${currentBeat || 1} / ${timeSignature}` : 'Bấm nút Bắt Đầu bên dưới để giữ nhịp'}
          </span>
        </div>

        {/* Right: Master Play/Stop & Mute Buttons */}
        <div className="flex flex-col items-center md:items-end justify-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-full max-w-xs sm:w-56 py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-xl transform active:scale-95 ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/40 animate-pulse'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-amber-900/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Dừng Giữ Nhịp</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Bắt Đầu Giữ Nhịp</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                  : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
              }`}
              title={isMuted ? 'Bật âm thanh gõ nhịp' : 'Tắt tiếng (chỉ nháy đèn)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? 'Đã Tắt Tiếng' : 'Âm Thanh Bật'}</span>
            </button>

            <button
              onClick={() => updateBpm(initialBpm)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 text-xs font-bold transition-all flex items-center gap-1"
              title="Đặt lại tốc độ mặc định của bài học"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

      </div>

      {/* BPM Controls: Slider & Step Buttons */}
      <div className="space-y-4 pt-2 border-t border-white/10 relative z-10">
        
        {/* Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>40 BPM (Rất Chậm)</span>
            <span className="text-amber-400 font-mono font-extrabold">{bpm} BPM</span>
            <span>220 BPM (Rất Nhanh)</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min={40}
              max={220}
              value={bpm}
              onChange={(e) => updateBpm(parseInt(e.target.value))}
              className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
              style={{
                background: `linear-gradient(to right, #f59e0b ${bpmPercent}%, rgba(255, 255, 255, 0.2) ${bpmPercent}%)`
              }}
            />
          </div>
        </div>

        {/* Step Buttons & Tap Tempo */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateBpm(bpm - 5)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-black text-xs transition-all active:scale-95"
            >
              -5
            </button>
            <button
              onClick={() => updateBpm(bpm - 1)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-black text-xs transition-all active:scale-95"
            >
              -1
            </button>
          </div>

          {/* Tap Tempo Button */}
          <button
            onClick={handleTap}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500/30 to-amber-600/30 hover:from-amber-500/50 hover:to-amber-600/50 text-amber-300 font-extrabold text-xs border border-amber-400/40 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>👆 Bấm Nhịp (Tap Tempo)</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateBpm(bpm + 1)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-black text-xs transition-all active:scale-95"
            >
              +1
            </button>
            <button
              onClick={() => updateBpm(bpm + 5)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-black text-xs transition-all active:scale-95"
            >
              +5
            </button>
          </div>

        </div>

        {/* Quick Speed Presets */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-extrabold text-slate-400 shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Tốc độ gợi ý:
          </span>
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.bpm}
              onClick={() => updateBpm(preset.bpm)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                bpm === preset.bpm
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20 border-white/10'
              }`}
            >
              <span>{preset.icon} {preset.label}</span>
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};
