import { useState, useEffect } from 'react';
import { getSessionsData, saveSessionsData } from './data/questData';
import type { Session } from './data/questData';
import { sql, initNeonSchema } from './lib/neon';
import { LogOut } from 'lucide-react';
import CourseRoadmap from './components/quest/CourseRoadmap';
import SessionDetail from './components/quest/SessionDetail';
import StudentPortfolio from './components/quest/StudentPortfolio';

interface Props {
  user?: any;
}

export default function GuitarQuest({ user }: Props) {
  const [sessions, setSessions] = useState<Session[]>(getSessionsData);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS'>('ALL');

  const studentName = user?.user_metadata?.full_name || localStorage.getItem('temp_user_name') || 'Học Viên';
  const studentEmail = user?.email || localStorage.getItem('temp_user_email') || '';
  const studentId = user?.id || localStorage.getItem('temp_user_id') || studentEmail;

  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [mainTab, setMainTab] = useState<'roadmap' | 'portfolio'>('roadmap');

  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>('guitar-8-buoi');

  // Fetch Live Data from Neon PostgreSQL Database
  useEffect(() => {
    async function loadNeonData() {
      try {
        await initNeonSchema();

        let enrolledCoursesList: any[] = [];
        try {
          const dbCourses = await sql`SELECT * FROM courses ORDER BY created_at ASC`;
          const enrolledRows = await sql`
            SELECT course_id FROM user_courses 
            WHERE LOWER(student_email) = ${studentEmail.toLowerCase()}
          `;

          let enrolledCourseIds: Set<string>;
          if (enrolledRows && enrolledRows.length > 0) {
            enrolledCourseIds = new Set(enrolledRows.map((r: any) => r.course_id));
          } else {
            enrolledCourseIds = new Set(['guitar-8-buoi']);
            const cleanEmailKey = studentEmail.replace(/[^a-zA-Z0-9]/g, '_');
            const autoEnrollId = `enroll_${cleanEmailKey}_guitar-8-buoi`;
            try {
              await sql`
                INSERT INTO user_courses (id, student_email, course_id)
                VALUES (${autoEnrollId}, ${studentEmail}, 'guitar-8-buoi')
                ON CONFLICT (student_email, course_id) DO NOTHING
              `;
            } catch (aeErr) {}
          }

          enrolledCoursesList = (dbCourses || []).filter((c: any) => enrolledCourseIds.has(c.id));
          if (enrolledCoursesList.length > 0) {
            setAvailableCourses(enrolledCoursesList);
            const currentIsEnrolled = enrolledCoursesList.some((c: any) => c.id === activeCourseId);
            if (!currentIsEnrolled) {
              setActiveCourseId(enrolledCoursesList[0].id);
            }
          } else {
            setAvailableCourses([{ id: 'guitar-8-buoi', title: 'Khoá Học Guitar Đệm Hát 8 Bài', total_sessions: 8 }]);
            setActiveCourseId('guitar-8-buoi');
          }
        } catch (cErr) {
          console.warn('Neon DB courses fetch note:', cErr);
        }

        const dbSessions = await sql`
          SELECT * FROM sessions 
          WHERE course_id = ${activeCourseId} OR (course_id IS NULL AND ${activeCourseId} = 'guitar-8-buoi')
          ORDER BY order_index ASC, id ASC
        `;
        
        const progressRows = await sql`
          SELECT * FROM student_progress 
          WHERE student_id = ${studentEmail} OR student_id = ${studentId}
        `;

        const completedIds = new Set(progressRows.filter((p: any) => p.is_completed).map((p: any) => Number(p.session_id)));

        if (dbSessions && dbSessions.length > 0) {
          const mapped: Session[] = dbSessions.map((dbItem: any, idx: number) => {
            const sessNum = idx + 1;
            const isDone = completedIds.has(Number(dbItem.id));

            const dbChords = dbItem?.chords && Array.isArray(dbItem.chords) && dbItem.chords.length > 0 ? dbItem.chords : ['C', 'G', 'Am', 'Em'];
            const dbExercises = dbItem?.exercises 
              ? (typeof dbItem.exercises === 'string' ? JSON.parse(dbItem.exercises) : dbItem.exercises)
              : [
                  { id: 1, text: `Thực hành gảy nhịp cho Bài ${sessNum}`, done: isDone },
                  { id: 2, text: `Quay video đoạn đàn thực hành Bài ${sessNum} gửi thầy`, done: isDone }
                ];

            const dbPractice = dbItem?.practice 
              ? (typeof dbItem.practice === 'string' ? JSON.parse(dbItem.practice) : dbItem.practice)
              : (dbItem?.youtube_video_id 
                  ? [{ heading: 'Video Hướng Dẫn', body: '', youtubeId: dbItem.youtube_video_id }]
                  : [{ heading: 'Video Hướng Dẫn', body: '', youtubeId: 'dQw4w9WgXcQ' }]);

            const theoryText = dbItem?.theory_content || `Chào mừng bạn đến với Bài ${sessNum}. Hãy theo dõi video hướng dẫn bên dưới và hoàn thành bài tập nộp cho Giảng viên nhé!`;
            const dbTheory = [{ heading: 'Nội dung bài học', body: theoryText }];
            const targetBpm = Number(dbItem?.target_bpm) || 80;
            const timeSig = Number(dbItem?.time_signature) || 4;

            return {
              id: Number(dbItem.id),
              title: dbItem.title || `Bài ${sessNum}: Bài thực hành ${sessNum}`,
              subtitle: dbItem.subtitle || `Nội dung hướng dẫn chi tiết cho bài học thứ ${sessNum}`,
              icon: dbItem.icon || '🎸',
              xp: 100,
              color: 'amber',
              x: 0,
              y: 0,
              completed: isDone,
              unlocked: isDone || sessNum === 1 || completedIds.has(Number(dbSessions[idx - 1]?.id)),
              target_bpm: targetBpm,
              time_signature: timeSig,
              content: {
                bpm: targetBpm,
                timeSignature: timeSig,
                theory: dbTheory,
                practice: dbPractice,
                youtubeVideoId: dbPractice[0]?.youtubeId || dbItem.youtube_video_id || 'dQw4w9WgXcQ',
                chords: {
                  symbols: dbChords,
                  title: 'Các Hợp Âm Thực Hành Bài Này'
                },
                exercises: dbExercises
              }
            };
          });
          setSessions(mapped);
        } else {
          const mapped: Session[] = getSessionsData().map(localSession => {
            const isDone = completedIds.has(localSession.id);
            return {
              ...localSession,
              completed: isDone,
              unlocked: isDone || localSession.id === 1 || completedIds.has(localSession.id - 1)
            };
          });
          setSessions(mapped);
        }

        try {
          const dbSubmissions = await sql`
            SELECT * FROM submissions 
            WHERE LOWER(student_email) = ${studentEmail.toLowerCase()} OR student_id = ${studentId}
            ORDER BY id DESC
          `;
          setMySubmissions(dbSubmissions || []);
        } catch (subErr) {
          console.warn('Neon DB submissions fetch:', subErr);
        }

      } catch (err) {
        console.warn('Neon DB dynamic fetch error:', err);
      }
    }

    if (studentEmail || studentId) {
      loadNeonData();
    }
  }, [studentId, studentEmail, activeCourseId]);

  const completedCount = sessions.filter(s => s.completed).length;

  const toggleExercise = (sessionId: number, exId: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          const updatedExs = s.content.exercises.map(e => e.id === exId ? { ...e, done: !e.done } : e);
          return { ...s, content: { ...s.content, exercises: updatedExs } };
        }
        return s;
      });
      saveSessionsData(updated);
      
      setSelectedSession(curr => {
        if (curr && curr.id === sessionId) {
          return updated.find(s => s.id === sessionId) || curr;
        }
        return curr;
      });
      
      return updated;
    });
  };

  const handleCompleteSession = async (session: Session) => {
    setSessions(prev => {
      const updated = prev.map((s, idx) => {
        if (s.id === session.id) {
          return { ...s, completed: true };
        }
        const completedIdx = prev.findIndex(ps => ps.id === session.id);
        if (completedIdx >= 0 && idx === completedIdx + 1) {
          return { ...s, unlocked: true };
        }
        return s;
      });
      saveSessionsData(updated);
      
      setSelectedSession(curr => {
        if (curr && curr.id === session.id) {
          return updated.find(s => s.id === session.id) || curr;
        }
        return curr;
      });
      
      return updated;
    });

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

      await sql`
        INSERT INTO profiles (id, full_name, email)
        VALUES (${studentId}, ${studentName}, ${studentEmail})
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      `;
    } catch (e) {
      console.warn('Neon DB progress save:', e);
    }
  };

  const handleDeleteSubmission = async (subId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài nộp video này không? Action này không thể hoàn tác.')) return;

    try {
      await sql`DELETE FROM submissions WHERE id = ${subId}`;

      const localSubs = JSON.parse(localStorage.getItem('guitarlab_submissions') || '[]');
      const updatedLocal = localSubs.filter((s: any) => s.id !== subId);
      localStorage.setItem('guitarlab_submissions', JSON.stringify(updatedLocal));

      setMySubmissions(prev => prev.filter(s => s.id !== subId));
    } catch (e) {
      console.warn('Neon DB delete submission note:', e);
      const localSubs = JSON.parse(localStorage.getItem('guitarlab_submissions') || '[]');
      const updatedLocal = localSubs.filter((s: any) => s.id !== subId);
      localStorage.setItem('guitarlab_submissions', JSON.stringify(updatedLocal));
      setMySubmissions(prev => prev.filter(s => s.id !== subId));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ══ TOP NAVBAR ══ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                <span className="text-xl">🎸</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-[#1b2a47] leading-none">GUITARLAB</span>
                <span className="text-[9px] font-extrabold text-amber-600 tracking-widest uppercase mt-0.5">CỔNG HỌC VIÊN</span>
              </div>
            </div>

            {availableCourses.length > 0 && (
              <div className="hidden lg:flex items-center gap-2 bg-amber-50/80 px-3 py-1.5 rounded-2xl border border-amber-200">
                <span className="text-xs font-extrabold text-amber-900">📚 Khóa Học:</span>
                <select
                  value={activeCourseId}
                  onChange={e => {
                    setActiveCourseId(e.target.value);
                    setSelectedSession(null);
                  }}
                  className="bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-black text-[#1b2a47] outline-none cursor-pointer"
                >
                  {availableCourses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.total_sessions || 8} Bài)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                setMainTab('roadmap');
                setSelectedSession(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                mainTab === 'roadmap' && !selectedSession
                  ? 'bg-[#1b2a47] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗺️ Lộ Trình {sessions.length || 8} Bài Học
            </button>
            <button
              onClick={() => {
                setMainTab('portfolio');
                setSelectedSession(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                mainTab === 'portfolio' && !selectedSession
                  ? 'bg-[#1b2a47] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎬 Kết Quả Bài Nộp ({mySubmissions.length})</span>
              {mySubmissions.some((s: any) => s.status === 'REVIEWED') && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                {(user?.user_metadata?.full_name || user?.email || 'H')[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-none">
                  {user?.user_metadata?.full_name || user?.email || 'Học Viên Guitar'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Học Viên GuitarLab</span>
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
        
        {selectedSession ? (
          <SessionDetail 
            session={selectedSession}
            studentId={studentId}
            onBack={() => setSelectedSession(null)}
            onComplete={handleCompleteSession}
            onExerciseToggle={toggleExercise}
            totalSessionsCount={sessions.length}
          />
        ) : mainTab === 'portfolio' ? (
          <StudentPortfolio 
            submissions={mySubmissions}
            sessions={sessions}
            onDeleteSubmission={handleDeleteSubmission}
            onViewSession={(sess) => {
              setSelectedSession(sess);
              setMainTab('roadmap');
            }}
          />
        ) : (
          <CourseRoadmap 
            sessions={sessions}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSelectSession={setSelectedSession}
            availableCourses={availableCourses}
            activeCourseId={activeCourseId}
            setActiveCourseId={setActiveCourseId}
            completedCount={completedCount}
          />
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        © 2026 GuitarLab Academy. Nền tảng học Guitar đệm hát trực tuyến hàng đầu.
      </footer>
    </div>
  );
}
