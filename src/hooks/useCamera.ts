import { useState, useCallback, useEffect } from 'react';

export type VideoQuality = '1080p' | '720p' | '480p';

export const getQualitySettings = (q: VideoQuality) => {
  switch (q) {
    case '1080p':
      return { width: 1920, height: 1080, bitrate: 6000000, label: 'Full HD 1080p' };
    case '720p':
      return { width: 1280, height: 720, bitrate: 3500000, label: 'HD 720p' };
    case '480p':
      return { width: 854, height: 480, bitrate: 1500000, label: 'SD 480p' };
  }
};

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [mirrorVideo, setMirrorVideo] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const loadMediaDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(cams);
      if (cams.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(cams[0].deviceId);
      }
    } catch (e) {
      console.warn('Error loading media devices:', e);
    }
  }, [selectedVideoDevice]);

  const startCamera = useCallback(
    async (
      targetQuality: VideoQuality = quality,
      targetFacingMode: 'user' | 'environment' = facingMode,
      targetVideoDeviceId: string = selectedVideoDevice,
      audioConstraints: boolean | MediaTrackConstraints = true
    ) => {
      setCameraError(null);
      try {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }

        const qSettings = getQualitySettings(targetQuality);
        const videoConstraints: MediaTrackConstraints = targetVideoDeviceId
          ? {
              deviceId: { exact: targetVideoDeviceId },
              width: { ideal: qSettings.width },
              height: { ideal: qSettings.height }
            }
          : {
              facingMode: targetFacingMode,
              width: { ideal: qSettings.width },
              height: { ideal: qSettings.height }
            };

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints
        });

        setStream(mediaStream);
        setMirrorVideo(targetFacingMode === 'user');
        await loadMediaDevices();
        return mediaStream;
      } catch (err: any) {
        console.error('Lỗi truy cập camera:', err);
        if (targetQuality === '1080p') {
          try {
            console.warn('Falling back to 720p...');
            setQuality('720p');
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: targetFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: audioConstraints
            });
            setStream(fallbackStream);
            setMirrorVideo(targetFacingMode === 'user');
            await loadMediaDevices();
            return fallbackStream;
          } catch (fbErr: any) {
            console.error('Fallback error:', fbErr);
          }
        }
        setCameraError(err.message || 'Không thể truy cập Camera. Vui lòng cấp quyền.');
        return null;
      }
    },
    [stream, quality, facingMode, selectedVideoDevice, loadMediaDevices]
  );

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const toggleFacingMode = useCallback(async (audioConstraints: boolean | MediaTrackConstraints = true) => {
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacingMode);
    setSelectedVideoDevice(''); // Clear specific device
    if (stream) {
      await startCamera(quality, nextFacingMode, '', audioConstraints);
    }
  }, [facingMode, stream, startCamera, quality]);

  const handleCameraDeviceChange = useCallback(async (deviceId: string, audioConstraints: boolean | MediaTrackConstraints = true) => {
    setSelectedVideoDevice(deviceId);
    if (stream) {
      await startCamera(quality, facingMode, deviceId, audioConstraints);
    }
  }, [stream, startCamera, quality, facingMode]);

  const handleQualityChange = useCallback(async (newQuality: VideoQuality, audioConstraints: boolean | MediaTrackConstraints = true) => {
    setQuality(newQuality);
    if (stream) {
      await startCamera(newQuality, facingMode, selectedVideoDevice, audioConstraints);
    }
  }, [stream, startCamera, facingMode, selectedVideoDevice]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    stream,
    setStream,
    quality,
    facingMode,
    videoDevices,
    selectedVideoDevice,
    mirrorVideo,
    setMirrorVideo,
    cameraError,
    startCamera,
    stopCamera,
    toggleFacingMode,
    handleCameraDeviceChange,
    handleQualityChange,
    loadMediaDevices
  };
};
