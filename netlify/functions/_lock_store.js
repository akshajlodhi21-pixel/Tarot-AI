// ============================================================
// ARCANA — Persistent Lock & Admin Authentication Store (Netlify)
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_FILE = path.join('/tmp', 'arcana_lock_state.json');
const TOPIC_NAME = 'arcana_judge_lock_28c035a5';
const SYNC_URL = `https://ntfy.sh/${TOPIC_NAME}`;

let memoryState = {
  locked: true,
  autoLockMinutes: 0,
  updatedAt: Date.now()
};
let lastSyncTime = 0;
const CACHE_TTL = 3000;

try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.locked === 'boolean') {
      memoryState = { ...memoryState, ...parsed };
    }
  }
} catch {}

async function getLockState() {
  const now = Date.now();
  if (now - lastSyncTime < CACHE_TTL) {
    return memoryState;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${SYNC_URL}/json?poll=1`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ArcanaTarotAI/1.0' }
    });
    clearTimeout(timer);

    if (resp.ok) {
      const text = await resp.text();
      const lines = text.trim().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const item = JSON.parse(lines[i]);
          let data = item.message;
          if (typeof data === 'string' && data.startsWith('{')) {
            data = JSON.parse(data);
          }
          if (data && typeof data.locked === 'boolean') {
            if (!memoryState.updatedAt || !data.updatedAt || data.updatedAt >= memoryState.updatedAt) {
              memoryState = {
                locked: data.locked,
                autoLockMinutes: Number(data.autoLockMinutes) || 0,
                updatedAt: data.updatedAt || Date.now()
              };
              try { fs.writeFileSync(STATE_FILE, JSON.stringify(memoryState)); } catch {}
            }
            break;
          }
        } catch {}
      }
    }
  } catch {}

  lastSyncTime = Date.now();
  return memoryState;
}

async function setLockState(newState) {
  memoryState = {
    ...memoryState,
    ...newState,
    updatedAt: Date.now()
  };

  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(memoryState));
  } catch {}

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    await fetch(SYNC_URL, {
      method: 'POST',
      body: JSON.stringify(memoryState),
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });
    clearTimeout(timer);
  } catch {}

  lastSyncTime = Date.now();
  return memoryState;
}

function verifyAdminPin(inputPin) {
  const expectedPin = String(process.env.ADMIN_PIN || process.env.ADMIN_PASSWORD || '9198').trim();
  const given = String(inputPin || '').trim();
  if (!given) return false;

  const bufA = Buffer.from(given);
  const bufB = Buffer.from(expectedPin);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminToken() {
  const secret = process.env.ADMIN_SECRET || 'arcana_tarot_judge_mode_2026';
  const payload = JSON.stringify({
    admin: true,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000
  });
  const b64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${hmac}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [b64, hmac] = parts;
  const secret = process.env.ADMIN_SECRET || 'arcana_tarot_judge_mode_2026';
  const expected = crypto.createHmac('sha256', secret).update(b64).digest('base64url');

  if (hmac !== expected) return false;

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!payload.admin || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getLockState,
  setLockState,
  verifyAdminPin,
  createAdminToken,
  verifyAdminToken
};
