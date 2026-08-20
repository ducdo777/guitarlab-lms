import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../../services/audioEngine';

interface MusicalStaffProps {
  currentNote?: string;
  clef?: 'treble' | 'bass';
  interactive?: boolean;
}

export const MusicalStaff: React.FC<MusicalStaffProps> = ({
  currentNote = 'C4',
  clef = 'treble',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map note pitches to Y offsets on staff
  const getNoteY = (note: string): number => {
    const noteMapTreble: { [key: string]: number } = {
      'C4': 136, // Ledger line below staff
      'D4': 128, // Below line 1
      'E4': 120, // Line 1
      'F4': 112, // Space 1
      'G4': 104, // Line 2
      'A4': 96,  // Space 2
      'B4': 88,  // Line 3
      'C5': 80,  // Space 3
      'D5': 72,  // Line 4
      'E5': 64,  // Space 4
      'F5': 56,  // Line 5
      'G5': 48,  // Above line 5
      'A5': 40,  // Ledger line above
    };

    const cleanNote = note.replace('#', '').replace('b', '');
    return noteMapTreble[cleanNote] || 104;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Panel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw 5 Staff Lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    const startY = 56;
    const lineSpacing = 16;

    for (let i = 0; i < 5; i++) {
      const y = startY + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
    }

    // Draw Treble Clef Symbol (Stylized G-Clef)
    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 54px serif';
    ctx.fillText('𝄞', 45, 116);

    // Draw Selected / Active Note
    const noteY = getNoteY(currentNote);
    const noteX = canvas.width / 2 + 20;

    // Ledger line for C4 or A5
    if (currentNote.includes('C4')) {
      ctx.strokeStyle = '#00f2fe';
      ctx.beginPath();
      ctx.moveTo(noteX - 18, 136);
      ctx.lineTo(noteX + 18, 136);
      ctx.stroke();
    }

    // Note Head (Oval)
    ctx.save();
    ctx.translate(noteX, noteY);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stem Line
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(noteX + 9, noteY);
    ctx.lineTo(noteX + 9, noteY - 36);
    ctx.stroke();

    // Note Name Label Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentNote, noteX, noteY + (currentNote.includes('C4') ? 30 : -44));

  }, [currentNote, clef]);

  const handleCanvasClick = () => {
    if (!interactive) return;
    audioEngine.playNote(currentNote, 0.6);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={180}
        onClick={handleCanvasClick}
        className="rounded-xl border border-slate-700 shadow-inner cursor-pointer hover:border-cyan-500/50 transition-colors"
      />
      <span className="text-xs text-slate-400 font-mono">
        {interactive ? '💡 Click khuông nhạc để nghe nốt' : 'Khuông nhạc hiển thị nốt'}
      </span>
    </div>
  );
};
