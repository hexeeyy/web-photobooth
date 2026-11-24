import { getAdaptiveGrid, getCustomFrameSlots, getLayoutById } from '../constants/layouts';
import { getFilterById } from '../constants/filters';

function loadVideo(photo, createdUrls) {
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';

  if (photo.videoBlob) {
    video.src = URL.createObjectURL(photo.videoBlob);
    createdUrls.push(video.src);
  } else if (photo.videoUrl) {
    video.src = photo.videoUrl;
  } else {
    return null;
  }

  return video;
}

function waitForVideo(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('A video clip could not be loaded for export.')), 15000);
    video.addEventListener('loadeddata', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    video.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('A video clip could not be loaded for export.'));
    }, { once: true });
    video.load();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load frame image: ${src}`));
    image.src = src;
  });
}

function drawCrop(ctx, image, rect, filter, radius = 0) {
  const imageWidth = image?.videoWidth || image?.naturalWidth;
  const imageHeight = image?.videoHeight || image?.naturalHeight;
  if (!imageWidth || !imageHeight) return;

  ctx.save();
  ctx.beginPath();
  if (radius > 0) {
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.clip();

  const sourceRatio = imageWidth / imageHeight;
  const targetRatio = rect.w / rect.h;
  let drawW;
  let drawH;
  let drawX;
  let drawY;

  if (sourceRatio > targetRatio) {
    drawH = rect.h;
    drawW = rect.h * sourceRatio;
    drawX = rect.x - (drawW - rect.w) / 2;
    drawY = rect.y;
  } else {
    drawW = rect.w;
    drawH = rect.w / sourceRatio;
    drawX = rect.x;
    drawY = rect.y - (drawH - rect.h) / 2;
  }

  ctx.filter = filter || 'none';
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();
}

function drawStickers(ctx, stickers, width, height, scale) {
  stickers.forEach((sticker) => {
    ctx.save();
    ctx.translate((sticker.x / 100) * width, (sticker.y / 100) * height);
    ctx.rotate(((sticker.rotation || 0) * Math.PI) / 180);
    ctx.font = `${Math.round(sticker.size * 3.5 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.emoji || '✨', 0, 0);
    ctx.restore();
  });
}

function drawWatermark(ctx, session, width, height, padding, isDouble, scale) {
  const settings = session.watermarkSettings || {};
  const centerXs = isDouble ? [width * 0.25, width * 0.75] : [width * 0.5];
  const titleSize = Math.round((settings.customTextSize || 16) * 3.8 * scale);

  centerXs.forEach((centerX) => {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = settings.color || '#111827';
    ctx.font = `bold ${titleSize}px ${settings.fontFamily || 'sans-serif'}`;
    ctx.fillText(settings.title || '', centerX, height - padding - 90 * scale);

    if (settings.showDate && settings.subtitle) {
      ctx.font = `italic 500 ${Math.round(titleSize * 0.58)}px ${settings.fontFamily || 'sans-serif'}`;
      ctx.fillText(settings.subtitle, centerX, height - padding - 35 * scale);
    }
    ctx.restore();
  });
}

function drawFrame(ctx, session, media, frameImage, width, height, scale) {
  const layout = getLayoutById(session.layoutId);
  const frameSettings = session.frameSettings || {};
  const photos = session.photos || [];
  const count = Math.max(1, Math.min(12, Number(session.photoCount) || photos.length || layout.photoCount));
  const filter = getFilterById(session.selectedFilterId || 'normal')?.canvasFilter || 'none';

  if (frameSettings.gradient) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f43f5e');
    gradient.addColorStop(1, '#fb923c');
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = frameSettings.customColor || '#ffffff';
  }
  ctx.fillRect(0, 0, width, height);

  if (layout.customFrame) {
    const slots = getCustomFrameSlots(layout.customFrame, count);
    slots.forEach((slot, index) => {
      const source = media[index % media.length];
      drawCrop(ctx, source, {
        x: (slot.x - 3) * scale,
        y: (slot.y - 3) * scale,
        w: (slot.w + 6) * scale,
        h: (slot.h + 6) * scale,
      }, filter);
    });
    ctx.drawImage(frameImage, 0, 0, width, height);
    drawStickers(ctx, session.stickers || [], width, height, scale);
    return;
  }

  if (frameSettings.pattern === 'dots') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    const spacing = 80 * scale;
    for (let x = 20 * scale; x < width; x += spacing) {
      for (let y = 20 * scale; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const padding = (frameSettings.padding || 16) * 4 * scale;
  const gap = (frameSettings.borderWidth || 16) * 4 * scale;
  const cornerRadius = (frameSettings.cornerRadius || 8) * 4 * scale;
  const grid = getAdaptiveGrid(layout, count);
  const isDouble = Boolean(layout.gridConfig.isDoubleStrip);
  const watermarkHeight = (layout.id === 'polaroid' ? 700 : 380) * scale;
  const cellWidth = (width - padding * 2 - gap * (grid.columns - 1)) / grid.columns;
  const cellHeight = (height - padding * 2 - watermarkHeight - gap * (grid.rows - 1)) / grid.rows;

  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / grid.columns);
    const column = index % grid.columns;
    const source = media[index % media.length];
    drawCrop(ctx, source, {
      x: padding + column * (cellWidth + gap),
      y: padding + row * (cellHeight + gap),
      w: cellWidth,
      h: cellHeight,
    }, filter, cornerRadius);
  }

  if (isDouble) {
    ctx.save();
    ctx.setLineDash([20 * scale, 15 * scale]);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(width / 2, 40 * scale);
    ctx.lineTo(width / 2, height - 40 * scale);
    ctx.stroke();
    ctx.font = `${36 * scale}px sans-serif`;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('✂ CUT HERE', width / 2, 80 * scale);
    ctx.restore();
  }

  drawWatermark(ctx, session, width, height, padding, isDouble, scale);
  drawStickers(ctx, session.stickers || [], width, height, scale);
}

function getRecorderMimeType() {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
  const formats = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return formats.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export async function downloadVideoCollage(session) {
  if (!session?.photos?.some((photo) => photo.videoBlob || photo.videoUrl)) {
    throw new Error('This session has no video clips to export.');
  }
  if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) {
    throw new Error('Video collage export is not supported by this browser.');
  }

  const mimeType = getRecorderMimeType();
  if (!mimeType) throw new Error('No supported video format is available for export.');

  const layout = getLayoutById(session.layoutId);
  const scale = Math.min(1, 1080 / layout.width, 1920 / layout.height);
  const width = Math.round(layout.width * scale);
  const height = Math.round(layout.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare a canvas for video export.');

  const createdUrls = [];
  const sources = (session.photos || []).map((photo) => loadVideo(photo, createdUrls));
  const activeVideos = sources.filter(Boolean);
  let stream;
  let recorder;
  let animationFrame;
  let stopTimer;

  try {
    await Promise.all(activeVideos.map(waitForVideo));
    await Promise.all(activeVideos.map((video) => video.play()));
    const media = await Promise.all(sources.map(async (video, index) => {
      if (video) return video;
      const photo = session.photos[index];
      const source = photo.rawDataUrl || photo.dataUrl;
      return source ? loadImage(source) : null;
    }));
    const frameImage = layout.customFrame ? await loadImage(layout.customFrame.imageUrl) : null;
    const durationSeconds = Math.max(
      1,
      ...session.photos
        .filter((photo) => photo.videoBlob || photo.videoUrl)
        .map((photo) => photo.videoDurationSeconds || 5)
    );

    const renderFrame = () => drawFrame(ctx, session, media, frameImage, width, height, scale);
    renderFrame();
    stream = canvas.captureStream(30);
    recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    const recording = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = (event) => reject(event.error || new Error('Video collage recording failed.'));
      recorder.onstop = () => {
        if (chunks.length === 0) {
          reject(new Error('The browser did not produce a video collage.'));
          return;
        }
        resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
      };
    });

    const renderLoop = () => {
      renderFrame();
      animationFrame = requestAnimationFrame(renderLoop);
    };

    recorder.start(250);
    renderLoop();
    stopTimer = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, durationSeconds * 1000);
    const blob = await recording;
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `photobooth-video-collage-${session.id}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } finally {
    clearTimeout(stopTimer);
    cancelAnimationFrame(animationFrame);
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    activeVideos.forEach((video) => video.pause());
    createdUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}
