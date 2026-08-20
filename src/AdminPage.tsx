import { useState, useEffect } from 'react';
import { getSessionsData, saveSessionsData } from './data/questData';
import type { Session } from './data/questData';
import { sql, initNeonSchema } from './lib/neon';
import { 
  Users, 
  Video, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Save, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface SubmissionItem {
  id: string;
  student_name: string;
  student_email: string;
  session_id: number;
  video_url: string;
  created_at: string;
  status: 'PENDING' | 'REVIEWED';
  grade?: number;
  feedback?: string;
}

interface StudentProgressItem {
  id: string;
  student_name: string;
  student_email: string;
  created_at: string;
  completed_count: number;
  completed_sessions: number[];
  latest_submission?: SubmissionItem;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'students' | 'editor'>('submissions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeEditorId, setActiveEditorId] = useState<number>(1);
  const [toastMsg, setToastMsg] = useState('');
  const [studentsList, setStudentsList] = useState<StudentProgressItem[]>([]);

  // Submissions State
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [selectedSub, setSelectedSub] = useState<SubmissionItem | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(9);
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  useEffect(() => {
    async function loadAllDatabaseData() {
      // 1. Initialize Neon DB Schema
      await initNeonSchema();

      // 2. Fetch Sessions from Neon DB
      try {
        const dbSessions = await sql`SELECT * FROM sessions ORDER BY id ASC`;
        if (dbSessions && dbSessions.length > 0) {
          const mapped: Session[] = getSessionsData().map(localSession => {
            const dbItem = dbSessions.find((ds: any) => Number(ds.id) === localSession.id);
            return {
              ...localSession,
              title: dbItem?.title || localSession.title,
              subtitle: dbItem?.subtitle || localSession.subtitle
            };
          });
          setSessions(mapped);
        } else {
          setSessions(getSessionsData());
        }
      } catch (e) {
        setSessions(getSessionsData());
      }

      // 3. Fetch Submissions & Students from Neon DB
      fetchDatabaseSubmissionsAndStudents();
    }

    loadAllDatabaseData();

    // Auto poll every 3 seconds for real-time submission sync
    const timer = setInterval(() => {
      fetchDatabaseSubmissionsAndStudents();
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const fetchDatabaseSubmissionsAndStudents = async () => {
    let neonFormatted: SubmissionItem[] = [];
    try {
      const neonRows = await sql`SELECT * FROM submissions ORDER BY created_at DESC`;
      if (neonRows && neonRows.length > 0) {
        neonFormatted = neonRows.map((d: any) => ({
          id: d.id,
          student_name: d.student_name || 'Học Viên Demo',
          student_email: d.student_email || 'student@guitarlab.vn',
          session_id: Number(d.session_id),
          video_url: d.video_url,
          created_at: new Date(d.created_at).toLocaleString('vi-VN'),
          status: d.status || 'PENDING',
          grade: d.grade,
          feedback: d.feedback
        }));
      }
    } catch (neonErr) {
      console.log('Neon DB submissions fetch error:', neonErr);
    }

    // Local submissions fallback
    const localSubs: SubmissionItem[] = JSON.parse(localStorage.getItem('guitarlab_submissions') || '[]');

    // Merge submissions
    const mergedMap = new Map<string, SubmissionItem>();
    [...localSubs, ...neonFormatted].forEach(item => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      }
    });

    const uniqueList = Array.from(mergedMap.values());
    setSubmissions(uniqueList);
    if (uniqueList.length > 0 && !selectedSub) setSelectedSub(uniqueList[0]);

    // 4. Fetch Students & Profiles from Neon DB
    try {
      const profilesRows = await sql`SELECT * FROM profiles ORDER BY created_at DESC`;
      const progressRows = await sql`SELECT * FROM student_progress`;

      const progressMap = new Map<string, number[]>();
      progressRows.forEach((p: any) => {
        const sId = p.student_id;
        const sNum = Number(p.session_id);
        if (p.is_completed) {
          const list = progressMap.get(sId) || [];
          list.push(sNum);
          progressMap.set(sId, list);
        }
      });

      if (profilesRows && profilesRows.length > 0) {
        const studentItems: StudentProgressItem[] = profilesRows.map((prof: any) => {
          const completedList = progressMap.get(prof.id) || [];
          const latestSub = uniqueList.find(s => s.student_email === prof.email || s.student_name === prof.full_name);
          return {
            id: prof.id,
            student_name: prof.full_name || 'Học Viên',
            student_email: prof.email,
            created_at: new Date(prof.created_at).toLocaleDateString('vi-VN'),
            completed_count: completedList.length,
            completed_sessions: completedList,
            latest_submission: latestSub
          };
        });
        setStudentsList(studentItems);
      } else {
        setStudentsList([]);
      }
    } catch (err) {
      setStudentsList([]);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSaveEditor = async () => {
    saveSessionsData(sessions);

    if (activeSession) {
      try {
        await sql`
          UPDATE sessions 
          SET title = ${activeSession.title},
              subtitle = ${activeSession.subtitle}
          WHERE id = ${activeSession.id}
        `;
      } catch (e) {
        console.warn('Neon DB session update note:', e);
      }
    }
    showToast('Đã lưu nội dung khóa học lên CSDL Neon thành công!');
  };

  const handleGradeSubmission = async () => {
    if (!selectedSub) return;

    // Update state
    const updated = submissions.map(s => {
      if (s.id === selectedSub.id) {
        return {
          ...s,
          status: 'REVIEWED' as const,
          grade: gradeInput,
          feedback: feedbackInput
        };
      }
      return s;
    });

    setSubmissions(updated);
    localStorage.setItem('guitarlab_submissions', JSON.stringify(updated));
    const found = updated.find(s => s.id === selectedSub.id);
    if (found) setSelectedSub(found);

    // Update Neon PostgreSQL Database
    try {
      await sql`
        UPDATE submissions 
        SET status = 'REVIEWED', grade = ${gradeInput}, feedback = ${feedbackInput}
        WHERE id = ${selectedSub.id}
      `;
    } catch (e) {
      console.warn('Neon DB update:', e);
    }

    showToast('Đã gửi đánh giá & điểm cho học viên!');
  };

  const activeSession = sessions.find(s => s.id === activeEditorId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#1b2a47] text-white px-5 py-3 rounded-2xl shadow-xl border border-amber-400/40 text-xs font-bold animate-bounce">
          ✨ {toastMsg}
        </div>
      )}

      {/* ══ TOP NAVBAR ══ */}
      <header className="bg-[#1b2a47] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
              🎸
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none">GUITARLAB ADMIN</span>
              <span className="text-[10px] text-amber-300 font-extrabold tracking-widest uppercase">CỔNG QUẢN TRỊ GIÁO VIÊN</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="/quest.html" 
              className="text-xs font-bold text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all border border-amber-400/30 flex items-center gap-1.5"
            >
              <span>Xem Cổng Học Viên</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ══ MAIN CONTENT ══ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tổng Học Viên</span>
              <span className="text-2xl font-black text-[#1b2a47]">
                {studentsList.length > 0 ? studentsList.length : 3} Học Viên
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Chờ Chấm Điểm</span>
              <span className="text-2xl font-black text-amber-600">
                {submissions.filter(s => s.status === 'PENDING').length} Bài Nộp
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Đã Chấm Điểm</span>
              <span className="text-2xl font-black text-emerald-600">
                {submissions.filter(s => s.status === 'REVIEWED').length} Bài Nộp
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Chương Trình</span>
              <span className="text-2xl font-black text-[#1b2a47]">8 Buổi Học</span>
            </div>
          </div>

        </div>

        {/* ADMIN TAB NAVIGATION */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'submissions'
                ? 'bg-[#1b2a47] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Video className="w-4 h-4" /> Chấm Bài Nộp Video
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'students'
                ? 'bg-[#1b2a47] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Danh Sách Học Viên
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'editor'
                ? 'bg-[#1b2a47] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Cấu Hình Bài Học (8 Buổi)
          </button>
        </div>

        {/* -------------------------------------------------------------
            TAB 1: CHẤM BÀI NỘP VIDEO (SUBMISSIONS REVIEW)
           ------------------------------------------------------------- */}
        {activeTab === 'submissions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Submissions List */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-slate-900 text-base">Bài Nộp Từ Học Viên</h2>
                <span className="text-xs text-slate-500 font-bold">{submissions.length} bài</span>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {submissions.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSub(sub);
                      setGradeInput(sub.grade || 9);
                      setFeedbackInput(sub.feedback || '');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      selectedSub?.id === sub.id
                        ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-[#1b2a47]">{sub.student_name}</span>
                      {sub.status === 'REVIEWED' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Đã Chấm ({sub.grade}/10)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Chờ Chấm
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span>Buổi {sub.session_id}</span>
                      <span className="text-slate-400">{sub.created_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Review & Grading Panel */}
            {selectedSub ? (
              <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">
                      Đang Xem Bài Nộp Buổi {selectedSub.session_id}
                    </span>
                    <h2 className="text-xl font-black text-[#1b2a47]">{selectedSub.student_name}</h2>
                    <span className="text-xs text-slate-500">{selectedSub.student_email}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-1">Thời gian nộp:</span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      {selectedSub.created_at}
                    </span>
                  </div>
                </div>

                {/* Video Player */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Video Thực Hành Của Học Viên:</h3>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg">
                    <video src={selectedSub.video_url} controls className="w-full h-full object-contain" />
                  </div>
                </div>

                {/* Grading Form */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-black text-sm text-[#1b2a47] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    Chấm Điểm & Gửi Nhận Xét 1:1
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-2">Điểm Số (1 - 10):</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={gradeInput}
                        onChange={e => setGradeInput(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 font-bold text-slate-900 outline-none focus:border-[#1b2a47]"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-xs font-bold text-slate-700 block mb-2">Nhận Xét Chi Tiết Cho Học Viên:</label>
                      <textarea
                        rows={3}
                        value={feedbackInput}
                        onChange={e => setFeedbackInput(e.target.value)}
                        placeholder="Nhập góp ý tư thế bấm đàn, nhịp điệu, các điểm cần cải thiện..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#1b2a47]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGradeSubmission}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-900/20 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Gửi Đánh Giá & Điểm Cho Học Viên
                  </button>
                </div>

              </div>
            ) : (
              <div className="lg:col-span-2 bg-white p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center text-slate-400">
                <Video className="w-12 h-12 mb-3 text-slate-300" />
                <p>Vui lòng chọn một bài nộp ở danh sách bên trái để xem video và chấm điểm</p>
              </div>
            )}

          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 2: QUẢN LÝ HỌC VIÊN & TIẾN ĐỘ HỌC TẬP (STUDENT DIRECTORY)
           ------------------------------------------------------------- */}
        {activeTab === 'students' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-black text-[#1b2a47] text-xl">Danh Sách Học Viên & Tiến Độ Học Tập 8 Buổi</h2>
                <p className="text-xs text-slate-500">Theo dõi quá trình học, bài nộp và số buổi đã hoàn thành của từng học viên</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold bg-amber-50 text-amber-900 px-4 py-2 rounded-xl border border-amber-200 shadow-xs">
                  Tổng: {studentsList.length} Học Viên Trong Hệ Thống
                </span>
              </div>
            </div>

            {/* Students Progress Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Học Viên</th>
                    <th className="p-4">Email Liên Hệ</th>
                    <th className="p-4">Tiến Độ Tổng Quan</th>
                    <th className="p-4">Ma Trận 8 Buổi Học</th>
                    <th className="p-4 text-right">Bài Nộp Mới Nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {studentsList.length > 0 ? (
                    studentsList.map((st, idx) => {
                      const percent = Math.round((st.completed_count / 8) * 100);
                      const bgColors = ['bg-amber-500', 'bg-indigo-600', 'bg-purple-600', 'bg-emerald-600', 'bg-blue-600'];
                      const avatarBg = bgColors[idx % bgColors.length];

                      return (
                        <tr key={st.id || st.student_email} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 ${avatarBg} text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm`}>
                                {(st.student_name[0] || 'H').toUpperCase()}
                              </div>
                              <div>
                                <span className="font-extrabold text-sm text-[#1b2a47] block">{st.student_name}</span>
                                <span className="text-[10px] text-slate-400">Tham gia: {st.created_at}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 font-mono">{st.student_email}</td>
                          <td className="p-4">
                            <div className="space-y-1.5 w-36">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-bold text-slate-700">{percent}%</span>
                                <span className="text-slate-500 font-bold">{st.completed_count}/8 Buổi</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(sNum => {
                                const isDone = st.completed_sessions.includes(sNum);
                                const isSub = st.latest_submission?.session_id === sNum;
                                let badgeClass = "bg-slate-200 text-slate-500";
                                if (isDone) badgeClass = "bg-emerald-500 text-white";
                                else if (isSub) badgeClass = "bg-amber-400 text-amber-950 font-bold";

                                return (
                                  <span key={sNum} className={`w-6 h-6 rounded-lg font-bold text-[10px] flex items-center justify-center ${badgeClass}`}>
                                    B{sNum}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {st.latest_submission ? (
                              <button 
                                onClick={() => {
                                  setSelectedSub(st.latest_submission || null);
                                  setActiveTab('submissions');
                                }} 
                                className="px-3 py-1.5 bg-amber-100 text-amber-800 font-extrabold rounded-xl hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
                              >
                                Chấm Buổi {st.latest_submission.session_id} <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Chưa nộp bài</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu học viên trong CSDL Neon PostgreSQL
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 3: CẤU HÌNH BÀI HỌC (COURSE CONTENT EDITOR)
           ------------------------------------------------------------- */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sessions Selector Sidebar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider px-3 mb-2">Chọn Buổi Để Chỉnh Sửa:</h3>
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveEditorId(s.id)}
                  className={`w-full text-left p-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between ${
                    activeEditorId === s.id
                      ? 'bg-[#1b2a47] text-white shadow-md'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{s.icon} Buổi {s.id}: {s.title}</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={handleSaveEditor}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <Save className="w-4 h-4" /> Lưu Tất Cả Bài Học
                </button>
              </div>
            </div>

            {/* Session Detail Form Editor */}
            {activeSession && (
              <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h2 className="font-black text-xl text-[#1b2a47]">
                    Chỉnh Sửa Buổi {activeSession.id}: {activeSession.title}
                  </h2>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    Cấu Hình Nội Dung
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Tiêu Đề Buổi Học:</label>
                    <input
                      type="text"
                      value={activeSession.title}
                      onChange={e => {
                        const val = e.target.value;
                        setSessions(sessions.map(s => s.id === activeSession.id ? { ...s, title: val } : s));
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none focus:border-[#1b2a47]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Phụ Đề / Mô Tả Ngắn:</label>
                    <input
                      type="text"
                      value={activeSession.subtitle}
                      onChange={e => {
                        const val = e.target.value;
                        setSessions(sessions.map(s => s.id === activeSession.id ? { ...s, subtitle: val } : s));
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-xs text-slate-900 outline-none focus:border-[#1b2a47]"
                    />
                  </div>
                </div>

                {/* Practice Video YouTube ID */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Video Bài Giảng YouTube:</h3>
                  {activeSession.content.practice.map((p, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên Mục Bài Học:</label>
                          <input
                            type="text"
                            value={p.heading}
                            onChange={e => {
                              const val = e.target.value;
                              setSessions(sessions.map(s => {
                                if (s.id === activeSession.id) {
                                  const updatedPrac = s.content.practice.map((item, i) => i === idx ? { ...item, heading: val } : item);
                                  return { ...s, content: { ...s.content, practice: updatedPrac } };
                                }
                                return s;
                              }));
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">YouTube Video ID:</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: dQw4w9WgXcQ"
                            value={p.youtubeId || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setSessions(sessions.map(s => {
                                if (s.id === activeSession.id) {
                                  const updatedPrac = s.content.practice.map((item, i) => i === idx ? { ...item, youtubeId: val } : item);
                                  return { ...s, content: { ...s.content, practice: updatedPrac } };
                                }
                                return s;
                              }));
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        © 2026 GuitarLab Admin Portal. Dành riêng cho Giảng viên & Quản trị viên.
      </footer>
    </div>
  );
}
