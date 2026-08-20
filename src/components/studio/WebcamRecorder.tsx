import React, { useRef, useState, useEffect } from 'react';
import { Camera, Square, RefreshCcw, Check, Video, UploadCloud, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sql } from '../../lib/neon';

interface Props {
  sessionId: number;
  studentId: string;
  onSubmitted?: () => void;
}

export const WebcamRecorder: React.FC<Props> = ({ sessionId, studentId, onSubmitted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'REVIEW' | 'SUCCESS'>('IDLE');

  // Khởi động Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
        audio: true 
      });
      setStream(mediaStream);
      setStatus('IDLE');
    } catch (err: any) {
      console.error('Lỗi truy cập camera:', err);
      setCameraError(err.message || 'Không thể truy cập Camera. Vui lòng kiểm tra quyền trên trình duyệt.');
    }
  };

  // Bind stream to <video> element reliably after rendering
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  // Clean up tracks when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Dừng Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Safe MimeType check for cross-browser support
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  // Bắt đầu quay
  const startRecording = () => {
    if (!stream) return;
    try {
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        setStatus('REVIEW');
        stopCamera();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500); // chunk interval
      setRecording(true);
      setStatus('RECORDING');
      setTimer(0);
    } catch (err: any) {
      console.error('Lỗi khởi động MediaRecorder:', err);
      alert('Không thể bắt đầu ghi hình: ' + err.message);
    }
  };

  // Dừng quay
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Hẹn giờ
  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  // Format Timer
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  // Upload lên Database / localStorage
  const submitVideo = async () => {
    if (!videoBlob) return;
    setUploading(true);

    const submissionId = `sub-${Date.now()}`;
    const timestamp = new Date().toLocaleString('vi-VN');
    const currentUserName = localStorage.getItem('temp_user_name') || (studentId === 'demo-user' ? 'Khách Xem Trước' : 'Học Viên Guitar');
    const currentUserEmail = localStorage.getItem('temp_user_email') || 'student@guitarlab.vn';

    try {
      // Convert blob to base64 Data URI so it works 100% reliably in any tab without storage bucket dependencies
      const base64DataUrl = await blobToBase64(videoBlob);
      let finalVideoUrl = base64DataUrl;

      // Try uploading to Supabase Storage if configured
      try {
        const fileName = `session_${sessionId}_student_${studentId}_${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoBlob);
          
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            finalVideoUrl = publicUrlData.publicUrl;
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage note: using data URI');
      }

      // Save submission record locally in localStorage so AdminPage immediately sees it!
      const newLocalSubmission = {
        id: submissionId,
        student_name: currentUserName,
        student_email: currentUserEmail,
        session_id: sessionId,
        video_url: finalVideoUrl,
        created_at: timestamp,
        status: 'PENDING'
      };

      const existingSubmissions = JSON.parse(localStorage.getItem('guitarlab_submissions') || '[]');
      const updatedSubmissions = [newLocalSubmission, ...existingSubmissions];
      localStorage.setItem('guitarlab_submissions', JSON.stringify(updatedSubmissions));

      // Try inserting into Neon PostgreSQL Database
      try {
        await sql`
          INSERT INTO submissions (id, student_id, student_name, student_email, session_id, video_url, status)
          VALUES (${submissionId}, ${studentId}, ${currentUserName}, ${currentUserEmail}, ${sessionId}, ${finalVideoUrl}, 'PENDING')
        `;
      } catch (neonErr) {
        console.warn('Neon DB insert:', neonErr);
      }

      // Try inserting into Supabase DB
      try {
        await supabase.from('submissions').insert({
          student_id: studentId,
          session_id: sessionId,
          video_url: finalVideoUrl,
          status: 'PENDING'
        });
      } catch (e) {
        // Ignore DB insert errors in demo mode
      }

      setStatus('SUCCESS');
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      console.error(err);
      alert('Lỗi nộp bài: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Giao diện khi mở Camera / Đang quay
  if (status === 'IDLE' || status === 'RECORDING') {
    return (
      <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 relative">
        {!stream && (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[260px] bg-slate-900 text-white">
            <div className="w-14 h-14 bg-slate-800 text-amber-400 rounded-2xl flex items-center justify-center mb-4 border border-slate-700 shadow-md">
              <Camera className="w-7 h-7" />
            </div>
            
            <h3 className="text-base font-bold text-white mb-1">Ghi Hình Thực Hành</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Bật Camera để kiểm tra góc quay và ghi lại đoạn đàn nộp cho giảng viên
            </p>

            {cameraError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center gap-2 max-w-sm text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            <button 
              onClick={startCamera} 
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase flex items-center gap-2.5 transition-all shadow-lg shadow-amber-900/40"
            >
              <Video className="w-4 h-4" /> Bật Camera Ngay
            </button>
          </div>
        )}

        {stream && (
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform -scale-x-100" 
            />
            
            {/* Control Bar Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {recording ? (
                  <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-full backdrop-blur-md shadow-md border border-red-400/40">
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                    <span className="font-mono font-bold text-xs">{formatTime(timer)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-300 font-semibold bg-black/50 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                    🔴 Sẵn Sàng Quay
                  </span>
                )}
              </div>
              
              <div>
                {!recording ? (
                  <button 
                    onClick={startRecording} 
                    className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full border-4 border-white/30 hover:scale-105 transition-all flex items-center justify-center shadow-xl shadow-red-900/50 group"
                    title="Bắt đầu quay"
                  >
                    <div className="w-5 h-5 bg-white rounded-full group-hover:scale-90 transition-transform" />
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording} 
                    className="w-14 h-14 bg-white/90 hover:bg-white text-slate-900 rounded-full border-2 border-white transition-all flex items-center justify-center shadow-xl hover:scale-105"
                    title="Dừng quay"
                  >
                    <Square className="w-5 h-5 fill-slate-900" />
                  </button>
                )}
              </div>

              <div className="w-20 text-right">
                <button
                  onClick={stopCamera}
                  className="text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-colors"
                >
                  Tắt Cam
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Giao diện xem lại Video trước khi nộp
  if (status === 'REVIEW') {
    return (
      <div className="w-full bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" /> Xem Lại Video Đoạn Đàn
          </h3>
          <span className="font-mono text-xs font-bold text-slate-500">{formatTime(timer)}</span>
        </div>
        
        <div className="aspect-video w-full bg-black">
          <video src={videoUrl!} controls className="w-full h-full object-cover" />
        </div>
        
        <div className="p-4 flex gap-3 bg-slate-50">
          <button 
            onClick={() => {
              setVideoBlob(null);
              setVideoUrl(null);
              startCamera();
            }} 
            disabled={uploading}
            className="flex-1 py-3 px-3 bg-white text-slate-700 border border-slate-300 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all flex justify-center items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" /> Quay Lại
          </button>
          
          <button 
            onClick={submitVideo}
            disabled={uploading}
            className="flex-[2] py-3 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider hover:from-emerald-700 hover:to-teal-700 transition-all flex justify-center items-center gap-1.5 shadow-md shadow-emerald-900/20 disabled:opacity-50"
          >
            {uploading ? (
              <span className="animate-pulse">Đang tải lên...</span>
            ) : (
              <><UploadCloud className="w-4 h-4" /> Nộp Bài Cho Giáo Viên</>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'SUCCESS') {
    return (
      <div className="w-full bg-emerald-50 rounded-2xl p-6 border border-emerald-200 text-center shadow-xs">
        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/30">
          <Check className="w-6 h-6 stroke-[3]" />
        </div>
        <h3 className="text-base font-extrabold text-emerald-900 mb-1">Đã Nộp Bài Thành Công!</h3>
        <p className="text-xs text-emerald-700 max-w-xs mx-auto">
          Video của bạn đã được lưu lại và gửi tới Giảng viên. Bạn sẽ nhận được nhận xét sớm nhất!
        </p>

        <button
          onClick={() => setStatus('IDLE')}
          className="mt-4 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
        >
          Quay video khác
        </button>
      </div>
    );
  }

  return null;
};
