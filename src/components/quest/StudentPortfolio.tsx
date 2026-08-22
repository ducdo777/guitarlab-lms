import { Trash2 } from 'lucide-react';
import type { Session } from '../../data/questData';

interface StudentPortfolioProps {
  submissions: any[];
  sessions: Session[];
  onDeleteSubmission: (subId: string) => void;
  onViewSession: (session: Session) => void;
}

export default function StudentPortfolio({
  submissions,
  sessions,
  onDeleteSubmission,
  onViewSession
}: StudentPortfolioProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Portfolio Header Banner */}
      <div className="bg-gradient-to-r from-[#1b2a47] via-[#24395e] to-[#114b48] text-white p-8 sm:p-10 rounded-3xl shadow-xl relative overflow-hidden space-y-3">
        <div className="relative z-10">
          <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/20">
            Góc Học Viên • Kết Quả Đánh Giá
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-3">
            Danh Mục Video Bài Nộp & Nhận Xét Từ Giảng Viên 🎬
          </h1>
          <p className="text-slate-300 font-medium text-sm max-w-2xl mt-1">
            Xem lại toàn bộ clip thực hành đàn guitar bạn đã nộp, bảng điểm đánh giá và lời góp ý chi tiết từ Giảng viên.
          </p>
        </div>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
            🎬
          </div>
          <h3 className="font-extrabold text-xl text-slate-800">Bạn Chưa Nộp Bài Video Thực Hành Nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Hãy mở bất kỳ bài học nào trong Lộ trình học tập, quay đoạn video bấm phím thực hành và gửi cho Giảng viên nhé!
          </p>
          <button
            onClick={() => {}} // In GuitarQuest we setMainTab to roadmap when clicking, so we should expose a prop for this, or rely on the caller passing it via a callback. Actually I'll use onViewSession with null? Or just a separate prop.
            className="px-6 py-3 bg-[#1b2a47] hover:bg-slate-800 text-white font-extrabold rounded-2xl transition-all text-xs inline-flex items-center gap-2 shadow-md hidden"
          >
            <span>Bắt Đầu Nộp Bài Ngay ➔</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.filter(Boolean).map((sub: any) => {
            if (!sub || typeof sub !== 'object') return null;
            const sessInfo = sessions.find(s => s.id === Number(sub.session_id));
            const isReviewed = sub.status === 'REVIEWED';
            const videoUrlStr = typeof sub.video_url === 'string' ? sub.video_url : '';
            const isYouTube = videoUrlStr.includes('youtube.com') || videoUrlStr.includes('youtu.be');

            let youtubeEmbedUrl = '';
            if (isYouTube) {
              if (videoUrlStr.includes('v=')) {
                youtubeEmbedUrl = `https://www.youtube.com/embed/${videoUrlStr.split('v=')[1]?.split('&')[0]}`;
              } else if (videoUrlStr.includes('youtu.be/')) {
                youtubeEmbedUrl = `https://www.youtube.com/embed/${videoUrlStr.split('youtu.be/')[1]?.split('?')[0]}`;
              } else {
                youtubeEmbedUrl = videoUrlStr;
              }
            }

            const subDateDisplay = sub.created_at
              ? (sub.created_at instanceof Date ? sub.created_at.toLocaleString('vi-VN') : String(sub.created_at))
              : 'Mới nộp';

            return (
              <div key={sub.id || Math.random()} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                
                {/* Submission Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Bài {sub.session_id || 1} / {sessions.length || 8}
                      </span>
                      <h3 className="font-black text-lg text-[#1b2a47]">
                        {sessInfo?.title || `Bài học ${sub.session_id || 1}`}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">📅 Ngày nộp bài: {subDateDisplay}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {isReviewed ? (
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl border border-emerald-200 shadow-xs">
                        <span className="text-base font-black text-emerald-700">⭐ {sub.grade || 10}/10 Điểm</span>
                        <span className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">Đã Chấm ✓</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold bg-amber-50 text-amber-900 px-4 py-2 rounded-2xl border border-amber-200 animate-pulse">
                        ⏳ Đang Chờ Giảng Viên Chấm Bài
                      </span>
                    )}
                  </div>
                </div>

                {/* Teacher Feedback Quote Box */}
                {isReviewed && sub.feedback && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-200/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider">
                        Nhận Xét & Góp Ý Từ Giảng Viên:
                      </h4>
                    </div>
                    <p className="text-sm font-medium text-emerald-900 leading-relaxed italic pl-7">
                      "{sub.feedback}"
                    </p>
                  </div>
                )}

                {/* Video Player */}
                {videoUrlStr && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Video Clip Bài Thực Hành Đã Nộp:</span>
                    <div className="aspect-video w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-lg bg-black flex items-center justify-center">
                      {isYouTube ? (
                        <iframe
                          src={youtubeEmbedUrl}
                          className="w-full h-full border-0"
                          allowFullScreen
                        ></iframe>
                      ) : videoUrlStr.startsWith('http') || videoUrlStr.startsWith('blob:') || videoUrlStr.startsWith('data:') ? (
                        <video
                          src={videoUrlStr}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="p-6 text-center text-slate-300 text-xs">
                          🎬 Clip bài nộp: <span className="font-mono text-amber-400">{videoUrlStr}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Link to view session & Delete submission */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => onDeleteSubmission(sub.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl transition-all border border-red-200/80 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa Bài Nộp Này
                  </button>
                  
                  <button
                    onClick={() => {
                      const foundSess = sessions.find(s => s.id === Number(sub.session_id));
                      if (foundSess) {
                        onViewSession(foundSess);
                      }
                    }}
                    className="text-xs font-bold text-[#1b2a47] hover:text-amber-600 bg-slate-100 hover:bg-amber-50 px-4 py-2 rounded-xl transition-all border border-slate-200"
                  >
                    Vào Học Lại Bài {sub.session_id || 1} ➔
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
