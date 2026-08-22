import { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  PlayCircle, 
  Video, 
  Award, 
  ArrowLeft, 
  Clock, 
  Check, 
  Sparkles
} from 'lucide-react';
import type { Session } from '../../data/questData';
import { CHORD_DATABASE } from '../../data/musicData';
import { ChordDiagram } from '../studio/ChordDiagram';
import { WebcamRecorder } from '../studio/WebcamRecorder';
import { LessonMetronome } from '../studio/LessonMetronome';

interface SessionDetailProps {
  session: Session;
  studentId: string;
  onBack: () => void;
  onComplete: (session: Session) => void;
  onExerciseToggle: (sessionId: number, exerciseId: string) => void;
  totalSessionsCount: number;
}

export default function SessionDetail({
  session,
  studentId,
  onBack,
  onComplete,
  onExerciseToggle,
  totalSessionsCount
}: SessionDetailProps) {
  const [, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#1b2a47] bg-slate-100 hover:bg-slate-200/70 px-4 py-2.5 rounded-xl transition-all self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Quay Lại Danh Sách Bài Học
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
            Bài {session.id} / {totalSessionsCount || 8}
          </span>
          {session.completed ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã Hoàn Thành
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Clock className="w-4 h-4 text-blue-600" /> Đang Học
            </span>
          )}
        </div>
      </div>

      {/* Session Title Card */}
      <div className="bg-gradient-to-r from-[#1b2a47] to-[#2d4675] text-white p-8 sm:p-10 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{session.icon}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Khóa Học Guitar Đệm Hát
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Bài {session.id}: {session.title}
          </h1>
          <p className="text-slate-300 font-medium text-base max-w-2xl">
            {session.subtitle}
          </p>
        </div>
      </div>

      {/* Content Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Theory, YouTube Video, Practice */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Mô Tả Nội Dung Bài Học (Văn bản) */}
          {session.content.theory?.[0]?.body && (
            <section className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-6 sm:p-8 rounded-3xl border border-amber-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                  📖
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#1b2a47]">Nội Dung Hướng Dẫn Chi Tiết</h2>
                  <p className="text-xs text-amber-800 font-bold">Kiến thức và lộ trình học của Bài {session.id}</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-medium pt-2 whitespace-pre-line">
                {session.content.theory[0].body}
              </p>
            </section>
          )}

          {/* 2. Video Bài Giảng YouTube (Tối đa 5 Video) */}
          {session.content.practice.some(p => p.youtubeId) && (
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Bài Giảng Video Hướng Dẫn ({session.content.practice.filter(p => p.youtubeId).length} Video)</h2>
                  <p className="text-xs text-slate-500">Xem kỹ từng video hướng dẫn trước khi thực hành</p>
                </div>
              </div>

              <div className="space-y-8">
                {session.content.practice.map((item, i) => (
                  item.youtubeId ? (
                    <div key={i} className="space-y-3 pb-6 border-b border-slate-100 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-base text-[#1b2a47] flex items-center gap-2">
                          <span className="w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {i + 1}
                          </span>
                          {item.heading}
                        </h3>
                      </div>

                      {/* Short Video Description */}
                      {item.body && (
                        <p className="text-xs text-slate-600 font-medium pl-8 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                          💡 <span className="font-bold text-slate-700">Ghi chú video:</span> {item.body}
                        </p>
                      )}

                      <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-md bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${item.youtubeId}`}
                          title={item.heading}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
            </section>
          )}

          {/* 2. Bộ Giữ Nhịp Metronome Thực Hành */}
          <section>
            <LessonMetronome
              initialBpm={session.content.bpm || session.target_bpm || 80}
              initialTimeSignature={session.content.timeSignature || session.time_signature || 4}
              sessionTitle={`Bài ${session.id}: ${session.title}`}
            />
          </section>

          {/* 3. Lý Thuyết & Hợp Âm */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Lý Thuyết & Hợp Âm Bài {session.id}</h2>
                <p className="text-xs text-slate-500">Kiến thức nền tảng và cách bấm thế tay</p>
              </div>
            </div>

            {/* Practice items text description */}
            <div className="space-y-4">
              {session.content.practice.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="font-bold text-sm text-[#1b2a47] flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#1b2a47] text-white text-xs rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {item.heading}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed pl-7">{item.body}</p>
                </div>
              ))}
            </div>

            {/* Chord Diagrams */}
            {session.content.chords?.symbols && session.content.chords.symbols.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#1b2a47] uppercase tracking-wider">Các Hợp Âm Cần Học & Bấm Phím (Chords):</h3>
                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    {session.content.chords.symbols.length} Hợp Âm
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {session.content.chords.symbols.map((chordKey: string) => {
                    const chordData = CHORD_DATABASE.find(c => c.symbol === chordKey || c.name === chordKey);
                    if (!chordData) {
                      return (
                        <div key={chordKey} className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-amber-900 mb-1">{chordKey}</span>
                          <span className="text-[10px] font-bold text-amber-700">Hợp âm tập luyện</span>
                        </div>
                      );
                    }
                    return (
                      <div key={chordKey} className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center flex flex-col items-center shadow-xs hover:border-amber-400 transition-all">
                        <span className="text-base font-black text-[#1b2a47] mb-1">{chordData.symbol} ({chordData.name})</span>
                        <div className="w-full flex items-center justify-center">
                          <ChordDiagram chord={chordData} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 3. Bài Tập Thực Hành Checklist */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Danh Sách Bài Tập Cần Hoàn Thành</h2>
                <p className="text-xs text-slate-500">Tích chọn bài tập sau khi luyện tập thuần thục</p>
              </div>
            </div>

            <div className="space-y-3">
              {session.content.exercises.map(ex => (
                <label 
                  key={ex.id} 
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    ex.done 
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-800' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={ex.done}
                    onChange={() => onExerciseToggle(session.id, ex.id)}
                    className="sr-only"
                  />
                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                    ex.done 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'bg-white border-slate-300'
                  }`}>
                    {ex.done && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <span className={`text-sm font-semibold leading-snug ${ex.done ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                    {ex.text}
                  </span>
                </label>
              ))}
            </div>

            {/* Complete Button */}
            <div className="pt-4 border-t border-slate-100">
              {!session.completed ? (
                <button
                  onClick={() => onComplete(session)}
                  className="w-full bg-[#1b2a47] hover:bg-[#121f36] text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Xác Nhận Hoàn Thành Bài {session.id}
                </button>
              ) : (
                <div className="w-full bg-emerald-50 text-emerald-700 font-bold p-4 rounded-2xl text-center border border-emerald-200 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Bạn Đã Hoàn Thành Bài Học Này!
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column (1 Col): Webcam Assignment Video & Teacher Status */}
        <div className="space-y-8">
          
          {/* 4. Quay Video Nộp Bài (Webcam) */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Quay Video Nộp Bài</h2>
                <p className="text-xs text-slate-500">Quay lại đoạn đàn để Giảng viên góp ý</p>
              </div>
            </div>

            <WebcamRecorder 
              sessionId={session.id} 
              studentId={studentId} 
              defaultBpm={session.content.bpm || session.target_bpm || 80}
              defaultTimeSignature={session.content.timeSignature || session.time_signature || 4}
              onSubmitted={() => {
                setRefreshKey(k => k + 1);
              }}
            />
          </section>

          {/* 5. Đánh Giá Từ Giáo Viên */}
          {(() => {
            const localSubs = JSON.parse(localStorage.getItem('guitarlab_submissions') || '[]');
            const sessionSub = localSubs.find((s: any) => s.session_id === session.id);

            return (
              <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Nhận Xét Từ Giảng Viên</h2>
                    <p className="text-xs text-slate-500">Phản hồi 1:1 sau khi chấm bài</p>
                  </div>
                </div>

                {sessionSub ? (
                  sessionSub.status === 'REVIEWED' ? (
                    <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-slate-700 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Trạng Thái:</span>
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] shadow-xs">
                          Đã Chấm Điểm: {sessionSub.grade}/10 Đ
                        </span>
                      </div>

                      <div className="pt-2 border-t border-emerald-200/60 space-y-1">
                        <span className="font-extrabold text-emerald-950 block">Lời Nhận Xét Từ Thầy Cô:</span>
                        <p className="p-3 bg-white rounded-xl border border-emerald-200/80 italic text-slate-800 leading-relaxed font-medium">
                          "{sessionSub.feedback || 'Bài đánh tốt, chúc mừng bạn!'}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-slate-700 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">Trạng Thái Bài Nộp:</span>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white font-bold text-[10px]">
                          Đã Nộp - Chờ Giảng Viên Chấm ⏳
                        </span>
                      </div>
                      <p className="pt-1 text-amber-800/90 leading-relaxed font-medium">
                        Video của bạn đã được gửi thành công! Giảng viên sẽ nghe bài đàn và đưa ra nhận xét chi tiết cho bạn trong vòng 24h.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Trạng Thái Bài Nộp:</span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                        Chưa Nộp Bài
                      </span>
                    </div>
                    <p className="pt-2 text-slate-500">
                      Hãy bật Camera ở ô phía trên, quay một đoạn đàn bài tập và bấm nút "Nộp Bài". Giảng viên sẽ đưa ra nhận xét chi tiết cho bạn trong vòng 24h!
                    </p>
                  </div>
                )}
              </section>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
