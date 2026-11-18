// ============================================================
// ARCANA — 3-Card Tarot Reading Serverless Function
// Netlify Function: POST /.netlify/functions/reading
// ============================================================

const path = require('path');
const fs = require('fs');

let GoogleGenerativeAI;
try {
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch {
  // Lazy-loaded or handled in invocation
}

// ── Rate limiter (in-memory, per cold-start instance) ───────
const rateMap = new Map();
const RATE_WINDOW = 60_000; // 1 minute
const RATE_LIMIT  = 10;     // max requests per window per IP

function isRateLimited(ip) {
  const now = Date.now();

  // Lazy cleanup to avoid lingering intervals in serverless runtimes
  if (rateMap.size > 100) {
    for (const [key, rec] of rateMap) {
      if (now - rec.start > RATE_WINDOW) rateMap.delete(key);
    }
  }

  let record = rateMap.get(ip);

  if (!record || now - record.start > RATE_WINDOW) {
    record = { start: now, count: 1 };
    rateMap.set(ip, record);
    return false;
  }

  record.count++;
  if (record.count > RATE_LIMIT) return true;
  return false;
}

// ── Allowed MIME types ──────────────────────────────────────
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// ── Spread label mapping ────────────────────────────────────
const SPREAD_LABELS = {
  general: 'General Reading',
  love:    'Love and Relationships',
  career:  'Career and Professional Life',
  growth:  'Personal Growth',
  future:  'Future Possibilities',
};

// ── Load 20-Card Reference Catalog ──────────────────────────
function loadCardCatalog() {
  try {
    const catalogPath = path.join(__dirname, '../../data/cards_catalog.json');
    if (fs.existsSync(catalogPath)) {
      return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load cards_catalog.json, using fallback catalog');
  }

  // Fallback catalog definition
  return [
    { number: 'Card I', name: 'The Fool', keywords: ['New beginnings', 'Faith', 'Spontaneity'], description: 'Beginning of a journey, unlimited potential, leap of faith.' },
    { number: 'Card II', name: 'The Magician', keywords: ['Manifestation', 'Power', 'Resourcefulness'], description: 'Willpower, conscious action, inner tools.' },
    { number: 'Card III', name: 'The High Priestess', keywords: ['Intuition', 'Sacred knowledge', 'Mystery'], description: 'Inner wisdom, quiet reflection, deep instincts.' },
    { number: 'Card IV', name: 'The Empress', keywords: ['Abundance', 'Nurturing', 'Creativity'], description: 'Natural abundance, creative growth, compassionate nurturing.' },
    { number: 'Card V', name: 'The Emperor', keywords: ['Structure', 'Stability', 'Discipline'], description: 'Order from chaos, healthy boundaries, leadership.' },
    { number: 'Card VI', name: 'The Hierophant', keywords: ['Tradition', 'Spiritual wisdom', 'Mentorship'], description: 'Established wisdom, trusted guidance, spiritual frameworks.' },
    { number: 'Card VII', name: 'The Lovers', keywords: ['Harmonious union', 'Values alignment', 'Choices'], description: 'Deep connection, harmony, integrity in choices.' },
    { number: 'Card VIII', name: 'The Chariot', keywords: ['Determination', 'Victory', 'Focus'], description: 'Triumph over opposing forces through focused intent.' },
    { number: 'Card IX', name: 'Strength', keywords: ['Courage', 'Patience', 'Compassion'], description: 'Gentle fortitude, emotional endurance, inner calm.' },
    { number: 'Card X', name: 'The Hermit', keywords: ['Soul-searching', 'Introspection', 'Wisdom'], description: 'Solitude, seeking inner truth, stepping back from noise.' },
    { number: 'Card XI', name: 'Wheel of Fortune', keywords: ['Cycles', 'Change', 'Turning point'], description: 'Inevitable cycles of change, destiny, adaptability.' },
    { number: 'Card XII', name: 'Justice', keywords: ['Fairness', 'Truth', 'Accountability'], description: 'Balanced judgment, objective truth, ethical clarity.' },
    { number: 'Card XIII', name: 'The Hanged Man', keywords: ['New perspective', 'Letting go', 'Pause'], description: 'Willingly pausing, viewing from an inverted perspective.' },
    { number: 'Card XIV', name: 'Death', keywords: ['Transformation', 'Endings', 'Rebirth'], description: 'Natural close of a chapter, clearing old patterns.' },
    { number: 'Card XV', name: 'Temperance', keywords: ['Balance', 'Moderation', 'Patience'], description: 'Balancing opposing energies, middle ground, alchemy.' },
    { number: 'Card XVI', name: 'The Devil', keywords: ['Attachments', 'Shadow self', 'Illusion'], description: 'Identifying self-imposed limitations, breaking free.' },
    { number: 'Card XVII', name: 'The Tower', keywords: ['Breakthrough', 'Shattering illusions', 'Awakening'], description: 'Disruptive revelations collapsing false foundations.' },
    { number: 'Card XVIII', name: 'The Star', keywords: ['Hope', 'Inspiration', 'Renewal'], description: 'Peaceful renewal, faith, serenity after challenges.' },
    { number: 'Card XIX', name: 'The Moon', keywords: ['Intuitive depth', 'Subconscious', 'Dreams'], description: 'Navigating emotional uncertainty, subconscious fears.' },
    { number: 'Card XX', name: 'The Sun', keywords: ['Joy', 'Success', 'Vitality'], description: 'Radiant clarity, triumphant vitality, warmth, celebration.' }
  ];
}

const CARDS_CATALOG = loadCardCatalog();

function buildCatalogPromptText() {
  return CARDS_CATALOG.map((c) =>
    `- ${c.number}: ${c.name} | Keywords: ${(c.keywords || []).join(', ')} | Meaning: ${c.description || ''}`
  ).join('\n');
}

// ── System Prompt (3-Card Grounded Spread) ───────────────────
function buildSystemPrompt() {
  return `You are an experienced, thoughtful tarot interpreter specializing in 3-card spread interpretations.

You are interpreting a physical 3-card reading chosen from a fixed, canonical 20-card deck.

CANONICAL 20-CARD DECK CATALOG:
${buildCatalogPromptText()}

SPREAD STRUCTURE (EXACTLY 3 CARDS):
- Position 1 (First uploaded image): Card 1 — Foundation / Past / Root Cause
- Position 2 (Second uploaded image): Card 2 — Present / Active Dynamics / Current Focus
- Position 3 (Third uploaded image): Card 3 — Future / Emerging Potential / Outcome & Guidance

ANALYSIS RULES:
1. Examine each of the 3 images in order. Match each image specifically to one card from the 20-Card Deck Catalog above.
2. State the card number and official card name clearly.
3. If an image is blurry, obscured, or does not match a card in the 20-card deck, explicitly state that it cannot be identified. Do NOT fabricate or invent cards.
4. Ground the interpretation strictly in the symbolism and keywords provided in the catalog.
5. Provide a cohesive narrative showing how Card 1 leads to Card 2, and how Card 2 informs the path toward Card 3.
6. Present future trajectories as empowering possibilities rather than fatalistic predictions.
7. Do not make medical, legal, or financial guarantees.

RESPONSE STRUCTURE (Use these markdown headings):
## Cards Recognised
(List:
- **Card 1 (Foundation):** [Card Number & Name] — [Identified visual traits]
- **Card 2 (Present):** [Card Number & Name] — [Identified visual traits]
- **Card 3 (Outcome):** [Card Number & Name] — [Identified visual traits])

## Individual Card Meanings
(Detail each card's grounded meaning from the catalog and its significance in its specific spread position)

## 3-Card Spread Dynamics
(Connect the 3 cards into an overall narrative: how the root foundation influences the present moment, and what that signals for the emerging future)

## Personalised Reading
(Directly answer the user's question and category with thoughtful, grounded insights)

## Challenges and Opportunities
(Key obstacles to navigate and strengths to embrace based on the 3 cards)

## Practical Guidance
(Concrete, actionable advice derived from the cards)

## Final Reflection
(A grounding, inspiring closing message for reflection)`;
}

// ── CORS headers ────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ── Helper to Parse Base64 Image ────────────────────────────
function parseImageDataUrl(imageString) {
  if (!imageString || typeof imageString !== 'string') return null;
  const match = imageString.match(/^data:([^;,]+)(?:;[a-zA-Z0-9.+-]+=[a-zA-Z0-9.+-]+)*;base64,(.+)$/s);
  if (!match) return null;

  const mime = match[1].toLowerCase().trim();
  const data = match[2].replace(/\s/g, '');

  if (!ALLOWED_MIME.has(mime)) return null;

  const bytes = Math.ceil(data.length * 3 / 4);
  if (bytes > 5 * 1024 * 1024) return null;

  return { mime, data };
}

// ── Handler ─────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed. Use POST.' });
  }

  const clientIP =
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    event.headers['client-ip'] ||
    'unknown';

  if (isRateLimited(clientIP)) {
    return respond(429, {
      error: 'Too many requests. Please wait a moment before trying again.',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid request body.' });
  }

  const { cards, image, question, spread } = body;

  // Extract raw images (support 3-card array or single image fallback)
  let rawImages = [];
  if (Array.isArray(cards) && cards.length > 0) {
    rawImages = cards.map((c) => (c && c.image ? c.image : c));
  } else if (image) {
    rawImages = [image];
  }

  if (rawImages.length === 0) {
    return respond(400, {
      error: 'Please upload your tarot card images. Exactly 3 cards are required.',
    });
  }

  if (rawImages.length !== 3) {
    return respond(400, {
      error: `Exactly 3 cards are required for this spread. Received ${rawImages.length}.`,
    });
  }

  // Validate all 3 images
  const parsedImages = [];
  for (let i = 0; i < 3; i++) {
    const parsed = parseImageDataUrl(rawImages[i]);
    if (!parsed) {
      return respond(400, {
        error: `Card ${i + 1} is invalid or exceeds 5 MB. Please provide a valid JPG, PNG, or WEBP image.`,
      });
    }
    parsedImages.push(parsed);
  }

  // Validate question & spread
  const userQuestion = (typeof question === 'string' ? question : '').trim().substring(0, 500);
  const spreadKey   = SPREAD_LABELS[spread] ? spread : 'general';
  const spreadLabel = SPREAD_LABELS[spreadKey];

  // API Key Check
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set.');
    return respond(500, {
      error: 'The service is not configured correctly. Please contact the site administrator.',
    });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  // Build Prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = [
    `Reading category: ${spreadLabel}`,
    `User's question: ${userQuestion || 'No specific question provided — please provide an overarching reading based on the 3-card spread.'}`,
    '',
    'I have uploaded 3 images corresponding to the 3-card spread:',
    '- First image: Card 1 (Past / Foundation)',
    '- Second image: Card 2 (Present / Active Dynamics)',
    '- Third image: Card 3 (Future / Emerging Outcome)',
    '',
    'Please identify each card from the 20-card catalog and deliver the structured 3-card reading.'
  ].join('\n');

  try {
    if (!GoogleGenerativeAI) {
      ({ GoogleGenerativeAI } = require('@google/generative-ai'));
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Build multimodal payload with all 3 images
    const contentParts = [
      systemPrompt + '\n\n' + userPrompt,
      { inlineData: { mimeType: parsedImages[0].mime, data: parsedImages[0].data } },
      { inlineData: { mimeType: parsedImages[1].mime, data: parsedImages[1].data } },
      { inlineData: { mimeType: parsedImages[2].mime, data: parsedImages[2].data } }
    ];

    const modelsToTry = [model, 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];
    let text = null;

    for (const currentModel of modelsToTry) {
      try {
        const geminiModel = genAI.getGenerativeModel({ model: currentModel });
        const result = await geminiModel.generateContent(contentParts);
        text = result.response.text();
        if (text && text.trim().length > 0) break;
      } catch (mErr) {
        const mMsg = mErr.message || '';
        if (mMsg.includes('503') || mMsg.includes('NOT_FOUND') || mMsg.includes('404')) {
          continue;
        }
        throw mErr;
      }
    }

    if (!text || text.trim().length === 0) {
      return respond(502, {
        error: 'The AI did not return a reading. Please ensure the card images are clear and try again.',
      });
    }

    return respond(200, { reading: text });
  } catch (err) {
    console.error('Gemini API error:', err.message || err);
    const msg = err.message || '';

    if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
      return respond(500, { error: 'The Gemini API key is invalid or lacks required permissions.' });
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      return respond(429, { error: 'The AI service is currently busy. Please wait a moment and try again.' });
    }
    return respond(502, { error: 'The AI service is currently unavailable. Please try again shortly.' });
  }
};
