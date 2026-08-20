import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { Play, Pause } from 'lucide-react';

const TEMPO_LABELS: { range: [number, number]; label: string }[] = [
  { range: [20,  59],  label: 'Larghissimo' },
  { range: [60,  65],  label: 'Largo' },
  { range: [66,  75],  label: 'Andante' },
  { range: [76,  107], label: 'Moderato' },
  { range: [108, 119], label: 'Allegro' },
  { range: [120, 155], label: 'Vivace' },
  { range: [156, 220], label: 'Presto' },
];

const getTempoLabel = (bpm: number) =>
  TEMPO_LABELS.find(({ range }) => bpm >= range[0] && bpm <= range[1])?.label ?? 'Presto';

export const Metronome: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [timeSignature, setTimeSignature] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const ms = (60 / bpm) * 1000;
      timerRef.current = setInterval(() => {
        setCurrentBeat((prev) => {
          const next = (prev % timeSignature) + 1;
          audioEngine.playClick(next === 1);
          return next;
        });
      }, ms);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentBeat(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, bpm, timeSignature]);

  const handleTap = () => {
    const now = Date.now();
    const taps = [...tapTimes, now].slice(-4);
    setTapTimes(taps);
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b) / intervals.length;
      const calc = Math.round(60000 / avg);
      if (calc >= 40 && calc <= 220) setBpm(calc);
    }
  };

  const bpmPct = ((bpm - 40) / (220 - 40)) * 100;

  return (
    <div className="section-gap">
      {/* Main Metronome Card */}
      <div className="glass-panel-3d p-6 flex flex-col items-center gap-7">

        {/* BPM Hero Display */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="font-black text-mono"
            style={{
              fontSize: 'clamp(4rem, 16vw, 6rem)',
              lineHeight: 1,
              letterSpacing: '-0.05em',
              color: isPlaying ? 'var(--accent-teal)' : 'white',
              textShadow: isPlaying ? '0 0 40px rgba(90,200,250,0.5)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {bpm}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-label">BPM</span>
            <span className="badge badge-blue">{getTempoLabel(bpm)}</span>
          </div>
        </div>

        {/* Beat LEDs */}
        <div className="flex items-center gap-3">
          {Array.from({ length: timeSignature }).map((_, i) => {
            const beat = i + 1;
            const isActive = currentBeat === beat;
            const isAccent = beat === 1;
            return (
              <div
                key={i}
                className={`beat-led ${isActive ? (isAccent ? 'accent-beat' : 'regular-beat') : ''}`}
              >
                {beat}
              </div>
            );
          })}
        </div>

        {/* BPM Slider */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <input
            type="range"
            min={40}
            max={220}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full"
            style={{ '--val': `${bpmPct}%` } as React.CSSProperties}
          />
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setBpm((b) => Math.max(40, b - 5))}
              className="btn-glass font-mono font-black text-sm"
              style={{ minWidth: 52 }}
            >
              −5
            </button>

            {/* Tap Tempo */}
            <button
              onClick={handleTap}
              className="btn-glass flex-1 font-semibold"
              style={{ border: '1px solid rgba(255,159,10,0.3)', color: '#ffcc00' }}
            >
              👆 Tap Tempo
            </button>

            <button
              onClick={() => setBpm((b) => Math.min(220, b + 5))}
              className="btn-glass font-mono font-black text-sm"
              style={{ minWidth: 52 }}
            >
              +5
            </button>
          </div>
        </div>

        {/* Time Signature */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-label">Nhịp</span>
          <div className="segment-control">
            {[2, 3, 4, 6].map((ts) => (
              <button
                key={ts}
                onClick={() => setTimeSignature(ts)}
                className={`btn-segment ${timeSignature === ts ? 'active' : ''}`}
              >
                {ts}/4
              </button>
            ))}
          </div>
        </div>

        {/* Play / Stop */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`btn-primary w-full max-w-xs text-base py-3.5 ${isPlaying ? 'btn-danger' : ''}`}
          style={{ maxWidth: 280 }}
        >
          {isPlaying
            ? <><Pause className="w-5 h-5" /><span>Dừng Nhịp</span></>
            : <><Play className="w-5 h-5 fill-current" /><span>Bắt Đầu Giữ Nhịp</span></>
          }
        </button>
      </div>

      {/* Tempo Reference Card */}
      <div className="glass-panel-3d p-5">
        <p className="text-label mb-3">Bảng Tempo Tham Chiếu</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPO_LABELS.map(({ range, label }) => (
            <button
              key={label}
              onClick={() => setBpm(Math.round((range[0] + range[1]) / 2))}
              className="flex flex-col items-start gap-0.5 rounded-xl p-3 transition-all"
              style={{
                background: bpm >= range[0] && bpm <= range[1]
                  ? 'rgba(0,122,255,0.15)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${bpm >= range[0] && bpm <= range[1]
                  ? 'rgba(0,122,255,0.4)'
                  : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <span className="font-bold text-sm text-white">{label}</span>
              <span className="text-caption text-mono">{range[0]}–{range[1]} BPM</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
