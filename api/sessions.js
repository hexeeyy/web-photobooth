import { del, put } from '@vercel/blob';
import {
  getStoredManifest,
  hashOwnerToken,
  isValidSessionId,
  ownerTokenMatches,
  toPublicManifest,
} from '../src/server/blobSessions.js';

function sendError(response, status, message) {
  response.status(status).json({ error: message });
}

function isOwnedBlobUrl(value, id, prefix) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname.endsWith('.public.blob.vercel-storage.com')
      && url.pathname.includes(`/sessions/${id}/${prefix}`);
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const { id } = request.query;
      if (!id) {
        return response.status(200).json([]);
      }
      if (!isValidSessionId(id)) return sendError(response, 400, 'Invalid session ID.');

      const stored = await getStoredManifest(id);
      if (!stored) return sendError(response, 404, 'Session not found.');
      return response.status(200).json(toPublicManifest(stored.manifest));
    }

    if (request.method === 'POST') {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      const { ownerToken } = body || {};
      const manifestData = body?.manifest;
      const id = manifestData?.id;

      if (!isValidSessionId(id) || typeof ownerToken !== 'string' || ownerToken.length < 32) {
        return sendError(response, 400, 'Invalid session or owner token.');
      }

      const existing = await getStoredManifest(id);
      if (existing && !ownerTokenMatches(ownerToken, existing.manifest.ownerTokenHash)) {
        return sendError(response, 403, 'You do not own this shared session.');
      }

      const previous = existing?.manifest || {};
      const packageUrl = manifestData.packageUrl ?? previous.packageUrl ?? null;
      const collageUrl = manifestData.collageUrl ?? previous.collageUrl ?? null;
      if (packageUrl && !isOwnedBlobUrl(packageUrl, id, 'package-')) {
        return sendError(response, 400, 'Invalid session package URL.');
      }
      if (collageUrl && !isOwnedBlobUrl(collageUrl, id, 'collage-')) {
        return sendError(response, 400, 'Invalid collage URL.');
      }

      const manifest = {
        ...previous,
        id,
        createdAt: Number(manifestData.createdAt) || previous.createdAt || Date.now(),
        layoutId: String(manifestData.layoutId || previous.layoutId || 'strip-4'),
        selectedFilterId: String(manifestData.selectedFilterId || previous.selectedFilterId || 'normal'),
        frameSettings: manifestData.frameSettings || previous.frameSettings || null,
        watermarkSettings: manifestData.watermarkSettings || previous.watermarkSettings || null,
        stickers: Array.isArray(manifestData.stickers) ? manifestData.stickers : previous.stickers || [],
        photos: Array.isArray(manifestData.photos)
          ? manifestData.photos.map((photo) => ({
              id: String(photo.id || ''),
              filterId: String(photo.filterId || 'normal'),
              timestamp: Number(photo.timestamp) || 0,
              hasVideo: Boolean(photo.hasVideo),
            }))
          : previous.photos || [],
        favorite: Boolean(manifestData.favorite ?? previous.favorite),
        packageUrl,
        collageUrl,
        ownerTokenHash: existing?.manifest.ownerTokenHash || hashOwnerToken(ownerToken),
      };

      await put(`sessions/${id}/manifest.json`, JSON.stringify(manifest), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
      });

      const obsoleteUrls = [
        previous.packageUrl !== packageUrl ? previous.packageUrl : null,
        previous.collageUrl !== collageUrl ? previous.collageUrl : null,
      ].filter(Boolean);
      if (obsoleteUrls.length) await del(obsoleteUrls);

      return response.status(200).json(toPublicManifest(manifest));
    }

    if (request.method === 'DELETE') {
      const { id } = request.query;
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      const { ownerToken } = body || {};
      if (!isValidSessionId(id) || typeof ownerToken !== 'string') {
        return sendError(response, 400, 'Invalid session ID or owner token.');
      }

      const stored = await getStoredManifest(id);
      if (!stored) return sendError(response, 404, 'Session not found.');
      if (!ownerTokenMatches(ownerToken, stored.manifest.ownerTokenHash)) {
        return sendError(response, 403, 'You do not own this shared session.');
      }

      await del([stored.blob.url, stored.manifest.packageUrl, stored.manifest.collageUrl].filter(Boolean));
      return response.status(200).json({ success: true });
    }

    response.setHeader('Allow', 'GET, POST, DELETE');
    return sendError(response, 405, 'Method not allowed.');
  } catch (error) {
    console.error('Session API error:', error);
    return sendError(response, 500, 'Could not process the shared session.');
  }
}
