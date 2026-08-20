import { useState, useEffect } from 'react';
import { getSessionsData, saveSessionsData } from './data/questData';
import type { Session } from './data/questData';
import { CHORD_DATABASE } from './data/musicData';
import { ChordDiagram } from './components/studio/ChordDiagram';
import { WebcamRecorder } from './components/studio/WebcamRecorder';
import { sql, initNeonSchema } from './lib/neon';
import { 
  BookOpen, 
  CheckCircle2, 
  PlayCircle, 
  Video, 
  Award, 
  ArrowLeft, 
  LogOut, 
  Clock, 
  Check, 
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface Props {
  user?: any;
}

export default function GuitarQuest({ user }: Props) {
  const [sessions, setSessions] = useState<Session[]>(getSessionsData);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS'>('ALL');
  const [, setRefreshKey] = useState(0);

  const studentName = user?.user_metadata?.full_name || localStorage.getItem('temp_user_name') || 'Học Viên';
  const studentEmail = user?.email || localStorage.getItem('temp_user_email') || '';
  const studentId = user?.id || localStorage.getItem('temp_user_id') || studentEmail;

  // Fetch Live Data from Neon PostgreSQL Database
  useEffect(() => {
    async function loadNeonData() {
      try {
        await initNeonSchema();

        // 1. Fetch sessions from Neon DB
        const dbSessions = await sql`SELECT * FROM sessions ORDER BY id ASC`;
        
        // 2. Fetch student progress from Neon DB strictly for this logged in user
        const progressRows = await sql`
          SELECT * FROM student_progress 
          WHERE student_id = ${studentEmail} OR student_id = ${studentId}
        `;

        const completedIds = new Set(progressRows.filter((p: any) => p.is_completed).map((p: any) => Number(p.session_id)));

        if (dbSessions && dbSessions.length > 0) {
          const mapped: Session[] = getSessionsData().map(localSession => {
            const dbItem = dbSessions.find((ds: any) => Number(ds.id) === localSession.id);
            const isDone = completedIds.has(localSession.id);
            return {
              ...localSession,
              title: dbItem?.title || localSession.title,
              subtitle: dbItem?.subtitle || localSession.subtitle,
              completed: isDone,
              unlocked: isDone || localSession.id === 1 || completedIds.has(localSession.id - 1)
            };
          });
          setSessions(mapped);
        }
      } catch (err) {
        console.warn('Neon DB dynamic fetch error:', err);
      }
    }

    if (studentEmail) {
      loadNeonData();
    }
  }, [studentId, studentEmail]);

  // Computed progress
  const completedCount = sessions.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / sessions.length) * 100);

  // Toggle Exercise completion
  const toggleExercise = (sessionId: number, exId: string) => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        const updatedExs = s.content.exercises.map(e => e.id === exId ? { ...e, done: !e.done } : e);
        return { ...s, content: { ...s.content, exercises: updatedExs } };
      }
      return s;
    });
    setSessions(updated);
    saveSessionsData(updated);
    if (selectedSession && selectedSession.id === sessionId) {
      const found = updated.find(s => s.id === sessionId);
      if (found) setSelectedSession(found);
    }
  };

  // Mark Session as Completed
  const handleCompleteSession = async (session: Session) => {
    const updated = sessions.map(s => {
      if (s.id === session.id) {
        return { ...s, completed: true };
      }
      // Unlock next session if current is completed
      if (s.id === session.id + 1) {
        return { ...s, unlocked: true };
      }
      return s;
    });
    setSessions(updated);
    saveSessionsData(updated);
    const found = updated.find(s => s.id === session.id);
    if (found) setSelectedSession(found);

    // Save progress to Neon PostgreSQL Database with ON CONFLICT upsert
    try {
      const cleanEmailKey = studentEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const progId = `prog_${cleanEmailKey}_${session.id}`;
      await sql`
        INSERT INTO student_progress (id, student_id, session_id, is_completed, completed_at)
        VALUES (${progId}, ${studentEmail}, ${session.id}, true, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET is_completed = true, completed_at = CURRENT_TIMESTAMP
      `;

      if (studentId !== studentEmail) {
        await sql`
          INSERT INTO student_progress (id, student_id, session_id, is_completed, completed_at)
          VALUES (${progId}_id, ${studentId}, ${session.id}, true, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET is_completed = true, completed_at = CURRENT_TIMESTAMP
        `;
      }

      // Also ensure profile exists in profiles table so Admin directory shows the student
      await sql`
        INSERT INTO profiles (id, full_name, email)
        VALUES (${studentId}, ${studentName}, ${studentEmail})
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      `;
    } catch (e) {
      console.warn('Neon DB progress save:', e);
    }
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'COMPLETED') return s.completed;
    if (activeTab === 'IN_PROGRESS') return s.unlocked && !s.completed;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ══ TOP NAVBAR ══ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
              <span className="text-xl">🎸</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#1b2a47] leading-none">GUITARLAB</span>
              <span className="text-[9px] font-extrabold text-amber-600 tracking-widest uppercase mt-0.5">CỔNG HỌC VIÊN</span>
            </div>
          </div>

          {/* User Profile Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                {(user?.user_metadata?.full_name || user?.email || 'H')[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-none">
                  {user?.user_metadata?.full_name || user?.email || 'Học Viên Guitar'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Học Viên Khóa 8 Buổi</span>
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  localStorage.removeItem('skip_auth');
                  localStorage.removeItem('temp_user_name');
                  localStorage.removeItem('temp_user_email');
                  localStorage.removeItem('temp_user_id');
                  localStorage.removeItem('guitar_quest_data_v4');
                  const { supabase } = await import('./lib/supabase');
                  await supabase.auth.signOut();
                } catch (err) {
                  console.warn('Bỏ qua lỗi Supabase signOut:', err);
                } finally {
                  localStorage.removeItem('skip_auth');
                  localStorage.removeItem('temp_user_name');
                  localStorage.removeItem('temp_user_email');
                  localStorage.removeItem('temp_user_id');
                  localStorage.removeItem('guitar_quest_data_v4');
                  window.location.reload();
                }
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3.5 py-2 rounded-xl transition-all border border-slate-200 hover:border-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng Xuất</span>
            </button>
          </div>

        </div>
      </header>

      {/* ══ MAIN CONTENT AREA ══ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* -------------------------------------------------------------
            VIEW 1: DETAILED SESSION VIEW
           ------------------------------------------------------------- */}
        {selectedSession ? (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Back Button & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <button 
                onClick={() => setSelectedSession(null)}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#1b2a47] bg-slate-100 hover:bg-slate-200/70 px-4 py-2.5 rounded-xl transition-all self-start"
              >
                <ArrowLeft className="w-4 h-4" /> Quay Lại Danh Sách Buổi Học
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
                  Buổi {selectedSession.id} / 8
                </span>
                {selectedSession.completed ? (
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
                  <span className="text-4xl">{selectedSession.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                    Khóa Học Guitar Đệm Hát
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  Buổi {selectedSession.id}: {selectedSession.title}
                </h1>
                <p className="text-slate-300 font-medium text-base max-w-2xl">
                  {selectedSession.subtitle}
                </p>
              </div>
            </div>

            {/* Content Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column (2 Cols): Theory, YouTube Video, Practice */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Video Bài Giảng */}
                {selectedSession.content.practice.some(p => p.youtubeId) && (
                  <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                        <PlayCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900">Bài Giảng Video Hướng Dẫn</h2>
                        <p className="text-xs text-slate-500">Xem kĩ video bài giảng trước khi tập luyện</p>
                      </div>
                    </div>

                    {selectedSession.content.practice.map((item, i) => (
                      item.youtubeId ? (
                        <div key={i} className="space-y-3">
                          <h3 className="font-bold text-sm text-slate-800">{item.heading}</h3>
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
                  </section>
                )}

                {/* 2. Lý Thuyết & Hợp Âm */}
                <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">Lý Thuyết & Hợp Âm Buổi {selectedSession.id}</h2>
                      <p className="text-xs text-slate-500">Kiến thức nền tảng và cách bấm thế tay</p>
                    </div>
                  </div>

                  {/* Practice items text description */}
                  <div className="space-y-4">
                    {selectedSession.content.practice.map((item, idx) => (
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
                  {selectedSession.content.chords?.symbols && selectedSession.content.chords.symbols.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Các Hợp Âm Cần Học Trong Buổi Này:</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {selectedSession.content.chords.symbols.map((chordKey: string) => {
                          const chordData = CHORD_DATABASE.find(c => c.name === chordKey);
                          if (!chordData) return null;
                          return (
                            <div key={chordKey} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
                              <span className="text-lg font-black text-[#1b2a47] mb-2">{chordData.name}</span>
                              <div className="w-36 h-36">
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
                    {selectedSession.content.exercises.map(ex => (
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
                          onChange={() => toggleExercise(selectedSession.id, ex.id)}
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
                    {!selectedSession.completed ? (
                      <button
                        onClick={() => handleCompleteSession(selectedSession)}
                        className="w-full bg-[#1b2a47] hover:bg-[#121f36] text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        Xác Nhận Hoàn Thành Buổi {selectedSession.id}
                      </button>
                    ) : (
                      <div className="w-full bg-emerald-50 text-emerald-700 font-bold p-4 rounded-2xl text-center border border-emerald-200 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Bạn Đã Hoàn Thành Buổi Học Này!
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
                    sessionId={selectedSession.id} 
                    studentId={studentId} 
                    onSubmitted={() => {
                      setRefreshKey(k => k + 1);
                    }}
                  />
                </section>

                {/* 5. Đánh Giá Từ Giáo Viên */}
                {(() => {
                  const localSubs = JSON.parse(localStorage.getItem('guitarlab_submissions') || '[]');
                  const sessionSub = localSubs.find((s: any) => s.session_id === selectedSession.id);

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
        ) : (
          /* -------------------------------------------------------------
              VIEW 2: COURSE DASHBOARD (ALL 8 SESSIONS LIST)
             ------------------------------------------------------------- */
          <div className="space-y-10 animate-fadeIn">
            
            {/* Banner Tiến Độ Tổng Quan */}
            <div className="bg-gradient-to-r from-[#1b2a47] via-[#24395e] to-[#114b48] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              
              <div className="space-y-3 max-w-xl text-center md:text-left z-10">
                <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Khóa Học Guitar Đệm Hát 8 Buổi
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  Chào mừng trở lại lớp học!
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Lộ trình chuẩn hóa 8 buổi giúp bạn nắm vững nhịp, hợp âm và đệm hát thành thạo các bài hát yêu thích.
                </p>
              </div>

              {/* Progress Box */}
              <div className="w-full md:w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 z-10 shrink-0 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Tiến Độ Khóa Học</span>
                  <span className="text-2xl font-black text-amber-400">{progressPercent}%</span>
                </div>

                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold pt-1">
                  <span>Đã Hoàn Thành:</span>
                  <span className="text-white font-bold">{completedCount} / {sessions.length} Buổi</span>
                </div>
              </div>

            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'ALL' 
                      ? 'bg-[#1b2a47] text-white shadow-md' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Tất Cả ({sessions.length})
                </button>
                <button
                  onClick={() => setActiveTab('IN_PROGRESS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'IN_PROGRESS' 
                      ? 'bg-[#1b2a47] text-white shadow-md' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Đang Học ({sessions.filter(s => s.unlocked && !s.completed).length})
                </button>
                <button
                  onClick={() => setActiveTab('COMPLETED')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'COMPLETED' 
                      ? 'bg-[#1b2a47] text-white shadow-md' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Đã Hoàn Thành ({completedCount})
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Bấm vào từng buổi học bên dưới để vào bài học chi tiết
              </span>
            </div>

            {/* 8 Sessions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredSessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${
                    session.completed 
                      ? 'border-emerald-200 hover:border-emerald-300' 
                      : session.unlocked 
                        ? 'border-slate-200 hover:border-[#1b2a47]/40' 
                        : 'border-slate-200 opacity-80'
                  }`}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {session.icon}
                    </span>

                    {session.completed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <UserCheck className="w-3.5 h-3.5" /> Xong
                      </span>
                    ) : session.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Buổi {session.id}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        Khóa
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-2 mb-6">
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-[#1b2a47] transition-colors line-clamp-1">
                      Buổi {session.id}: {session.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {session.subtitle}
                    </p>
                  </div>

                  {/* Footer Card */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>{session.content.exercises.length} Bài Tập</span>
                    <span className="inline-flex items-center text-[#1b2a47] font-bold group-hover:translate-x-1 transition-transform">
                      Vào Học <ChevronRight className="w-4 h-4 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        © 2026 GuitarLab Academy. Nền tảng học Guitar đệm hát trực tuyến hàng đầu.
      </footer>

    </div>
  );
}
