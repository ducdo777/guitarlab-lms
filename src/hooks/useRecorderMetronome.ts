import { useState, useCallback, useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

export type MetronomeSize = 'SM' | 'MD' | 'LG' | 'XL';

export const useRecorderMetronome = (defaultBpm: number = 80, defaultTimeSignature: number = 4) => {
  const [embedMetronome, setEmbedMetronome] = useState<boolean>(true);
  const [playMetronomeAudio, setPlayMetronomeAudio] = useState<boolean>(true);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(defaultBpm);
  const [metronomeTimeSig, setMetronomeTimeSig] = useState<number>(defaultTimeSignature);
  const [metronomeSize, setMetronomeSize] = useState<MetronomeSize>('LG');
  const [metronomeVolume, setMetronomeVolume] = useState<number>(120);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const currentBeatRef = useRef<number>(0);
  const metronomeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (defaultBpm && defaultBpm >= 30 && defaultBpm <= 250) {
      setMetronomeBpm(defaultBpm);
    }
    if (defaultTimeSignature && [2, 3, 4, 6].includes(defaultTimeSignature)) {
      setMetronomeTimeSig(defaultTimeSignature);
    }
  }, [defaultBpm, defaultTimeSignature]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    setTapTimes(prev => {
      const taps = [...prev, now].slice(-4);
      if (taps.length >= 2) {
        const intervals = taps.slice(1).map((t, i) => t - taps[i]);
        const avg = intervals.reduce((a, b) => a + b) / intervals.length;
        const calc = Math.round(60000 / avg);
        if (calc >= 30 && calc <= 250) {
          setMetronomeBpm(calc);
        }
      }
      return taps;
    });
  }, []);

  const resetBeat = useCallback(() => {
    setCurrentBeat(0);
    currentBeatRef.current = 0;
  }, []);

  const stopMetronome = useCallback(() => {
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
    }
    resetBeat();
  }, [resetBeat]);

  const startMetronome = useCallback((recording: boolean) => {
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
      stopMetronome();
    }
  }, [embedMetronome, playMetronomeAudio, metronomeBpm, metronomeTimeSig, metronomeVolume, stopMetronome]);

  useEffect(() => {
    return () => {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
    };
  }, []);

  return {
    embedMetronome,
    setEmbedMetronome,
    playMetronomeAudio,
    setPlayMetronomeAudio,
    metronomeBpm,
    setMetronomeBpm,
    metronomeTimeSig,
    setMetronomeTimeSig,
    metronomeSize,
    setMetronomeSize,
    metronomeVolume,
    setMetronomeVolume,
    tapTimes,
    currentBeat,
    currentBeatRef,
    handleTap,
    resetBeat,
    startMetronome,
    stopMetronome
  };
};
