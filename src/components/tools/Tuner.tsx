import React, { useState, useEffect, useRef } from 'react';
import { PitchDetector, type TunerResult } from '../../services/pitchDetector';
import { Mic, MicOff, CheckCircle2, AlertCircle } from 'lucide-react';

const GUITAR_STRINGS = [
  { name: 'E2', label: 'Dây 6 (Trầm)', freq: '82.4 Hz' },
  { name: 'A2', label: 'Dây 5', freq: '110 Hz' },
  { name: 'D3', label: 'Dây 4', freq: '146.8 Hz' },
  { name: 'G3', label: 'Dây 3', freq: '196 Hz' },
  { name: 'B3', label: 'Dây 2', freq: '246.9 Hz' },
  { name: 'E4', label: 'Dây 1 (Cao)', freq: '329.6 Hz' },
];

export const Tuner: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [tunerData, setTunerData] = useState<TunerResult | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);

  useEffect(() => {
    detectorRef.current = new PitchDetector();
    return () => { detectorRef.current?.stop(); };
  }, []);

  const toggleMic = async () => {
    if (isListening) {
      detectorRef.current?.stop();
      setIsListening(false);
      setTunerData(null);
    } else {
      const ok = await detectorRef.current?.start((res) => setTunerData(res));
      if (ok) setIsListening(true);
      else alert('Không thể truy cập Microphone! Vui lòng cấp quyền micro trong trình duyệt.');
    }
  };

  const centsPercent = tunerData
    ? Math.min(Math.max(((tunerData.cents + 50) / 100) * 100, 0), 100)
    : 50;

  const needleColor = tunerData
    ? tunerData.inTune
      ? 'var(--accent-green)'
      : tunerData.cents < 0
      ? 'var(--accent-amber)'
      : 'var(--accent-red)'
    : 'rgba(255,255,255,0.2)';

  return (
    <div className="section-gap">
      {/* Main Tuner Card */}
      <div className="glass-panel-3d p-6 flex flex-col items-center gap-6">
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`btn-primary ${isListening ? 'btn-danger animate-mic-ring' : ''}`}
          style={{ minWidth: 200 }}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          <span>{isListening ? 'Tắt Micro' : 'Bật Micro Lên Dây'}</span>
        </button>

        {/* Circular Gauge */}
        <div className="tuner-ring">
          {/* Radial SVG arc */}
          <svg width="220" height="220" className="absolute inset-0" viewBox="0 0 220 220">
            {/* Track arc */}
            <path
              d="M 30 160 A 90 90 0 0 1 190 160"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Green center zone */}
            <path
              d="M 96 82 A 90 90 0 0 1 124 82"
              fill="none"
              stroke="rgba(52,199,89,0.4)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Needle */}
            {tunerData && (
              <line
                x1="110"
                y1="110"
                x2={110 + 72 * Math.cos(Math.PI * (centsPercent / 100 - 0.5) - Math.PI / 2 + (Math.PI * 0.65))}
                y2={110 + 72 * Math.sin(Math.PI * (centsPercent / 100 - 0.5) - Math.PI / 2 + (Math.PI * 0.65))}
                stroke={needleColor}
                strokeWidth="3"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${needleColor})`, transition: 'all 0.08s ease' }}
              />
            )}
            {/* Center dot */}
            <circle cx="110" cy="110" r="6" fill="rgba(255,255,255,0.15)" />
          </svg>

          {/* Note display */}
          <div className="flex flex-col items-center relative z-10">
            {tunerData ? (
              <>
                <span
                  className="font-black text-mono"
                  style={{
                    fontSize: '3.5rem',
                    color: tunerData.inTune ? 'var(--accent-green)' : 'white',
                    textShadow: tunerData.inTune ? '0 0 30px rgba(52,199,89,0.7)' : 'none',
                    letterSpacing: '-0.05em',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tunerData.note}
                  <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)' }}>{tunerData.octave}</span>
                </span>
                <span className="text-caption text-mono">{tunerData.frequency} Hz</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Mic
                  className="w-10 h-10"
                  style={{
                    color: isListening ? 'var(--accent-red)' : 'rgba(255,255,255,0.2)',
                    animation: isListening ? 'pulse 1s ease infinite' : 'none',
                  }}
                />
                <span className="text-caption text-center" style={{ maxWidth: 120 }}>
                  {isListening ? 'Gảy 1 dây đàn…' : 'Nhấn Bật Micro'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cents Bar */}
        <div className="w-full max-w-xs flex flex-col gap-2">
          <div className="flex justify-between text-caption text-mono text-xs">
            <span style={{ color: 'var(--accent-amber)' }}>♭ Giáng</span>
            <span style={{ color: 'var(--accent-green)' }}>● Chuẩn</span>
            <span style={{ color: 'var(--accent-red)' }}>♯ Thăng</span>
          </div>
          <div
            className="relative h-3 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* center green zone */}
            <div
              className="absolute top-0 bottom-0 w-6 rounded-full -translate-x-1/2"
              style={{ left: '50%', background: 'rgba(52,199,89,0.3)' }}
            />
            {/* needle */}
            {tunerData && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full"
                style={{
                  left: `${centsPercent}%`,
                  background: needleColor,
                  boxShadow: `0 0 10px ${needleColor}`,
                  transition: 'left 0.08s ease',
                }}
              />
            )}
          </div>
          {/* Status */}
          {tunerData && (
            <div className="flex justify-center">
              {tunerData.inTune ? (
                <span className="badge badge-green"><CheckCircle2 className="w-3 h-3" /> Chuẩn Âm!</span>
              ) : tunerData.cents < 0 ? (
                <span className="badge badge-amber"><AlertCircle className="w-3 h-3" /> Thấp {tunerData.cents} cents</span>
              ) : (
                <span className="badge badge-red"><AlertCircle className="w-3 h-3" /> Cao +{tunerData.cents} cents</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Guitar String Reference Card */}
      <div className="glass-panel-3d p-5">
        <p className="text-label mb-3">Tần Số Chuẩn — 6 Dây Guitar</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GUITAR_STRINGS.map((s, i) => (
            <div
              key={s.name}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-mono"
                style={{ background: 'rgba(0,122,255,0.15)', color: '#5ac8fa' }}
              >
                {i + 1}
              </div>
              <div>
                <div className="font-bold text-sm text-mono text-white">{s.name}</div>
                <div className="text-caption" style={{ fontSize: '0.65rem' }}>{s.freq}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
