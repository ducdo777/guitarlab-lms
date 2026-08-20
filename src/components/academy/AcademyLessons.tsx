import React, { useState } from 'react';
import { LESSONS, type GuitarLesson } from '../../data/musicData';
import { audioEngine } from '../../services/audioEngine';
import { CHORD_DATABASE } from '../../data/musicData';
import { ChordDiagram } from '../studio/ChordDiagram';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, Volume2, Trophy, ArrowRight, BookOpen, Star } from 'lucide-react';

export const AcademyLessons: React.FC = () => {
  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<{ [quizIndex: number]: number }>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());

  const lesson: GuitarLesson = LESSONS[activeLessonIndex];

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = () => {
    setSubmitted(true);
    const correctCount = lesson.quiz.filter((q, idx) => userAnswers[idx] === q.correctIndex).length;
    if (correctCount === lesson.quiz.length) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setCompletedLessons((prev) => new Set(prev).add(activeLessonIndex));
    }
  };

  const handleNextLesson = () => {
    setSubmitted(false);
    setUserAnswers({});
    setActiveLessonIndex((prev) => (prev + 1) % LESSONS.length);
  };

  // Find relevant chords for the current lesson
  const lessonChords = lesson.id === 'open-chords' || lesson.id === 'barre-chords'
    ? CHORD_DATABASE.filter((c) =>
        lesson.id === 'open-chords'
          ? c.difficulty === 'Cơ Bản' && c.type !== 'Power'
          : c.difficulty === 'Trung Cấp'
      ).slice(0, 3)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Lesson Module Selector */}
      <div className="glass-panel-3d p-4 flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Chương Trình Học Guitar</span>
        </h2>

        {LESSONS.map((les, idx) => (
          <button
            key={les.id}
            onClick={() => {
              setActiveLessonIndex(idx);
              setSubmitted(false);
              setUserAnswers({});
            }}
            className={`p-3 rounded-2xl text-left border transition-all ${
              activeLessonIndex === idx
                ? 'bg-slate-800/80 border-cyan-500 text-white shadow-neon-cyan'
                : 'bg-slate-900/40 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-black uppercase tracking-wider ${les.categoryColor}`}>
                {les.category}
              </span>
              {completedLessons.has(idx) && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
            </div>
            <div className="text-xs font-bold text-slate-200 leading-tight">{les.titleVi}</div>
            <div className={`text-[10px] font-bold mt-1 ${
              les.difficulty === 'Cơ Bản' ? 'text-emerald-400' :
              les.difficulty === 'Trung Cấp' ? 'text-amber-400' : 'text-pink-400'
            }`}>
              {les.difficulty}
            </div>
          </button>
        ))}
      </div>

      {/* Main Lesson Content */}
      <div className="lg:col-span-3 glass-panel-3d p-6 flex flex-col gap-6">
        {/* Lesson Header */}
        <div className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-black uppercase tracking-widest ${lesson.categoryColor}`}>
              {lesson.category}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              lesson.difficulty === 'Cơ Bản'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : lesson.difficulty === 'Trung Cấp'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-pink-500/20 text-pink-300 border-pink-500/40'
            }`}>{lesson.difficulty}</span>
          </div>
          <h1 className="text-2xl font-black text-white">{lesson.titleVi}</h1>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{lesson.description}</p>
        </div>

        {/* Section Cards Grid */}
        <div className={`grid gap-4 ${lessonChords.length > 0 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          {/* Lesson Content Cards */}
          <div className={`flex flex-col gap-4 ${lessonChords.length > 0 ? 'lg:col-span-2' : ''}`}>
            {lesson.content.map((sec, idx) => (
              <div key={idx} className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                <h3 className="font-black text-cyan-300 text-sm">{sec.sectionTitle}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{sec.text}</p>
                {sec.tip && (
                  <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 font-medium">
                    {sec.tip}
                  </div>
                )}
                {sec.listenNote && (
                  <button
                    onClick={() => audioEngine.playNote(sec.listenNote!, 1.0)}
                    className="btn-3d text-xs self-start"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Nghe Ví Dụ ({sec.listenNote})</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Chord Diagrams if relevant to lesson */}
          {lessonChords.length > 0 && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 flex flex-col gap-4">
              <h3 className="font-black text-cyan-300 text-sm">Hợp Âm Trong Chương Này</h3>
              {lessonChords.map((chord) => (
                <div key={chord.symbol} className="flex flex-col items-center gap-1 border-b border-white/10 pb-3 last:border-none last:pb-0">
                  <span className="text-base font-black font-mono text-cyan-300">{chord.symbol}</span>
                  <ChordDiagram chord={chord} compact={true} showPlayButton={true} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guitar Quiz */}
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-white/10 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Bài Kiểm Tra Ôn Tập</span>
            </h3>
            {submitted && (
              <span className={`text-xs font-mono font-bold ${
                lesson.quiz.filter((q, idx) => userAnswers[idx] === q.correctIndex).length === lesson.quiz.length
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {lesson.quiz.filter((q, idx) => userAnswers[idx] === q.correctIndex).length}/{lesson.quiz.length} câu đúng
              </span>
            )}
          </div>

          {lesson.quiz.map((q, qIdx) => (
            <div key={qIdx} className="flex flex-col gap-3">
              <p className="text-sm font-bold text-slate-200">
                Câu {qIdx + 1}: {q.question}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = userAnswers[qIdx] === optIdx;
                  const isCorrect = q.correctIndex === optIdx;

                  let style = 'bg-slate-900 border-white/10 text-slate-300 hover:border-cyan-500/40';
                  if (submitted) {
                    if (isCorrect) style = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                    else if (isSelected && !isCorrect) style = 'bg-rose-500/20 border-rose-500 text-rose-200';
                  } else if (isSelected) {
                    style = 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(qIdx, optIdx)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${style}`}
                    >
                      <span>{opt}</span>
                      {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {submitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="text-xs text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-white/10">
                  💡 <strong className="text-white">Giải thích:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            {!submitted ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(userAnswers).length < lesson.quiz.length}
                className="btn-3d btn-3d-cyan text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Nộp Bài Kiểm Tra Guitar</span>
              </button>
            ) : (
              <button onClick={handleNextLesson} className="btn-3d btn-3d-cyan text-xs">
                <span>Chương Tiếp Theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
