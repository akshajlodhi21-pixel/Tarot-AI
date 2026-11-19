// ============================================================
// ARCANA — Admin Authentication & Lock Control (Netlify)
// Endpoint: POST /.netlify/functions/admin
// ============================================================

const {
  getLockState,
  setLockState,
  verifyAdminPin,
  createAdminToken,
  verifyAdminToken
} = require('./_lock_store');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

const failedAttempts = new Map();
const ATTEMPT_WINDOW = 60_000;
const MAX_ATTEMPTS = 5;

function isLoginRateLimited(ip) {
  const now = Date.now();
  const rec = failedAttempts.get(ip);
  if (!rec || now - rec.start > ATTEMPT_WINDOW) return false;
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  let rec = failedAttempts.get(ip);
  if (!rec || now - rec.start > ATTEMPT_WINDOW) rec = { start: now, count: 1 };
  else rec.count++;
  failedAttempts.set(ip, rec);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const clientIP =
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    event.headers['client-ip'] ||
    'unknown';

  if (event.httpMethod === 'GET') {
    const state = await getLockState();
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locked: !!state.locked,
        autoLockMinutes: Number(state.autoLockMinutes) || 0
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body.' })
    };
  }

  const { action, pin, token, autoLockMinutes } = body;

  if (action === 'unlock') {
    if (isLoginRateLimited(clientIP)) {
      return {
        statusCode: 429,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Too many failed unlock attempts. Please wait 1 minute before trying again.',
          code: 'RATE_LIMIT'
        })
      };
    }

    const isValid = verifyAdminPin(pin);
    if (!isValid) {
      recordFailedAttempt(clientIP);
      await new Promise((r) => setTimeout(r, 600));
      return {
        statusCode: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Incorrect Admin PIN. Please verify your credentials.',
          code: 'INVALID_PIN'
        })
      };
    }

    failedAttempts.delete(clientIP);
    const updated = await setLockState({ locked: false });
    const adminToken = createAdminToken();

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        locked: false,
        autoLockMinutes: updated.autoLockMinutes,
        token: adminToken,
        message: 'ARCANA successfully unlocked for Judge Session.'
      })
    };
  }

  if (action === 'lock') {
    const isTokenValid = verifyAdminToken(token);
    const isPinValid = pin ? verifyAdminPin(pin) : false;

    if (!isTokenValid && !isPinValid) {
      return {
        statusCode: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Unauthorized. Admin credentials required to lock application.',
          code: 'UNAUTHORIZED'
        })
      };
    }

    const updated = await setLockState({ locked: true });
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        locked: true,
        autoLockMinutes: updated.autoLockMinutes,
        message: 'ARCANA has been locked.'
      })
    };
  }

  if (action === 'set-timeout') {
    const isTokenValid = verifyAdminToken(token);
    if (!isTokenValid) {
      return {
        statusCode: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Unauthorized. Admin session required.',
          code: 'UNAUTHORIZED'
        })
      };
    }

    const minutes = Math.max(0, Math.min(120, Number(autoLockMinutes) || 0));
    const updated = await setLockState({ autoLockMinutes: minutes });

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        autoLockMinutes: updated.autoLockMinutes,
        message: minutes === 0 ? 'Inactivity auto-lock disabled.' : `Auto-lock set to ${minutes} minutes.`
      })
    };
  }

  if (action === 'verify-token') {
    const isValid = verifyAdminToken(token);
    const state = await getLockState();
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valid: isValid,
        locked: !!state.locked,
        autoLockMinutes: state.autoLockMinutes
      })
    };
  }

  return {
    statusCode: 400,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: `Unknown action '${action}'.` })
  };
};
