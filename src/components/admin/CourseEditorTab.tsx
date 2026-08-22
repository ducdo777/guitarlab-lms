import { useState, useEffect } from 'react';
import { ChevronRight, Plus, Save, Trash2 } from 'lucide-react';
import type { CourseItem } from '../../hooks/useAdminData';
import type { Session } from '../../data/questData';

interface Props {
  coursesList: CourseItem[];
  onSave: (sessions: Session[], courseId: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export default function CourseEditorTab({ coursesList, onSave, showToast }: Props) {
  const [editorCourseId, setEditorCourseId] = useState<string>('guitar-8-buoi');
  const [activeEditorId, setActiveEditorId] = useState<number>(1);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    fetchSessionsForCourse(editorCourseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorCourseId]);

  const fetchSessionsForCourse = async (courseId: string) => {
    try {
      const { api } = await import('../../lib/api');
      const res = await api.admin.getSessions(courseId);
      let dbSessions = res.sessions || [];

      if (dbSessions && dbSessions.length > 0) {
        const mapped: Session[] = dbSessions.map((dbItem: any, idx: number) => {
          const sessNum = idx + 1;
          const dbChords = dbItem?.chords && Array.isArray(dbItem.chords) && dbItem.chords.length > 0 ? dbItem.chords : ['C', 'G', 'Am', 'Em'];
          const dbExercises = dbItem?.exercises
            ? (typeof dbItem.exercises === 'string' ? JSON.parse(dbItem.exercises) : dbItem.exercises)
            : [
                { id: 1, text: `Thực hành gảy nhịp cho Bài ${sessNum}`, done: false },
                { id: 2, text: `Quay video đoạn đàn thực hành Bài ${sessNum} gửi thầy`, done: false }
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
            completed: false,
            unlocked: true,
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
    const newTitle = `Bài ${nextOrderIndex}: Bài thực hành nâng cao ${nextOrderIndex}`;
    const newSubtitle = `Nội dung hướng dẫn chi tiết cho bài học thứ ${nextOrderIndex}`;

    const newSession: Session = {
      id: newSessId,
      title: newTitle,
      subtitle: newSubtitle,
      icon: '🎸',
      xp: 100,
      color: 'amber',
      x: 0,
      y: 0,
      completed: false,
      unlocked: true,
      target_bpm: 80,
      time_signature: 4,
      content: {
        bpm: 80,
        timeSignature: 4,
        theory: [{ heading: 'Nội dung bài học', body: 'Nội dung bài học mới' }],
        practice: [{ heading: 'Video Hướng Dẫn', body: '', youtubeId: 'dQw4w9WgXcQ' }],
        chords: { symbols: ['Em', 'Am'], title: 'Hợp âm' },
        exercises: [{ id: 'ex_1', text: 'Thực hành bài tập', done: false }]
      }
    };

    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    setActiveEditorId(newSessId);
    await onSave(updatedSessions, editorCourseId);
    showToast(`Đã thêm Bài ${nextOrderIndex} vào khóa học thành công!`);
  };

  const handleDeleteSessionInCourse = async (sessId: number, sessTitle: string) => {
    if (sessions.length <= 1) {
      alert('Khóa học phải giữ ít nhất 1 bài học!');
      return;
    }

    if (!window.confirm(`Xác nhận xóa "${sessTitle}" khỏi khóa học này?`)) return;

    const updatedSessions = sessions.filter(s => s.id !== sessId);
    setSessions(updatedSessions);
    if (activeEditorId === sessId && updatedSessions.length > 0) {
      setActiveEditorId(updatedSessions[0].id);
    }
    await onSave(updatedSessions, editorCourseId);
    showToast(`Đã xóa bài học khỏi khóa ${editorCourseId}`);
  };

  const activeSession = sessions.find(s => s.id === activeEditorId);

  return (
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
            }}
            className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-black text-[#1b2a47] outline-none cursor-pointer shadow-xs"
          >
            {coursesList.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.total_sessions} Bài)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sessions Selector Sidebar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Bài Học ({sessions.length}):</h3>
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
                <span>{s.icon || '🎸'} Bài {idx + 1}: {s.title}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>

          <button
            onClick={handleAddSession}
            className="w-full mt-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-600" /> Thêm Bài Học Mới
          </button>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <button
              onClick={() => onSave(sessions, editorCourseId)}
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
                  <Trash2 className="w-3.5 h-3.5" /> Xóa Bài Này
                </button>

                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Cấu Hình Nội Dung
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Tiêu Đề Bài Học:</label>
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

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⏱️ Cấu Hình Bộ Giữ Nhịp Metronome Chuẩn:</span>
                </h3>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Tốc độ luyện tập mặc định cho học viên
                </span>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Tốc Độ Nhịp Chuẩn (BPM: 40 - 220):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={40}
                        max={220}
                        value={activeSession.content.bpm || activeSession.target_bpm || 80}
                        onChange={e => {
                          const val = Math.max(40, Math.min(220, Number(e.target.value) || 80));
                          setSessions(sessions.map(s => {
                            if (s.id === activeSession.id) {
                              return {
                                ...s,
                                target_bpm: val,
                                content: { ...s.content, bpm: val }
                              };
                            }
                            return s;
                          }));
                        }}
                        className="w-28 bg-white/10 border border-amber-400/40 rounded-xl px-3 py-2 text-base font-mono font-black text-amber-400 outline-none text-center"
                      />
                      <span className="text-xs font-bold text-slate-400">BPM</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Loại Nhịp Phách (Time Signature):
                    </label>
                    <div className="flex items-center gap-2">
                      {[2, 3, 4, 6].map(ts => {
                        const currentTs = activeSession.content.timeSignature || activeSession.time_signature || 4;
                        const isActive = currentTs === ts;
                        return (
                          <button
                            key={ts}
                            type="button"
                            onClick={() => {
                              setSessions(sessions.map(s => {
                                if (s.id === activeSession.id) {
                                  return {
                                    ...s,
                                    time_signature: ts,
                                    content: { ...s.content, timeSignature: ts }
                                  };
                                }
                                return s;
                              }));
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
                              isActive
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm scale-105'
                                : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                            }`}
                          >
                            {ts}/4
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/10">
                  <span className="text-[10px] font-extrabold text-slate-400">Gợi ý nhanh:</span>
                  {[
                    { bpm: 60, ts: 4, label: 'Luyện Bấm (60 BPM)' },
                    { bpm: 72, ts: 3, label: 'Fingerpicking 3/4 (72 BPM)' },
                    { bpm: 75, ts: 4, label: 'Ballad (75 BPM)' },
                    { bpm: 90, ts: 4, label: 'Pop Vừa (90 BPM)' },
                    { bpm: 105, ts: 4, label: 'Disco (105 BPM)' },
                    { bpm: 125, ts: 4, label: 'Solo (125 BPM)' },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSessions(sessions.map(s => {
                          if (s.id === activeSession.id) {
                            return {
                              ...s,
                              target_bpm: preset.bpm,
                              time_signature: preset.ts,
                              content: { ...s.content, bpm: preset.bpm, timeSignature: preset.ts }
                            };
                          }
                          return s;
                        }));
                      }}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/15 text-slate-300 rounded-lg text-[10px] font-bold border border-white/10 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
  );
}
