// ============================================================
// ARCANA — Backend Unit Tests
// Run: node tests/backend.test.js
// ============================================================

const { handler } = require('../netlify/functions/reading');

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition) {
  if (condition) {
    passed++;
    results.push(`  ✓ ${name}`);
  } else {
    failed++;
    results.push(`  ✗ ${name}`);
  }
}

// Helper to build a mock Netlify event
function mockEvent(overrides = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.' + Math.floor(Math.random() * 255),
      ...overrides.headers,
    },
    body: overrides.body !== undefined
      ? (typeof overrides.body === 'string' ? overrides.body : JSON.stringify(overrides.body))
      : JSON.stringify({
          image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          question: 'What does the future hold?',
          spread: 'general',
        }),
    ...(overrides.httpMethod ? { httpMethod: overrides.httpMethod } : {}),
  };
}

async function runTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ARCANA — Backend Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 1. Method validation ──────────────────────────────
  console.log('  HTTP Method Validation');

  const getRes = await handler(mockEvent({ httpMethod: 'GET' }));
  assert('GET request returns 405', getRes.statusCode === 405);

  const putRes = await handler(mockEvent({ httpMethod: 'PUT' }));
  assert('PUT request returns 405', putRes.statusCode === 405);

  const deleteRes = await handler(mockEvent({ httpMethod: 'DELETE' }));
  assert('DELETE request returns 405', deleteRes.statusCode === 405);

  const optRes = await handler(mockEvent({ httpMethod: 'OPTIONS' }));
  assert('OPTIONS request returns 204 (preflight)', optRes.statusCode === 204);

  // ── 2. Body validation ────────────────────────────────
  console.log('\n  Request Body Validation');

  const noBody = await handler(mockEvent({ body: '{}' }));
  assert('Missing image returns 400', noBody.statusCode === 400);
  const noBodyData = JSON.parse(noBody.body);
  assert('Missing image has error message', noBodyData.error && noBodyData.error.includes('image'));

  const invalidJson = await handler(mockEvent({ body: 'not json!!' }));
  assert('Invalid JSON returns 400', invalidJson.statusCode === 400);

  // ── 3. MIME validation ────────────────────────────────
  console.log('\n  MIME Type Validation');

  const gifRes = await handler(mockEvent({
    body: { image: 'data:image/gif;base64,R0lGODlh', question: '', spread: 'general' },
  }));
  assert('GIF image returns 400', gifRes.statusCode === 400);
  const gifData = JSON.parse(gifRes.body);
  assert('GIF error mentions unsupported type', gifData.error && gifData.error.includes('Unsupported'));

  const svgRes = await handler(mockEvent({
    body: { image: 'data:image/svg+xml;base64,PHN2Zz4=', question: '', spread: 'general' },
  }));
  assert('SVG image returns 400', svgRes.statusCode === 400);

  const badUrlRes = await handler(mockEvent({
    body: { image: 'not-a-data-url', question: '', spread: 'general' },
  }));
  assert('Non-data-URL returns 400', badUrlRes.statusCode === 400);

  // ── 4. Config validation ──────────────────────────────
  console.log('\n  Configuration Validation');

  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const noKeyRes = await handler(mockEvent());
  assert('Missing API key returns 500', noKeyRes.statusCode === 500);
  const noKeyData = JSON.parse(noKeyRes.body);
  assert('Missing key error is safe (no key leak)', !noKeyData.error.includes('key'));
  assert('Missing key error mentions configuration', noKeyData.error.includes('configured'));

  // Restore
  if (originalKey) process.env.GEMINI_API_KEY = originalKey;

  // ── 5. CORS headers ───────────────────────────────────
  console.log('\n  CORS Headers');

  const corsRes = await handler(mockEvent({ httpMethod: 'OPTIONS' }));
  assert('OPTIONS has Access-Control-Allow-Origin', corsRes.headers['Access-Control-Allow-Origin'] === '*');
  assert('OPTIONS has Access-Control-Allow-Methods', corsRes.headers['Access-Control-Allow-Methods'].includes('POST'));

  // ── 6. Spread validation ──────────────────────────────
  console.log('\n  Spread Validation');

  // Invalid spread should still work (defaults to general)
  delete process.env.GEMINI_API_KEY;
  const badSpreadRes = await handler(mockEvent({
    body: { image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', question: '', spread: 'nonexistent' },
  }));
  // It won't reach Gemini (no key), but it should pass validation (500 not 400)
  assert('Invalid spread defaults to general (no 400)', badSpreadRes.statusCode === 500);
  if (originalKey) process.env.GEMINI_API_KEY = originalKey;

  // ── 7. Response format ────────────────────────────────
  console.log('\n  Response Format');

  const errRes = await handler(mockEvent({ body: '{}' }));
  const errBody = JSON.parse(errRes.body);
  assert('Error response has Content-Type JSON', errRes.headers['Content-Type'] === 'application/json');
  assert('Error response has error field', 'error' in errBody);
  assert('Error response does not leak stack traces', !errBody.stack);

  // ── Print results ─────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  results.forEach((r) => console.log(r));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
