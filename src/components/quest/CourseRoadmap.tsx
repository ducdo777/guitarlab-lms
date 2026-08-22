import { Sparkles, UserCheck, ChevronRight } from 'lucide-react';
import type { Session } from '../../data/questData';

interface CourseRoadmapProps {
  sessions: Session[];
  activeTab: 'ALL' | 'COMPLETED' | 'IN_PROGRESS';
  setActiveTab: (tab: 'ALL' | 'COMPLETED' | 'IN_PROGRESS') => void;
  onSelectSession: (session: Session) => void;
  studentProgress?: any;
  availableCourses: any[];
  activeCourseId: string;
  setActiveCourseId: (id: string) => void;
  completedCount: number;
}

export default function CourseRoadmap({
  sessions,
  activeTab,
  setActiveTab,
  onSelectSession,
  availableCourses,
  activeCourseId,
  setActiveCourseId,
  completedCount
}: CourseRoadmapProps) {
  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'COMPLETED') return s.completed;
    if (activeTab === 'IN_PROGRESS') return s.unlocked && !s.completed;
    return true;
  });

  const activeCourseObj = availableCourses.find(c => c.id === activeCourseId) || {
    title: 'Khoá Học Guitar Đệm Hát 8 Bài',
    subtitle: 'Lộ trình chuẩn hóa từ Zero đến đệm hát thuần thục bài hát yêu thích',
    total_sessions: 8
  };
  const dynamicProgress = Math.round((completedCount / (sessions.length || activeCourseObj.total_sessions || 8)) * 100) || 0;

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Banner Tiến Độ Tổng Quan */}
      <div className="bg-gradient-to-r from-[#1b2a47] via-[#24395e] to-[#114b48] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        
        <div className="space-y-3 max-w-xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-bold px-3.5 py-1.5 rounded-full border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            {activeCourseObj.title} ({sessions.length || activeCourseObj.total_sessions || 8} Bài)
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Chào mừng trở lại lớp học!
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            {activeCourseObj.subtitle || 'Lộ trình huấn luyện guitar thực hành chuyên sâu theo từng bài học.'}
          </p>

          {/* Mobile Course Switcher Selector */}
          {availableCourses.length > 1 && (
            <div className="lg:hidden pt-2 flex items-center gap-2">
              <span className="text-xs font-extrabold text-amber-300">Đổi Khóa:</span>
              <select
                value={activeCourseId}
                onChange={e => {
                  setActiveCourseId(e.target.value);
                }}
                className="bg-white/10 text-white border border-amber-400/40 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
              >
                {availableCourses.map(c => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.title} ({c.total_sessions} Bài)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Progress Box */}
        <div className="w-full md:w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 z-10 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Tiến Độ Khóa Học</span>
            <span className="text-2xl font-black text-amber-400">{dynamicProgress}%</span>
          </div>

          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${dynamicProgress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold pt-1">
            <span>Đã học: {completedCount} / {sessions.length || activeCourseObj.total_sessions || 8} Bài</span>
            <span>{completedCount === (sessions.length || activeCourseObj.total_sessions || 8) ? 'Hoàn Thành! 🎉' : 'Đang Học 🎯'}</span>
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
          Bấm vào từng bài học bên dưới để vào bài học chi tiết
        </span>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredSessions.map((session) => (
          <div 
            key={session.id}
            onClick={() => onSelectSession(session)}
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
                  Bài {session.id}
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
                Bài {session.id}: {session.title}
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
  );
}
