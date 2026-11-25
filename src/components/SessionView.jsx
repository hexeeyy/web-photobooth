import React, { useState, useEffect } from 'react';
import { getSession } from '../services/storage';
import { Download, Printer, Share2, Film, Sparkles, Camera, ArrowLeft } from 'lucide-react';
import VideoClipsGallery from './VideoClipsGallery';
import CollageCanvas from './CollageCanvas';

export default function SessionView({ sessionId, onOpenBooth }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [isPlayingLiveClips, setIsPlayingLiveClips] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getSession(sessionId);
        if (data) {
          setSession(data);
        } else {
          setError('Session not found or has expired.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load session.');
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) {
      load();
    }
  }, [sessionId]);

  const handleDownload = async () => {
    if (!session?.collageDataUrl) return;
    try {
      const response = await fetch(session.collageDataUrl);
      if (!response.ok) throw new Error(`Photo download failed (${response.status}).`);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `photobooth-${session.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadError('');
    } catch (err) {
      console.error('Photo download failed:', err);
      setDownloadError('Could not download the photo collage. Please try again.');
    }
  };

  const handleDownloadAll = async () => {
    try {
      const response = await fetch(session.packageUrl);
      if (!response.ok) throw new Error(`Session download failed (${response.status}).`);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `photobooth-package-${session.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadError('');
    } catch (err) {
      console.error('Session package download failed:', err);
      setDownloadError('Could not download the full photo and video package. Please try again.');
    }
  };

  const handleDownloadVideoCollage = async () => {
    if (!session || isExportingVideo) return;
    try {
      setIsExportingVideo(true);
      setDownloadError('');
      const { downloadVideoCollage } = await import('../services/videoCollage');
      await downloadVideoCollage(session);
    } catch (err) {
      console.error('Video collage export failed:', err);
      setDownloadError(err.message || 'Could not save the video collage. Please try again.');
    } finally {
      setIsExportingVideo(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: session?.watermarkSettings?.title || 'Photobooth Strip',
          text: 'Check out our photobooth pictures & 5s video clips!',
          url: window.location.href,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="glass-theme w-full min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-white/70">Loading your photobooth memory...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="glass-theme w-full min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-lg font-bold text-red-400 mb-2">{error || 'Session not found'}</h3>
        <p className="text-xs text-white/50 max-w-xs mb-6">
          This photobooth memory may be stored on the main booth device or was removed.
        </p>
        <button
          onClick={onOpenBooth}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg"
        >
          <Camera size={16} />
          Open Photobooth Camera
        </button>
      </div>
    );
  }

  return (
    <div className="glass-theme w-full min-h-screen bg-zinc-950 text-white flex flex-col pb-12">
      
      {/* Top Banner */}
      <div className="no-print px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-zinc-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={onOpenBooth}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Photobooth
        </button>
        <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
          <Sparkles size={14} /> Photo Memory
        </span>
        <button
          onClick={handleShare}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80"
          title="Share"
        >
          <Share2 size={16} />
        </button>
      </div>

      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="flex flex-col items-center lg:sticky lg:top-24">
        
        {/* Title Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-black tracking-tight text-white">
            {session.watermarkSettings?.title || 'PHOTOBOOTH MEMORY'}
          </h1>
          <p className="text-xs text-white/60 mt-1">
            {session.watermarkSettings?.subtitle || new Date(session.createdAt).toLocaleDateString()}
          </p>
          {session.expiresAt && (
            <p className="text-[11px] text-amber-200/80 mt-1">
              This link expires {new Date(session.expiresAt).toLocaleString()}; stored media is removed shortly after.
            </p>
          )}
        </div>

        {/* Live Motion Playback Button */}
        {session.photos && session.photos.some((p) => p.videoBlob || p.videoUrl) && (
          <button
            onClick={() => setIsPlayingLiveClips(!isPlayingLiveClips)}
            className={`no-print mb-4 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
              isPlayingLiveClips
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <Film size={15} />
            {isPlayingLiveClips ? 'Live Motion ON' : 'Play Motion on Strip'}
          </button>
        )}

        {/* Photobooth Strip Preview - Zero Black Spaces */}
        <div className="relative mb-6 flex items-center justify-center">
          {isPlayingLiveClips ? (
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <CollageCanvas
                layoutId={session.layoutId || 'strip-4'}
                photoCount={session.photoCount || session.photos?.length}
                photos={session.photos || []}
                selectedFilterId={session.selectedFilterId || 'normal'}
                frameSettings={session.frameSettings}
                watermarkSettings={session.watermarkSettings}
                stickers={session.stickers || []}
                isPlayingLiveClips={true}
              />
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <img
                src={session.collageDataUrl}
                alt="Photobooth Strip"
                className="w-full h-auto object-contain drop-shadow-xl"
                style={{ maxWidth: session.layoutId?.includes('double') ? '380px' : '280px' }}
              />
            </div>
          )}
        </div>
        </div>

        <div className="w-full flex flex-col items-center lg:pt-2">
        {/* Quick Action Buttons */}
        <div className="no-print w-full grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleDownload}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <Download size={16} />
            Save Photo Strip
          </button>

          <button
            onClick={handlePrint}
            className="w-full py-3 bg-white text-zinc-950 hover:bg-zinc-100 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <Printer size={16} />
            Print Strip
          </button>
        </div>

        {session.photos?.some((photo) => photo.videoBlob || photo.videoUrl) && (
          <button
            onClick={handleDownloadVideoCollage}
            disabled={isExportingVideo}
            className="no-print w-full py-3 mb-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Film size={16} />
            {isExportingVideo ? 'Creating video collage...' : 'Save Video Collage'}
          </button>
        )}

        {session.packageUrl && (
          <button
            onClick={handleDownloadAll}
            className="no-print w-full py-3 mb-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <Download size={16} />
            Download All Outputs & Clips
          </button>
        )}
        {downloadError && (
          <p role="alert" className="no-print w-full mb-4 text-center text-xs text-red-400">
            {downloadError}
          </p>
        )}

        {/* Video Clips Gallery */}
        {session.photos && session.photos.length > 0 && (
          <div className="no-print w-full mb-6">
            <VideoClipsGallery photos={session.photos} selectedFilterId={session.selectedFilterId} />
          </div>
        )}

        {/* Return / Open Booth CTA */}
        <div className="no-print w-full text-center pt-4 border-t border-white/10">
          <button
            onClick={onOpenBooth}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold text-white inline-flex items-center gap-2"
          >
            <Camera size={16} />
            Take New Photos in Booth
          </button>
        </div>
        </div>

      </div>

      {/* Print-Only Container */}
      <div className="print-only hidden">
        <div className="flex items-center justify-center min-h-screen">
          <img src={session.collageDataUrl} alt="Print Strip" className="max-h-screen w-auto" />
        </div>
      </div>

    </div>
  );
}
