import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { getLayoutById } from '../constants/layouts';
import { getFilterById } from '../constants/filters';
import { Play, Pause, Trash2, Move } from 'lucide-react';

const CollageCanvas = forwardRef(function CollageCanvas(
  {
    layoutId = 'strip-4',
    photos = [],
    selectedFilterId = 'normal',
    frameSettings = {
      colorId: 'white',
      customColor: '#ffffff',
      gradient: null,
      pattern: 'clean',
      borderWidth: 16,
      cornerRadius: 8,
      padding: 16,
    },
    watermarkSettings = {
      title: 'PHOTOBOOTH MEMORY',
      subtitle: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      fontId: 'sans',
      fontFamily: '"Montserrat Variable", "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#111827',
      showDate: true,
      logoUrl: null,
      customTextSize: 18,
    },
    stickers = [],
    onUpdateSticker,
    onDeleteSticker,
    isPlayingLiveClips = false,
  },
  ref
) {
  const containerRef = useRef(null);
  const layout = getLayoutById(layoutId);

  // Dragging sticker state
  const [activeStickerId, setActiveStickerId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Expose renderHighResCanvas method to parent for download, printing, and saving
  useImperativeHandle(ref, () => ({
    getHighResCanvas: async () => {
      return renderHighResCanvas();
    },
    getHighResDataUrl: async () => {
      const canvas = await renderHighResCanvas();
      return canvas.toDataURL('image/jpeg', 0.98);
    },
    getHighResBlob: async () => {
      const canvas = await renderHighResCanvas();
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.98));
    }
  }));

  // Render High-Resolution Canvas (300 DPI for physical printing)
  const renderHighResCanvas = async () => {
    const canvas = document.createElement('canvas');
    const targetW = layout.width;
    const targetH = layout.height;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // 1. Draw Background
    if (frameSettings.gradient) {
      const grad = ctx.createLinearGradient(0, 0, targetW, targetH);
      // Simple parse for two-color linear gradient
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(1, '#fb923c');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = frameSettings.customColor || '#ffffff';
    }
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Background Pattern (Polka dots or Checker)
    if (frameSettings.pattern === 'dots') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      const dotSpacing = 80;
      for (let x = 20; x < targetW; x += dotSpacing) {
        for (let y = 20; y < targetH; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Load photo images into HTMLImageElements
    const loadedImages = await Promise.all(
      photos.map((p) => {
        return new Promise((resolve) => {
          if (!p) return resolve(null);
          const src = p.rawDataUrl || p.dataUrl;
          if (!src) return resolve(null);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      })
    );

    // Calculate Grid Layout geometry
    const padding = (frameSettings.padding || 16) * 4; // Scale for 300 DPI
    const gap = (frameSettings.borderWidth || 16) * 4;
    const cornerRadius = (frameSettings.cornerRadius || 8) * 4;

    const isDouble = layout.gridConfig.isDoubleStrip;
    const columns = layout.gridConfig.columns;
    const rows = layout.gridConfig.rows;

    // Reserve height for watermark at bottom
    const watermarkHeight = layout.id === 'polaroid' ? 700 : 380;
    const availableHeight = targetH - padding * 2 - watermarkHeight;
    const availableWidth = targetW - padding * 2;

    const cellWidth = (availableWidth - gap * (columns - 1)) / columns;
    const cellHeight = (availableHeight - gap * (rows - 1)) / rows;

    const activeFilter = getFilterById(selectedFilterId);

    const renderCell = (img, col, row) => {
      if (!img) return;
      const x = padding + col * (cellWidth + gap);
      const y = padding + row * (cellHeight + gap);

      ctx.save();
      // Rounded corner clipping
      if (cornerRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, cellWidth, cellHeight, cornerRadius);
        ctx.clip();
      }

      // Center-crop draw image
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const cellRatio = cellWidth / cellHeight;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > cellRatio) {
        drawH = cellHeight;
        drawW = cellHeight * imgRatio;
        drawX = x - (drawW - cellWidth) / 2;
        drawY = y;
      } else {
        drawW = cellWidth;
        drawH = cellWidth / imgRatio;
        drawX = x;
        drawY = y - (drawH - cellHeight) / 2;
      }

      // Apply filter to photo only
      if (activeFilter && activeFilter.canvasFilter && activeFilter.canvasFilter !== 'none') {
        try {
          ctx.filter = activeFilter.canvasFilter;
        } catch (e) {
          ctx.filter = 'none';
        }
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.filter = 'none'; // reset filter
      ctx.restore();
    };

    if (isDouble) {
      // Double 2x6 strip side-by-side
      for (let r = 0; r < rows; r++) {
        const img = loadedImages[r % loadedImages.length];
        // Strip 1 (Left)
        renderCell(img, 0, r);
        // Strip 2 (Right)
        renderCell(img, 1, r);
      }

      // Draw middle cut guide line
      ctx.save();
      ctx.setLineDash([20, 15]);
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(targetW / 2, 40);
      ctx.lineTo(targetW / 2, targetH - 40);
      ctx.stroke();

      // Scissor marker text
      ctx.font = '36px sans-serif';
      ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText('✂ CUT HERE', targetW / 2, 80);
      ctx.restore();

    } else {
      // Standard grid or vertical strip
      let imgIdx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const img = loadedImages[imgIdx % loadedImages.length];
          renderCell(img, c, r);
          imgIdx++;
        }
      }
    }

    // 3. Draw Watermark & Branding Text
    const renderWatermarkText = (centerX, bottomY) => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = watermarkSettings.color || '#111827';

      // Title font
      const titleSize = Math.round((watermarkSettings.customTextSize || 18) * 3.8);
      ctx.font = `bold ${titleSize}px ${watermarkSettings.fontFamily}`;
      ctx.fillText(watermarkSettings.title || '', centerX, bottomY - 90);

      // Subtitle & Date font
      if (watermarkSettings.showDate && watermarkSettings.subtitle) {
        ctx.font = `italic 500 ${Math.round(titleSize * 0.58)}px ${watermarkSettings.fontFamily}`;
        ctx.fillStyle = watermarkSettings.color || '#4b5563';
        ctx.fillText(watermarkSettings.subtitle, centerX, bottomY - 35);
      }
      ctx.restore();
    };

    if (isDouble) {
      renderWatermarkText(targetW * 0.25, targetH - padding);
      renderWatermarkText(targetW * 0.75, targetH - padding);
    } else {
      renderWatermarkText(targetW * 0.5, targetH - padding);
    }

    // 4. Draw Stickers
    stickers.forEach((s) => {
      ctx.save();
      const stickerX = (s.x / 100) * targetW;
      const stickerY = (s.y / 100) * targetH;
      const stickerSize = Math.round(s.size * 3.5);

      ctx.translate(stickerX, stickerY);
      ctx.rotate(((s.rotation || 0) * Math.PI) / 180);
      ctx.font = `${stickerSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji || '✨', 0, 0);
      ctx.restore();
    });

    return canvas;
  };

  // Sticker dragging handlers for DOM interactive preview
  const handleTouchStart = (stickerId, e) => {
    setActiveStickerId(stickerId);
  };

  const handlePointerDown = (stickerId, e) => {
    setActiveStickerId(stickerId);
    e.stopPropagation();
  };

  const handleContainerPointerMove = (e) => {
    if (!activeStickerId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));

    if (onUpdateSticker) {
      onUpdateSticker(activeStickerId, { x, y });
    }
  };

  const handlePointerUp = () => {
    setActiveStickerId(null);
  };

  const isDouble = layout.gridConfig.isDoubleStrip;
  const columns = layout.gridConfig.columns;
  const rows = layout.gridConfig.rows;

  return (
    <div
      ref={containerRef}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handlePointerUp}
      onTouchMove={handleContainerPointerMove}
      onTouchEnd={handlePointerUp}
      className="collage-preview relative select-none shadow-2xl transition-all duration-300 mx-auto overflow-hidden"
      style={{
        aspectRatio: layout.aspectRatio,
        backgroundColor: frameSettings.customColor || '#ffffff',
        backgroundImage: frameSettings.gradient || 'none',
        padding: `${frameSettings.padding || 16}px`,
        maxWidth: '100%',
        width: layout.id === 'strip-4' || layout.id === 'strip-3' ? '280px' : '380px',
      }}
    >
      {/* Decorative Dots Pattern */}
      {frameSettings.pattern === 'dots' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(${watermarkSettings.color || '#000'} 1.5px, transparent 1.5px)`,
            backgroundSize: '16px 16px',
          }}
        />
      )}

      {/* Main Photo Grid */}
      <div
        className="w-full h-full min-h-0 flex flex-col justify-between"
        style={{
          gap: `${frameSettings.borderWidth || 12}px`,
        }}
      >
        <div
          className="grid flex-1 min-h-0 min-w-0 w-full"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            gap: `${frameSettings.borderWidth || 12}px`,
          }}
        >
          {Array.from({ length: columns * rows }).map((_, index) => {
            const rowIndex = Math.floor(index / columns);
            const isRightCol = isDouble && index % columns === 1;
            const photoIndex = (isDouble ? rowIndex : index) % (photos.length || 1);
            const photo = photos[photoIndex];
            const activeFilter = getFilterById(selectedFilterId || photo?.filterId || 'normal');
            const videoSrc = isRightCol ? (photo?.videoUrlCopy || photo?.videoUrl) : photo?.videoUrl;

            return (
              <div
                key={index}
                className="relative min-h-0 min-w-0 overflow-hidden flex items-center justify-center"
                style={{
                  borderRadius: `${frameSettings.cornerRadius || 8}px`,
                  backgroundColor: 'transparent',
                }}
              >
                {photo ? (
                  <>
                    {/* Base Image Layer: always present so no black gaps or flashes */}
                    <img
                      src={photo.rawDataUrl || photo.dataUrl}
                      alt={`Booth Shot ${photoIndex + 1}`}
                      className="w-full h-full min-h-0 min-w-0 object-cover transition-all"
                      style={{
                        filter: activeFilter.cssFilter,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />

                    {/* Live Motion Video Layer: fades in on top when enabled */}
                    {isPlayingLiveClips && videoSrc && (
                      <video
                        key={`vid-${photo.id || photoIndex}-${index}-${isRightCol ? 'r' : 'l'}`}
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        webkit-playsinline="true"
                        poster={photo.rawDataUrl || photo.dataUrl}
                        onLoadedData={(e) => {
                          e.target.play().catch(() => {});
                        }}
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                        style={{
                          filter: activeFilter.cssFilter,
                          objectFit: 'cover',
                          backgroundColor: 'transparent',
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-zinc-400 text-xs font-mono">No Photo</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Watermark Section */}
        <div
          className="w-full flex items-center justify-center flex-col pt-3 pb-1"
          style={{
            color: watermarkSettings.color || '#111827',
            fontFamily: watermarkSettings.fontFamily,
          }}
        >
          {isDouble ? (
            <div className="w-full flex justify-around text-center">
              <div>
                <div className="font-bold text-xs uppercase tracking-wider">{watermarkSettings.title}</div>
                {watermarkSettings.showDate && (
                  <div className="text-[10px] opacity-75 italic">{watermarkSettings.subtitle}</div>
                )}
              </div>
              <div>
                <div className="font-bold text-xs uppercase tracking-wider">{watermarkSettings.title}</div>
                {watermarkSettings.showDate && (
                  <div className="text-[10px] opacity-75 italic">{watermarkSettings.subtitle}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div
                className="font-bold uppercase tracking-wider"
                style={{ fontSize: `${watermarkSettings.customTextSize || 14}px` }}
              >
                {watermarkSettings.title}
              </div>
              {watermarkSettings.showDate && (
                <div className="text-xs opacity-75 italic mt-0.5">{watermarkSettings.subtitle}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stickers Overlay */}
      {stickers.map((s) => (
        <div
          key={s.id}
          onPointerDown={(e) => handlePointerDown(s.id, e)}
          onTouchStart={(e) => handleTouchStart(s.id, e)}
          className={`absolute cursor-move select-none p-1 transition-transform touch-none ${
            activeStickerId === s.id ? 'ring-2 ring-rose-500 rounded-lg scale-110 z-40' : 'z-30 hover:scale-105'
          }`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg)`,
            fontSize: `${s.size}px`,
          }}
        >
          <span>{s.emoji}</span>
          {activeStickerId === s.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteSticker) onDeleteSticker(s.id);
              }}
              className="absolute -top-3 -right-3 p-1 bg-red-600 text-white rounded-full text-xs shadow-md"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      ))}

      {/* Double strip cut line indicator */}
      {isDouble && (
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-gray-400/40 pointer-events-none" />
      )}
    </div>
  );
});

export default CollageCanvas;
