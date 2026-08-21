import React from 'react';
import { Music, GraduationCap, Headphones, Wrench, Volume2, Mic } from 'lucide-react';

interface HeaderProps {
  activeTab: 'studio' | 'academy' | 'ear-trainer' | 'tools';
  setActiveTab: (tab: 'studio' | 'academy' | 'ear-trainer' | 'tools') => void;
  volume: number;
  setVolume: (val: number) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  volume,
  setVolume,
  isRecording,
  onToggleRecord,
}) => {
  return (
    <header className="glass-panel-3d sticky top-0 z-50 mb-6 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      {/* 3D Logo & Studio Branding */}
      <div className="flex items-center gap-3.5 group cursor-pointer">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-white/30 group-hover:scale-105 transition-transform duration-300">
          <Music className="w-6 h-6 text-slate-950 font-black drop-shadow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-400 to-pink-500">
              HarmonyLab
            </h1>
            <span className="text-[10px] font-mono font-extrabold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40 shadow-glow">
              3D STUDIO
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Nền Tảng Dạy & Học Âm Nhạc Trực Tuyến 3D</p>
        </div>
      </div>

      {/* 3D Navigation Bar */}
      <nav className="flex items-center gap-2.5 bg-slate-950/80 p-2 rounded-2xl border border-white/10 shadow-inner">
        <button
          onClick={() => setActiveTab('studio')}
          className={`btn-3d ${activeTab === 'studio' ? 'active' : ''}`}
        >
          <Music className="w-4 h-4 text-cyan-400" />
          <span>Studio Nhạc Cụ 3D</span>
        </button>

        <button
          onClick={() => setActiveTab('academy')}
          className={`btn-3d ${activeTab === 'academy' ? 'active' : ''}`}
        >
          <GraduationCap className="w-4 h-4 text-blue-400" />
          <span>Lý Thuyết & Khuông Nhạc</span>
        </button>

        <button
          onClick={() => setActiveTab('ear-trainer')}
          className={`btn-3d ${activeTab === 'ear-trainer' ? 'active' : ''}`}
        >
          <Headphones className="w-4 h-4 text-purple-400" />
          <span>Luyện Tai Nghe</span>
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`btn-3d ${activeTab === 'tools' ? 'active' : ''}`}
        >
          <Wrench className="w-4 h-4 text-pink-400" />
          <span>Bộ Công Cụ Nhạc Công</span>
        </button>
      </nav>

      {/* 3D Audio Controls */}
      <div className="flex items-center gap-4">
        {/* Audio Recording Button */}
        <button
          onClick={onToggleRecord}
          className={`btn-3d ${
            isRecording
              ? 'btn-3d-pink animate-pulse'
              : 'hover:border-rose-500/50'
          }`}
        >
          <Mic className={`w-4 h-4 ${isRecording ? 'text-white animate-ping' : 'text-rose-400'}`} />
          <span>{isRecording ? 'Đang Ghi Âm 3D...' : 'Ghi Âm Bài Học'}</span>
        </button>

        {/* Volume Dial Slider */}
        <div className="flex items-center gap-2.5 bg-slate-950/90 px-3.5 py-2 rounded-2xl border border-white/10 shadow-inner">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400 cursor-pointer"
          />
          <span className="text-[10px] font-mono text-cyan-300 font-bold w-6">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </header>
  );
};
