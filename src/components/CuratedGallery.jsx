import React, { useState, useEffect } from 'react';
import { getAllSessions, deleteSession, toggleFavorite, getShareableUrl } from '../services/storage';
import { Star, Trash2, Share2, Printer, Download, Eye, Play, Sparkles, Image as ImageIcon, ArrowLeft } from 'lucide-react';

export default function CuratedGallery({
  onSelectSession,
  onBackToBooth,
  onOpenShareModal,
}) {
  const [sessions, setSessions] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'favorites'
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const loadSessions = async () => {
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (e) {
      console.error('Failed to load sessions', e);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Slideshow timer
  useEffect(() => {
    let timer = null;
    if (isSlideshowActive && sessions.length > 0) {
      timer = setInterval(() => {
        setSlideshowIndex((prev) => (prev + 1) % sessions.length);
      }, 4000); // 4 seconds per slide
    }
    return () => clearInterval(timer);
  }, [isSlideshowActive, sessions.length]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('Delete this photobooth session?')) {
      await deleteSession(id);
      loadSessions();
    }
  };

  const handleToggleFavorite = async (id, e) => {
    e.stopPropagation();
    await toggleFavorite(id);
    loadSessions();
  };

  const displayedSessions = filterMode === 'favorites'
    ? sessions.filter((s) => s.favorite)
    : sessions;

  // Full Screen Live Slideshow Mode
  if (isSlideshowActive && displayedSessions.length > 0) {
    const current = displayedSessions[slideshowIndex % displayedSessions.length];
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
        <button
          onClick={() => setIsSlideshowActive(false)}
          className="absolute top-6 right-6 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-wider"
        >
          Exit Slideshow
        </button>

        <div className="relative max-h-[85vh] transition-all duration-700 ease-in-out transform flex items-center justify-center">
          <img
            src={current.collageDataUrl}
            alt="Slideshow Strip"
            className="max-h-[85vh] w-auto rounded-xl shadow-2xl border-4 border-white"
          />
        </div>

        <div className="mt-4 text-center">
          <h3 className="text-xl font-bold text-white tracking-wide">
            {current.watermarkSettings?.title || 'Photobooth Strip'}
          </h3>
          <p className="text-xs text-white/60">
            {current.watermarkSettings?.subtitle || new Date(current.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-white flex flex-col">
      
      {/* Top Header */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-zinc-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToBooth}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <Sparkles size={16} className="text-rose-500" />
              Curated Event Gallery
            </h2>
            <p className="text-[11px] text-white/50">{sessions.length} Saved Sessions</p>
          </div>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={() => setIsSlideshowActive(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Play size={14} />
            Live Slideshow
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-white/5 bg-zinc-900/40">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            filterMode === 'all'
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          All Photos ({sessions.length})
        </button>

        <button
          onClick={() => setFilterMode('favorites')}
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
            filterMode === 'favorites'
              ? 'bg-amber-400 text-black'
              : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          <Star size={12} className={filterMode === 'favorites' ? 'fill-black' : ''} />
          Curated / Favorites ({sessions.filter((s) => s.favorite).length})
        </button>
      </div>

      {/* Main Grid List */}
      <div className="flex-1 p-4 overflow-y-auto">
        {displayedSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-white/40">
            <ImageIcon size={48} className="mb-3 opacity-30 text-rose-400" />
            <h3 className="text-sm font-semibold text-white/80">No photobooth strips yet</h3>
            <p className="text-xs text-white/50 max-w-xs mt-1">
              Snap some photos with 5s clips in the booth to populate this curated gallery!
            </p>
            <button
              onClick={onBackToBooth}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg"
            >
              Open Photobooth
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session)}
                className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-rose-500/50 transition-all flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-2xl"
              >
                {/* Collage Thumbnail */}
                <div className="relative w-full aspect-[1/2] bg-zinc-950/60 flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={session.collageDataUrl}
                    alt={session.watermarkSettings?.title || 'Photobooth Strip'}
                    className="w-full h-full object-contain rounded-lg drop-shadow"
                  />

                  {/* Favorite Star Button */}
                  <button
                    onClick={(e) => handleToggleFavorite(session.id, e)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-amber-400 hover:bg-black/90 transition-all"
                  >
                    <Star
                      size={16}
                      className={session.favorite ? 'fill-amber-400 text-amber-400' : 'text-white/60'}
                    />
                  </button>

                  {/* Video Clip Count Badge */}
                  {session.photos && session.photos.some((p) => p.hasVideo || p.videoBlob || p.videoUrl) && (
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-rose-600/90 text-[10px] font-bold text-white shadow">
                      ▶ 5s Clips
                    </div>
                  )}
                </div>

                {/* Info & Action Footer */}
                <div className="p-3 bg-zinc-900 border-t border-white/5">
                  <h4 className="text-xs font-bold text-white truncate">
                    {session.watermarkSettings?.title || 'Photobooth Strip'}
                  </h4>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenShareModal(session);
                      }}
                      className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-md"
                      title="Share / QR"
                    >
                      <Share2 size={14} />
                    </button>

                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
