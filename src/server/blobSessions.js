import { list } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';

export const isValidSessionId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(id);

export function hashOwnerToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function ownerTokenMatches(token, tokenHash) {
  if (typeof token !== 'string' || typeof tokenHash !== 'string') return false;
  const supplied = Buffer.from(hashOwnerToken(token), 'hex');
  const expected = Buffer.from(tokenHash, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function getStoredManifest(id) {
  const pathname = `sessions/${id}/manifest.json`;
  const { blobs } = await list({ prefix: pathname, limit: 10 });
  const blob = blobs.find((item) => item.pathname === pathname);
  if (!blob) return null;

  const response = await fetch(blob.url);
  if (!response.ok) throw new Error(`Could not read the session manifest (${response.status}).`);
  return { blob, manifest: await response.json() };
}

export function toPublicManifest(manifest) {
  const publicManifest = { ...manifest };
  delete publicManifest.ownerTokenHash;
  return {
    ...publicManifest,
    collageDataUrl: manifest.collageUrl || null,
  };
}

