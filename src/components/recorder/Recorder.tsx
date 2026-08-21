import React, { useState, useRef, useEffect } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { Square, Download, Play, Pause, Trash2, Disc } from 'lucide-react';

interface RecorderProps {
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
}

export const Recorder: React.FC<RecorderProps> = ({ isRecording, setIsRecording }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isRecording]);

  const startRecording = () => {
    const stream = audioEngine.getMediaStream();
    if (!stream) {
      alert('Chưa thể kết nối luồng âm thanh! Hãy gảy thử một nốt nhạc trước khi ghi âm.');
      setIsRecording(false);
      return;
    }

    audioChunksRef.current = [];
    setRecordSeconds(0);
    setAudioUrl(null);

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    };

    mediaRecorder.start();

    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel p-4 mb-6 flex flex-wrap items-center justify-between gap-4 border border-rose-500/30 bg-slate-900/90 shadow-pink">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 animate-pulse">
          <Disc className="w-5 h-5 animate-spin" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Ghi Âm Bài Học Trực Tiếp</h3>
          <p className="text-xs font-mono text-rose-400">
            {isRecording ? `Đang ghi âm... ${formatTime(recordSeconds)}` : 'Đã dừng ghi âm'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isRecording ? (
          <button
            onClick={() => setIsRecording(false)}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Dừng Ghi Âm</span>
          </button>
        ) : (
          audioUrl && (
            <div className="flex items-center gap-2">
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <button
                onClick={() => {
                  if (audioPlayerRef.current) {
                    if (isPlaying) {
                      audioPlayerRef.current.pause();
                      setIsPlaying(false);
                    } else {
                      audioPlayerRef.current.play();
                      setIsPlaying(true);
                    }
                  }
                }}
                className="glass-button text-xs"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Tạm Dừng' : 'Nghe Lại'}</span>
              </button>

              <a
                href={audioUrl}
                download={`harmony-lab-recording-${Date.now()}.webm`}
                className="primary-button text-xs py-2 px-3"
              >
                <Download className="w-4 h-4" />
                <span>Tải File Audio</span>
              </a>

              <button
                onClick={() => setAudioUrl(null)}
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                title="Xóa bản ghi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
