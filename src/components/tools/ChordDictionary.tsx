import React, { useState } from 'react';
import { CHORD_DATABASE } from '../../data/musicData';
import { ChordDiagram } from '../studio/ChordDiagram';
import { Search } from 'lucide-react';

const TYPES = ['Tất Cả', 'Major', 'Minor', '7th', 'Power'] as const;

export const ChordDictionary: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('Tất Cả');
  const [selected, setSelected] = useState(CHORD_DATABASE[0]);

  const filtered = CHORD_DATABASE.filter((c) => {
    const q = query.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
    const matchT = filterType === 'Tất Cả' || c.type === filterType;
    return matchQ && matchT;
  });

  return (
    <div className="section-gap">
      {/* Search & Filter */}
      <div className="glass-panel-3d p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm hợp âm (Em, G, Am…)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-white/30 outline-none"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'var(--font)',
            }}
          />
        </div>
        <div className="segment-control shrink-0">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`btn-segment ${filterType === t ? 'active' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Chord Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((chord) => (
            <button
              key={chord.symbol}
              onClick={() => setSelected(chord)}
              className={`chord-card flex flex-col items-center gap-2 ${selected.symbol === chord.symbol ? 'selected' : ''}`}
            >
              <span
                className="font-black text-mono"
                style={{ fontSize: '1.6rem', color: selected.symbol === chord.symbol ? '#5ac8fa' : 'white' }}
              >
                {chord.symbol}
              </span>
              <span className="text-caption text-center leading-tight" style={{ fontSize: '0.68rem' }}>
                {chord.name}
              </span>
              <span className={`badge ${
                chord.difficulty === 'Cơ Bản' ? 'badge-green' :
                chord.difficulty === 'Trung Cấp' ? 'badge-amber' : 'badge-red'
              }`} style={{ fontSize: '0.58rem' }}>
                {chord.difficulty}
              </span>
              <ChordDiagram chord={chord} compact={true} showPlayButton={false} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-16 text-caption">
              Không tìm thấy hợp âm phù hợp
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div
          className="glass-panel-3d p-6 flex flex-col items-center gap-5 lg:w-64 lg:sticky lg:top-16 lg:self-start"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <span
              className="font-black text-mono"
              style={{ fontSize: '3rem', color: '#5ac8fa', letterSpacing: '-0.04em' }}
            >
              {selected.symbol}
            </span>
            <span className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {selected.name}
            </span>
          </div>

          <ChordDiagram chord={selected} showPlayButton />

          {/* Info rows */}
          <div className="w-full flex flex-col gap-2">
            {[
              { label: 'Loại', value: selected.type },
              { label: 'Công thức', value: selected.formula, mono: true, accent: true },
              { label: 'Độ khó', value: selected.difficulty, colored: true },
              ...(selected.barreFromFret ? [{ label: 'Barre', value: `Phím ${selected.barreFromFret}`, mono: true }] : []),
            ].map(({ label, value, mono, accent, colored }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-caption text-xs">{label}</span>
                <span
                  className={`text-xs font-bold ${mono ? 'text-mono' : ''}`}
                  style={{
                    color: accent ? '#5ac8fa' :
                           colored && value === 'Cơ Bản' ? '#34c759' :
                           colored && value === 'Trung Cấp' ? '#ff9f0a' :
                           colored ? '#ff6b6b' :
                           'rgba(255,255,255,0.85)'
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Note pills */}
          <div className="w-full">
            <span className="text-label block mb-2">Các nốt</span>
            <div className="flex flex-wrap gap-1.5">
              {selected.notes.map((n) => (
                <span
                  key={n}
                  className="px-2 py-0.5 rounded-lg text-xs font-bold text-mono"
                  style={{ background: 'rgba(0,122,255,0.12)', color: '#5ac8fa', border: '1px solid rgba(0,122,255,0.2)' }}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Finger legend */}
          <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1">
            {[
              { n: '①', label: 'Trỏ', color: '#5ac8fa' },
              { n: '②', label: 'Giữa', color: '#5856d6' },
              { n: '③', label: 'Áp Út', color: '#ff6b81' },
              { n: '④', label: 'Út', color: '#ff9f0a' },
            ].map(({ n, label, color }) => (
              <span key={n} className="text-caption" style={{ fontSize: '0.65rem' }}>
                <span className="font-black text-mono" style={{ color }}>{n}</span> = {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
