import React, { useState } from 'react';
import { LAYOUTS } from '../constants/layouts';
import { FRAME_COLORS, FRAME_PATTERNS, FONTS, STICKERS, STAMP_BADGES } from '../constants/designs';
import { FILTERS } from '../constants/filters';
import { LayoutGrid, Palette, Type, Smile, Sparkles, Sliders, Check } from 'lucide-react';

export default function EditorControls({
  layoutId,
  onLayoutChange,
  frameSettings,
  onFrameSettingsChange,
  watermarkSettings,
  onWatermarkSettingsChange,
  stickers,
  onAddSticker,
  onClearStickers,
  selectedFilterId,
  onFilterChange,
}) {
  const [activeTab, setActiveTab] = useState('layout'); // 'layout', 'frame', 'watermark', 'stickers', 'filter'

  return (
    <div className="w-full bg-zinc-900 border-t border-white/10 flex flex-col max-h-[50vh] sm:max-h-none overflow-hidden select-none">
      
      {/* Navigation Tabs */}
      <div className="flex items-center justify-around border-b border-white/10 px-2 py-2 overflow-x-auto no-scrollbar bg-black/40">
        <button
          onClick={() => setActiveTab('layout')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'layout'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid size={15} />
          Layout
        </button>

        <button
          onClick={() => setActiveTab('frame')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'frame'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Palette size={15} />
          Frame & Border
        </button>

        <button
          onClick={() => setActiveTab('watermark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'watermark'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Type size={15} />
          Watermark
        </button>

        <button
          onClick={() => setActiveTab('stickers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'stickers'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smile size={15} />
          Stickers ({stickers.length})
        </button>

        <button
          onClick={() => setActiveTab('filter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'filter'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles size={15} />
          Filter
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-4 overflow-y-auto max-h-56 no-scrollbar">

        {/* 1. LAYOUT TAB */}
        {activeTab === 'layout' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {LAYOUTS.map((item) => {
              const isActive = layoutId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onLayoutChange(item.id)}
                  className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
                    isActive
                      ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white">{item.name}</span>
                    {isActive && <Check size={14} className="text-rose-400" />}
                  </div>
                  <span className="text-[10px] text-white/50">{item.printSize}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-rose-300 w-fit mt-1">
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. FRAME & BORDER TAB */}
        {activeTab === 'frame' && (
          <div className="space-y-4">
            {/* Color Swatches */}
            <div>
              <label className="text-xs font-semibold text-white/80 block mb-2">Frame Color</label>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {FRAME_COLORS.map((fc) => (
                  <button
                    key={fc.id}
                    onClick={() => {
                      onFrameSettingsChange({
                        ...frameSettings,
                        colorId: fc.id,
                        customColor: fc.color || null,
                        gradient: fc.gradient || null,
                      });
                      // Auto-sync watermark text color for readability
                      onWatermarkSettingsChange({
                        ...watermarkSettings,
                        color: fc.textColor,
                      });
                    }}
                    className={`w-9 h-9 rounded-full shrink-0 border-2 transition-all flex items-center justify-center active:scale-90 ${
                      frameSettings.colorId === fc.id ? 'border-rose-500 ring-2 ring-rose-400 scale-105' : 'border-white/20'
                    }`}
                    style={{
                      backgroundColor: fc.color || '#fff',
                      backgroundImage: fc.gradient || 'none',
                    }}
                    title={fc.name}
                  >
                    {frameSettings.colorId === fc.id && (
                      <span className="text-[10px]" style={{ color: fc.textColor }}>✓</span>
                    )}
                  </button>
                ))}

                {/* Custom Color Input */}
                <label className="w-9 h-9 rounded-full shrink-0 border-2 border-dashed border-white/40 flex items-center justify-center cursor-pointer overflow-hidden relative" title="Custom Hex Color">
                  <input
                    type="color"
                    value={frameSettings.customColor || '#ffffff'}
                    onChange={(e) =>
                      onFrameSettingsChange({
                        ...frameSettings,
                        colorId: 'custom',
                        customColor: e.target.value,
                        gradient: null,
                      })
                    }
                    className="opacity-0 absolute inset-0 cursor-pointer"
                  />
                  <Palette size={14} className="text-white/70" />
                </label>
              </div>
            </div>

            {/* Pattern & Border Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-white/70 block mb-1">
                  Border Spacing: {frameSettings.borderWidth}px
                </label>
                <input
                  type="range"
                  min="4"
                  max="28"
                  value={frameSettings.borderWidth}
                  onChange={(e) =>
                    onFrameSettingsChange({
                      ...frameSettings,
                      borderWidth: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-white/70 block mb-1">
                  Corner Radius: {frameSettings.cornerRadius}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={frameSettings.cornerRadius}
                  onChange={(e) =>
                    onFrameSettingsChange({
                      ...frameSettings,
                      cornerRadius: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Pattern Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">Pattern:</span>
              <button
                onClick={() =>
                  onFrameSettingsChange({
                    ...frameSettings,
                    pattern: frameSettings.pattern === 'dots' ? 'clean' : 'dots',
                  })
                }
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  frameSettings.pattern === 'dots'
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                Polka Dots
              </button>
            </div>
          </div>
        )}

        {/* 3. WATERMARK TAB */}
        {activeTab === 'watermark' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-white/80 block mb-1">Event / Brand Title</label>
              <input
                type="text"
                value={watermarkSettings.title}
                onChange={(e) =>
                  onWatermarkSettingsChange({
                    ...watermarkSettings,
                    title: e.target.value,
                  })
                }
                placeholder="e.g. SARAH'S 21ST BIRTHDAY"
                className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-1">Date / Subtitle</label>
                <input
                  type="text"
                  value={watermarkSettings.subtitle}
                  onChange={(e) =>
                    onWatermarkSettingsChange({
                      ...watermarkSettings,
                      subtitle: e.target.value,
                    })
                  }
                  placeholder="Date or location"
                  className="w-full px-3 py-1.5 bg-black/60 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/80 block mb-1">Font Style</label>
                <select
                  value={watermarkSettings.fontId}
                  onChange={(e) => {
                    const sel = FONTS.find((f) => f.id === e.target.value);
                    if (sel) {
                      onWatermarkSettingsChange({
                        ...watermarkSettings,
                        fontId: sel.id,
                        fontFamily: sel.family,
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-black/60 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {FONTS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={watermarkSettings.showDate}
                  onChange={(e) =>
                    onWatermarkSettingsChange({
                      ...watermarkSettings,
                      showDate: e.target.checked,
                    })
                  }
                  className="rounded text-rose-600 focus:ring-0"
                />
                Show Date Stamp
              </label>

              {/* Watermark text color */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/60">Color:</span>
                <input
                  type="color"
                  value={watermarkSettings.color}
                  onChange={(e) =>
                    onWatermarkSettingsChange({
                      ...watermarkSettings,
                      color: e.target.value,
                    })
                  }
                  className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. STICKERS TAB */}
        {activeTab === 'stickers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/60">Tap sticker to place on collage:</span>
              {stickers.length > 0 && (
                <button
                  onClick={onClearStickers}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-8 gap-2">
              {STICKERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onAddSticker(s.emoji)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-xl transition-transform active:scale-90"
                  title={s.label}
                >
                  {s.emoji}
                </button>
              ))}
            </div>

            {/* Quick Party Stamp Badges */}
            <div className="pt-2">
              <span className="text-[11px] text-white/50 block mb-1">Preset Text Badges:</span>
              <div className="flex flex-wrap gap-1.5">
                {STAMP_BADGES.map((badge, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      onWatermarkSettingsChange({
                        ...watermarkSettings,
                        title: badge,
                      })
                    }
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white/90 active:scale-95"
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. FILTER TAB */}
        {activeTab === 'filter' && (
          <div className="grid grid-cols-3 gap-2">
            {FILTERS.map((f) => {
              const isActive = selectedFilterId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onFilterChange(f.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                    isActive
                      ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full border border-white/20"
                    style={{ backgroundColor: f.colorPreview }}
                  />
                  <span className="text-[11px] font-medium text-white">{f.name}</span>
                  <span className="text-[9px] text-white/50">{f.badge}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
