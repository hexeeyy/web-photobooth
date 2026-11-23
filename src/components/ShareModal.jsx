import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Share2, Copy, Download, Printer, Check, X, Film, Sparkles } from 'lucide-react';
import { getShareableUrl } from '../services/storage';

export default function ShareModal({
  isOpen,
  onClose,
  session,
  collageDataUrl,
  onPrint,
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const shareUrl = session ? getShareableUrl(session.id) : window.location.href;

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  // Copy URL to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  // Web Share API (native phone share)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: session?.watermarkSettings?.title || 'Photobooth Strip',
          text: `Check out our photobooth photos & 5s video clips!`,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Download High-Res Collage Image
  const handleDownloadCollage = async () => {
    if (!collageDataUrl) return;
    try {
      const response = await fetch(collageDataUrl);
      if (!response.ok) throw new Error(`Photo download failed (${response.status}).`);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `photobooth-${session?.id || 'strip'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Photo download failed:', error);
    }
  };

  // Bundle everything (Collage + Raw Photos + 5s Video Clips) into a ZIP file
  const handleDownloadAllZip = async () => {
    if (!session) return;
    setIsZipping(true);
    try {
      let content;
      if (session.packageUrl) {
        const response = await fetch(session.packageUrl);
        if (!response.ok) throw new Error(`Session download failed (${response.status}).`);
        content = await response.blob();
      } else {
        const { createSessionArchive } = await import('../services/sessionArchive');
        content = await createSessionArchive({ ...session, collageDataUrl });
      }
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photobooth-package-${session.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('ZIP creation failed:', error);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-white flex flex-col items-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/70 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <Sparkles size={18} className="text-rose-400" />
            Share & Print
          </h3>
          <p className="text-xs text-white/60 mt-0.5">
            Scan with your phone to view, download, or share!
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-2xl shadow-xl mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Scan QR Code" className="w-48 h-48 rounded-lg" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs font-mono">
              Generating QR...
            </div>
          )}
        </div>

        {/* Shareable Link Box */}
        <div className="w-full flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl p-2 mb-4">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent text-xs text-white/80 font-mono truncate focus:outline-none px-1"
          />
          <button
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 ${
              copied ? 'bg-emerald-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 mb-2">
          {/* Print Button */}
          <button
            onClick={() => {
              onClose();
              if (onPrint) onPrint();
            }}
            className="w-full py-2.5 px-3 bg-white text-zinc-950 hover:bg-zinc-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95"
          >
            <Printer size={16} />
            Print Strip
          </button>

          {/* Native Share */}
          <button
            onClick={handleNativeShare}
            className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95"
          >
            <Share2 size={16} />
            Share Phone
          </button>
        </div>

        {/* Secondary Downloads */}
        <div className="w-full grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadCollage}
            className="py-2 px-3 bg-white/10 hover:bg-white/15 text-white/90 rounded-xl text-xs font-medium flex items-center justify-center gap-1 active:scale-95"
          >
            <Download size={14} />
            Save Photo
          </button>

          <button
            onClick={handleDownloadAllZip}
            disabled={isZipping}
            className="py-2 px-3 bg-white/10 hover:bg-white/15 text-white/90 rounded-xl text-xs font-medium flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
          >
            <Film size={14} />
            {isZipping ? 'Zipping...' : 'Zip + Videos'}
          </button>
        </div>

      </div>
    </div>
  );
}
