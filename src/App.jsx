import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Image as ImageIcon, Share2, Printer, RotateCcw, Film } from 'lucide-react';
import CameraView from './components/CameraView';
import CollageCanvas from './components/CollageCanvas';
import EditorControls from './components/EditorControls';
import ShareModal from './components/ShareModal';
import CuratedGallery from './components/CuratedGallery';
import SessionView from './components/SessionView';
import { getLayoutById } from './constants/layouts';
import { getSession, publishSession, saveSession, rehydrateSession } from './services/storage';
import { playCelebrationChime } from './services/audio';

export default function App() {
  // Navigation View: 'booth' | 'editor' | 'gallery' | 'session'
  const [currentView, setCurrentView] = useState('booth');
  const [sessionParamId, setSessionParamId] = useState(null);

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [layoutId, setLayoutId] = useState('strip-4');
  const [selectedFilterId, setSelectedFilterId] = useState('normal');
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  
  // Design & Watermark Customization
  const [frameSettings, setFrameSettings] = useState({
    colorId: 'white',
    customColor: '#ffffff',
    gradient: null,
    pattern: 'clean',
    borderWidth: 14,
    cornerRadius: 8,
    padding: 16,
  });

  const [watermarkSettings, setWatermarkSettings] = useState({
    title: 'PHOTOBOOTH MEMORY',
    subtitle: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    fontId: 'sans',
    fontFamily: '"Montserrat Variable", "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#111827',
    showDate: true,
    logoUrl: null,
    customTextSize: 16,
  });

  const [stickers, setStickers] = useState([
    { id: 'stk-1', emoji: '✨', x: 88, y: 12, size: 28, rotation: 10 },
  ]);

  const [collageDataUrl, setCollageDataUrl] = useState(null);
  const [collageOutput, setCollageOutput] = useState('photo');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSession, setShareSession] = useState(null);
  const [shareError, setShareError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveError, setSaveError] = useState('');

  const collageCanvasRef = useRef(null);

  // 1. Check for ?session=<id> in URL for instant mobile share view
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session');
    if (sid) {
      setSessionParamId(sid);
      setCurrentView('session');
    }
  }, []);

  // Active layout definition
  const currentLayout = getLayoutById(layoutId);
  const hasMotionClips = capturedPhotos.some((photo) => photo.videoUrl || photo.videoUrlCopy);

  // When photos are captured from CameraView
  const handleCaptureComplete = async (shots) => {
    setCapturedPhotos(shots);
    setCollageOutput('photo');
    const newSessionId = `pb-${crypto.randomUUID()}`;
    setCurrentSessionId(newSessionId);
    setCurrentView('editor');

    // Celebration feedback
    playCelebrationChime();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Re-generate high-res collage when design or layout changes
  const updateCollageDataUrl = useCallback(async () => {
    if (collageCanvasRef.current) {
      try {
        const url = await collageCanvasRef.current.getHighResDataUrl();
        setCollageDataUrl(url);
        return url;
      } catch (e) {
        console.error('Collage generation error', e);
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (currentView === 'editor' && capturedPhotos.length > 0) {
      const timer = setTimeout(() => {
        updateCollageDataUrl();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [
    currentView,
    layoutId,
    frameSettings,
    watermarkSettings,
    stickers,
    capturedPhotos,
    selectedFilterId,
    updateCollageDataUrl,
  ]);

  // Persist session to IndexedDB
  const handleSaveCurrentSession = useCallback(async () => {
    if (!currentSessionId || capturedPhotos.length === 0) return null;
    setSaveError('');
    try {
      const url = await updateCollageDataUrl();
      const sessionData = {
        id: currentSessionId,
        createdAt: Date.now(),
        layoutId,
        selectedFilterId,
        frameSettings,
        watermarkSettings,
        stickers,
        photos: capturedPhotos,
        collageDataUrl: url || collageDataUrl,
        favorite: false,
      };
      await saveSession(sessionData);
      return sessionData;
    } catch (e) {
      console.error('Failed to auto-save session:', e);
      setSaveError('Could not save this session on this device. Please keep this page open and try again.');
      return null;
    }
  }, [
    currentSessionId,
    capturedPhotos,
    updateCollageDataUrl,
    layoutId,
    selectedFilterId,
    frameSettings,
    watermarkSettings,
    stickers,
    collageDataUrl,
  ]);

  // Trigger auto-save whenever user updates collage in editor
  useEffect(() => {
    if (currentView === 'editor' && currentSessionId && capturedPhotos.length > 0) {
      const timer = setTimeout(() => {
        handleSaveCurrentSession();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [
    currentView,
    currentSessionId,
    capturedPhotos,
    layoutId,
    frameSettings,
    watermarkSettings,
    stickers,
    selectedFilterId,
    handleSaveCurrentSession,
  ]);

  // Sticker actions
  const handleAddSticker = (emoji) => {
    const newSticker = {
      id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      emoji,
      x: 35 + Math.random() * 30,
      y: 20 + Math.random() * 50,
      size: 28,
      rotation: Math.floor(Math.random() * 30 - 15),
    };
    setStickers([...stickers, newSticker]);
  };

  const handleUpdateSticker = (id, updates) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleDeleteSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearStickers = () => {
    setStickers([]);
  };

  // Print Strip
  const handlePrint = async () => {
    await updateCollageDataUrl();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Open Share Modal
  const handleOpenShare = async () => {
    setShareError('');
    setIsPublishing(true);
    try {
      const savedSession = await handleSaveCurrentSession();
      if (!savedSession) throw new Error('The photobooth session could not be saved.');

      const publishedSession = import.meta.env.PROD
        ? await publishSession(savedSession)
        : savedSession;
      setShareSession(publishedSession);
      setCollageDataUrl(publishedSession.collageDataUrl || savedSession.collageDataUrl);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error('Failed to prepare share link:', error);
      setShareError(error.message || 'Could not prepare the share link. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Load a session from Gallery
  const handleSelectSessionFromGallery = async (session) => {
    try {
      let selectedSession = session;
      if (session.packageUrl && !session.photos?.[0]?.dataUrl) {
        selectedSession = await getSession(session.id);
      }
      if (!selectedSession) throw new Error('Could not load this shared session.');

      const rehydrated = rehydrateSession(selectedSession);
      setCurrentSessionId(rehydrated.id);
      setLayoutId(rehydrated.layoutId || 'strip-4');
      setSelectedFilterId(rehydrated.selectedFilterId || 'normal');
      setFrameSettings(rehydrated.frameSettings || frameSettings);
      setWatermarkSettings(rehydrated.watermarkSettings || watermarkSettings);
      setStickers(rehydrated.stickers || []);
      setCapturedPhotos(rehydrated.photos || []);
      setCollageOutput('photo');
      setCollageDataUrl(rehydrated.collageDataUrl);
      setCurrentView('editor');
    } catch (error) {
      console.error('Failed to load gallery session:', error);
      setShareError(error.message || 'Could not load this session.');
    }
  };

  const handleShareGallerySession = async (session) => {
    setShareError('');
    setIsPublishing(true);
    try {
      const fullSession = session.packageUrl && !session.photos?.[0]?.dataUrl
        ? await getSession(session.id)
        : session;
      if (!fullSession) throw new Error('Could not load this session.');

      const publishedSession = import.meta.env.PROD
        && (!fullSession.packageUrl || fullSession.ownerToken)
        ? await publishSession(fullSession)
        : fullSession;
      setShareSession(publishedSession);
      setCollageDataUrl(publishedSession.collageDataUrl);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error('Failed to prepare gallery share link:', error);
      setShareError(error.message || 'Could not prepare the share link.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Render view router
  if (currentView === 'session') {
    return (
      <SessionView
        sessionId={sessionParamId}
        onOpenBooth={() => {
          // Clear query param and switch to booth
          window.history.pushState({}, '', window.location.pathname);
          setCurrentView('booth');
        }}
      />
    );
  }

  if (currentView === 'gallery') {
    return (
      <>
        <div className="no-print">
          <CuratedGallery
            onBackToBooth={() => setCurrentView('booth')}
            onSelectSession={handleSelectSessionFromGallery}
            onOpenShareModal={handleShareGallerySession}
          />
          {shareError && (
            <p role="alert" className="fixed bottom-4 left-4 right-4 z-40 text-center text-xs text-red-300 bg-zinc-900/95 border border-red-500/30 rounded-xl p-3">
              {shareError}
            </p>
          )}
        </div>
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          session={shareSession}
          collageDataUrl={collageDataUrl}
          onPrint={() => {
            setIsShareModalOpen(false);
            setTimeout(() => window.print(), 150);
          }}
        />
        <div className="print-only hidden">
          {collageDataUrl && <img src={collageDataUrl} alt="Photobooth collage" className="max-h-screen w-auto" />}
        </div>
      </>
    );
  }

  return (
    <div className="glass-theme w-full min-h-screen bg-zinc-950 text-white flex flex-col justify-between overflow-x-hidden font-sans">
      
      {/* 1. CAMERA VIEW */}
      {currentView === 'booth' && (
        <div className="w-full h-full min-h-[100dvh] flex flex-col justify-between">
          <CameraView
            targetCount={currentLayout.photoCount}
            selectedFilterId={selectedFilterId}
            onFilterChange={setSelectedFilterId}
            onCaptureComplete={handleCaptureComplete}
            onOpenGallery={() => setCurrentView('gallery')}
            onCancel={() => {
              if (capturedPhotos.length > 0) setCurrentView('editor');
              else setCurrentView('gallery');
            }}
          />
        </div>
      )}

      {/* 2. COLLAGE EDITOR & DESIGN VIEW */}
      {currentView === 'editor' && (
        <div className="w-full min-h-screen flex flex-col justify-between">
          
          {/* Top Editor Bar */}
          <div className="no-print px-4 py-2.5 bg-zinc-900/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
            <button
              onClick={() => setCurrentView('booth')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1.5 active:scale-95 text-white/80"
            >
              <RotateCcw size={14} />
              Retake
            </button>

            {/* Gallery Shortcut */}
            <button
              onClick={() => setCurrentView('gallery')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1.5 text-white/80 active:scale-95"
            >
              <ImageIcon size={14} />
              Gallery
            </button>
          </div>

          {/* Center Stage: Interactive Collage Canvas */}
          <div className="no-print flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-md w-full flex flex-col items-center">
              <div className="w-full grid grid-cols-2 gap-2 mb-4 p-1 rounded-2xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  role="tab"
                  aria-selected={collageOutput === 'photo'}
                  onClick={() => setCollageOutput('photo')}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    collageOutput === 'photo'
                      ? 'bg-white text-zinc-950 shadow'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <ImageIcon size={15} />
                  Photo Collage
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={collageOutput === 'motion'}
                  disabled={!hasMotionClips}
                  onClick={() => setCollageOutput('motion')}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    collageOutput === 'motion'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Film size={15} />
                  Motion Collage
                </button>
              </div>

              <p className="text-[11px] text-white/50 text-center mb-3">
                {collageOutput === 'motion'
                  ? 'Your captured clips play inside each collage frame.'
                  : hasMotionClips
                    ? 'Your still-photo collage.'
                    : 'Capture video clips to create a motion collage.'}
              </p>

              <CollageCanvas
                ref={collageCanvasRef}
                layoutId={layoutId}
                photos={capturedPhotos}
                selectedFilterId={selectedFilterId}
                frameSettings={frameSettings}
                watermarkSettings={watermarkSettings}
                stickers={stickers}
                onUpdateSticker={handleUpdateSticker}
                onDeleteSticker={handleDeleteSticker}
                isPlayingLiveClips={collageOutput === 'motion'}
              />

              {/* Action Buttons Under Collage */}
              <div className="w-full flex flex-wrap items-stretch justify-center gap-2 sm:gap-3 mt-4">
                <button
                  onClick={handleOpenShare}
                  disabled={isPublishing}
                  className="min-w-[130px] flex-1 justify-center px-3 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-[10px] sm:text-xs flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <Share2 size={16} />
                  {isPublishing ? 'Preparing Link...' : 'Share & QR'}
                </button>

                {collageOutput === 'photo' && (
                  <button
                    onClick={handlePrint}
                    className="min-w-[130px] flex-1 justify-center px-3 sm:px-5 py-2.5 bg-white text-zinc-950 hover:bg-zinc-100 rounded-2xl font-bold text-[10px] sm:text-xs flex items-center gap-2 shadow-lg active:scale-95"
                  >
                    <Printer size={16} />
                    Print Photo Collage
                  </button>
                )}
              </div>
              {shareError && (
                <p role="alert" className="w-full mt-2 text-center text-xs text-red-400">
                  {shareError}
                </p>
              )}
              {saveError && (
                <p role="alert" className="w-full mt-2 text-center text-xs text-red-400">
                  {saveError}
                </p>
              )}

            </div>
          </div>

          {/* Bottom Customization Controls Bar */}
          <div className="no-print">
            <EditorControls
              layoutId={layoutId}
              onLayoutChange={setLayoutId}
              frameSettings={frameSettings}
              onFrameSettingsChange={setFrameSettings}
              watermarkSettings={watermarkSettings}
              onWatermarkSettingsChange={setWatermarkSettings}
              stickers={stickers}
              onAddSticker={handleAddSticker}
              onClearStickers={handleClearStickers}
              selectedFilterId={selectedFilterId}
              onFilterChange={setSelectedFilterId}
            />
          </div>

        </div>
      )}

      {/* Share & QR Code Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        session={{
          ...(shareSession || {
            id: currentSessionId,
            photos: capturedPhotos,
            watermarkSettings,
          }),
        }}
        collageDataUrl={collageDataUrl}
        onPrint={handlePrint}
      />

      {/* Print-Only CSS Render Container */}
      <div className="print-only hidden">
        <div className="flex items-center justify-center min-h-screen">
          {collageDataUrl && (
            <img
              src={collageDataUrl}
              alt="Print Ready Strip"
              className="max-h-screen w-auto"
            />
          )}
        </div>
      </div>

    </div>
  );
}
