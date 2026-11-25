// Temporary IndexedDB storage with optional server sync.
import { SESSION_RETENTION_MS } from '../constants/sessionRetention.js';

const DB_NAME = 'WebPhotoboothDB';
const DB_VERSION = 2;
const STORE_SESSIONS = 'sessions';

function isExpiredSession(session) {
  const expiresAt = Number(session.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > 0) return expiresAt <= Date.now();
  const createdAt = Number(session.createdAt);
  return !createdAt || createdAt + SESSION_RETENTION_MS <= Date.now();
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const store = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('favorite', 'favorite', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLocalSession(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_SESSIONS, 'readonly').objectStore(STORE_SESSIONS).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function pruneExpiredLocalSessions() {
  const db = await openDB();
  const cutoff = Date.now() - SESSION_RETENTION_MS;

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORE_SESSIONS);
    const request = store.index('createdAt').openKeyCursor(IDBKeyRange.upperBound(cutoff));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Convert Blob to Base64 for JSON serialization if needed
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Rehydrate video Blob URLs that may have been revoked across sessions
export function rehydrateSession(session) {
  if (!session || !session.photos) return session;
  session.photos = session.photos.map((p) => {
    let videoUrl = p.videoUrl;
    let videoUrlCopy = p.videoUrlCopy;
    if (p.videoBlob) {
      try {
        videoUrl = URL.createObjectURL(p.videoBlob);
        videoUrlCopy = URL.createObjectURL(p.videoBlob.slice(0));
      } catch (e) {}
    }
    return {
      ...p,
      videoUrl: videoUrl || p.videoUrl,
      videoUrlCopy: videoUrlCopy || videoUrl || p.videoUrl
    };
  });
  return session;
}

export async function saveSession(session) {
  // 1. Save in local IndexedDB (with raw video Blobs)
  try {
    const previous = await getLocalSession(session.id).catch(() => null);
    const storedSession = {
      ...previous,
      ...session,
      createdAt: previous?.createdAt || session.createdAt || Date.now(),
      ownerToken: session.ownerToken || previous?.ownerToken,
      packageUrl: session.packageUrl || previous?.packageUrl,
      collageUrl: session.collageUrl || previous?.collageUrl,
    };
    const savedSession = { ...storedSession, updatedAt: Date.now() };
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.put(savedSession);
      req.onsuccess = () => resolve(session);
      req.onerror = () => reject(req.error);
    });
    session = savedSession;
  } catch (err) {
    console.warn('Local IndexedDB write error:', err);
    throw err;
  }

  // 2. Sync to the optional local server during development
  if (!import.meta.env.PROD) {
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...session,
          photos: (session.photos || []).map((photo) => ({
            id: photo.id,
            dataUrl: photo.dataUrl,
            filterId: photo.filterId,
            timestamp: photo.timestamp,
            hasVideo: Boolean(photo.videoBlob || photo.videoUrl),
          })),
        }),
      }).catch(() => {});
    } catch (e) {
      console.error('Local session sync failed:', e);
    }
  }

  return session;
}

export async function publishSession(session) {
  if (!import.meta.env.PROD) return session;
  if (!session.collageDataUrl) throw new Error('The photo collage is not ready to share yet.');

  const [{ upload }, { createSessionArchive }] = await Promise.all([
    import('@vercel/blob/client'),
    import('./sessionArchive'),
  ]);
  const existing = await getLocalSession(session.id);
  const ownerToken = existing?.ownerToken || crypto.randomUUID();
  const manifest = {
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
      hasVideo: Boolean(photo.videoBlob || photo.videoUrl),
    })),
  };

  const saveManifest = async (value) => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerToken, manifest: value }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Session upload failed (${response.status}).`);
    }
    return response.json();
  };

  await saveManifest(manifest);
  await saveSession({ ...session, ownerToken });

  const archive = await createSessionArchive(session);
  const collageBlob = await (await fetch(session.collageDataUrl)).blob();
  const clientPayload = JSON.stringify({ sessionId: session.id, ownerToken });
  const uploadOptions = {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    clientPayload,
  };

  const [packageBlob, collage] = await Promise.all([
    upload(`sessions/${session.id}/package.zip`, archive, {
      ...uploadOptions,
      contentType: 'application/zip',
      multipart: archive.size > 5 * 1024 * 1024,
    }),
    upload(`sessions/${session.id}/collage.jpg`, collageBlob, {
      ...uploadOptions,
      contentType: 'image/jpeg',
    }),
  ]);

  const publishedManifest = {
    ...manifest,
    packageUrl: packageBlob.url,
    collageUrl: collage.url,
  };
  const savedManifest = await saveManifest(publishedManifest);

  const publishedSession = {
    ...session,
    ownerToken,
    ...publishedManifest,
    expiresAt: savedManifest.expiresAt,
    collageDataUrl: collage.url,
  };
  await saveSession(publishedSession);
  return publishedSession;
}

export async function getAllSessions() {
  try {
    await pruneExpiredLocalSessions();
  } catch (error) {
    console.warn('Expired local session cleanup failed:', error);
  }

  // First try server API for cross-device sessions
  try {
    const res = await fetch('/api/sessions');
    if (res.ok) {
      const serverSessions = await res.json();
      if (Array.isArray(serverSessions) && serverSessions.length > 0) {
        const activeServerSessions = serverSessions.filter((session) => !isExpiredSession(session));
        // Also merge with local DB
        try {
          const db = await openDB();
          const localReq = db.transaction(STORE_SESSIONS, 'readonly').objectStore(STORE_SESSIONS).getAll();
          const localSessions = await new Promise((res) => {
            localReq.onsuccess = () => res(localReq.result || []);
            localReq.onerror = () => res([]);
          });

          // Merge by ID
          const map = new Map();
          localSessions.forEach((s) => map.set(s.id, s));
          activeServerSessions.forEach((s) => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          const merged = Array.from(map.values());
          merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return merged;
        } catch (e) {
          return activeServerSessions;
        }
      }
    }
  } catch (e) {
    // API unavailable, proceed to IndexedDB
  }

  // Fallback to IndexedDB
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result || []).filter((session) => !isExpiredSession(session));
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results.map(rehydrateSession));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

export async function getSession(id) {
  // Check local IndexedDB first
  try {
    await pruneExpiredLocalSessions();
  } catch (error) {
    console.warn('Expired local session cleanup failed:', error);
  }
  try {
    const local = await getLocalSession(id);
    if (local && !isExpiredSession(local)) return rehydrateSession(local);
  } catch (error) {
    console.warn('Local session lookup failed:', error);
  }

  const endpoint = import.meta.env.PROD
    ? `/api/sessions?id=${encodeURIComponent(id)}`
    : `/api/sessions/${encodeURIComponent(id)}`;
  const response = await fetch(endpoint);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Session lookup failed (${response.status}).`);

  const data = await response.json();
  if (!data.packageUrl) return rehydrateSession(data);
  const { hydratePublishedSession } = await import('./sessionArchive');
  return hydratePublishedSession(data);
}

export async function deleteSession(id) {
  let local = null;
  try {
    local = await getLocalSession(id);
  } catch (e) {}

  // Delete from local DB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    tx.objectStore(STORE_SESSIONS).delete(id);
  } catch (e) {}

  // Delete from server
  try {
    if (import.meta.env.PROD) {
      if (local?.ownerToken) {
        await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerToken: local.ownerToken }),
        });
      }
    } else {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    }
  } catch (e) {}

  return true;
}

export async function toggleFavorite(id) {
  const session = await getSession(id);
  if (!session) return null;
  session.favorite = !session.favorite;
  await saveSession(session);
  return session;
}

export function getShareableUrl(sessionId) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?session=${encodeURIComponent(sessionId)}`;
}
