import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';

export const BeatSequencer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(120);
  const [currentStep, setCurrentStep] = useState<number>(0);

  type TrackType = 'kick' | 'snare' | 'hihat' | 'clap' | 'perc';

  const tracks: { id: TrackType; name: string; color: string; activeColor: string }[] = [
    { id: 'kick', name: 'Kick (Trống Cái)', color: 'bg-cyan-500', activeColor: 'bg-cyan-400 text-slate-950 shadow-neon-cyan' },
    { id: 'snare', name: 'Snare (Trống Con)', color: 'bg-pink-500', activeColor: 'bg-pink-500 text-white shadow-neon-pink' },
    { id: 'hihat', name: 'Hi-Hat (Lá Xập)', color: 'bg-amber-400', activeColor: 'bg-amber-400 text-slate-950 shadow-lg' },
    { id: 'clap', name: 'Clap (Vỗ Tay)', color: 'bg-purple-500', activeColor: 'bg-purple-500 text-white shadow-lg' },
    { id: 'perc', name: 'Percussion (Gõ)', color: 'bg-emerald-400', activeColor: 'bg-emerald-400 text-slate-950 shadow-lg' },
  ];

  const [grid, setGrid] = useState<{ [key in TrackType]: boolean[] }>({
    kick:  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    clap:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    perc:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, false, false],
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = (60 / bpm / 4) * 1000;
      timerRef.current = setInterval(() => {
        setCurrentStep((prevStep) => {
          const nextStep = (prevStep + 1) % 16;
          tracks.forEach((tr) => {
            if (grid[tr.id][nextStep]) {
              audioEngine.playDrum(tr.id);
            }
          });
          return nextStep;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm, grid]);

  const toggleCell = (track: TrackType, stepIdx: number) => {
    setGrid((prev) => {
      const updatedTrack = [...prev[track]];
      updatedTrack[stepIdx] = !updatedTrack[stepIdx];
      return { ...prev, [track]: updatedTrack };
    });
  };

  const clearGrid = () => {
    setGrid({
      kick: Array(16).fill(false),
      snare: Array(16).fill(false),
      hihat: Array(16).fill(false),
      clap: Array(16).fill(false),
      perc: Array(16).fill(false),
    });
  };

  const loadPreset = (presetName: string) => {
    if (presetName === 'pop') {
      setGrid({
        kick:  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        clap:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        perc:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, false, false],
      });
      setBpm(120);
    } else if (presetName === 'rock') {
      setGrid({
        kick:  [true, false, false, false, false, false, true, false, true, false, false, false, false, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        clap:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        perc:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      });
      setBpm(132);
    } else if (presetName === 'hiphop') {
      setGrid({
        kick:  [true, false, false, true, false, false, false, false, true, false, true, false, false, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        clap:  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        perc:  [false, false, true, false, false, true, false, false, false, false, true, false, false, true, false, false],
      });
      setBpm(92);
    }
  };

  return (
    <div className="glass-panel-3d p-6 flex flex-col gap-6">
      {/* Sequencer Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        {/* Play/Pause & Clear Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`btn-3d ${isPlaying ? 'btn-3d-pink' : 'btn-3d-cyan'}`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isPlaying ? 'Tạm Dừng 3D' : 'Phát Beat 3D'}</span>
          </button>

          <button onClick={clearGrid} className="btn-3d text-xs">
            <RotateCcw className="w-4 h-4" />
            <span>Xóa Đòn</span>
          </button>
        </div>

        {/* BPM Tempo Slider & Counter */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-extrabold text-slate-400">Tempo (BPM):</span>
          <input
            type="range"
            min="60"
            max="180"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
            className="w-28 accent-cyan-400 cursor-pointer"
          />
          <span className="font-mono font-black text-cyan-300 text-base min-w-[36px]">{bpm}</span>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-400">Điệu Mẫu 3D:</span>
          <select
            onChange={(e) => loadPreset(e.target.value)}
            className="bg-slate-950 text-cyan-300 border border-white/15 text-xs rounded-xl px-3 py-1.5 font-mono cursor-pointer shadow-inner focus:outline-none"
          >
            <option value="pop">Pop Dance (120 BPM)</option>
            <option value="rock">Rock Solid (132 BPM)</option>
            <option value="hiphop">Hip-Hop Classic (92 BPM)</option>
          </select>
        </div>
      </div>

      {/* 16-Step 3D Sequencer Grid */}
      <div className="flex flex-col gap-3.5 overflow-x-auto pb-2">
        {tracks.map((tr) => (
          <div key={tr.id} className="flex items-center gap-3.5 min-w-[750px]">
            {/* Track Name */}
            <div className="w-40 font-extrabold text-xs text-slate-200 flex items-center gap-2.5">
              <div className={`w-3.5 h-3.5 rounded-full ${tr.color} shadow-md`} />
              <span>{tr.name}</span>
            </div>

            {/* 16 Step 3D Pads */}
            <div className="flex items-center gap-2 flex-1">
              {grid[tr.id].map((active, stepIdx) => (
                <button
                  key={stepIdx}
                  onClick={() => toggleCell(tr.id, stepIdx)}
                  className={`pad-3d flex-1 flex items-center justify-center font-mono text-[10px] font-black ${
                    active
                      ? `${tr.activeColor} active-pad`
                      : 'text-slate-500'
                  } ${currentStep === stepIdx ? 'ring-2 ring-cyan-300 scale-105 z-10 shadow-neon-cyan' : ''}`}
                >
                  <span>{stepIdx % 4 === 0 ? stepIdx / 4 + 1 : ''}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
