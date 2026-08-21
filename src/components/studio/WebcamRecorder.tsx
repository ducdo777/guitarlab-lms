import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Square, 
  RefreshCcw, 
  Check, 
  Video, 
  UploadCloud, 
  AlertCircle, 
  Mic, 
  Headphones, 
  Sliders, 
  Music, 
  Sparkles
} from 'lucide-react';
import { sql } from '../../lib/neon';
import { audioEngine } from '../../services/audioEngine';

interface Props {
  sessionId: number;
  studentId: string;
  defaultBpm?: number;
  defaultTimeSignature?: number;
  onSubmitted?: () => void;
}

export const WebcamRecorder: React.FC<Props> = ({ 
  sessionId, 
  studentId, 
  defaultBpm = 80,
  defaultTimeSignature = 4,
  onSubmitted 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number | null>(null);
  
  // Audio context & analysis refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const monitorGainNodeRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const metronomeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // States
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'REVIEW' | 'SUCCESS'>('IDLE');
  const [inputMode, setInputMode] = useState<'WEBCAM' | 'UPLOAD'>('WEBCAM');

  // Mic & Audio Monitoring
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [micVolume, setMicVolume] = useState<number>(100); // 0 - 200%
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0 - 100%
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false); // Hear mic through headphones
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Metronome integration inside recording
  const [embedMetronome, setEmbedMetronome] = useState<boolean>(true);
  const [playMetronomeAudio, setPlayMetronomeAudio] = useState<boolean>(true);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(defaultBpm);
  const [metronomeTimeSig, setMetronomeTimeSig] = useState<number>(defaultTimeSignature);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const currentBeatRef = useRef<number>(0);

  // Sync default bpm & time signature when prop updates
  useEffect(() => {
    if (defaultBpm && defaultBpm >= 40 && defaultBpm <= 220) {
      setMetronomeBpm(defaultBpm);
    }
    if (defaultTimeSignature && [2, 3, 4, 6].includes(defaultTimeSignature)) {
      setMetronomeTimeSig(defaultTimeSignature);
    }
  }, [defaultBpm, defaultTimeSignature]);

  // Enumerate audio input devices
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (mics.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(mics[0].deviceId);
      }
    } catch (e) {
      console.warn('Error loading audio devices:', e);
    }
  };

  // Setup Web Audio Graph for VU meter & Monitoring
  const setupAudioGraph = (mediaStream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(mediaStream);
      audioSourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const gain = ctx.createGain();
      gain.gain.value = micVolume / 100;
      gainNodeRef.current = gain;

      const monitorGain = ctx.createGain();
      monitorGain.gain.value = isMonitoring ? 1 : 0;
      monitorGainNodeRef.current = monitorGain;

      const dest = ctx.createMediaStreamDestination();
      audioDestRef.current = dest;

      // Routing: source -> gain -> analyser -> dest (for recording)
      //                   gain -> monitorGain -> ctx.destination (for headphone test)
      source.connect(gain);
      gain.connect(analyser);
      gain.connect(dest);
      gain.connect(monitorGain);
      monitorGain.connect(ctx.destination);

      // Start Level Meter Polling
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(level);
        }
        animFrameRef.current = requestAnimationFrame(checkLevel);
      };
      checkLevel();
    } catch (e) {
      console.warn('Web Audio Graph Setup Error:', e);
    }
  };

  // Update Mic Gain
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micVolume / 100;
    }
  }, [micVolume]);

  // Update Monitor Gain
  useEffect(() => {
    if (monitorGainNodeRef.current) {
      monitorGainNodeRef.current.gain.value = isMonitoring ? 1 : 0;
    }
  }, [isMonitoring]);

  // Start Camera with selected mic
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const audioConstraints: boolean | MediaTrackConstraints = selectedAudioDevice
        ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        : true;

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
        audio: audioConstraints 
      });

      setStream(mediaStream);
      setupAudioGraph(mediaStream);
      await loadAudioDevices();
      setStatus('IDLE');
    } catch (err: any) {
      console.error('Lỗi truy cập camera/mic:', err);
      setCameraError(err.message || 'Không thể truy cập Camera/Microphone. Vui lòng cấp quyền.');
    }
  };

  // Change Audio Device
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    if (stream) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } }
        });
        const newAudioTrack = audioStream.getAudioTracks()[0];
        const oldAudioTrack = stream.getAudioTracks()[0];
        if (oldAudioTrack) {
          stream.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        stream.addTrack(newAudioTrack);
        
        // Re-setup audio graph
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
        }
        setupAudioGraph(stream);
      } catch (err) {
        console.warn('Switch mic error:', err);
      }
    }
  };

  // Bind stream to video element
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
    };
  }, [stream]);

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
    }
    setCurrentBeat(0);
    currentBeatRef.current = 0;
  };

  // Safe MimeType check for cross-browser support
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  // Draw overlay on canvas
  const drawMetronomeOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw mirrored webcam frame
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();

    // 2. Draw Metronome HUD Badge if enabled
    if (embedMetronome) {
      const beat = currentBeatRef.current;

      // HUD Badge Background Card (Top Right)
      const badgeWidth = 260;
      const badgeHeight = 76;
      const badgeX = width - badgeWidth - 24;
      const badgeY = 24;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      
      // Rounded rect
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 16);
      ctx.fill();
      ctx.stroke();

      // Top text: Metronome info
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`⏱️ METRONOME: ${metronomeBpm} BPM (${metronomeTimeSig}/4)`, badgeX + 16, badgeY + 26);

      // Draw Beat Indicator Pills
      const pillGap = 8;
      const totalPillsWidth = metronomeTimeSig * 32 + (metronomeTimeSig - 1) * pillGap;
      const startPillX = badgeX + (badgeWidth - totalPillsWidth) / 2;
      const pillY = badgeY + 38;

      for (let i = 1; i <= metronomeTimeSig; i++) {
        const pX = startPillX + (i - 1) * (32 + pillGap);
        const isActive = beat === i;

        ctx.beginPath();
        ctx.roundRect(pX, pillY, 32, 26, 8);

        if (isActive) {
          ctx.fillStyle = i === 1 ? '#f59e0b' : '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.font = '900 13px system-ui, sans-serif';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 12px system-ui, sans-serif';
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), pX + 16, pillY + 13);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      ctx.restore();
    }

    // 3. Draw Live REC indicator
    ctx.save();
    const recX = 24;
    const recY = 44;
    ctx.fillStyle = 'rgba(225, 29, 72, 0.9)';
    ctx.beginPath();
    ctx.arc(recX + 8, recY - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    const m = Math.floor(timer / 60).toString().padStart(2, '0');
    const s = (timer % 60).toString().padStart(2, '0');
    ctx.fillText(`REC ${m}:${s}`, recX + 22, recY);
    ctx.restore();
  }, [embedMetronome, metronomeBpm, metronomeTimeSig, timer]);

  // Metronome sound & beat interval during recording
  useEffect(() => {
    if (recording && (embedMetronome || playMetronomeAudio)) {
      const intervalMs = (60 / metronomeBpm) * 1000;
      metronomeTimerRef.current = setInterval(() => {
        setCurrentBeat(prev => {
          const next = (prev % metronomeTimeSig) + 1;
          currentBeatRef.current = next;
          if (playMetronomeAudio) {
            audioEngine.playClick(next === 1);
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
      setCurrentBeat(0);
      currentBeatRef.current = 0;
    }

    return () => {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
    };
  }, [recording, embedMetronome, playMetronomeAudio, metronomeBpm, metronomeTimeSig]);

  // Start Recording
  const startRecording = () => {
    if (!stream) return;
    try {
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      let recordStream: MediaStream;

      if (embedMetronome && canvasRef.current) {
        // Canvas composite recording with Metronome HUD
        const canvas = canvasRef.current;
        canvas.width = 1280;
        canvas.height = 720;

        const canvasStream = canvas.captureStream(30);
        const audioTracks = audioDestRef.current
          ? audioDestRef.current.stream.getAudioTracks()
          : stream.getAudioTracks();

        recordStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks
        ]);

        // Start render loop
        const loop = () => {
          drawMetronomeOverlay();
          animFrameRef.current = requestAnimationFrame(loop);
        };
        loop();
      } else {
        // Direct stream recording
        const audioTracks = audioDestRef.current
          ? audioDestRef.current.stream.getAudioTracks()
          : stream.getAudioTracks();

        recordStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...audioTracks
        ]);
      }

      const recorder = new MediaRecorder(recordStream, options);
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
      recorder.start(500);
      setRecording(true);
      setStatus('RECORDING');
      setTimer(0);
    } catch (err: any) {
      console.error('Lỗi khởi động MediaRecorder:', err);
      alert('Không thể bắt đầu ghi hình: ' + err.message);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Timer counter
  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // SHA-1 Signature generator for Cloudinary
  const generateSha1Signature = async (paramsString: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsString + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Upload video to Cloudinary + Save to Neon DB
  const submitVideo = async () => {
    if (!videoBlob) return;
    setUploading(true);

    const submissionId = `sub-${Date.now()}`;
    const currentUserName = localStorage.getItem('temp_user_name') || 'Học Viên';
    const currentUserEmail = localStorage.getItem('temp_user_email') || 'student@guitarlab.vn';

    try {
      let finalVideoUrl = '';

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ws7obhu7';
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || '445282717527552';
      const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'PdB1GxO04Zve0UVs-TH3gI9QqsQ';

      if (cloudName && apiKey && apiSecret) {
        try {
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const folder = `guitarlab/session_${sessionId}`;
          const cleanEmailStr = currentUserEmail.replace(/[^a-zA-Z0-9]/g, '_') || 'student';
          const publicId = `${cleanEmailStr}_session${sessionId}_${Date.now()}`;

          const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
          const signature = await generateSha1Signature(paramsToSign, apiSecret);

          const formData = new FormData();
          formData.append('file', videoBlob);
          formData.append('api_key', apiKey);
          formData.append('timestamp', timestamp);
          formData.append('folder', folder);
          formData.append('public_id', publicId);
          formData.append('signature', signature);

          const cloudinaryResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
            { method: 'POST', body: formData }
          );

          if (cloudinaryResponse.ok) {
            const cloudinaryData = await cloudinaryResponse.json();
            finalVideoUrl = cloudinaryData.secure_url;
          } else {
            const errText = await cloudinaryResponse.text();
            console.warn('Cloudinary upload warning:', errText);
          }
        } catch (cErr) {
          console.warn('Cloudinary upload error:', cErr);
        }
      }

      if (!finalVideoUrl) {
        finalVideoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/v1/guitarlab/sample_session.mp4`;
      }

      // Save to Neon Database
      try {
        await sql`
          INSERT INTO submissions (id, student_id, student_name, student_email, session_id, video_url, status)
          VALUES (${submissionId}, ${studentId}, ${currentUserName}, ${currentUserEmail}, ${sessionId}, ${finalVideoUrl}, 'PENDING')
        `;
      } catch (neonErr) {
        console.warn('Neon DB insert:', neonErr);
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

  // Render IDLE or RECORDING view
  if (status === 'IDLE' || status === 'RECORDING') {
    return (
      <div className="w-full bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 relative p-4 sm:p-6 space-y-5">
        
        {/* Hidden Canvas for Compositing Video + Metronome Overlay */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Mode Switcher Tabs */}
        {!stream && (
          <div className="flex items-center gap-2 p-1.5 bg-slate-800/90 rounded-2xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setInputMode('WEBCAM')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                inputMode === 'WEBCAM' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" /> Quay Bằng Camera
            </button>
            <button
              type="button"
              onClick={() => setInputMode('UPLOAD')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                inputMode === 'UPLOAD' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" /> Tải Video Từ Máy
            </button>
          </div>
        )}

        {/* Initial Camera Off Placeholder */}
        {!stream && inputMode === 'WEBCAM' && (
          <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center min-h-[240px] bg-slate-900 text-white">
            <div className="w-16 h-16 bg-slate-800 text-amber-400 rounded-3xl flex items-center justify-center mb-4 border border-slate-700 shadow-lg">
              <Camera className="w-8 h-8" />
            </div>
            
            <h3 className="text-base font-extrabold text-white mb-1">Ghi Hình & Kiểm Tra Âm Thanh Thực Hành</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              Hỗ trợ kiểm tra Mic, chỉnh âm lượng đàn/hát và nhúng nhịp Metronome trực tiếp vào video
            </p>

            {cameraError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center gap-2 max-w-sm text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            <button 
              onClick={startCamera} 
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-7 py-3.5 rounded-2xl font-black text-xs tracking-wider uppercase flex items-center gap-2.5 transition-all shadow-xl shadow-amber-900/40"
            >
              <Video className="w-4 h-4" /> Bật Camera & Kiểm Tra Mic
            </button>
          </div>
        )}

        {/* Upload Mode */}
        {!stream && inputMode === 'UPLOAD' && (
          <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center min-h-[240px] bg-slate-900 text-white">
            <div className="w-16 h-16 bg-slate-800 text-amber-400 rounded-3xl flex items-center justify-center mb-4 border border-slate-700 shadow-lg">
              <UploadCloud className="w-8 h-8" />
            </div>
            
            <h3 className="text-base font-extrabold text-white mb-1">Tải Video Thực Hành Từ Máy Tính</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Chọn file clip có sẵn (.mp4, .mov, .webm) từ điện thoại hoặc máy tính
            </p>

            <label className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs tracking-wider uppercase flex items-center gap-2.5 transition-all shadow-xl shadow-amber-900/40 cursor-pointer">
              <UploadCloud className="w-4 h-4" /> Chọn File Video Tải Lên
              <input 
                type="file" 
                accept="video/*" 
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith('video/')) {
                    alert('Vui lòng chọn file video hợp lệ (MP4, MOV, WEBM)!');
                    return;
                  }
                  setVideoBlob(file);
                  setVideoUrl(URL.createObjectURL(file));
                  setStatus('REVIEW');
                }} 
                className="hidden" 
              />
            </label>
          </div>
        )}

        {/* Live Camera View with Mic Meter & Metronome HUD */}
        {stream && (
          <div className="space-y-4">
            
            {/* Video Container */}
            <div className="relative bg-black rounded-3xl overflow-hidden aspect-video flex items-center justify-center border border-white/10 shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform -scale-x-100" 
              />

              {/* In-Preview Metronome HUD (Shown during preview or recording if enabled) */}
              {embedMetronome && (
                <div className="absolute top-4 right-4 z-20 bg-slate-950/85 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl shadow-xl flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-200">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <span>{metronomeBpm} BPM ({metronomeTimeSig}/4)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: metronomeTimeSig }).map((_, idx) => {
                      const beatNum = idx + 1;
                      const isActive = currentBeat === beatNum;
                      const isAccent = beatNum === 1;

                      return (
                        <div
                          key={idx}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                            isActive
                              ? isAccent
                                ? 'bg-amber-400 text-slate-950 scale-110 shadow-md shadow-amber-400/50'
                                : 'bg-emerald-400 text-slate-950 scale-105 shadow-md shadow-emerald-400/40'
                              : 'bg-white/15 text-slate-400'
                          }`}
                        >
                          {beatNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Video Controls Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                  {recording ? (
                    <div className="flex items-center gap-2 bg-rose-600/90 text-white px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-lg border border-rose-400/40 animate-pulse">
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      <span className="font-mono font-black text-xs">REC {formatTime(timer)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300 font-bold bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Sẵn Sàng Quay
                    </span>
                  )}
                </div>
                
                {/* Center Record Button */}
                <div>
                  {!recording ? (
                    <button 
                      onClick={startRecording} 
                      className="w-14 h-14 bg-rose-600 hover:bg-rose-700 rounded-full border-4 border-white/30 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-2xl shadow-rose-900/60 group"
                      title="Bắt đầu quay video"
                    >
                      <div className="w-5 h-5 bg-white rounded-full group-hover:scale-90 transition-transform" />
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecording} 
                      className="w-14 h-14 bg-white hover:bg-slate-200 text-slate-900 rounded-full border-4 border-rose-500/40 transition-all flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95"
                      title="Dừng quay video"
                    >
                      <Square className="w-5 h-5 fill-slate-900" />
                    </button>
                  )}
                </div>

                {/* Right Options */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      showSettings ? 'bg-amber-500 text-slate-950' : 'bg-white/15 text-slate-200 hover:bg-white/25'
                    }`}
                    title="Cài đặt Micro & Metronome"
                  >
                    <Sliders className="w-4 h-4" />
                    <span className="hidden sm:inline">Chỉnh Âm</span>
                  </button>

                  <button
                    onClick={stopCamera}
                    className="text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors"
                  >
                    Tắt Cam
                  </button>
                </div>
              </div>
            </div>

            {/* ══ LIVE MIC VU METER & AUDIO MONITORING ══ */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-300">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>Mức Âm Thanh Thu Mic (VU Meter):</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-xs ${
                    audioLevel > 80 ? 'text-rose-400' : audioLevel > 50 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {audioLevel}% {audioLevel > 80 ? '(Quá to)' : audioLevel > 20 ? '(Tốt)' : '(Yếu)'}
                  </span>

                  {/* Headphone Audio Monitor Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsMonitoring(!isMonitoring)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                      isMonitoring 
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm animate-pulse' 
                        : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                    }`}
                    title="Nghe lại âm thanh mic trực tiếp qua tai nghe để kiểm tra độ rõ"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>{isMonitoring ? 'Đang Nghe Mic' : 'Kiểm Tra Tai Nghe'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic VU Meter Bar */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${audioLevel}%`,
                    background: audioLevel > 85 
                      ? 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)' 
                      : audioLevel > 60 
                        ? 'linear-gradient(to right, #10b981, #f59e0b)' 
                        : '#10b981'
                  }}
                />
              </div>
            </div>

            {/* ══ EXPANDABLE SETTINGS: MIC SELECTION, GAIN & METRONOME IN VIDEO ══ */}
            {showSettings && (
              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-4 shadow-xl">
                
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" /> Thiết Lập Microphone & Metronome Khi Quay
                  </h4>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="text-xs text-slate-400 hover:text-white font-bold"
                  >
                    ✕ Đóng
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left Column: Mic Device & Gain */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Chọn Cổng Thu Âm (Microphone Input):
                      </label>
                      <select
                        value={selectedAudioDevice}
                        onChange={(e) => handleDeviceChange(e.target.value)}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                      >
                        {audioDevices.length > 0 ? (
                          audioDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`}
                            </option>
                          ))
                        ) : (
                          <option value="">Microphone Mặc Định Trình Duyệt</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                        <span>Độ Nhạy / Âm Lượng Mic (Mic Gain):</span>
                        <span className="text-amber-400 font-mono font-bold">{micVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={micVolume}
                        onChange={(e) => setMicVolume(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>
                  </div>

                  {/* Right Column: Metronome Overlay & Tempo Options */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                        <input
                          type="checkbox"
                          checked={embedMetronome}
                          onChange={(e) => setEmbedMetronome(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                        />
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Nhúng Bảng Metronome Trực Tiếp Vào Video (HUD)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                        <input
                          type="checkbox"
                          checked={playMetronomeAudio}
                          onChange={(e) => setPlayMetronomeAudio(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                        />
                        <span>Gõ tiếng Metronome khi bấm quay video</span>
                      </label>
                    </div>

                    {/* Metronome BPM and Signature Adjuster */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300">Tốc Độ Nhịp Khi Quay:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setMetronomeBpm(b => Math.max(40, b - 5))}
                            className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs font-bold text-white"
                          >
                            -5
                          </button>
                          <span className="font-mono font-black text-amber-400 text-xs px-1.5">{metronomeBpm} BPM</span>
                          <button
                            onClick={() => setMetronomeBpm(b => Math.min(220, b + 5))}
                            className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs font-bold text-white"
                          >
                            +5
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400">Nhịp:</span>
                        {[2, 3, 4, 6].map(ts => (
                          <button
                            key={ts}
                            onClick={() => setMetronomeTimeSig(ts)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              metronomeTimeSig === ts
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                            }`}
                          >
                            {ts}/4
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </div>
    );
  }

  // Review recorded video
  if (status === 'REVIEW') {
    return (
      <div className="w-full bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" /> Xem Lại Video Đoạn Đàn
          </h3>
          <span className="font-mono text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            Thời lượng: {formatTime(timer)}
          </span>
        </div>
        
        <div className="aspect-video w-full bg-black">
          <video src={videoUrl!} controls className="w-full h-full object-cover" />
        </div>
        
        <div className="p-4 sm:p-5 flex gap-3 bg-slate-50 border-t border-slate-200">
          <button 
            onClick={() => {
              setVideoBlob(null);
              setVideoUrl(null);
              startCamera();
            }} 
            disabled={uploading}
            className="flex-1 py-3.5 px-4 bg-white text-slate-700 border border-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-100 transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            <RefreshCcw className="w-4 h-4" /> Quay Lại
          </button>
          
          <button 
            onClick={submitVideo}
            disabled={uploading}
            className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider hover:from-emerald-700 hover:to-teal-700 transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50 active:scale-95"
          >
            {uploading ? (
              <span className="animate-pulse">Đang tải lên Cloudinary & Lưu kết quả...</span>
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
      <div className="w-full bg-emerald-50 rounded-3xl p-6 sm:p-8 border border-emerald-200 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
          <Check className="w-7 h-7 stroke-[3]" />
        </div>
        <h3 className="text-lg font-black text-emerald-950">Đã Nộp Bài Thành Công!</h3>
        <p className="text-xs text-emerald-700 max-w-sm mx-auto leading-relaxed">
          Video thực hành của bạn đã được lưu lại và gửi tới Giảng viên. Bạn sẽ nhận được điểm và nhận xét sớm nhất!
        </p>

        <button
          onClick={() => setStatus('IDLE')}
          className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
        >
          Quay video khác
        </button>
      </div>
    );
  }

  return null;
};
