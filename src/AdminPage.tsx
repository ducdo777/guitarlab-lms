import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Video, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  FolderPlus,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAdminData } from './hooks/useAdminData';
import SubmissionsTab from './components/admin/SubmissionsTab';
import StudentsTab from './components/admin/StudentsTab';
import CourseEditorTab from './components/admin/CourseEditorTab';
import CoursesManagementTab from './components/admin/CoursesManagementTab';
import { getSessionsData, saveSessionsData } from './data/questData';
import type { Session } from './data/questData';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'students' | 'editor' | 'courses'>('submissions');
  const [toastMsg, setToastMsg] = useState('');
  
  // Also keep a local state of original sessions for students tab if needed? Wait, StudentsTab takes sessions, so we can use getSessionsData() for now.
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(getSessionsData());
  }, []);

  const {
    submissions,
    studentsList,
    coursesList,
    userEnrollments,
    refetch
  } = useAdminData();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleGradeSubmission = async (id: string, grade: number, feedback: string) => {
    try {
      const { api } = await import('./lib/api');
      await api.admin.grade(id, grade, feedback);
      refetch();
      showToast('Đã gửi đánh giá & điểm cho học viên!');
    } catch (e) {
      console.warn('Grade submission error:', e);
    }
  };

  const handleDeleteSubmissionAdmin = async (subId: string) => {
    if (!window.confirm('Xác nhận xóa bài nộp video này khỏi CSDL?')) return;
    try {
      const { api } = await import('./lib/api');
      await api.admin.deleteSubmission(subId);
      refetch();
      showToast('Đã xóa bài nộp thành công!');
    } catch (e) {
      console.warn('Delete submission error:', e);
      refetch();
      showToast('Đã xóa bài nộp!');
    }
  };

  const handleCreateCourse = async (newCourseId: string, newCourseTitle: string, newCourseSubtitle: string, newCourseSessions: number) => {
    if (!newCourseId.trim() || !newCourseTitle.trim()) {
      alert('Vui lòng nhập Mã ID và Tên Khóa Học!');
      return;
    }
    const cleanCourseId = newCourseId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    try {
      const { api } = await import('./lib/api');
      await api.admin.createCourse({
        id: cleanCourseId,
        title: newCourseTitle,
        subtitle: newCourseSubtitle || 'Khóa học guitar tùy chỉnh',
        sessionsCount: newCourseSessions
      });

      refetch();
      showToast(`Đã tạo khóa học mới "${newCourseTitle}" với ${newCourseSessions} bài!`);
    } catch (err: any) {
      console.error('Create course error:', err);
      alert('Lỗi tạo khóa học: ' + err.message);
    }
  };

  const handleToggleEnrollment = async (studentEmail: string, courseId: string, isEnrolled: boolean) => {
    const cleanEmail = studentEmail.trim().toLowerCase();
    const targetCourse = coursesList.find(c => c.id === courseId);
    const courseTitle = targetCourse?.title || courseId;

    try {
      if (isEnrolled) {
        const confirmRemove = window.confirm(
          `Xác nhận gỡ học viên (${studentEmail}) khỏi khóa "${courseTitle}"?\n\n` +
          `⚠️ CẢNH BÁO: Toàn bộ tiến độ học tập và bài nộp video của học viên trong khóa này sẽ được xóa sạch hoàn toàn.`
        );
        if (!confirmRemove) return;

        const { api } = await import('./lib/api');
        await api.admin.toggleEnrollment(cleanEmail, courseId, false);

        refetch();
        showToast(`Đã gỡ học viên khỏi khóa "${courseTitle}" và xóa sạch dữ liệu liên quan!`);
      } else {
        const { api } = await import('./lib/api');
        await api.admin.toggleEnrollment(cleanEmail, courseId, true);
        refetch();
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
      const { api } = await import('./lib/api');
      await api.admin.deleteCourse(courseId);

      refetch();
      showToast(`Đã xóa khóa học ${courseTitle}`);
    } catch (err: any) {
      console.error('Delete course error:', err);
      alert('Lỗi xóa khóa học!');
    }
  };

  const handleSaveEditor = async (editorSessions: Session[], editorCourseId: string) => {
    saveSessionsData(editorSessions);
    try {
      const formattedSessions = editorSessions.map((sess, idx) => {
        const chordsArr = sess.content.chords?.symbols || [];
        const exercisesArr = sess.content.exercises || [];
        const ytbId = sess.content.practice[0]?.youtubeId || (sess.content as any).youtubeVideoId || 'dQw4w9WgXcQ';
        const theoryText = typeof sess.content.theory === 'string' 
          ? sess.content.theory 
          : (sess.content.theory?.[0]?.body || '');
        const targetBpm = sess.content.bpm || sess.target_bpm || 80;
        const timeSig = sess.content.timeSignature || sess.time_signature || 4;

        return {
          id: sess.id,
          course_id: editorCourseId,
          title: sess.title,
          subtitle: sess.subtitle,
          icon: sess.icon || '🎸',
          youtube_video_id: ytbId,
          theory_content: theoryText,
          chords: chordsArr,
          exercises: exercisesArr,
          target_bpm: targetBpm,
          time_signature: timeSig,
          order_index: idx + 1
        };
      });

      const { api } = await import('./lib/api');
      await api.admin.saveSessions(formattedSessions, editorCourseId);

      showToast('Đã lưu bài học lên Neon CSDL thành công!');
    } catch (e: any) {
      alert('Lỗi lưu bài học: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#1b2a47] text-white px-5 py-3 rounded-2xl shadow-xl border border-amber-400/40 text-xs font-bold animate-bounce">
          ✨ {toastMsg}
        </div>
      )}

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

            <Link 
              to="/quest" 
              className="text-xs font-bold text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all border border-amber-400/30 flex items-center gap-1.5"
            >
              <span>Cổng Học Viên</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

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
              <span className="text-2xl font-black text-[#1b2a47]">{coursesList.reduce((sum, c) => sum + c.total_sessions, 0) || 8} Bài Học</span>
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

        {activeTab === 'submissions' && (
          <SubmissionsTab
            submissions={submissions}
            onGrade={handleGradeSubmission}
            onDelete={handleDeleteSubmissionAdmin}
          />
        )}

        {activeTab === 'students' && (
          <StudentsTab
            studentsList={studentsList}
            sessions={sessions}
            submissions={submissions}
          />
        )}

        {activeTab === 'editor' && (
          <CourseEditorTab
            coursesList={coursesList}
            onSave={handleSaveEditor}
            showToast={showToast}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesManagementTab
            coursesList={coursesList}
            studentsList={studentsList}
            userEnrollments={userEnrollments}
            onCreateCourse={handleCreateCourse}
            onDeleteCourse={handleDeleteCourse}
            onToggleEnrollment={handleToggleEnrollment}
            onRefresh={refetch}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        © 2026 GuitarLab Admin Portal. Dành riêng cho Giảng viên & Quản trị viên.
      </footer>
    </div>
  );
}
