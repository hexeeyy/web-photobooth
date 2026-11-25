import { del, list } from '@vercel/blob';
import { SESSION_RETENTION_MS } from '../src/constants/sessionRetention.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured.');
    return response.status(500).json({ error: 'Session cleanup is not configured.' });
  }
  if (request.headers.authorization !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const cutoff = Date.now() - SESSION_RETENTION_MS;
    let cursor;
    let deletedCount = 0;

    do {
      const page = await list({ prefix: 'sessions/', limit: 1000, cursor });
      const expiredUrls = new Set(page.blobs
        .filter((blob) => (
          !blob.pathname.endsWith('/manifest.json')
          && blob.uploadedAt.getTime() <= cutoff
        ))
        .map((blob) => blob.url));
      const expiredManifests = [];

      for (const blob of page.blobs) {
        if (!blob.pathname.endsWith('/manifest.json')) continue;
        const manifestResponse = await fetch(blob.url);
        if (!manifestResponse.ok) {
          throw new Error(`Could not read a session manifest (${manifestResponse.status}).`);
        }
        const manifest = await manifestResponse.json();
        const expiresAt = Number(manifest.expiresAt)
          || (Number(manifest.createdAt) || blob.uploadedAt.getTime()) + SESSION_RETENTION_MS;
        if (expiresAt <= Date.now()) {
          expiredManifests.push(blob);
          if (manifest.packageUrl) expiredUrls.add(manifest.packageUrl);
          if (manifest.collageUrl) expiredUrls.add(manifest.collageUrl);
        }
      }

      if (expiredUrls.size) {
        await del(Array.from(expiredUrls));
        deletedCount += expiredUrls.size;
      }
      for (const blob of expiredManifests) {
        await del(blob.url, { ifMatch: blob.etag });
        deletedCount += 1;
      }

      cursor = page.hasMore ? page.cursor : undefined;
      if (page.hasMore && !cursor) {
        throw new Error('Blob cleanup pagination did not return a cursor.');
      }
    } while (cursor);

    return response.status(200).json({ deletedCount });
  } catch (error) {
    console.error('Expired session cleanup failed:', error);
    return response.status(500).json({ error: 'Could not clean up expired sessions.' });
  }
}
