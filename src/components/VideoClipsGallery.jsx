import React, { useState } from 'react';
import { Video, Download, Play, Pause, Film, Check } from 'lucide-react';
import { getFilterById } from '../constants/filters';

export default function VideoClipsGallery({ photos = [], selectedFilterId = 'normal' }) {
  const [playingVideoId, setPlayingVideoId] = useState(null);

  const videoPhotos = photos.filter((p) => p.videoUrl || p.videoBlob);
  const activeFilter = getFilterById(selectedFilterId);

  if (videoPhotos.length === 0) {
    return (
      <div className="text-center p-6 bg-zinc-900 rounded-2xl border border-white/10 text-white/50 text-xs">
        No video clips available for this session.
      </div>
    );
  }

  const handleDownloadClip = (photo, index) => {
    if (!photo.videoUrl && !photo.videoBlob) return;
    const url = photo.videoUrl || URL.createObjectURL(photo.videoBlob);
    const a = document.createElement('a');
    a.href = url;
    const extension = photo.videoBlob?.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `photobooth-clip-shot-${index + 1}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400">
            <Film size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Motion Video Clips</h4>
            <p className="text-[11px] text-white/50">Each shot includes a shareable video memory</p>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono">
          {videoPhotos.length} Clips
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {videoPhotos.map((photo, idx) => {
          const isPlaying = playingVideoId === photo.id;
          const duration = photo.videoDurationSeconds || 5;
          return (
            <div
              key={photo.id || idx}
              className="group relative rounded-xl overflow-hidden bg-zinc-800 border border-white/10 aspect-[3/4] flex flex-col justify-between shadow-md"
            >
              {/* Base photo image so no black space or flickering */}
              <img
                src={photo.rawDataUrl || photo.dataUrl}
                alt={`Shot ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-all"
                style={{ filter: activeFilter.cssFilter, objectFit: 'cover' }}
              />

              {photo.videoUrl && (
                <video
                  src={photo.videoUrl}
                  playsInline
                  webkit-playsinline="true"
                  loop
                  autoPlay
                  muted
                  poster={photo.rawDataUrl || photo.dataUrl}
                  onLoadedData={(e) => {
                    e.target.play().catch(() => {});
                  }}
                  className="absolute inset-0 w-full h-full object-cover transition-all"
                  style={{
                    filter: activeFilter.cssFilter,
                    objectFit: 'cover',
                    backgroundColor: 'transparent',
                  }}
                />
              )}

              {/* Shot Tag */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white">
                Shot #{idx + 1} • {duration}s
              </div>

              {/* Bottom Download Bar */}
              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-end">
                <button
                  onClick={() => handleDownloadClip(photo, idx)}
                  className="p-1.5 bg-white/20 hover:bg-rose-600 text-white rounded-lg text-xs backdrop-blur-md transition-all active:scale-95"
                  title={`Download ${duration}s Video Clip`}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
