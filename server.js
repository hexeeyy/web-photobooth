// Lightweight local network server for cross-device photobooth sharing
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SESSION_RETENTION_MS } from './src/constants/sessionRetention.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
}

function readSessions() {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const sessions = JSON.parse(raw);
    const cutoff = Date.now() - SESSION_RETENTION_MS;
    const activeSessions = sessions.filter((session) => Number(session.createdAt) > cutoff);
    if (activeSessions.length !== sessions.length) writeSessions(activeSessions);
    return activeSessions;
  } catch (e) {
    return [];
  }
}

function writeSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

readSessions();
setInterval(readSessions, 60 * 60 * 1000);

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // API Routes
  if (url.pathname === '/api/sessions' && req.method === 'GET') {
    const sessions = readSessions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessions));
    return;
  }

  if (url.pathname.startsWith('/api/sessions/') && req.method === 'GET') {
    const id = url.pathname.replace('/api/sessions/', '');
    const sessions = readSessions();
    const session = sessions.find((s) => s.id === id);
    if (session) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
    }
    return;
  }

  if (url.pathname === '/api/sessions' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const newSession = JSON.parse(body);
        const sessions = readSessions();
        const index = sessions.findIndex((s) => s.id === newSession.id);
        if (index >= 0) {
          sessions[index] = { ...sessions[index], ...newSession, updatedAt: Date.now() };
        } else {
          sessions.unshift({ ...newSession, createdAt: Date.now() });
        }
        writeSessions(sessions);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: newSession.id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/sessions/') && req.method === 'DELETE') {
    const id = url.pathname.replace('/api/sessions/', '');
    let sessions = readSessions();
    sessions = sessions.filter((s) => s.id !== id);
    writeSessions(sessions);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Fallback
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Photobooth Sync Server running at http://0.0.0.0:${PORT}`);
});
