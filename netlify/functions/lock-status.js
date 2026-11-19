// ============================================================
// ARCANA — Public Lock Status (Netlify)
// Endpoint: GET /.netlify/functions/lock-status
// ============================================================

const { getLockState } = require('./_lock_store');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
    };
  }

  try {
    const state = await getLockState();
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locked: !!state.locked,
        autoLockMinutes: Number(state.autoLockMinutes) || 0,
        updatedAt: state.updatedAt || Date.now()
      })
    };
  } catch {
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locked: true,
        autoLockMinutes: 0,
        updatedAt: Date.now()
      })
    };
  }
};
