// ============================================================
// ARCANA — Admin Authentication & Lock Control Endpoint
// Endpoint: POST /api/admin
// Secure master controls for Judge Mode
// ============================================================

const {
  getLockState,
  setLockState,
  verifyAdminPin,
  createAdminToken,
  verifyAdminToken
} = require('./_lock_store');

// In-memory brute force rate limiter for failed admin login attempts
const failedAttempts = new Map();
const ATTEMPT_WINDOW = 60_000; // 1 minute
const MAX_ATTEMPTS = 5;

function isLoginRateLimited(ip) {
  const now = Date.now();
  const rec = failedAttempts.get(ip);
  if (!rec || now - rec.start > ATTEMPT_WINDOW) {
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  let rec = failedAttempts.get(ip);
  if (!rec || now - rec.start > ATTEMPT_WINDOW) {
    rec = { start: now, count: 1 };
  } else {
    rec.count++;
  }
  failedAttempts.set(ip, rec);
}

function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const clientIP =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (req.method === 'GET') {
    const state = await getLockState();
    return res.status(200).json({
      locked: !!state.locked,
      autoLockMinutes: Number(state.autoLockMinutes) || 0
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
  }

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const { action, pin, token, autoLockMinutes } = body;

  // ── ACTION: UNLOCK ──────────────────────────────────────────
  if (action === 'unlock') {
    if (isLoginRateLimited(clientIP)) {
      return res.status(429).json({
        success: false,
        error: 'Too many failed unlock attempts. Please wait 1 minute before trying again.',
        code: 'RATE_LIMIT'
      });
    }

    const isValid = verifyAdminPin(pin);
    if (!isValid) {
      recordFailedAttempt(clientIP);
      // Safe delay to mitigate brute force timing
      await new Promise((r) => setTimeout(r, 600));
      return res.status(401).json({
        success: false,
        error: 'Incorrect Admin PIN. Please verify your credentials.',
        code: 'INVALID_PIN'
      });
    }

    clearFailedAttempts(clientIP);
    const updated = await setLockState({ locked: false });
    const adminToken = createAdminToken();

    return res.status(200).json({
      success: true,
      locked: false,
      autoLockMinutes: updated.autoLockMinutes,
      token: adminToken,
      message: 'ARCANA successfully unlocked for Judge Session.'
    });
  }

  // ── ACTION: LOCK ────────────────────────────────────────────
  if (action === 'lock') {
    // Require valid admin token OR master PIN to lock
    const isTokenValid = verifyAdminToken(token);
    const isPinValid = pin ? verifyAdminPin(pin) : false;

    if (!isTokenValid && !isPinValid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Admin credentials required to lock application.',
        code: 'UNAUTHORIZED'
      });
    }

    const updated = await setLockState({ locked: true });
    return res.status(200).json({
      success: true,
      locked: true,
      autoLockMinutes: updated.autoLockMinutes,
      message: 'ARCANA has been locked.'
    });
  }

  // ── ACTION: SET TIMEOUT ─────────────────────────────────────
  if (action === 'set-timeout') {
    const isTokenValid = verifyAdminToken(token);
    if (!isTokenValid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Admin session required.',
        code: 'UNAUTHORIZED'
      });
    }

    const minutes = Math.max(0, Math.min(120, Number(autoLockMinutes) || 0));
    const updated = await setLockState({ autoLockMinutes: minutes });

    return res.status(200).json({
      success: true,
      autoLockMinutes: updated.autoLockMinutes,
      message: minutes === 0 ? 'Inactivity auto-lock disabled.' : `Auto-lock set to ${minutes} minutes.`
    });
  }

  // ── ACTION: VERIFY TOKEN ────────────────────────────────────
  if (action === 'verify-token') {
    const isValid = verifyAdminToken(token);
    const state = await getLockState();
    return res.status(200).json({
      valid: isValid,
      locked: !!state.locked,
      autoLockMinutes: state.autoLockMinutes
    });
  }

  return res.status(400).json({ error: `Unknown action '${action}'.` });
};
