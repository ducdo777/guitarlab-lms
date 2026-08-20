import React, { useState, useEffect } from 'react';
import { audioEngine, type InstrumentType } from '../../services/audioEngine';
import { Sparkles, Keyboard } from 'lucide-react';

interface PianoProps {
  onNotePlay?: (note: string) => void;
}

export const Piano: React.FC<PianoProps> = ({ onNotePlay }) => {
  const [labelMode, setLabelMode] = useState<'english' | 'solfege' | 'keyboard'>('solfege');
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [sustain, setSustain] = useState<boolean>(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [octaveShift, setOctaveShift] = useState<number>(4);

  const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const solfegeMap: { [key: string]: string } = {
    'C': 'Đồ', 'C#': 'Đồ#',
    'D': 'Rê', 'D#': 'Rê#',
    'E': 'Mi',
    'F': 'Pha', 'F#': 'Pha#',
    'G': 'Sol', 'G#': 'Sol#',
    'A': 'La', 'A#': 'La#',
    'B': 'Si',
  };

  const keyboardKeyMap: { [key: string]: string } = {
    'a': `C${octaveShift}`,
    'w': `C#${octaveShift}`,
    's': `D${octaveShift}`,
    'e': `D#${octaveShift}`,
    'd': `E${octaveShift}`,
    'f': `F${octaveShift}`,
    't': `F#${octaveShift}`,
    'g': `G${octaveShift}`,
    'y': `G#${octaveShift}`,
    'h': `A${octaveShift}`,
    'u': `A#${octaveShift}`,
    'j': `B${octaveShift}`,
    'k': `C${octaveShift + 1}`,
  };

  useEffect(() => {
    audioEngine.instrument = instrument;
    audioEngine.sustain = sustain;
  }, [instrument, sustain]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = keyboardKeyMap[e.key.toLowerCase()];
      if (note) triggerNotePress(note);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = keyboardKeyMap[e.key.toLowerCase()];
      if (note) triggerNoteRelease(note);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [octaveShift]);

  const triggerNotePress = (note: string) => {
    audioEngine.playNote(note);
    setActiveNotes((prev) => new Set(prev).add(note));
    if (onNotePlay) onNotePlay(note);
  };

  const triggerNoteRelease = (note: string) => {
    audioEngine.stopNote(note);
    setActiveNotes((prev) => {
      const updated = new Set(prev);
      updated.delete(note);
      return updated;
    });
  };

  const buildPianoKeys = () => {
    const keys: { note: string; isBlack: boolean; label: string }[] = [];
    const octaves = [octaveShift, octaveShift + 1];

    octaves.forEach((oct) => {
      baseNotes.forEach((n) => {
        const fullNote = `${n}${oct}`;
        const isBlack = n.includes('#');

        let displayLabel = n;
        if (labelMode === 'solfege') {
          displayLabel = solfegeMap[n] || n;
        } else if (labelMode === 'keyboard') {
          const entry = Object.entries(keyboardKeyMap).find(([_, val]) => val === fullNote);
          displayLabel = entry ? entry[0].toUpperCase() : n;
        }

        keys.push({
          note: fullNote,
          isBlack,
          label: displayLabel,
        });
      });
    });

    return keys;
  };

  const pianoKeys = buildPianoKeys();

  const playChord = (chordNotes: string[]) => {
    chordNotes.forEach((n, idx) => {
      setTimeout(() => triggerNotePress(n), idx * 50);
    });
    setTimeout(() => {
      chordNotes.forEach((n) => triggerNoteRelease(n));
    }, 1200);
  };

  return (
    <div className="glass-panel-3d p-6 flex flex-col gap-6">
      {/* Piano Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        {/* Instrument Tone Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Âm Thanh 3D:</span>
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {(['piano', 'epiano', 'guitar', 'synth'] as InstrumentType[]).map((t) => (
              <button
                key={t}
                onClick={() => setInstrument(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  instrument === t
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/30 font-black scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'piano' ? 'Grand Piano 3D' : t === 'epiano' ? 'Rhodes E-Piano' : t === 'guitar' ? 'Acoustic Guitar' : 'Synth Lead'}
              </button>
            ))}
          </div>
        </div>

        {/* Note Label Mode Switcher */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Hiển Thị Phím:</span>
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setLabelMode('solfege')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                labelMode === 'solfege' ? 'bg-blue-600 text-white shadow-glow' : 'text-slate-400'
              }`}
            >
              Đồ Rê Mi
            </button>
            <button
              onClick={() => setLabelMode('english')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                labelMode === 'english' ? 'bg-blue-600 text-white shadow-glow' : 'text-slate-400'
              }`}
            >
              C D E
            </button>
            <button
              onClick={() => setLabelMode('keyboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                labelMode === 'keyboard' ? 'bg-blue-600 text-white shadow-glow' : 'text-slate-400'
              }`}
            >
              Phím Máy Tính
            </button>
          </div>
        </div>

        {/* Octave & Sustain Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-2xl border border-white/10 text-xs">
            <span className="text-slate-400 font-medium">Octave:</span>
            <button
              onClick={() => setOctaveShift((o) => Math.max(2, o - 1))}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 font-black text-cyan-400 flex items-center justify-center border border-white/10"
            >
              -
            </button>
            <span className="font-mono text-cyan-300 font-extrabold px-2 text-sm">{octaveShift}</span>
            <button
              onClick={() => setOctaveShift((o) => Math.min(6, o + 1))}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 font-black text-cyan-400 flex items-center justify-center border border-white/10"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setSustain(!sustain)}
            className={`btn-3d text-xs ${sustain ? 'active' : ''}`}
          >
            Sustain (Ngân 3D)
          </button>
        </div>
      </div>

      {/* Quick Chord Player Preset Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" /> Phát Hợp Âm Nhanh:
        </span>
        {[
          { label: 'C Major', notes: [`C${octaveShift}`, `E${octaveShift}`, `G${octaveShift}`] },
          { label: 'G Major', notes: [`G${octaveShift}`, `B${octaveShift}`, `D${octaveShift + 1}`] },
          { label: 'A Minor', notes: [`A${octaveShift}`, `C${octaveShift + 1}`, `E${octaveShift + 1}`] },
          { label: 'F Major', notes: [`F${octaveShift}`, `A${octaveShift}`, `C${octaveShift + 1}`] },
          { label: 'C7', notes: [`C${octaveShift}`, `E${octaveShift}`, `G${octaveShift}`, `A#${octaveShift}`] },
        ].map((c) => (
          <button
            key={c.label}
            onClick={() => playChord(c.notes)}
            className="btn-3d text-xs font-mono py-1.5 px-3 border-cyan-500/30 hover:border-cyan-400"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* REALISTIC 3D PIANO KEYBOARD SURFACE */}
      <div className="piano-bed-3d justify-center">
        {pianoKeys.map((k) => (
          <div
            key={k.note}
            onMouseDown={() => triggerNotePress(k.note)}
            onMouseUp={() => triggerNoteRelease(k.note)}
            onMouseLeave={() => triggerNoteRelease(k.note)}
            onTouchStart={(e) => {
              e.preventDefault();
              triggerNotePress(k.note);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              triggerNoteRelease(k.note);
            }}
            className={`${k.isBlack ? 'key-3d-black' : 'key-3d-white'} ${
              activeNotes.has(k.note) ? 'active' : ''
            }`}
          >
            {/* LED Status Light top indicator */}
            <div
              className={`w-2 h-2 rounded-full mb-auto mt-2 transition-all ${
                activeNotes.has(k.note)
                  ? k.isBlack
                    ? 'bg-pink-400 shadow-neon-pink ring-2 ring-pink-300'
                    : 'bg-cyan-400 shadow-neon-cyan ring-2 ring-cyan-300'
                  : 'bg-slate-700/40'
              }`}
            />
            <span className="font-mono text-[11px] font-extrabold tracking-tight opacity-90">{k.label}</span>
          </div>
        ))}
      </div>

      {/* Keyboard hotkey hint footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono px-2 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-cyan-400" />
          <span>Gợi ý phím máy tính: <code className="text-cyan-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-white/10">A S D F G H J K</code> (Phím trắng), <code className="text-pink-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-white/10">W E T Y U</code> (Phím đen)</span>
        </div>
        <span className="font-bold text-cyan-300">Đang phát: {Array.from(activeNotes).join(', ') || 'Chưa bấm phím'}</span>
      </div>
    </div>
  );
};
