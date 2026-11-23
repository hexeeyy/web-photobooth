import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, SwitchCamera, Video, Sparkles, CheckCircle2, RotateCcw, Play, Square, Settings, Volume2, VolumeX, Eye, Wand2, Images } from 'lucide-react';
import { playCountdownBeep, playShutterSound, initAudio } from '../services/audio';
import { FILTERS, getFilterById } from '../constants/filters';
import { generateDemoShots } from '../services/demoShots';

export default function CameraView({
  targetCount = 4,
  selectedFilterId = 'normal',
  onFilterChange,
  onCaptureComplete,
  onCancel,
  onOpenGallery,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);

  const [facingMode, setFacingMode] = useState('user'); // 'user' (selfie) or 'environment' (back)
  const [hasPermission, setHasPermission] = useState(null);
  const [permissionError, setPermissionError] = useState('');
  
  // Timer settings
  const [timerDuration, setTimerDuration] = useState(5); // 5 seconds (at least 5s video clip)
  const [isCapturingSequence, setIsCapturingSequence] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Stored captured items for current sequence
  // Each item: { id, dataUrl, videoBlob, videoUrl, filterId }
  const [capturedShots, setCapturedShots] = useState([]);
  const [previewClipUrl, setPreviewClipUrl] = useState(null);

  // Initialize Camera
  const startCamera = useCallback(async (facing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false // audio not strictly required for photobooth clips and avoids mic permission block
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        };
      }
      setHasPermission(true);
      setPermissionError('');
    } catch (err) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setPermissionError(err.message || 'Could not access camera. Please allow camera permissions.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  // Flip Camera
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
  };

  // Helper to get supported mime type for MediaRecorder
  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm',
    ];
    const playbackProbe = document.createElement('video');
    return types.find((type) =>
      MediaRecorder.isTypeSupported?.(type) && playbackProbe.canPlayType(type)
    ) || '';
  };

  // Capture Still Photo from Video with current Filter
  const captureStillPhoto = () => {
    if (!videoRef.current) return { dataUrl: null, rawDataUrl: null };
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // If front camera, mirror image
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // 1. Raw untouched capture
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // 2. Filtered capture
    const currentFilter = getFilterById(selectedFilterId);
    let filteredDataUrl = rawDataUrl;

    if (currentFilter && currentFilter.canvasFilter !== 'none') {
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = currentFilter.canvasFilter;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        filteredDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      } catch (e) {
        filteredDataUrl = rawDataUrl;
      }
    }

    return { dataUrl: filteredDataUrl, rawDataUrl };
  };

  // Trigger Single Shot Process (records 5s video clip and takes still photo)
  const recordShotProcess = (shotNum) => {
    return new Promise((resolve) => {
      const stream = streamRef.current;
      videoChunksRef.current = [];

      let recorder = null;
      const mimeType = getSupportedMimeType();
      if (stream && window.MediaRecorder && mimeType) {
        try {
          recorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              videoChunksRef.current.push(e.data);
            }
          };
          recorder.start(100);
          setIsRecordingClip(true);
        } catch (e) {
          console.warn('MediaRecorder init failed', e);
        }
      } else if (stream && window.MediaRecorder) {
        console.warn('No video format is supported for both recording and playback.');
      }

      // 5-second duration with live countdown & progress
      const totalSeconds = Math.max(5, timerDuration);
      let remaining = totalSeconds;
      setCountdown(remaining);
      setRecordingProgress(0);

      const interval = setInterval(() => {
        remaining -= 1;
        setRecordingProgress(((totalSeconds - remaining) / totalSeconds) * 100);

        if (remaining > 0) {
          setCountdown(remaining);
          if (soundEnabled) playCountdownBeep(false);
        } else {
          // Finish recording
          clearInterval(interval);
          setCountdown(0);
          if (soundEnabled) playCountdownBeep(true);

          // Flash screen & shutter
          setIsFlashing(true);
          if (soundEnabled) playShutterSound();
          setTimeout(() => setIsFlashing(false), 350);

          // Snap Still Photo (both raw and filtered)
          const { dataUrl: photoDataUrl, rawDataUrl } = captureStillPhoto();

          // Stop Recorder
          if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = () => {
              const videoBlob = new Blob(videoChunksRef.current, { type: recorder.mimeType || mimeType });
              const videoUrl = URL.createObjectURL(videoBlob);
              let videoUrlCopy = videoUrl;
              try {
                videoUrlCopy = URL.createObjectURL(videoBlob.slice(0));
              } catch (e) {}

              setIsRecordingClip(false);
              setCountdown(null);
              setRecordingProgress(0);

              resolve({
                id: `shot-${Date.now()}-${shotNum}`,
                dataUrl: photoDataUrl,
                rawDataUrl: rawDataUrl || photoDataUrl,
                videoBlob: videoBlob,
                videoUrl: videoUrl,
                videoUrlCopy: videoUrlCopy,
                filterId: selectedFilterId,
                timestamp: Date.now()
              });
            };
            recorder.stop();
          } else {
            setIsRecordingClip(false);
            setCountdown(null);
            setRecordingProgress(0);

            resolve({
              id: `shot-${Date.now()}-${shotNum}`,
              dataUrl: photoDataUrl,
              rawDataUrl: rawDataUrl || photoDataUrl,
              videoBlob: null,
              videoUrl: null,
              filterId: selectedFilterId,
              timestamp: Date.now()
            });
          }
        }
      }, 1000);
    });
  };

  // Start Sequence Capture (captures targetCount photos + 5s clips automatically)
  const startSequence = async () => {
    if (isCapturingSequence) return;
    initAudio();
    setIsCapturingSequence(true);
    const newShots = [];

    for (let i = 0; i < targetCount; i++) {
      setCurrentShotIndex(i + 1);

      // Short break between shots if not first
      if (i > 0) {
        setCountdown("Pose!");
        await new Promise((r) => setTimeout(r, 1800));
      }

      const shotResult = await recordShotProcess(i + 1);
      newShots.push(shotResult);
      setCapturedShots([...newShots]);
    }

    setIsCapturingSequence(false);
    setCurrentShotIndex(0);
    setCountdown(null);

    // Call complete callback with all captured shots
    if (onCaptureComplete) {
      onCaptureComplete(newShots);
    }
  };

  // Single shot manual capture
  const handleSingleManualShot = async () => {
    if (isCapturingSequence || isRecordingClip) return;
    initAudio();
    const nextIdx = capturedShots.length + 1;
    setCurrentShotIndex(nextIdx);

    const shotResult = await recordShotProcess(nextIdx);
    const updated = [...capturedShots, shotResult];
    setCapturedShots(updated);
    setCurrentShotIndex(0);

    if (updated.length >= targetCount) {
      if (onCaptureComplete) {
        onCaptureComplete(updated);
      }
    }
  };

  // Retake all shots
  const handleReset = () => {
    capturedShots.forEach(s => {
      if (s.videoUrl) URL.revokeObjectURL(s.videoUrl);
    });
    setCapturedShots([]);
    setCurrentShotIndex(0);
  };

  const handleLoadDemo = async () => {
    const demos = await generateDemoShots(targetCount);
    setCapturedShots(demos);
    if (onCaptureComplete) {
      onCaptureComplete(demos);
    }
  };

  const currentFilter = getFilterById(selectedFilterId);

  return (
    <div className="glass-theme relative w-full h-full min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      
      {/* Flash overlay */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-flash" />
      )}

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between gap-1 px-2 py-2 sm:gap-2 sm:px-4 sm:py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onCancel}
          className="shrink-0 text-[10px] sm:text-xs uppercase tracking-wider font-semibold px-2 sm:px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all active:scale-95"
        >
          Exit
        </button>

        {/* Shot Counter Pill */}
        <div className="min-w-0 flex-1 flex items-center justify-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs font-medium whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>
            {capturedShots.length} / {targetCount} Shots
          </span>
          <span className="hidden sm:inline text-white/50 text-[10px] pl-1">• 5s Video Clips</span>
        </div>

        {/* Audio Toggle & Camera Flip */}
        <div className="shrink-0 flex items-center gap-1 sm:gap-2">
          <button
            onClick={onOpenGallery}
            className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md active:scale-95"
            title="Gallery"
            aria-label="Gallery"
          >
            <Images size={17} />
          </button>
          <button
            onClick={handleLoadDemo}
            className="px-2 py-1 sm:px-2.5 rounded-full bg-rose-600/80 hover:bg-rose-500 backdrop-blur-md text-xs font-bold flex items-center gap-1 active:scale-95"
            title="Load Demo Photos & 5s Clips"
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline text-[10px]">Demo</span>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md active:scale-95"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} className="text-white/40" />}
          </button>
          <button
            onClick={toggleFacingMode}
            className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md active:scale-95"
            title="Flip Camera"
          >
            <SwitchCamera size={17} />
          </button>
        </div>
      </div>

      {/* Main Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden w-full">
        {permissionError ? (
          <div className="text-center p-6 max-w-sm bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl">
            <p className="text-white/80 font-medium mb-4 text-xs">{permissionError}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-rose-600 rounded-xl font-bold text-xs hover:bg-rose-500 active:scale-95 text-white"
              >
                Retry Camera
              </button>
              <button
                onClick={handleLoadDemo}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl font-bold text-xs active:scale-95 text-white flex items-center justify-center gap-1.5"
              >
                <Wand2 size={14} />
                Try Demo Shots & 5s Clips
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Live Camera Stream */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transition-all duration-200 ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
              style={{ filter: currentFilter.cssFilter }}
            />

            {/* Countdown / Recording HUD Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                <div className="relative flex items-center justify-center">
                  {/* Circular Progress Ring */}
                  <div className="w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center relative">
                    <div
                      className="absolute inset-0 rounded-full border-4 border-rose-500 transition-all duration-300"
                      style={{
                        clipPath: `polygon(50% 50%, -50% -50%, ${recordingProgress}% -50%, ${recordingProgress}% 150%, -50% 150%)`
                      }}
                    />
                    <span className="text-6xl font-black text-white drop-shadow-lg tracking-tighter animate-countdown">
                      {countdown}
                    </span>
                  </div>
                </div>

                <div className="mt-4 px-4 py-1.5 rounded-full bg-rose-600/90 backdrop-blur-md text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-900/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                  Recording 5s Clip
                </div>
              </div>
            )}

            {/* In-Progress Shot Mini Indicator */}
            {isCapturingSequence && !countdown && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium border border-white/10">
                Shot {currentShotIndex} of {targetCount}
              </div>
            )}

            {/* Filter Name Watermark Preview in Corner */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-md text-[11px] font-mono text-white/80 pointer-events-none">
              Filter: {currentFilter.name}
            </div>
          </div>
        )}
      </div>

      {/* Captured Thumbnails Tray */}
      {capturedShots.length > 0 && (
        <div className="relative z-20 px-4 py-2 bg-black/80 backdrop-blur-md flex items-center justify-between gap-3 border-t border-white/10">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {capturedShots.map((shot, idx) => (
              <div
                key={shot.id}
                className="relative group w-14 h-14 rounded-lg overflow-hidden border-2 border-rose-500/80 shrink-0 cursor-pointer shadow-md"
                onClick={() => setPreviewClipUrl(shot.videoUrl)}
              >
                <img src={shot.dataUrl} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 px-1 text-[9px] font-bold bg-black/70 text-white rounded-tl">
                  #{idx + 1}
                </span>
                {shot.videoUrl && (
                  <span className="absolute top-0.5 left-0.5 p-0.5 bg-rose-600 rounded text-[8px] leading-none">
                    ▶ 5s
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReset}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full text-xs flex items-center gap-1 active:scale-95"
              title="Retake All"
            >
              <RotateCcw size={16} />
              <span className="text-[11px]">Retake</span>
            </button>
            {capturedShots.length === targetCount && (
              <button
                onClick={() => onCaptureComplete(capturedShots)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95"
              >
                <CheckCircle2 size={16} />
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Selector Carousel */}
      <div className="relative z-20 px-4 py-2 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => {
            const isActive = selectedFilterId === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? 'bg-white/20 border border-white/40 ring-1 ring-white/30'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent opacity-70'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full border border-white/30 shadow-inner flex items-center justify-center text-[10px]"
                  style={{ backgroundColor: f.colorPreview }}
                >
                  {isActive && <Sparkles size={12} className="text-white drop-shadow" />}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap text-white/90">
                  {f.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Main Shutter Controls */}
      <div className="relative z-20 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6 bg-black flex items-center justify-around gap-4 border-t border-white/5">
        
        {/* Timer Duration Toggle */}
        <button
          onClick={() => setTimerDuration(timerDuration === 3 ? 5 : timerDuration === 5 ? 10 : 3)}
          disabled={isCapturingSequence || isRecordingClip}
          className="flex flex-col items-center gap-0.5 text-white/70 hover:text-white disabled:opacity-30 active:scale-95"
        >
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
            {timerDuration}s
          </span>
          <span className="text-[10px] text-white/50">Timer</span>
        </button>

        {/* Big Shutter / Sequence Trigger Button */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={startSequence}
            disabled={isCapturingSequence || isRecordingClip}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 shadow-2xl transition-all active:scale-90 ${
              isCapturingSequence || isRecordingClip
                ? 'opacity-60 scale-95'
                : 'hover:scale-105 hover:border-rose-400'
            }`}
          >
            <div className="w-full h-full rounded-full bg-rose-500 hover:bg-rose-400 transition-colors flex flex-col items-center justify-center shadow-inner">
              <Camera size={26} className="text-white" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/90 mt-0.5">
                {targetCount} Shots
              </span>
            </div>
          </button>
        </div>

        {/* Single Shot Trigger button */}
        <button
          onClick={handleSingleManualShot}
          disabled={isCapturingSequence || isRecordingClip || capturedShots.length >= targetCount}
          className="flex flex-col items-center gap-0.5 text-white/70 hover:text-white disabled:opacity-30 active:scale-95"
        >
          <span className="p-2 rounded-full bg-white/10 border border-white/10">
            <Camera size={16} />
          </span>
          <span className="text-[10px] text-white/50">1 Shot</span>
        </button>
      </div>

      {/* Video Clip Modal Preview */}
      {previewClipUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="relative max-w-sm w-full bg-zinc-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
            <div className="p-3 bg-zinc-800 flex items-center justify-between border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-rose-400">
                <Video size={14} /> 5-Second Motion Clip
              </span>
              <button
                onClick={() => setPreviewClipUrl(null)}
                className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-full"
              >
                Close
              </button>
            </div>
            <video
              src={previewClipUrl}
              autoPlay
              loop
              playsInline
              controls
              className="w-full h-auto aspect-[3/4] object-cover bg-black"
            />
          </div>
        </div>
      )}

    </div>
  );
}
