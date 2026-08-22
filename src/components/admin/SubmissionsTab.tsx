import { useState, useEffect } from 'react';
import { Video, MessageSquare, Trash2, Save } from 'lucide-react';
import type { SubmissionItem } from '../../hooks/useAdminData';

interface Props {
  submissions: SubmissionItem[];
  onGrade: (id: string, grade: number, feedback: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function SubmissionsTab({ submissions, onGrade, onDelete }: Props) {
  const [selectedSub, setSelectedSub] = useState<SubmissionItem | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(9);
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  useEffect(() => {
    if (!selectedSub && submissions.length > 0) {
      setSelectedSub(submissions[0]);
    }
  }, [submissions, selectedSub]);

  const handleGrade = async () => {
    if (!selectedSub) return;
    await onGrade(selectedSub.id, gradeInput, feedbackInput);
    // Optimistic local update is typically handled by parent, or parent refetches.
    setSelectedSub(prev => prev ? { ...prev, status: 'REVIEWED', grade: gradeInput, feedback: feedbackInput } : null);
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    if (selectedSub?.id === id) {
      setSelectedSub(null);
    }
  };

  return (
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
                <span>Bài {sub.session_id}</span>
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
                Đang Xem Bài Nộp Bài {selectedSub.session_id}
              </span>
              <h2 className="text-xl font-black text-[#1b2a47]">{selectedSub.student_name}</h2>
              <span className="text-xs text-slate-500">{selectedSub.student_email}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelete(selectedSub.id)}
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
              Đánh Giá & Chấm Điểm Bài Tập:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cho Điểm (Thang 10):</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={gradeInput}
                  onChange={e => setGradeInput(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-black text-amber-600 focus:border-[#1b2a47] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Lời Nhận Xét & Hướng Dẫn Sửa Lỗi:</label>
                <textarea
                  rows={2}
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  placeholder="Nhập nhận xét chi tiết về nhịp điệu, ngón tay, tư thế gảy..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:border-[#1b2a47] outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleGrade}
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
  );
}
