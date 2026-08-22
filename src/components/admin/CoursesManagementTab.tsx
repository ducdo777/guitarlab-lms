import { useState } from 'react';
import { Plus, FolderPlus, Users, GraduationCap } from 'lucide-react';
import type { CourseItem, StudentProgressItem } from '../../hooks/useAdminData';

interface Props {
  coursesList: CourseItem[];
  studentsList: StudentProgressItem[];
  userEnrollments: any[];
  onCreateCourse: (id: string, title: string, subtitle: string, sessionsCount: number) => Promise<void>;
  onDeleteCourse: (id: string, title: string) => Promise<void>;
  onToggleEnrollment: (email: string, courseId: string, isEnrolled: boolean) => Promise<void>;
  onRefresh: () => void;
}

export default function CoursesManagementTab({
  coursesList,
  studentsList,
  userEnrollments,
  onCreateCourse,
  onDeleteCourse,
  onToggleEnrollment
}: Props) {
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [newCourseId, setNewCourseId] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseSubtitle, setNewCourseSubtitle] = useState('');
  const [newCourseSessions, setNewCourseSessions] = useState(8);

  const [enrollModalStudent, setEnrollModalStudent] = useState<StudentProgressItem | null>(null);

  const handleCreate = async () => {
    await onCreateCourse(newCourseId, newCourseTitle, newCourseSubtitle, newCourseSessions);
    setShowNewCourseModal(false);
    setNewCourseId('');
    setNewCourseTitle('');
    setNewCourseSubtitle('');
    setNewCourseSessions(8);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#1b2a47]">Quản Lý Khóa Học & Phân Lớp Học Viên</h2>
          <p className="text-xs text-slate-500 mt-1">
            Tạo các khóa học độc lập, tùy chỉnh số bài học (4, 8, 12, 16 bài...) và xếp học viên vào từng lớp.
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
                    {course.total_sessions} Bài Học
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
                    onClick={() => onDeleteCourse(course.id, course.title)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                  >
                    Xóa Khóa
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400">Khóa Mặc Định</span>
                )}

                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
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
                <label className="font-extrabold text-slate-700 block mb-1">Số Lượng Bài Học Khóa Này:</label>
                <select
                  value={newCourseSessions}
                  onChange={e => setNewCourseSessions(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-[#1b2a47] outline-none"
                >
                  <option value={4}>4 Bài Học (Khóa Ngắn / Cấp Tốc)</option>
                  <option value={6}>6 Bài Học</option>
                  <option value={8}>8 Bài Học (Chuẩn)</option>
                  <option value={10}>10 Bài Học</option>
                  <option value={12}>12 Bài Học (Chuyên Sâu)</option>
                  <option value={16}>16 Bài Học (Toàn Diện)</option>
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
                onClick={handleCreate}
                className="px-5 py-2.5 bg-[#1b2a47] hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md"
              >
                Xác Nhận Tạo Khóa ➔
              </button>
            </div>
          </div>
        </div>
      )}

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
                          {c.total_sessions} Bài
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">{c.subtitle}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={isEnrolled}
                      onChange={() => onToggleEnrollment(enrollModalStudent.student_email, c.id, isEnrolled)}
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
    </div>
  );
}
