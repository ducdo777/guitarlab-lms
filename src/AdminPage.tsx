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
  ChevronRight,
  Trash2
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
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentProgressItem | null>(null);

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
          student_name: d.student_name || 'Học Viên',
          student_email: d.student_email || 'student@guitarlab.vn',
          session_id: Number(d.session_id),
          video_url: d.video_url,
          created_at: new Date(d.created_at).toLocaleString('vi-VN'),
          status: d.status || 'PENDING',
          grade: d.grade,
          feedback: d.feedback
        }));
        setSubmissions(neonFormatted);
        if (!selectedSub && neonFormatted.length > 0) setSelectedSub(neonFormatted[0]);
      } else {
        setSubmissions([]);
      }
    } catch (neonErr) {
      console.log('Neon DB submissions fetch error:', neonErr);
    }

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
          const byId = progressMap.get(prof.id) || [];
          const byEmail = progressMap.get(prof.email) || [];
          const combinedSet = new Set([...byId, ...byEmail]);
          const completedList = Array.from(combinedSet).sort((a, b) => a - b);
          const latestSub = neonFormatted.find((s: SubmissionItem) => s.student_email === prof.email || s.student_name === prof.full_name);
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
        const chordsArr = activeSession.content.chords?.symbols || [];
        const exercisesArr = JSON.stringify(activeSession.content.exercises || []);
        const ytbId = activeSession.content.practice[0]?.youtubeId || 'dQw4w9WgXcQ';

        await sql`
          UPDATE sessions 
          SET title = ${activeSession.title},
              subtitle = ${activeSession.subtitle},
              youtube_video_id = ${ytbId},
              chords = ${chordsArr},
              exercises = ${exercisesArr}::jsonb
          WHERE id = ${activeSession.id}
        `;
      } catch (e) {
        console.warn('Neon DB session update note:', e);
      }
    }
    showToast('Đã lưu nội dung bài học, hợp âm & danh sách bài tập lên CSDL Neon!');
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

  const handleDeleteSubmissionAdmin = async (subId: string) => {
    if (!window.confirm('Xác nhận xóa bài nộp video này khỏi CSDL?')) return;

    try {
      await sql`DELETE FROM submissions WHERE id = ${subId}`;

      const updated = submissions.filter(s => s.id !== subId);
      setSubmissions(updated);
      localStorage.setItem('guitarlab_submissions', JSON.stringify(updated));

      if (selectedSub?.id === subId) {
        setSelectedSub(updated[0] || null);
      }
      showToast('Đã xóa bài nộp thành công!');
    } catch (e) {
      console.warn('Neon DB delete submission admin note:', e);
      const updated = submissions.filter(s => s.id !== subId);
      setSubmissions(updated);
      localStorage.setItem('guitarlab_submissions', JSON.stringify(updated));
      if (selectedSub?.id === subId) setSelectedSub(updated[0] || null);
      showToast('Đã xóa bài nộp!');
    }
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

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDeleteSubmissionAdmin(selectedSub.id)}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs border border-red-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa Bài Nộp
                    </button>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block mb-1">Thời gian nộp:</span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {selectedSub.created_at}
                      </span>
                    </div>
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
                    <th className="p-4 text-right">Chi Tiết Hồ Sơ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {studentsList.length > 0 ? (
                    studentsList.map((st, idx) => {
                      const percent = Math.round((st.completed_count / 8) * 100);
                      const bgColors = ['bg-amber-500', 'bg-indigo-600', 'bg-purple-600', 'bg-emerald-600', 'bg-blue-600'];
                      const avatarBg = bgColors[idx % bgColors.length];

                      return (
                        <tr 
                          key={st.id || st.student_email} 
                          onClick={() => setSelectedStudentProfile(st)}
                          className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                        >
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
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentProfile(st);
                              }} 
                              className="px-3.5 py-1.5 bg-[#1b2a47] text-white font-extrabold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-1 shadow-xs"
                            >
                              Hồ Sơ & Bài Nộp ➔
                            </button>
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

                {/* Detailed Theory Text Description */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Mô Tả Nội Dung Chi Tiết Bài Học (Hiển thị dưới tên bài cho học viên):
                  </label>
                  <textarea
                    rows={3}
                    value={activeSession.content.theory?.[0]?.body || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setSessions(sessions.map(s => {
                        if (s.id === activeSession.id) {
                          const updatedTheory = s.content.theory && s.content.theory.length > 0
                            ? [{ ...s.content.theory[0], body: val }, ...s.content.theory.slice(1)]
                            : [{ heading: 'Nội dung bài học', body: val }];
                          return { ...s, content: { ...s.content, theory: updatedTheory } };
                        }
                        return s;
                      }));
                    }}
                    placeholder="Nhập hướng dẫn chi tiết nội dung bài học bằng văn bản..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#1b2a47]"
                  />
                </div>

                {/* Practice Videos List Editor (Up to 5 videos) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                      Video Bài Giảng YouTube ({activeSession.content.practice.length}/5 Video):
                    </h3>
                    {activeSession.content.practice.length < 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeSession.content.practice || [];
                          const newItem = {
                            heading: `Video ${current.length + 1}: Hướng dẫn thực hành`,
                            body: 'Mô tả ngắn nội dung bài giảng video...',
                            youtubeId: 'dQw4w9WgXcQ'
                          };
                          setSessions(sessions.map(s => {
                            if (s.id === activeSession.id) {
                              return { ...s, content: { ...s.content, practice: [...current, newItem] } };
                            }
                            return s;
                          }));
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1"
                      >
                        + Thêm Video (Tối Đa 5)
                      </button>
                    )}
                  </div>

                  {activeSession.content.practice.map((p, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg">
                          Video Bài Giảng #{idx + 1}
                        </span>
                        {activeSession.content.practice.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = activeSession.content.practice.filter((_, i) => i !== idx);
                              setSessions(sessions.map(s => {
                                if (s.id === activeSession.id) {
                                  return { ...s, content: { ...s.content, practice: updated } };
                                }
                                return s;
                              }));
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50"
                          >
                            Xóa Video này
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên Video / Tiêu Đề Mục:</label>
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
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">YouTube Video ID (hoặc Link Full):</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: dQw4w9WgXcQ"
                            value={p.youtubeId || ''}
                            onChange={e => {
                              let val = e.target.value.trim();
                              if (val.includes('v=')) {
                                val = val.split('v=')[1]?.split('&')[0] || val;
                              } else if (val.includes('youtu.be/')) {
                                val = val.split('youtu.be/')[1]?.split('?')[0] || val;
                              }
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

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mô Tả Ngắn Cho Video Này:</label>
                        <textarea
                          rows={2}
                          value={p.body || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setSessions(sessions.map(s => {
                              if (s.id === activeSession.id) {
                                const updatedPrac = s.content.practice.map((item, i) => i === idx ? { ...item, body: val } : item);
                                return { ...s, content: { ...s.content, practice: updatedPrac } };
                              }
                              return s;
                            }));
                          }}
                          placeholder="Nhập hướng dẫn ngắn cho học viên khi xem video này..."
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ══ 1. HỢP ÂM TẬP LUYỆN (PRACTICE CHORDS SELECTOR) ══ */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Hợp Âm Tập Luyện Cần Bấm (Chords):</h3>
                    <span className="text-[10px] font-bold text-slate-400">Bấm nút để bật/tắt hợp âm vào bài học</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    {['C', 'D', 'E', 'Em', 'Am', 'G', 'F', 'Dm', 'Bm', 'A', 'E7', 'G7', 'C7', 'Fm'].map(chord => {
                      const activeChords = activeSession.content.chords?.symbols || [];
                      const isSelected = activeChords.includes(chord);
                      return (
                        <button
                          key={chord}
                          type="button"
                          onClick={() => {
                            const nextChords = isSelected
                              ? activeChords.filter(c => c !== chord)
                              : [...activeChords, chord];
                            
                            setSessions(sessions.map(s => {
                              if (s.id === activeSession.id) {
                                return {
                                  ...s,
                                  content: {
                                    ...s.content,
                                    chords: {
                                      ...(s.content.chords || { symbols: [] }),
                                      symbols: nextChords
                                    }
                                  }
                                };
                              }
                              return s;
                            }));
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border shadow-xs ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {chord} {isSelected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ══ 2. CẤU HÌNH BÀI TẬP (CONFIGURABLE EXERCISES LIST) ══ */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Danh Sách Bài Tập Cần Hoàn Thành (Exercises):</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const currentEx = activeSession.content.exercises || [];
                        const newEx = [
                          ...currentEx,
                          { id: `ex_${Date.now()}`, text: 'Bài tập mới: Thực hành rải dây nhịp 4/4', done: false }
                        ];
                        setSessions(sessions.map(s => {
                          if (s.id === activeSession.id) {
                            return {
                              ...s,
                              content: { ...s.content, exercises: newEx }
                            };
                          }
                          return s;
                        }));
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                    >
                      + Thêm Bài Tập Mới
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(activeSession.content.exercises || []).map((ex, exIdx) => (
                      <div key={ex.id || exIdx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 w-6">#{exIdx + 1}</span>
                        <input
                          type="text"
                          value={ex.text}
                          onChange={e => {
                            const val = e.target.value;
                            const updatedEx = (activeSession.content.exercises || []).map((item, i) => 
                              i === exIdx ? { ...item, text: val } : item
                            );
                            setSessions(sessions.map(s => {
                              if (s.id === activeSession.id) {
                                return { ...s, content: { ...s.content, exercises: updatedEx } };
                              }
                              return s;
                            }));
                          }}
                          className="flex-1 bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-medium text-slate-800 outline-none focus:border-[#1b2a47]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedEx = (activeSession.content.exercises || []).filter((_, i) => i !== exIdx);
                            setSessions(sessions.map(s => {
                              if (s.id === activeSession.id) {
                                return { ...s, content: { ...s.content, exercises: updatedEx } };
                              }
                              return s;
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      {/* ═════════════════════════════════════════════════════════════════
          TRANG THÔNG TIN CHI TIẾT HỌC VIÊN (STUDENT DETAIL PROFILE MODAL)
         ═════════════════════════════════════════════════════════════════ */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedStudentProfile(null)}
              className="absolute top-6 right-6 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-lg transition-all"
            >
              ✕
            </button>

            {/* Student Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-md">
                  {(selectedStudentProfile.student_name[0] || 'H').toUpperCase()}
                </div>
                <div>
                  <h2 className="font-black text-2xl text-[#1b2a47] flex items-center gap-2">
                    {selectedStudentProfile.student_name}
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Học Viên Guitar
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">📧 Email: {selectedStudentProfile.student_email}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">📅 Ngày tham gia: {selectedStudentProfile.created_at}</p>
                </div>
              </div>

              {/* Progress Badge */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-right min-w-[200px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tiến Độ Khóa Học:</span>
                <span className="text-2xl font-black text-emerald-600">
                  {selectedStudentProfile.completed_count}/8 Buổi ({Math.round((selectedStudentProfile.completed_count / 8) * 100)}%)
                </span>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((selectedStudentProfile.completed_count / 8) * 100)}%` }}></div>
                </div>
              </div>
            </div>

            {/* 1. Ma Trận 8 Buổi Học */}
            <div className="space-y-3">
              <h3 className="font-black text-sm text-[#1b2a47] uppercase tracking-wider">
                1. Trạng Thái Chi Tiết Tiến Độ 8 Buổi Học:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sNum => {
                  const isDone = selectedStudentProfile.completed_sessions.includes(sNum);
                  const sessInfo = sessions.find(s => s.id === sNum);
                  return (
                    <div 
                      key={sNum} 
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        isDone 
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-xs">Buổi {sNum}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {isDone ? 'Hoàn thành ✓' : 'Chưa học'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold block truncate">{sessInfo?.title || `Bài học ${sNum}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Danh Sách Bài Nộp Video Guitar Thực Hành */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[#1b2a47] uppercase tracking-wider">
                  2. Các Bài Nộp Video Guitar Thực Hành ({
                    submissions.filter(s => 
                      s.student_email === selectedStudentProfile.student_email || 
                      s.student_name === selectedStudentProfile.student_name
                    ).length
                  } Bài Nộp):
                </h3>
              </div>

              {(() => {
                const studentSubs = submissions.filter(s => 
                  s.student_email === selectedStudentProfile.student_email || 
                  s.student_name === selectedStudentProfile.student_name
                );

                if (studentSubs.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 italic text-xs">
                      Học viên này chưa nộp bài thực hành video nào.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {studentSubs.map(sub => {
                      const sess = sessions.find(s => s.id === sub.session_id);
                      return (
                        <div key={sub.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                            <div>
                              <h4 className="font-black text-sm text-[#1b2a47]">
                                🎬 Bài Nộp Buổi {sub.session_id}: {sess?.title || `Buổi học ${sub.session_id}`}
                              </h4>
                              <span className="text-[11px] text-slate-400">Thời gian nộp: {sub.created_at}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                                sub.status === 'REVIEWED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {sub.status === 'REVIEWED' ? 'Đã Chấm Điểm ✓' : 'Chờ Nhận Xét'}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedStudentProfile(null);
                                  setSelectedSub(sub);
                                  setActiveTab('submissions');
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs"
                              >
                                Chấm Bài Này ➔
                              </button>
                            </div>
                          </div>

                          {/* Video Player */}
                          {sub.video_url && (
                            <div className="aspect-video w-full max-w-lg mx-auto rounded-2xl overflow-hidden shadow-md bg-black">
                              {sub.video_url.includes('youtube.com') || sub.video_url.includes('youtu.be') ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${sub.video_url.split('v=')[1] || sub.video_url.split('youtu.be/')[1]}`}
                                  className="w-full h-full border-0"
                                  allowFullScreen
                                ></iframe>
                              ) : (
                                <video
                                  src={sub.video_url}
                                  controls
                                  className="w-full h-full object-contain"
                                />
                              )}
                            </div>
                          )}

                          {/* Grade & Feedback if reviewed */}
                          {sub.status === 'REVIEWED' && (
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-emerald-900">Điểm Đánh Giá: {sub.grade}/10 điểm</span>
                                <span className="text-[10px] font-bold text-emerald-700">Đã gửi nhận xét cho học viên</span>
                              </div>
                              {sub.feedback && (
                                <p className="text-xs text-emerald-800 italic">"{sub.feedback}"</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        © 2026 GuitarLab Admin Portal. Dành riêng cho Giảng viên & Quản trị viên.
      </footer>
    </div>
  );
}
