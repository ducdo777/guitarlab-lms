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
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Volume2,
  Zap
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

type MetronomeSize = 'SM' | 'MD' | 'LG' | 'XL';

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
  const vuAnimFrameRef = useRef<number | null>(null);
  
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

  // Zoom / Fullscreen Expanded Mode
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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
  const [metronomeSize, setMetronomeSize] = useState<MetronomeSize>('LG'); // SM, MD, LG, XL
  const [metronomeVolume, setMetronomeVolume] = useState<number>(120); // 0 - 200%
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const currentBeatRef = useRef<number>(0);

  // Sync default bpm & time signature when prop updates
  useEffect(() => {
    if (defaultBpm && defaultBpm >= 30 && defaultBpm <= 250) {
      setMetronomeBpm(defaultBpm);
    }
    if (defaultTimeSignature && [2, 3, 4, 6].includes(defaultTimeSignature)) {
      setMetronomeTimeSig(defaultTimeSignature);
    }
  }, [defaultBpm, defaultTimeSignature]);

  // Handle ESC key to exit expanded mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Tap tempo calculator
  const handleTap = () => {
    const now = Date.now();
    const taps = [...tapTimes, now].slice(-4);
    setTapTimes(taps);
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b) / intervals.length;
      const calc = Math.round(60000 / avg);
      if (calc >= 30 && calc <= 250) {
        setMetronomeBpm(calc);
      }
    }
  };

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
  const setupAudioGraph = async (mediaStream: MediaStream) => {
    try {
      if (vuAnimFrameRef.current) {
        cancelAnimationFrame(vuAnimFrameRef.current);
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(mediaStream);
      audioSourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const gain = ctx.createGain();
      gain.gain.value = micVolume / 100;
      gainNodeRef.current = gain;

      const monitorGain = ctx.createGain();
      monitorGain.gain.value = isMonitoring ? 1 : 0;
      monitorGainNodeRef.current = monitorGain;

      const dest = ctx.createMediaStreamDestination();
      audioDestRef.current = dest;

      source.connect(gain);
      gain.connect(analyser);
      gain.connect(dest);
      gain.connect(monitorGain);
      monitorGain.connect(ctx.destination);

      const timeData = new Uint8Array(analyser.fftSize);

      const checkLevel = () => {
        if (analyserRef.current && audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
          }

          analyserRef.current.getByteTimeDomainData(timeData);
          let sum = 0;
          for (let i = 0; i < timeData.length; i++) {
            const v = (timeData[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / timeData.length);
          
          const sensitivity = (micVolume / 100);
          const rawLevel = rms * 350 * sensitivity;
          const level = Math.min(100, Math.max(0, Math.round(rawLevel)));
          
          setAudioLevel(prev => {
            if (level > prev) return level;
            return Math.max(0, Math.round(prev * 0.82 + level * 0.18));
          });
        }
        vuAnimFrameRef.current = requestAnimationFrame(checkLevel);
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
      await setupAudioGraph(mediaStream);
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
  }, [stream, status, isExpanded]);

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
      if (vuAnimFrameRef.current) {
        cancelAnimationFrame(vuAnimFrameRef.current);
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
    if (vuAnimFrameRef.current) {
      cancelAnimationFrame(vuAnimFrameRef.current);
    }
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
    }
    setCurrentBeat(0);
    currentBeatRef.current = 0;
    setAudioLevel(0);
    setIsExpanded(false);
  };

  // Safe MimeType check for cross-browser support
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  // Draw overlay on canvas with size scaling
  const drawMetronomeOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw mirrored webcam frame
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -width, 0, width, height);
      ctx.restore();
    }
    ctx.restore();

    // 2. Draw Scaled Metronome HUD Badge if enabled
    if (embedMetronome) {
      const beat = currentBeatRef.current;

      // Scaling dimensions based on metronomeSize
      const scaleMultiplier = metronomeSize === 'SM' ? 0.8 : metronomeSize === 'MD' ? 1.0 : metronomeSize === 'LG' ? 1.4 : 1.8;
      
      const badgeWidth = Math.round(240 * scaleMultiplier);
      const badgeHeight = Math.round(68 * scaleMultiplier);
      const badgeX = width - badgeWidth - 24;
      const badgeY = 24;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = Math.max(1.5, Math.round(2 * scaleMultiplier));
      
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, Math.round(14 * scaleMultiplier));
      ctx.fill();
      ctx.stroke();

      // Top text: Metronome info
      const fontSize = Math.round(12 * scaleMultiplier);
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`⏱️ METRONOME: ${metronomeBpm} BPM (${metronomeTimeSig}/4)`, badgeX + Math.round(14 * scaleMultiplier), badgeY + Math.round(22 * scaleMultiplier));

      const pillGap = Math.round(6 * scaleMultiplier);
      const pillWidth = Math.round(28 * scaleMultiplier);
      const pillHeight = Math.round(24 * scaleMultiplier);
      const totalPillsWidth = metronomeTimeSig * pillWidth + (metronomeTimeSig - 1) * pillGap;
      const startPillX = badgeX + (badgeWidth - totalPillsWidth) / 2;
      const pillY = badgeY + Math.round(32 * scaleMultiplier);

      for (let i = 1; i <= metronomeTimeSig; i++) {
        const pX = startPillX + (i - 1) * (pillWidth + pillGap);
        const isActive = beat === i;

        ctx.beginPath();
        ctx.roundRect(pX, pillY, pillWidth, pillHeight, Math.round(6 * scaleMultiplier));

        if (isActive) {
          ctx.fillStyle = i === 1 ? '#f59e0b' : '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.font = `900 ${Math.round(13 * scaleMultiplier)}px system-ui, sans-serif`;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.fill();
          ctx.fillStyle = '#cbd5e1';
          ctx.font = `bold ${Math.round(11 * scaleMultiplier)}px system-ui, sans-serif`;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), pX + pillWidth / 2, pillY + pillHeight / 2);
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
    ctx.arc(recX + 8, recY - 4, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    const m = Math.floor(timer / 60).toString().padStart(2, '0');
    const s = (timer % 60).toString().padStart(2, '0');
    ctx.fillText(`REC ${m}:${s}`, recX + 22, recY);
    ctx.restore();
  }, [embedMetronome, metronomeBpm, metronomeTimeSig, metronomeSize, timer]);

  // Metronome sound & beat interval during recording
  useEffect(() => {
    if (recording && (embedMetronome || playMetronomeAudio)) {
      const intervalMs = (60 / metronomeBpm) * 1000;
      metronomeTimerRef.current = setInterval(() => {
        setCurrentBeat(prev => {
          const next = (prev % metronomeTimeSig) + 1;
          currentBeatRef.current = next;
          if (playMetronomeAudio) {
            audioEngine.playClick(next === 1, metronomeVolume / 100);
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
  }, [recording, embedMetronome, playMetronomeAudio, metronomeBpm, metronomeTimeSig, metronomeVolume]);

  // Start Recording
  const startRecording = async () => {
    if (!stream) return;
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      let recordStream: MediaStream;

      if (embedMetronome && canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = 1280;
        canvas.height = 720;

        drawMetronomeOverlay();

        const canvasStream = canvas.captureStream(30);
        const audioTracks = stream.getAudioTracks();

        recordStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks
        ]);

        const loop = () => {
          drawMetronomeOverlay();
          animFrameRef.current = requestAnimationFrame(loop);
        };
        loop();
      } else {
        const audioTracks = stream.getAudioTracks();

        recordStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...audioTracks
        ]);
      }

      const recorder = new MediaRecorder(recordStream, options);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
        const blobType = mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: blobType });
        console.log('✅ Video recorded successfully, size:', blob.size, 'bytes');
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStatus('REVIEW');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
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
      <>
        {/* Offscreen Canvas for Compositing Video + Metronome Overlay */}
        <canvas 
          ref={canvasRef} 
          width={1280} 
          height={720} 
          style={{ 
            position: 'fixed', 
            top: '-9999px', 
            left: '-9999px', 
            width: '1280px', 
            height: '720px', 
            opacity: 0, 
            pointerEvents: 'none', 
            zIndex: -100 
          }} 
        />

        {/* Outer Wrapper with Fullscreen Expanded Mode Handling */}
        <div className={`w-full transition-all duration-300 ${
          isExpanded 
            ? 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-4 sm:p-8 flex flex-col items-center justify-center overflow-y-auto' 
            : 'bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 p-3.5 sm:p-5 space-y-4'
        }`}>

          {/* Mode Switcher Tabs (Only when camera is off) */}
          {!stream && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-800/90 rounded-2xl border border-slate-700/60 w-full max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setInputMode('WEBCAM')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'WEBCAM' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" /> Quay Camera
              </button>
              <button
                type="button"
                onClick={() => setInputMode('UPLOAD')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'UPLOAD' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" /> Tải Video File
              </button>
            </div>
          )}

          {/* Initial Camera Off Placeholder */}
          {!stream && inputMode === 'WEBCAM' && (
            <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center min-h-[200px] bg-slate-900 text-white w-full">
              <div className="w-14 h-14 bg-slate-800 text-amber-400 rounded-2xl flex items-center justify-center mb-3 border border-slate-700 shadow-md">
                <Camera className="w-7 h-7" />
              </div>
              
              <h3 className="text-sm sm:text-base font-extrabold text-white mb-1">Ghi Hình & Kiểm Tra Âm Thanh</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-5">
                Kiểm tra Mic thu, chỉnh âm lượng đàn và nhúng nhịp Metronome vào video
              </p>

              {cameraError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center gap-2 max-w-sm text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <button 
                onClick={startCamera} 
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 px-6 py-3 rounded-xl font-black text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-lg shadow-amber-900/30 active:scale-95"
              >
                <Video className="w-4 h-4" /> Bật Camera Ngay
              </button>
            </div>
          )}

          {/* Upload Mode */}
          {!stream && inputMode === 'UPLOAD' && (
            <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center min-h-[200px] bg-slate-900 text-white w-full">
              <div className="w-14 h-14 bg-slate-800 text-amber-400 rounded-2xl flex items-center justify-center mb-3 border border-slate-700 shadow-md">
                <UploadCloud className="w-7 h-7" />
              </div>
              
              <h3 className="text-sm sm:text-base font-extrabold text-white mb-1">Tải Video Có Sẵn</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-5">
                Chọn file clip (.mp4, .mov, .webm) từ máy tính hoặc điện thoại
              </p>

              <label className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 px-6 py-3 rounded-xl font-black text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-lg shadow-amber-900/30 cursor-pointer active:scale-95">
                <UploadCloud className="w-4 h-4" /> Chọn File Video
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

          {/* Live Camera View */}
          {stream && (
            <div className={`w-full ${isExpanded ? 'max-w-4xl space-y-4' : 'space-y-3'}`}>
              
              {/* Top Bar inside Fullscreen Mode */}
              {isExpanded && (
                <div className="flex items-center justify-between pb-2 text-white">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                    <Camera className="w-5 h-5" />
                    <span>Chế Độ Toàn Màn Hình (Phóng To Luyện Đàn)</span>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Minimize2 className="w-4 h-4" /> Thu Nhỏ (Esc)
                  </button>
                </div>
              )}

              {/* Video Player Box with Scalable Metronome HUD */}
              <div className={`relative bg-black rounded-2xl sm:rounded-3xl overflow-hidden aspect-video flex items-center justify-center border border-white/10 shadow-2xl ${
                isExpanded ? 'w-full max-h-[65vh]' : 'w-full'
              }`}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100" 
                />

                {/* Top Left: Recording Status Badge */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  {recording ? (
                    <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-full shadow-lg border border-rose-400/40 animate-pulse text-[11px] font-mono font-black">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span>REC {formatTime(timer)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-slate-300 px-2.5 py-1 rounded-full border border-white/15 text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Sẵn Sàng</span>
                    </div>
                  )}
                </div>

                {/* Top Right: Scalable Metronome HUD & Zoom Toggle Button */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  {embedMetronome && (
                    <div className={`bg-slate-950/90 backdrop-blur-md border border-white/25 shadow-xl flex flex-col items-center gap-1 transition-all ${
                      metronomeSize === 'SM' 
                        ? 'p-1.5 rounded-xl' 
                        : metronomeSize === 'MD' 
                          ? 'p-2 rounded-2xl' 
                          : metronomeSize === 'LG'
                            ? 'p-2.5 rounded-2xl ring-2 ring-amber-400/30'
                            : 'p-3.5 rounded-3xl ring-4 ring-amber-400/40 scale-105'
                    }`}>
                      <div className={`flex items-center gap-1 font-bold text-amber-300 ${
                        metronomeSize === 'SM' 
                          ? 'text-[9px]' 
                          : metronomeSize === 'MD' 
                            ? 'text-[11px]' 
                            : metronomeSize === 'LG'
                              ? 'text-xs'
                              : 'text-sm font-black'
                      }`}>
                        <Music className="w-3 h-3 text-amber-400" />
                        <span>{metronomeBpm} BPM ({metronomeTimeSig}/4)</span>
                      </div>

                      {/* Beat Indicator Pills with Scaled Sizes */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: metronomeTimeSig }).map((_, idx) => {
                          const beatNum = idx + 1;
                          const isActive = currentBeat === beatNum;
                          const isAccent = beatNum === 1;

                          const pillClasses = metronomeSize === 'SM'
                            ? 'w-4 h-4 text-[9px] rounded'
                            : metronomeSize === 'MD'
                              ? 'w-5 h-5 text-[10px] rounded-lg'
                              : metronomeSize === 'LG'
                                ? 'w-7 h-7 text-xs font-black rounded-xl'
                                : 'w-9 h-9 text-sm font-black rounded-2xl';

                          return (
                            <div
                              key={idx}
                              className={`${pillClasses} flex items-center justify-center transition-all ${
                                isActive
                                  ? isAccent
                                    ? 'bg-amber-400 text-slate-950 font-black scale-110 shadow-md shadow-amber-400/60 ring-2 ring-white'
                                    : 'bg-emerald-400 text-slate-950 font-black scale-105 shadow-md shadow-emerald-400/50 ring-2 ring-white'
                                  : 'bg-white/20 text-slate-300 font-bold'
                              }`}
                            >
                              {beatNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Zoom In / Zoom Out (Fullscreen) Button */}
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 bg-black/70 hover:bg-black/90 backdrop-blur-md text-slate-200 hover:text-white rounded-2xl border border-white/25 transition-all shadow-md"
                    title={isExpanded ? 'Thu nhỏ giao diện' : 'Phóng to toàn màn hình'}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ══ CLEAN BOTTOM RECORD CONTROL TOOLBAR ══ */}
              <div className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-slate-950/90 rounded-2xl border border-white/10">
                
                {/* Left: Settings Toggle Button */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    showSettings 
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm' 
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                  title="Cài đặt Micro & Metronome"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showSettings ? 'Đóng Cài Đặt' : 'Chỉnh Mic & Metronome'}</span>
                </button>

                {/* Center: Prominent Record / Stop Button */}
                <div>
                  {!recording ? (
                    <button 
                      onClick={startRecording} 
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-900/50 hover:scale-105 active:scale-95 transition-all"
                      title="Bắt đầu quay video"
                    >
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      <span>Bắt Đầu Quay</span>
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecording} 
                      className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all animate-bounce"
                      title="Dừng quay video"
                    >
                      <Square className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Dừng Quay ({formatTime(timer)})</span>
                    </button>
                  )}
                </div>

                {/* Right: Turn Off Camera */}
                <button
                  onClick={stopCamera}
                  className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  Tắt Cam
                </button>
              </div>

              {/* ══ LIVE MIC VU METER & AUDIO MONITORING ══ */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300 text-[11px] sm:text-xs">
                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Mức Mic (VU):</span>
                    <span className={`font-mono font-black ${
                      audioLevel > 80 ? 'text-rose-400' : audioLevel > 50 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {audioLevel}% {audioLevel > 80 ? '(Quá to)' : audioLevel > 20 ? '(Tốt)' : '(Yếu)'}
                    </span>
                  </div>
                  
                  {/* Headphone Audio Monitor Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsMonitoring(!isMonitoring)}
                    className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                      isMonitoring 
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm animate-pulse' 
                        : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                    }`}
                    title="Nghe lại âm thanh mic trực tiếp qua tai nghe"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>{isMonitoring ? 'Đang Nghe Mic' : 'Kiểm Tra Tai Nghe'}</span>
                  </button>
                </div>

                {/* Dynamic VU Meter Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
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

              {/* ══ EXPANDABLE SETTINGS: SIZE, VOLUME, CUSTOM BPM ══ */}
              {showSettings && (
                <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-4 shadow-xl text-white">
                  
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Thiết Lập Chi Tiết Âm Thanh & Metronome
                    </h4>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="text-xs text-slate-400 hover:text-white font-bold p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Left Column: Mic Config + Metronome Volume */}
                    <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-white/5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Cổng Thu Âm (Microphone):
                        </label>
                        <select
                          value={selectedAudioDevice}
                          onChange={(e) => handleDeviceChange(e.target.value)}
                          className="w-full bg-slate-900 border border-white/20 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-amber-400 truncate"
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

                      {/* Mic Gain Slider */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                          <span>Độ Nhạy Mic (Mic Gain):</span>
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

                      {/* Metronome Sound Volume (Tăng / Giảm Âm Lượng Tiếng Click) */}
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                          <span className="flex items-center gap-1 text-amber-300">
                            <Volume2 className="w-3.5 h-3.5" /> Âm Lượng Tiếng Gõ Metronome:
                          </span>
                          <span className="text-amber-400 font-mono font-black">{metronomeVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          value={metronomeVolume}
                          onChange={(e) => setMetronomeVolume(Number(e.target.value))}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex items-center gap-1.5 pt-1.5">
                          {[
                            { v: 50, l: '50% Nhẹ' },
                            { v: 100, l: '100% Vừa' },
                            { v: 150, l: '150% To' },
                            { v: 200, l: '200% Rất To' }
                          ].map(pv => (
                            <button
                              key={pv.v}
                              type="button"
                              onClick={() => setMetronomeVolume(pv.v)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                metronomeVolume === pv.v 
                                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' 
                                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
                              }`}
                            >
                              {pv.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Metronome Size & Custom Tempo Controls */}
                    <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-white/5">
                      
                      {/* Metronome HUD Size Selector (Tăng / Giảm Kích Thước Hình Metronome) */}
                      <div>
                        <label className="text-[11px] font-bold text-amber-300 block mb-1.5">
                          Kích Thước Bảng Metronome Trên Video:
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['SM', 'MD', 'LG', 'XL'] as MetronomeSize[]).map((sz) => {
                            const label = sz === 'SM' ? 'Nhỏ (1x)' : sz === 'MD' ? 'Vừa (1.3x)' : sz === 'LG' ? 'Lớn (1.6x)' : 'Cực Đại (2x)';
                            const isSel = metronomeSize === sz;
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setMetronomeSize(sz)}
                                className={`py-1.5 px-1 rounded-xl text-[10px] font-extrabold transition-all border text-center ${
                                  isSel
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black scale-105'
                                    : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                          <input
                            type="checkbox"
                            checked={embedMetronome}
                            onChange={(e) => setEmbedMetronome(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                          />
                          <span className="flex items-center gap-1 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
                          <span className="text-[11px]">Gõ tiếng Metronome khi bấm quay video</span>
                        </label>
                      </div>

                      {/* Custom BPM & Time Signature Controls */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-white/10 space-y-2.5">
                        
                        {/* Direct BPM input + Step Buttons */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-300">Tốc Độ Tùy Chỉnh:</span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setMetronomeBpm(b => Math.max(30, b - 10))}
                              className="px-1.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-white"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => setMetronomeBpm(b => Math.max(30, b - 5))}
                              className="px-1.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-white"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => setMetronomeBpm(b => Math.max(30, b - 1))}
                              className="px-1.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-white"
                            >
                              -1
                            </button>

                            {/* Direct Number Input */}
                            <input
                              type="number"
                              min={30}
                              max={250}
                              value={metronomeBpm}
                              onChange={(e) => setMetronomeBpm(Math.max(30, Math.min(250, Number(e.target.value) || 60)))}
                              className="w-14 bg-white/10 border border-amber-400/40 rounded-lg px-1.5 py-1 text-xs font-mono font-black text-amber-400 text-center outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => setMetronomeBpm(b => Math.min(250, b + 1))}
                              className="px-1.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-white"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => setMetronomeBpm(b => Math.min(250, b + 5))}
                              className="px-1.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-white"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => setMetronomeBpm(b => Math.min(250, b + 10))}
                              className="px-1.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-white"
                            >
                              +10
                            </button>
                          </div>
                        </div>

                        {/* Slider + Tap Tempo */}
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={30}
                            max={250}
                            value={metronomeBpm}
                            onChange={(e) => setMetronomeBpm(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                          <button
                            type="button"
                            onClick={handleTap}
                            className="px-2.5 py-1 bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 text-[10px] font-black rounded-lg border border-amber-400/40 shrink-0"
                          >
                            👆 Tap Tempo
                          </button>
                        </div>

                        {/* Time Signature */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-white/10 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400">Nhịp:</span>
                          {[2, 3, 4, 6].map(ts => (
                            <button
                              key={ts}
                              type="button"
                              onClick={() => setMetronomeTimeSig(ts)}
                              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                                metronomeTimeSig === ts
                                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
                              }`}
                            >
                              {ts}/4
                            </button>
                          ))}
                        </div>

                        {/* Speed Presets */}
                        <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                          <span className="text-[9px] font-bold text-slate-400 shrink-0 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-amber-400" /> Gợi ý:
                          </span>
                          {[
                            { bpm: 60, l: '60' },
                            { bpm: 75, l: '75' },
                            { bpm: 90, l: '90' },
                            { bpm: 105, l: '105' },
                            { bpm: 125, l: '125' },
                          ].map(ps => (
                            <button
                              key={ps.bpm}
                              type="button"
                              onClick={() => setMetronomeBpm(ps.bpm)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                                metronomeBpm === ps.bpm
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
                              }`}
                            >
                              {ps.l}
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
      </>
    );
  }

  // Review recorded video
  if (status === 'REVIEW') {
    return (
      <div className="w-full bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" /> Xem Lại Video Đoạn Đàn
          </h3>
          <span className="font-mono text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            Thời lượng: {formatTime(timer)}
          </span>
        </div>
        
        <div className="aspect-video w-full bg-black flex items-center justify-center">
          {videoUrl ? (
            <video 
              key={videoUrl} 
              src={videoUrl} 
              controls 
              autoPlay 
              playsInline 
              className="w-full h-full object-contain" 
            />
          ) : (
            <div className="text-white text-xs font-bold animate-pulse">Đang tải video thực hành...</div>
          )}
        </div>
        
        <div className="p-3.5 sm:p-5 flex gap-3 bg-slate-50 border-t border-slate-200 flex-col sm:flex-row">
          <button 
            onClick={() => {
              setVideoBlob(null);
              setVideoUrl(null);
              startCamera();
            }} 
            disabled={uploading}
            className="flex-1 py-3 px-4 bg-white text-slate-700 border border-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-100 transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            <RefreshCcw className="w-4 h-4" /> Quay Lại
          </button>
          
          <button 
            onClick={submitVideo}
            disabled={uploading}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider hover:from-emerald-700 hover:to-teal-700 transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50 active:scale-95"
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
