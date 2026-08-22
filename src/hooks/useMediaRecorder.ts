import { useState, useCallback, useEffect, useRef } from 'react';
import { getQualitySettings, type VideoQuality } from './useCamera';

export const useMediaRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'REVIEW' | 'SUCCESS'>('IDLE');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm',
      'video/mp4'
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  const startRecording = useCallback(async (recordStream: MediaStream, quality: VideoQuality) => {
    try {
      const qSettings = getQualitySettings(quality);
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: qSettings.bitrate
      };

      const recorder = new MediaRecorder(recordStream, options);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blobType = mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: blobType });
        console.log(`✅ Video recorded (${quality} Full HD):`, blob.size, 'bytes, type:', blob.type);
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
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const resetRecording = useCallback(() => {
    setVideoBlob(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setStatus('IDLE');
    setTimer(0);
  }, [videoUrl]);

  return {
    recording,
    videoBlob,
    setVideoBlob,
    videoUrl,
    setVideoUrl,
    timer,
    setTimer,
    status,
    setStatus,
    startRecording,
    stopRecording,
    resetRecording
  };
};
