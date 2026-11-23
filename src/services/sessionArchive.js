import JSZip from 'jszip';

function getVideoExtension(photo) {
  return photo.videoBlob?.type.includes('mp4') ? 'mp4' : 'webm';
}

function getSessionMetadata(session) {
  return {
    id: session.id,
    createdAt: session.createdAt,
    layoutId: session.layoutId,
    selectedFilterId: session.selectedFilterId,
    frameSettings: session.frameSettings,
    watermarkSettings: session.watermarkSettings,
    stickers: session.stickers || [],
    favorite: Boolean(session.favorite),
    photos: (session.photos || []).map((photo) => ({
      id: photo.id,
      filterId: photo.filterId,
      timestamp: photo.timestamp,
      hasRawPhoto: Boolean(photo.rawDataUrl),
      hasVideo: Boolean(photo.videoBlob),
      videoType: photo.videoBlob?.type || '',
      videoExtension: getVideoExtension(photo),
    })),
  };
}

async function addImage(zip, pathname, source) {
  if (!source) return;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not add ${pathname} to the session package.`);
  zip.file(pathname, await response.blob());
}

export async function createSessionArchive(session) {
  const zip = new JSZip();

  await addImage(zip, 'collage.jpg', session.collageDataUrl);

  for (const [index, photo] of (session.photos || []).entries()) {
    await addImage(zip, `photos/photo-${index + 1}.jpg`, photo.dataUrl);
    await addImage(zip, `photos/raw-photo-${index + 1}.jpg`, photo.rawDataUrl);
    if (photo.videoBlob) {
      zip.file(`videos/clip-5s-shot-${index + 1}.${getVideoExtension(photo)}`, photo.videoBlob);
    }
  }

  zip.file('session.json', JSON.stringify(getSessionMetadata(session), null, 2));
  return zip.generateAsync({ type: 'blob' });
}

export async function hydratePublishedSession(manifest) {
  const response = await fetch(manifest.packageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download session files (${response.status}).`);
  }

  const zip = await JSZip.loadAsync(await response.blob());
  const metadataFile = zip.file('session.json');
  if (!metadataFile) throw new Error('The shared session package is missing its metadata.');

  const metadata = JSON.parse(await metadataFile.async('string'));
  const collageFile = zip.file('collage.jpg');
  const collageDataUrl = manifest.collageUrl || (collageFile
    ? `data:image/jpeg;base64,${await collageFile.async('base64')}`
    : null);

  const photos = await Promise.all((metadata.photos || []).map(async (photo, index) => {
    const dataFile = zip.file(`photos/photo-${index + 1}.jpg`);
    const rawFile = zip.file(`photos/raw-photo-${index + 1}.jpg`);
    const videoFile = zip.file(`videos/clip-5s-shot-${index + 1}.${photo.videoExtension}`);
    const dataUrl = dataFile
      ? `data:image/jpeg;base64,${await dataFile.async('base64')}`
      : null;
    const rawDataUrl = rawFile
      ? `data:image/jpeg;base64,${await rawFile.async('base64')}`
      : dataUrl;
    const videoBlob = videoFile
      ? new Blob([await videoFile.async('arraybuffer')], { type: photo.videoType || 'video/webm' })
      : null;
    const videoUrl = videoBlob ? URL.createObjectURL(videoBlob) : null;

    return {
      ...photo,
      dataUrl,
      rawDataUrl,
      videoBlob,
      videoUrl,
      videoUrlCopy: videoBlob ? URL.createObjectURL(videoBlob.slice(0)) : null,
    };
  }));

  return {
    ...manifest,
    ...metadata,
    collageDataUrl,
    photos,
  };
}
