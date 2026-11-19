// ============================================================
// ARCANA — Public Lock Status Endpoint
// Endpoint: GET /api/lock-status
// Returns current persistent lock status and configuration
// ============================================================

const { getLockState } = require('./_lock_store');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const state = await getLockState();
    return res.status(200).json({
      locked: !!state.locked,
      autoLockMinutes: Number(state.autoLockMinutes) || 0,
      updatedAt: state.updatedAt || Date.now()
    });
  } catch (err) {
    console.error('Error fetching lock status:', err.message || err);
    return res.status(200).json({
      locked: true,
      autoLockMinutes: 0,
      updatedAt: Date.now()
    });
  }
};
