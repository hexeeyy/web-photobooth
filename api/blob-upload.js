import { handleUpload } from '@vercel/blob/client';
import { getStoredManifest, isValidSessionId, ownerTokenMatches } from '../src/server/blobSessions.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload || '{}');
        const { sessionId, ownerToken } = payload;
        const isPackage = pathname === `sessions/${sessionId}/package.zip`;
        const isCollage = pathname === `sessions/${sessionId}/collage.jpg`;
        if (!isValidSessionId(sessionId) || (!isPackage && !isCollage)) {
          throw new Error('Invalid upload path.');
        }

        const stored = await getStoredManifest(sessionId);
        if (!stored || !ownerTokenMatches(ownerToken, stored.manifest.ownerTokenHash)) {
          throw new Error('You do not own this shared session.');
        }

        return {
          allowedContentTypes: isPackage ? ['application/zip'] : ['image/jpeg'],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return response.status(200).json(result);
  } catch (error) {
    console.error('Blob upload authorization error:', error);
    return response.status(400).json({ error: 'Could not authorize this upload.' });
  }
}
