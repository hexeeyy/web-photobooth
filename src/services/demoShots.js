// Generate rich demo photos and 5s video clips for testing or when camera is restricted
export async function generateDemoShots(count = 4) {
  const poses = [
    { title: '✌️ Peace & Smiles', gradient: ['#f43f5e', '#ec4899'], emoji: '✌️', subtitle: 'Shot 1' },
    { title: '🕶️ Cool Vibe', gradient: ['#3b82f6', '#06b6d4'], emoji: '🕶️', subtitle: 'Shot 2' },
    { title: '💖 Party Queen', gradient: ['#8b5cf6', '#d946ef'], emoji: '💖', subtitle: 'Shot 3' },
    { title: '🎉 Confetti Magic', gradient: ['#f59e0b', '#ef4444'], emoji: '🎉', subtitle: 'Shot 4' },
    { title: '👑 Royalty', gradient: ['#10b981', '#06b6d4'], emoji: '👑', subtitle: 'Shot 5' },
    { title: '🥂 Cheers', gradient: ['#6366f1', '#a855f7'], emoji: '🥂', subtitle: 'Shot 6' },
  ];

  const results = [];

  for (let i = 0; i < count; i++) {
    const pose = poses[i % poses.length];
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');

    // Draw base still photo
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, pose.gradient[0]);
    grad.addColorStop(1, pose.gradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative floating particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let p = 0; p < 30; p++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 20 + 5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Main pose emoji
    ctx.font = '160px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pose.emoji, canvas.width / 2, canvas.height / 2 - 40);

    // Pose title & badge
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pose.title, canvas.width / 2, canvas.height / 2 + 120);

    ctx.font = '600 24px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Photobooth Pose #${i + 1}`, canvas.width / 2, canvas.height / 2 + 170);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Generate 5-second video clip using Canvas Stream & MediaRecorder
    let videoBlob = null;
    let videoUrl = null;
    let videoUrlCopy = null;

    if (canvas.captureStream && window.MediaRecorder) {
      try {
        const stream = canvas.captureStream(30);
        const playbackProbe = document.createElement('video');
        const types = [
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=vp8',
          'video/webm;codecs=vp9',
          'video/webm',
        ];
        const mime = types.find((type) =>
          MediaRecorder.isTypeSupported?.(type) && playbackProbe.canPlayType(type)
        );
        if (!mime) throw new Error('No video format is supported for both recording and playback.');

        const recorder = new MediaRecorder(stream, { mimeType: mime });
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const recordPromise = new Promise((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || mime });
            resolve(blob);
          };
        });

        recorder.start();

        // Animate canvas for 2 seconds (quick synthetic motion)
        let frameCount = 0;
        const animInterval = setInterval(() => {
          frameCount++;
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Moving sparkle effect
          const offsetY = Math.sin(frameCount * 0.1) * 20;
          ctx.font = '160px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pose.emoji, canvas.width / 2, canvas.height / 2 - 40 + offsetY);

          ctx.font = 'bold 36px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(pose.title, canvas.width / 2, canvas.height / 2 + 120);

          if (frameCount >= 40) {
            clearInterval(animInterval);
            if (recorder.state !== 'inactive') recorder.stop();
          }
        }, 50);

        videoBlob = await recordPromise;
        videoUrl = URL.createObjectURL(videoBlob);
        try {
          videoUrlCopy = URL.createObjectURL(videoBlob.slice(0));
        } catch (e) {
          videoUrlCopy = videoUrl;
        }
      } catch (err) {
        console.warn('Synthetic video creation skipped', err);
      }
    }

    results.push({
      id: `demo-shot-${Date.now()}-${i + 1}`,
      dataUrl,
      rawDataUrl: dataUrl,
      videoBlob,
      videoUrl,
      videoUrlCopy: videoUrlCopy || videoUrl,
      filterId: 'normal',
      timestamp: Date.now(),
    });
  }

  return results;
}
