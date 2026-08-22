import { useState } from 'react';
import type { StudentProgressItem, SubmissionItem } from '../../hooks/useAdminData';
import type { Session } from '../../data/questData';

interface Props {
  studentsList: StudentProgressItem[];
  sessions: Session[];
  submissions: SubmissionItem[];
}

export default function StudentsTab({ studentsList, sessions, submissions }: Props) {
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentProgressItem | null>(null);

  return (
    <>
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-black text-[#1b2a47] text-xl">Danh Sách Học Viên & Tiến Độ Học Tập</h2>
            <p className="text-xs text-slate-500">Theo dõi quá trình học, bài nộp và số bài đã hoàn thành của từng học viên</p>
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
                <th className="p-4">Ma Trận Bài Học</th>
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
                            <span className="text-slate-500 font-bold">{st.completed_count}/8 Bài</span>
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

      {selectedStudentProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedStudentProfile(null)}
              className="absolute top-6 right-6 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-lg transition-all"
            >
              ✕
            </button>

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

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-right min-w-[200px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tiến Độ Khóa Học:</span>
                <span className="text-2xl font-black text-emerald-600">
                  {selectedStudentProfile.completed_count}/8 Bài ({Math.round((selectedStudentProfile.completed_count / 8) * 100)}%)
                </span>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((selectedStudentProfile.completed_count / 8) * 100)}%` }}></div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-black text-sm text-[#1b2a47] uppercase tracking-wider">
                1. Trạng Thái Chi Tiết Tiến Độ Bài Học:
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
                        <span className="font-black text-xs">Bài {sNum}</span>
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
                                🎬 Bài Nộp Bài {sub.session_id}: {sess?.title || `Bài học ${sub.session_id}`}
                              </h4>
                              <span className="text-[11px] text-slate-400">Thời gian nộp: {sub.created_at}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                                sub.status === 'REVIEWED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {sub.status === 'REVIEWED' ? 'Đã Chấm Điểm ✓' : 'Chờ Nhận Xét'}
                              </span>
                            </div>
                          </div>

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
    </>
  );
}
