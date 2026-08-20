import React from 'react';
import type { ChordDefinition } from '../../data/musicData';
import { audioEngine } from '../../services/audioEngine';
import { Volume2 } from 'lucide-react';

interface ChordDiagramProps {
  chord: ChordDefinition;
  compact?: boolean;
  showPlayButton?: boolean;
  onPlay?: () => void;
}

const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
const FINGER_COLORS: { [key: number]: string } = {
  1: '#00f2fe', // Index - Cyan
  2: '#3a86ff', // Middle - Blue
  3: '#ff007f', // Ring - Pink
  4: '#ffbe0b', // Pinky - Amber
};

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chord,
  compact = false,
  showPlayButton = true,
  onPlay,
}) => {
  const frets = chord.guitarFrets;
  const fingers = chord.fingers;

  // Calculate fret range to display
  const activeFrets = frets.filter((f) => f > 0);
  const minFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 1;
  const startFret = chord.barreFromFret ?? (minFret > 1 ? minFret : 1);
  const displayFrets = 4; // show 4 frets

  const cellW = compact ? 28 : 38;
  const cellH = compact ? 26 : 36;
  const dotR = compact ? 10 : 14;
  const svgW = cellW * 6 + 40;
  const svgH = cellH * (displayFrets + 1) + 50;
  const gridX = 30;
  const gridY = compact ? 30 : 40;

  const handlePlay = () => {
    audioEngine.instrument = 'guitar';
    chord.notes.forEach((n, idx) => {
      setTimeout(() => audioEngine.playNote(n, 0.9), idx * 70);
    });
    if (onPlay) onPlay();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={svgW} height={svgH} className="overflow-visible">
        {/* Nut (thick top bar) */}
        <rect
          x={gridX}
          y={gridY - 3}
          width={cellW * 5}
          height={startFret === 1 ? 7 : 3}
          rx={2}
          fill={startFret === 1 ? '#e2e8f0' : '#475569'}
        />

        {/* Fret position label (if not starting at fret 1) */}
        {startFret > 1 && (
          <text x={gridX - 8} y={gridY + cellH * 0.7} fontSize={compact ? 10 : 12} fill="#00f2fe" fontWeight="bold" textAnchor="end" fontFamily="JetBrains Mono">
            {startFret}fr
          </text>
        )}

        {/* Horizontal fret lines */}
        {Array.from({ length: displayFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={gridX}
            y1={gridY + i * cellH}
            x2={gridX + cellW * 5}
            y2={gridY + i * cellH}
            stroke={i === 0 ? '#94a3b8' : '#334155'}
            strokeWidth={i === 0 ? 2 : 1.5}
          />
        ))}

        {/* Vertical string lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`string-${i}`}
            x1={gridX + i * cellW}
            y1={gridY}
            x2={gridX + i * cellW}
            y2={gridY + displayFrets * cellH}
            stroke="#475569"
            strokeWidth={1 + (5 - i) * 0.3}
          />
        ))}

        {/* Barre bar (if barre chord) */}
        {chord.barreFromFret && (
          <rect
            x={gridX + 1}
            y={gridY + (chord.barreFromFret - startFret) * cellH + cellH * 0.25}
            width={cellW * 5 - 2}
            height={cellH * 0.5}
            rx={dotR}
            fill="#00f2fe"
            opacity={0.8}
          />
        )}

        {/* Finger dots */}
        {frets.map((fret, stringIdx) => {
          if (fret <= 0) return null;
          const fretPos = fret - startFret;
          if (fretPos < 0 || fretPos >= displayFrets) return null;

          const cx = gridX + stringIdx * cellW;
          const cy = gridY + fretPos * cellH + cellH * 0.5;
          const fingerNum = fingers[stringIdx];
          const color = FINGER_COLORS[fingerNum] || '#00f2fe';

          // Skip drawing dot if barre is already drawn for this string
          if (chord.barreFromFret && fret === chord.barreFromFret && fingerNum === 1) {
            return (
              <text key={stringIdx} x={cx} y={cy + 4} textAnchor="middle" fontSize={compact ? 9 : 11} fill="#021422" fontWeight="900">
                {fingerNum}
              </text>
            );
          }

          return (
            <g key={stringIdx}>
              <circle
                cx={cx}
                cy={cy}
                r={dotR}
                fill={color}
                style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
              />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize={compact ? 9 : 11} fill="#000" fontWeight="900">
                {fingerNum > 0 ? fingerNum : ''}
              </text>
            </g>
          );
        })}

        {/* Open / Mute string indicators */}
        {frets.map((fret, stringIdx) => {
          const cx = gridX + stringIdx * cellW;
          const cy = gridY - (compact ? 14 : 18);
          if (fret === 0) {
            return (
              <circle key={stringIdx} cx={cx} cy={cy} r={compact ? 5 : 7} fill="none" stroke="#00f2fe" strokeWidth={2} />
            );
          } else if (fret === -1) {
            const r = compact ? 5 : 7;
            return (
              <g key={stringIdx}>
                <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke="#ef4444" strokeWidth={2} />
                <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} stroke="#ef4444" strokeWidth={2} />
              </g>
            );
          }
          return null;
        })}

        {/* String name labels at bottom */}
        {!compact && STRING_NAMES.map((name, i) => (
          <text key={name} x={gridX + i * cellW} y={svgH - 6} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="JetBrains Mono" fontWeight="bold">
            {name}
          </text>
        ))}
      </svg>

      {/* Play Chord Button */}
      {showPlayButton && (
        <button
          onClick={handlePlay}
          className="btn-3d btn-3d-cyan text-xs py-1.5 px-3 w-full justify-center"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Nghe Hợp Âm</span>
        </button>
      )}
    </div>
  );
};
