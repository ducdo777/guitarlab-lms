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
  Trash2,
  FolderPlus,
  Plus,
  GraduationCap,
  LogOut,
  ShieldCheck
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

interface CourseItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  total_sessions: number;
  created_at?: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'students' | 'editor' | 'courses'>('submissions');
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

  // Course & Enrollment State
  const [coursesList, setCoursesList] = useState<CourseItem[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<any[]>([]);
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [newCourseId, setNewCourseId] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseSubtitle, setNewCourseSubtitle] = useState('');
  const [newCourseSessions, setNewCourseSessions] = useState(8);
  const [enrollModalStudent, setEnrollModalStudent] = useState<StudentProgressItem | null>(null);
  const [editorCourseId, setEditorCourseId] = useState<string>('guitar-8-buoi');

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
          created_at: d.created_at ? (d.created_at instanceof Date ? d.created_at.toLocaleString('vi-VN') : new Date(d.created_at).toLocaleString('vi-VN')) : 'Mới nộp',
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

    await fetchCoursesAndEnrollments();
  };

  const fetchCoursesAndEnrollments = async () => {
    try {
      const dbCourses = await sql`SELECT * FROM courses ORDER BY created_at ASC`;
      const dbEnrollments = await sql`SELECT * FROM user_courses`;
      if (dbCourses && dbCourses.length > 0) {
        setCoursesList(dbCourses.map((c: any) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle || '',
          description: c.description || '',
          total_sessions: Number(c.total_sessions || 8)
        })));
      }
      if (dbEnrollments) setUserEnrollments(dbEnrollments);
    } catch (e) {
      console.warn('Neon DB fetch courses:', e);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseId.trim() || !newCourseTitle.trim()) {
      alert('Vui lòng nhập Mã ID và Tên Khóa Học!');
      return;
    }

    const cleanCourseId = newCourseId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    try {
      try {
        await sql`ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_order_index_key;`;
      } catch (e) {}

      await sql`
        INSERT INTO courses (id, title, subtitle, description, total_sessions)
        VALUES (${cleanCourseId}, ${newCourseTitle}, ${newCourseSubtitle || 'Khóa học guitar tùy chỉnh'}, ${newCourseSubtitle}, ${newCourseSessions})
        ON CONFLICT (id) DO UPDATE SET 
          title = EXCLUDED.title, 
          subtitle = EXCLUDED.subtitle, 
          total_sessions = EXCLUDED.total_sessions
      `;

      for (let i = 1; i <= newCourseSessions; i++) {
        const sessId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000) + i;
        await sql`
          INSERT INTO sessions (id, course_id, title, subtitle, icon, order_index)
          VALUES (${sessId}, ${cleanCourseId}, ${`Buổi ${i}: Bài thực hành ${i}`}, ${`Nội dung hướng dẫn cho buổi học thứ ${i}`}, '🎸', ${i})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      await fetchCoursesAndEnrollments();
      setShowNewCourseModal(false);
      setNewCourseId('');
      setNewCourseTitle('');
      setNewCourseSubtitle('');
      setNewCourseSessions(8);
      showToast(`Đã tạo khóa học mới "${newCourseTitle}" với ${newCourseSessions} buổi!`);
    } catch (err: any) {
      console.error('Create course error:', err);
      alert('Lỗi tạo khóa học: ' + err.message);
    }
  };

  const handleToggleEnrollment = async (studentEmail: string, courseId: string, isEnrolled: boolean) => {
    const cleanEmail = studentEmail.trim().toLowerCase();
    const cleanEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const enrollId = `enroll_${cleanEmailKey}_${courseId}`;
    const targetCourse = coursesList.find(c => c.id === courseId);
    const courseTitle = targetCourse?.title || courseId;

    try {
      if (isEnrolled) {
        // ══ XÁC NHẬN GỠ HỌC VIÊN & XÓA SẠCH DỮ LIỆU CŨ ══
        const confirmRemove = window.confirm(
          `Xác nhận gỡ học viên (${studentEmail}) khỏi khóa "${courseTitle}"?\n\n` +
          `⚠️ CẢNH BÁO: Toàn bộ tiến độ học tập và bài nộp video của học viên trong khóa này sẽ được xóa sạch hoàn toàn.`
        );
        if (!confirmRemove) return;

        // 1. Delete enrollment from user_courses
        await sql`
          DELETE FROM user_courses 
          WHERE LOWER(student_email) = ${cleanEmail} AND course_id = ${courseId}
        `;

        // 2. Delete student progress for sessions belonging to this course
        await sql`
          DELETE FROM student_progress 
          WHERE (LOWER(student_id) = ${cleanEmail} OR student_id IN (SELECT id FROM profiles WHERE LOWER(email) = ${cleanEmail}))
            AND session_id IN (
              SELECT id FROM sessions 
              WHERE course_id = ${courseId} OR (course_id IS NULL AND ${courseId} = 'guitar-8-buoi')
            )
        `;

        // 3. Delete student video submissions for sessions belonging to this course
        await sql`
          DELETE FROM submissions 
          WHERE (LOWER(student_email) = ${cleanEmail} OR LOWER(student_id) = ${cleanEmail} OR student_id IN (SELECT id FROM profiles WHERE LOWER(email) = ${cleanEmail}))
            AND session_id IN (
              SELECT id FROM sessions 
              WHERE course_id = ${courseId} OR (course_id IS NULL AND ${courseId} = 'guitar-8-buoi')
            )
        `;

        // 4. Update local state
        setUserEnrollments(prev => prev.filter(e => !(e.student_email.toLowerCase() === cleanEmail && e.course_id === courseId)));
        await fetchDatabaseSubmissionsAndStudents();
        showToast(`Đã gỡ học viên khỏi khóa "${courseTitle}" và xóa sạch dữ liệu liên quan!`);
      } else {
        // ══ PHÂN LỚP HỌC VIÊN (KHỞI TẠO MỚI) ══
        await sql`
          INSERT INTO user_courses (id, student_email, course_id)
          VALUES (${enrollId}, ${cleanEmail}, ${courseId})
          ON CONFLICT (student_email, course_id) DO NOTHING
        `;
        setUserEnrollments(prev => [...prev, { id: enrollId, student_email: cleanEmail, course_id: courseId }]);
        await fetchDatabaseSubmissionsAndStudents();
        showToast(`Đã phân học viên vào khóa "${courseTitle}" (khởi tạo mới 0%)!`);
      }
    } catch (err: any) {
      console.error('Toggle enrollment error:', err);
      alert('Lỗi cập nhật phân lớp: ' + err.message);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (courseId === 'guitar-8-buoi') {
      alert('Không thể xóa khóa học mặc định!');
      return;
    }
    if (!window.confirm(`Xác nhận xóa toàn bộ khóa học "${courseTitle}"?`)) return;

    try {
      await sql`DELETE FROM courses WHERE id = ${courseId}`;
      await sql`DELETE FROM sessions WHERE course_id = ${courseId}`;
      await sql`DELETE FROM user_courses WHERE course_id = ${courseId}`;

      setCoursesList(prev => prev.filter(c => c.id !== courseId));
      showToast(`Đã xóa khóa học ${courseTitle}`);
    } catch (err: any) {
      console.error('Delete course error:', err);
      alert('Lỗi xóa khóa học!');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchSessionsForCourse = async (courseId: string) => {
    try {
      let dbSessions = await sql`
        SELECT * FROM sessions 
        WHERE course_id = ${courseId} OR (course_id IS NULL AND ${courseId} = 'guitar-8-buoi')
        ORDER BY order_index ASC, id ASC
      `;

      // Auto-generate session rows if course currently has 0 sessions
      if (!dbSessions || dbSessions.length === 0) {
        const targetCourse = coursesList.find(c => c.id === courseId);
        const totalToCreate = targetCourse?.total_sessions || 8;

        try {
          for (let i = 1; i <= totalToCreate; i++) {
            const sessId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000) + i;
            await sql`
              INSERT INTO sessions (id, course_id, title, subtitle, icon, order_index)
              VALUES (${sessId}, ${courseId}, ${`Buổi ${i}: Bài thực hành ${i}`}, ${`Nội dung hướng dẫn chi tiết cho buổi học thứ ${i}`}, '🎸', ${i})
              ON CONFLICT (id) DO NOTHING
            `;
          }

          const retrySessions = await sql`
            SELECT * FROM sessions 
            WHERE course_id = ${courseId}
            ORDER BY order_index ASC, id ASC
          `;
          if (retrySessions && retrySessions.length > 0) {
            dbSessions = retrySessions;
          }
        } catch (genErr) {
          console.warn('Auto generate sessions error:', genErr);
        }
      }

      if (dbSessions && dbSessions.length > 0) {
        const mapped: Session[] = dbSessions.map((dbItem: any, idx: number) => {
          const sessNum = idx + 1;
          const dbChords = dbItem?.chords && Array.isArray(dbItem.chords) && dbItem.chords.length > 0 ? dbItem.chords : ['C', 'G', 'Am', 'Em'];
          const dbExercises = dbItem?.exercises 
            ? (typeof dbItem.exercises === 'string' ? JSON.parse(dbItem.exercises) : dbItem.exercises)
            : [
                { id: 1, text: `Thực hành gảy nhịp cho Buổi ${sessNum}`, done: false },
                { id: 2, text: `Quay video đoạn đàn thực hành Buổi ${sessNum} gửi thầy`, done: false }
              ];

          const dbPractice = dbItem?.practice 
            ? (typeof dbItem.practice === 'string' ? JSON.parse(dbItem.practice) : dbItem.practice)
            : (dbItem?.youtube_video_id 
                ? [{ heading: 'Video Hướng Dẫn', body: '', youtubeId: dbItem.youtube_video_id }]
                : [{ heading: 'Video Hướng Dẫn', body: '', youtubeId: 'dQw4w9WgXcQ' }]);

          const theoryText = dbItem?.theory_content || `Chào mừng bạn đến với Buổi ${sessNum}. Hãy theo dõi video hướng dẫn bên dưới và hoàn thành bài tập nộp cho Giảng viên nhé!`;
          const dbTheory = [{ heading: 'Nội dung bài học', body: theoryText }];

          return {
            id: Number(dbItem.id),
            title: dbItem.title || `Buổi ${sessNum}: Bài thực hành ${sessNum}`,
            subtitle: dbItem.subtitle || `Nội dung hướng dẫn chi tiết cho buổi học thứ ${sessNum}`,
            icon: dbItem.icon || '🎸',
            xp: 100,
            color: 'amber',
            x: 0,
            y: 0,
            completed: false,
            unlocked: true,
            content: {
              theory: dbTheory,
              practice: dbPractice,
              youtubeVideoId: dbPractice[0]?.youtubeId || dbItem.youtube_video_id || 'dQw4w9WgXcQ',
              chords: {
                symbols: dbChords,
                title: 'Các Hợp Âm Thực Hành Buổi Này'
              },
              exercises: dbExercises
            }
          };
        });
        setSessions(mapped);
        if (mapped.length > 0) setActiveEditorId(mapped[0].id);
      } else {
        setSessions([]);
      }
    } catch (e) {
      console.warn('Fetch sessions for course error:', e);
    }
  };

  const handleAddSession = async () => {
    const nextOrderIndex = sessions.length + 1;
    const newSessId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
    const newTitle = `Buổi ${nextOrderIndex}: Bài thực hành nâng cao ${nextOrderIndex}`;
    const newSubtitle = `Nội dung hướng dẫn chi tiết cho buổi học thứ ${nextOrderIndex}`;

    try {
      await sql`
        INSERT INTO sessions (id, course_id, title, subtitle, icon, order_index)
        VALUES (${newSessId}, ${editorCourseId}, ${newTitle}, ${newSubtitle}, '🎸', ${nextOrderIndex})
      `;

      await sql`
        UPDATE courses 
        SET total_sessions = total_sessions + 1 
        WHERE id = ${editorCourseId}
      `;

      await fetchSessionsForCourse(editorCourseId);
      await fetchCoursesAndEnrollments();
      setActiveEditorId(newSessId);
      showToast(`Đã thêm Buổi ${nextOrderIndex} vào khóa học thành công!`);
    } catch (err: any) {
      console.error('Add session error:', err);
      alert('Lỗi thêm buổi học: ' + err.message);
    }
  };

  const handleDeleteSessionInCourse = async (sessId: number, sessTitle: string) => {
    if (sessions.length <= 1) {
      alert('Khóa học phải giữ ít nhất 1 buổi học!');
      return;
    }

    if (!window.confirm(`Xác nhận xóa "${sessTitle}" khỏi khóa học này?`)) return;

    try {
      await sql`DELETE FROM sessions WHERE id = ${sessId}`;

      await sql`
        UPDATE courses 
        SET total_sessions = GREATEST(1, total_sessions - 1) 
        WHERE id = ${editorCourseId}
      `;

      await fetchSessionsForCourse(editorCourseId);
      await fetchCoursesAndEnrollments();
      showToast(`Đã xóa buổi học khỏi khóa ${editorCourseId}`);
    } catch (err: any) {
      console.error('Delete session error:', err);
      alert('Lỗi xóa buổi học!');
    }
  };

  const handleSaveEditor = async () => {
    saveSessionsData(sessions);

    try {
      for (let idx = 0; idx < sessions.length; idx++) {
        const sess = sessions[idx];
        const chordsArr = sess.content.chords?.symbols || [];
        const exercisesArr = JSON.stringify(sess.content.exercises || []);
        const ytbId = sess.content.practice[0]?.youtubeId || (sess.content as any).youtubeVideoId || 'dQw4w9WgXcQ';
        const theoryText = typeof sess.content.theory === 'string' 
          ? sess.content.theory 
          : (sess.content.theory?.[0]?.body || '');
        const practiceJson = JSON.stringify(sess.content.practice || []);

        await sql`
          INSERT INTO sessions (id, course_id, title, subtitle, icon, youtube_video_id, theory_content, practice, chords, exercises, order_index)
          VALUES (
            ${sess.id}, 
            ${editorCourseId}, 
            ${sess.title}, 
            ${sess.subtitle}, 
            ${sess.icon || '🎸'}, 
            ${ytbId}, 
            ${theoryText}, 
            ${practiceJson}::jsonb, 
            ${chordsArr}, 
            ${exercisesArr}::jsonb,
            ${idx + 1}
          )
          ON CONFLICT (id) DO UPDATE SET 
            course_id = EXCLUDED.course_id,
            title = EXCLUDED.title,
            subtitle = EXCLUDED.subtitle,
            youtube_video_id = EXCLUDED.youtube_video_id,
            theory_content = EXCLUDED.theory_content,
            practice = EXCLUDED.practice,
            chords = EXCLUDED.chords,
            exercises = EXCLUDED.exercises,
            order_index = EXCLUDED.order_index
        `;
      }
      showToast(`Đã lưu toàn bộ nội dung bài học, video & bài tập cho khóa ${editorCourseId} lên CSDL Neon!`);
    } catch (e: any) {
      console.warn('Neon DB session update error:', e);
      alert('Lỗi lưu bài học: ' + e.message);
    }
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
            {/* Super Admin Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <span className="text-[11px] font-bold text-amber-200 block leading-tight">
                  {localStorage.getItem('temp_user_name') || 'Super Admin'}
                </span>
                <span className="text-[9px] text-amber-300/70 font-mono block leading-none">
                  {localStorage.getItem('temp_user_email') || 'admin@guitarlab.vn'}
                </span>
              </div>
            </div>

            <a 
              href="/quest.html" 
              className="text-xs font-bold text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all border border-amber-400/30 flex items-center gap-1.5"
            >
              <span>Cổng Học Viên</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => {
                if (window.confirm('Xác nhận đăng xuất khỏi Cổng Quản Trị?')) {
                  localStorage.removeItem('skip_auth');
                  localStorage.removeItem('temp_user_name');
                  localStorage.removeItem('temp_user_email');
                  localStorage.removeItem('temp_user_id');
                  window.location.reload();
                }
              }}
              className="text-xs font-bold text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/40 px-3.5 py-2 rounded-xl transition-all border border-red-400/30 flex items-center gap-1.5"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng Xuất</span>
            </button>
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
              <span className="text-2xl font-black text-[#1b2a47]">{coursesList.reduce((sum, c) => sum + c.total_sessions, 0) || 8} Buổi Học</span>
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
            onClick={() => {
              setActiveTab('editor');
              fetchSessionsForCourse(editorCourseId);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'editor'
                ? 'bg-[#1b2a47] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Cấu Hình Bài Học
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'courses'
                ? 'bg-[#1b2a47] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FolderPlus className="w-4 h-4" /> Quản Lý Khóa Học & Phân Lớp ({coursesList.length})
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
          <div className="space-y-6 animate-fadeIn">
            {/* Course Selector Header Bar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#1b2a47]">Cấu Hình Nội Dung Bài Học Cho Khóa Học</h2>
                <p className="text-xs text-slate-500 mt-1">Chọn khóa học để chỉnh sửa tiêu đề, video giảng dạy, hợp âm và danh sách bài tập</p>
              </div>

              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200 shrink-0">
                <span className="text-xs font-extrabold text-amber-900">📚 Chọn Khóa Học:</span>
                <select
                  value={editorCourseId}
                  onChange={e => {
                    const cId = e.target.value;
                    setEditorCourseId(cId);
                    fetchSessionsForCourse(cId);
                  }}
                  className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-black text-[#1b2a47] outline-none cursor-pointer shadow-xs"
                >
                  {coursesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.total_sessions} Buổi)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sessions Selector Sidebar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Buổi Học ({sessions.length}):</h3>
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {sessions.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveEditorId(s.id)}
                    className={`w-full text-left p-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between ${
                      activeEditorId === s.id
                        ? 'bg-[#1b2a47] text-white shadow-md'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{s.icon || '🎸'} Buổi {idx + 1}: {s.title}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </div>

              {/* Add New Session Button */}
              <button
                onClick={handleAddSession}
                className="w-full mt-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4 text-amber-600" /> Thêm Buổi Học Mới
              </button>

              <div className="pt-3 border-t border-slate-100 mt-3">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <h2 className="font-black text-xl text-[#1b2a47]">
                    Chỉnh Sửa: {activeSession.title}
                  </h2>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDeleteSessionInCourse(activeSession.id, activeSession.title)}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs border border-red-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa Buổi Này
                    </button>

                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      Cấu Hình Nội Dung
                    </span>
                  </div>
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
        </div>
        )}

        {/* -------------------------------------------------------------
            TAB 4: QUẢN LÝ KHÓA HỌC & PHÂN LỚP HỌC VIÊN
           ------------------------------------------------------------- */}
        {activeTab === 'courses' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
              <div>
                <h2 className="text-xl font-black text-[#1b2a47]">Quản Lý Khóa Học & Phân Lớp Học Viên</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tạo các khóa học độc lập, tùy chỉnh số buổi học (4, 8, 12, 16 buổi...) và xếp học viên vào từng lớp.
                </p>
              </div>

              <button
                onClick={() => setShowNewCourseModal(true)}
                className="px-5 py-3 bg-[#1b2a47] hover:bg-slate-800 text-white font-extrabold rounded-2xl transition-all text-xs flex items-center gap-2 shadow-md shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400" /> Tạo Khóa Học Mới
              </button>
            </div>

            {/* List of Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesList.map(course => {
                const enrolledCount = userEnrollments.filter(e => e.course_id === course.id).length;

                return (
                  <div key={course.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 hover:border-amber-400 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          ID: {course.id}
                        </span>
                        <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          {course.total_sessions} Buổi Học
                        </span>
                      </div>

                      <h3 className="text-lg font-extrabold text-[#1b2a47] leading-snug">{course.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{course.subtitle || 'Khóa học guitar tùy chỉnh'}</p>

                      <div className="pt-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span>{enrolledCount} Học Viên Đã Phân Lớp</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      {course.id !== 'guitar-8-buoi' ? (
                        <button
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Xóa Khóa
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">Khóa Mặc Định</span>
                      )}

                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        Hoạt Động ✓
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bảng Phân Lớp Học Viên */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Bảng Phân Học Viên Vào Khóa Học</h2>
                  <p className="text-xs text-slate-500">Phân quyền học viên được truy cập khóa học tương ứng</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 uppercase font-extrabold border-b border-slate-200">
                      <th className="p-4 rounded-l-2xl">Học Viên</th>
                      <th className="p-4">Email</th>
                      <th className="p-4 text-center">Khóa Được Phân Lớp</th>
                      <th className="p-4 text-right rounded-r-2xl">Xếp Lớp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentsList.map(st => {
                      const studentEnrolledCourseIds = userEnrollments
                        .filter(e => e.student_email === st.student_email)
                        .map(e => e.course_id);

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-bold text-[#1b2a47] flex items-center gap-2">
                            <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-black">
                              {(st.student_name || 'H')[0].toUpperCase()}
                            </div>
                            <span>{st.student_name}</span>
                          </td>
                          <td className="p-4 font-mono text-slate-600">{st.student_email}</td>
                          <td className="p-4 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {coursesList.map(c => {
                                const isEnrolled = studentEnrolledCourseIds.includes(c.id);
                                return (
                                  <span
                                    key={c.id}
                                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                                      isEnrolled
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                                    }`}
                                  >
                                    {c.title} {isEnrolled ? '✓' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setEnrollModalStudent(st)}
                              className="px-3.5 py-1.5 bg-[#1b2a47] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                            >
                              Phân Lớp ➔
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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

      {/* ═════════════════════════════════════════════════════════════════
          MODAL TẠO KHÓA HỌC MỚI (CREATE NEW COURSE MODAL)
         ═════════════════════════════════════════════════════════════════ */}
      {showNewCourseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-black text-lg text-[#1b2a47] flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-500" /> Tạo Khóa Học Mới
              </h3>
              <button
                onClick={() => setShowNewCourseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Mã ID Khóa Học (viết liền không dấu):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: fingerstyle-guitar, guitar-solo-lead"
                  value={newCourseId}
                  onChange={e => setNewCourseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono font-bold text-slate-800 focus:border-[#1b2a47] outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Tên Khóa Học:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khóa Học Guitar Lead & Solo Chuyên Sâu"
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-[#1b2a47] outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Mô Tả Phụ (Subtitle):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Dành cho học viên đã đệm hát cơ bản muốn lên trình solo"
                  value={newCourseSubtitle}
                  onChange={e => setNewCourseSubtitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:border-[#1b2a47] outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Số Lượng Buổi Học Khóa Này:</label>
                <select
                  value={newCourseSessions}
                  onChange={e => setNewCourseSessions(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-[#1b2a47] outline-none"
                >
                  <option value={4}>4 Buổi Học (Khóa Ngắn / Cấp Tốc)</option>
                  <option value={6}>6 Buổi Học</option>
                  <option value={8}>8 Buổi Học (Chuẩn)</option>
                  <option value={10}>10 Buổi Học</option>
                  <option value={12}>12 Buổi Học (Chuyên Sâu)</option>
                  <option value={16}>16 Buổi Học (Toàn Diện)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewCourseModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateCourse}
                className="px-5 py-2.5 bg-[#1b2a47] hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md"
              >
                Xác Nhận Tạo Khóa ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          MODAL XẾP LỚP CHO HỌC VIÊN (ENROLL STUDENT MODAL)
         ═════════════════════════════════════════════════════════════════ */}
      {enrollModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-lg text-[#1b2a47]">Phân Lớp Cho Học Viên</h3>
                <p className="text-xs font-bold text-amber-600">{enrollModalStudent.student_name} ({enrollModalStudent.student_email})</p>
              </div>
              <button
                onClick={() => setEnrollModalStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-500">Tích chọn các khóa học mà học viên được quyền truy cập:</p>
              {coursesList.map(c => {
                const isEnrolled = userEnrollments.some(e => e.student_email.toLowerCase() === enrollModalStudent.student_email.toLowerCase() && e.course_id === c.id);

                return (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      isEnrolled
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#1b2a47]">{c.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          {c.total_sessions} Buổi
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">{c.subtitle}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={isEnrolled}
                      onChange={() => handleToggleEnrollment(enrollModalStudent.student_email, c.id, isEnrolled)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setEnrollModalStudent(null)}
                className="px-6 py-2.5 bg-[#1b2a47] hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md"
              >
                Hoàn Tất Xếp Lớp ✓
              </button>
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
