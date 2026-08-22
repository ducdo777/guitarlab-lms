import { useState, useCallback, useEffect, useRef } from 'react';

export const useAudioMonitor = () => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [micVolume, setMicVolume] = useState<number>(100);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const monitorGainNodeRef = useRef<GainNode | null>(null);
  const vuAnimFrameRef = useRef<number | null>(null);

  const loadAudioDevices = useCallback(async () => {
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
  }, [selectedAudioDevice]);

  const setupAudioGraph = useCallback(async (mediaStream: MediaStream) => {
    try {
      if (vuAnimFrameRef.current) {
        cancelAnimationFrame(vuAnimFrameRef.current);
      }
      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(mediaStream);

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
          
          // Using current micVolume from state might be tricky inside requestAnimationFrame, 
          // we use the gainNodeRef value which should be up to date.
          const sensitivity = gainNodeRef.current ? gainNodeRef.current.gain.value : (micVolume / 100);
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
  }, [micVolume, isMonitoring]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micVolume / 100;
    }
  }, [micVolume]);

  useEffect(() => {
    if (monitorGainNodeRef.current) {
      monitorGainNodeRef.current.gain.value = isMonitoring ? 1 : 0;
    }
  }, [isMonitoring]);

  const handleAudioDeviceChange = useCallback(async (deviceId: string, stream: MediaStream | null) => {
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
        
        setupAudioGraph(stream);
      } catch (err) {
        console.warn('Switch mic error:', err);
      }
    }
  }, [setupAudioGraph]);

  const stopAudioMonitor = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (vuAnimFrameRef.current) {
      cancelAnimationFrame(vuAnimFrameRef.current);
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stopAudioMonitor();
    };
  }, [stopAudioMonitor]);

  return {
    audioDevices,
    selectedAudioDevice,
    micVolume,
    setMicVolume,
    audioLevel,
    setAudioLevel,
    isMonitoring,
    setIsMonitoring,
    loadAudioDevices,
    setupAudioGraph,
    handleAudioDeviceChange,
    stopAudioMonitor,
    audioCtxRef
  };
};
