import React, { useState } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { ChordDiagram } from './ChordDiagram';
import { CHORD_DATABASE } from '../../data/musicData';

const STRINGS = [
  { open: 'e', note: 'E4', thickness: 1 },
  { open: 'B', note: 'B3', thickness: 1.5 },
  { open: 'G', note: 'G3', thickness: 2 },
  { open: 'D', note: 'D3', thickness: 2.5 },
  { open: 'A', note: 'A2', thickness: 3 },
  { open: 'E', note: 'E2', thickness: 3.5 },
];
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Fret dot inlays typically at frets 3, 5, 7, 9, 12, 15, 17, 19, 21
const INLAYS = [3, 5, 7, 9, 12];

const getFretNote = (openNoteFull: string, fret: number) => {
  const oct = parseInt(openNoteFull.slice(-1));
  const root = openNoteFull.slice(0, -1);
  const rootIdx = NOTES.indexOf(root);
  const total = rootIdx + fret;
  return {
    name: NOTES[total % 12],
    full: `${NOTES[total % 12]}${oct + Math.floor(total / 12)}`,
    isRoot: NOTES[total % 12] === root,
  };
};

const SCALE_SETS: Record<string, { label: string; notes: string[]; color: string }> = {
  none:       { label: 'None', notes: [], color: '' },
  'c-major':  { label: 'C Major',      notes: ['C','D','E','F','G','A','B'], color: '#34C759' },
  'am-penta': { label: 'Am Pentatonic', notes: ['A','C','D','E','G'],    color: '#2196F3' },
  'g-major':  { label: 'G Major',      notes: ['G','A','B','C','D','E','F#'], color: '#FF9800' },
};

export const Fretboard: React.FC = () => {
  const [tab, setTab] = useState<'guitar' | 'chords'>('guitar');
  const [actionMode, setActionMode] = useState<'play' | 'highlight' | 'mark'>('play');
  const [scale, setScale] = useState('none');
  const [selectedChord, setSelectedChord] = useState(CHORD_DATABASE[0]);
  const [markedNotes, setMarkedNotes] = useState<Set<string>>(new Set());
  const [playingNote, setPlayingNote] = useState<string | null>(null);

  const scaleInfo = SCALE_SETS[scale];

  const handleFretClick = (fullNote: string) => {
    if (actionMode === 'play') {
      audioEngine.instrument = 'guitar';
      audioEngine.playNote(fullNote, 0.8);
      setPlayingNote(fullNote);
      setTimeout(() => setPlayingNote(null), 400);
    } else if (actionMode === 'mark') {
      const newMarked = new Set(markedNotes);
      const key = `${fullNote}`;
      if (newMarked.has(key)) {
        newMarked.delete(key);
      } else {
        newMarked.add(key);
      }
      setMarkedNotes(newMarked);
    }
  };

  const isNoteVisible = (fullNote: string, noteName: string) => {
    if (actionMode === 'highlight' && scale !== 'none') {
      return scaleInfo.notes.includes(noteName);
    }
    if (actionMode === 'mark') {
      return markedNotes.has(fullNote);
    }
    if (actionMode === 'play') {
      return playingNote === fullNote;
    }
    return false;
  };

  const getNoteClass = (fullNote: string, noteName: string) => {
    if (actionMode === 'highlight' && scale !== 'none' && scaleInfo.notes.includes(noteName)) {
      return scaleInfo.notes[0] === noteName ? 'root' : 'highlight';
    }
    if (actionMode === 'mark' && markedNotes.has(fullNote)) {
      return 'highlight';
    }
    if (actionMode === 'play' && playingNote === fullNote) {
      return 'root';
    }
    return '';
  };

  return (
    <div className="section-gap">
      <div className="glass-panel-3d" style={{ padding: 16 }}>
        <div className="segment-control mb-4" style={{ marginBottom: 16 }}>
          <button
            className={`btn-segment ${tab === 'guitar' ? 'active' : ''}`}
            onClick={() => setTab('guitar')}
          >
            Guitar
          </button>
          <button
            className={`btn-segment ${tab === 'chords' ? 'active' : ''}`}
            onClick={() => setTab('chords')}
          >
            Chords
          </button>
        </div>

        {tab === 'guitar' && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="segment-control">
              <button
                className={`btn-segment ${actionMode === 'mark' ? 'active' : ''}`}
                onClick={() => setActionMode('mark')}
              >
                Mark
              </button>
              <button
                className={`btn-segment ${actionMode === 'highlight' ? 'active' : ''}`}
                onClick={() => setActionMode('highlight')}
              >
                Highlight
              </button>
              <button
                className={`btn-segment ${actionMode === 'play' ? 'active' : ''}`}
                onClick={() => setActionMode('play')}
              >
                Play
              </button>
            </div>
            
            {actionMode === 'highlight' && (
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}
              >
                {Object.entries(SCALE_SETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            )}

            {actionMode === 'mark' && (
              <button className="btn-segment" onClick={() => setMarkedNotes(new Set())}>
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {tab === 'guitar' && (
        <div className="fretboard-wrapper">
          <div className="realistic-fretboard">
            {/* Headstock */}
            <div className="headstock">
              {STRINGS.map((str, i) => (
                <div key={i} className="string-label">
                  <div className="string-label-circle">{str.open}</div>
                </div>
              ))}
            </div>

            {/* Fretboard Body */}
            <div className="fretboard-body">
              {/* Generate columns for frets 1 to 12 */}
              {Array.from({ length: 13 }).map((_, fretIndex) => (
                <div key={fretIndex} className="fret-col">
                  {/* Position inlays */}
                  {INLAYS.includes(fretIndex) && (
                    <>
                      {fretIndex === 12 ? (
                        <>
                          <div className="inlay-dot" style={{ top: '25%' }} />
                          <div className="inlay-dot" style={{ top: '75%' }} />
                        </>
                      ) : (
                        <div className="inlay-dot" />
                      )}
                    </>
                  )}

                  {/* Rows for strings */}
                  {STRINGS.map((str, strIndex) => {
                    const { name, full } = getFretNote(str.note, fretIndex);
                    const isVisible = isNoteVisible(full, name);
                    const noteClass = getNoteClass(full, name);
                    
                    return (
                      <div
                        key={strIndex}
                        className="string-row"
                        onClick={() => handleFretClick(full)}
                      >
                        <div className="guitar-string" style={{ height: str.thickness }} />
                        <div className={`note-dot ${isVisible ? 'visible' : 'hidden'} ${noteClass}`}>
                          {name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          <div className="fret-numbers">
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className="fret-number">
                {i === 0 ? '0' : i}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'chords' && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
            {CHORD_DATABASE.map(ch => (
              <div
                key={ch.symbol}
                className={`chord-card ${selectedChord.symbol === ch.symbol ? 'selected' : ''}`}
                onClick={() => setSelectedChord(ch)}
              >
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{ch.symbol}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>{ch.name}</div>
              </div>
            ))}
          </div>
          
          <div className="glass-panel-3d" style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: 16 }}>{selectedChord.symbol}</div>
             <ChordDiagram chord={selectedChord} showPlayButton />
          </div>
        </div>
      )}
    </div>
  );
};
