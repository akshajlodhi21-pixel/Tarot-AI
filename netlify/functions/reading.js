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
  // Handled in invocation if lazy loaded
}

// ── Rate limiter (in-memory, per cold-start instance) ───────
const rateMap = new Map();
const RATE_WINDOW = 60_000; // 1 minute
const RATE_LIMIT  = 10;     // max requests per window per IP

function isRateLimited(ip) {
  const now = Date.now();
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
  return record.count > RATE_LIMIT;
}

// ── Allowed MIME types ──────────────────────────────────────
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// ── Spread label mapping ────────────────────────────────────
const SPREAD_LABELS = {
  general: 'General Guidance (Overall themes and direction)',
  love:    'Love & Relationships (Connection and communication)',
  career:  'Career & Purpose (Work, growth and choices)',
  growth:  'Personal Growth (Self-awareness and inner change)',
  future:  'Future Possibilities (What may lie ahead)',
};

// ── Load 20-Card Reference Catalog ──────────────────────────
function loadCardCatalog() {
  try {
    const catalogPath = path.join(__dirname, '../../data/cards_catalog.json');
    if (fs.existsSync(catalogPath)) {
      return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load cards_catalog.json from filesystem, using fallback.');
  }

  return [
    { number: 'Card 0', name: 'The Fool', keywords: ['New beginnings', 'Spontaneity', 'Faith'], description: 'Dawn of an adventure, stepping into the unknown.' },
    { number: 'Card 1', name: 'The Magician', keywords: ['Manifestation', 'Willpower', 'Resourcefulness'], description: 'Channeling creative and mental power into physical reality.' },
    { number: 'Card 2', name: 'The High Priestess', keywords: ['Intuition', 'Sacred mysteries', 'Inner knowing'], description: 'Listening to deep intuition and quiet wisdom.' },
    { number: 'Card 3', name: 'The Empress', keywords: ['Abundance', 'Fertility', 'Creativity'], description: 'Natural abundance, nurturing growth, creative gestation.' },
    { number: 'Card 4', name: 'The Emperor', keywords: ['Structure', 'Stability', 'Discipline'], description: 'Order from chaos, healthy boundaries, leadership.' },
    { number: 'Card 5', name: 'The Herophant', keywords: ['Spiritual guidance', 'Tradition', 'Mentorship'], description: 'Seeking higher learning, grounded tradition, sacred mentorship.' },
    { number: 'Card 6', name: 'The Lovers', keywords: ['Harmonious union', 'Values alignment', 'Choices'], description: 'Profound partnership and making value-aligned choices.' },
    { number: 'Card 7', name: 'The Chariot', keywords: ['Determination', 'Victory', 'Drive'], description: 'Conquering obstacles through focused determination.' },
    { number: 'Card 8', name: 'The Strength', keywords: ['Courage', 'Patience', 'Compassion'], description: 'Gentle fortitude, emotional endurance, inner calm.' },
    { number: 'Card 9', name: 'The Hermit', keywords: ['Introspection', 'Solitude', 'Wisdom'], description: 'Withdrawing to illuminate your inner truth.' },
    { number: 'Card 10', name: 'Wheel Of Fortune', keywords: ['Cycles of change', 'Destiny', 'Opportunity'], description: 'Perpetual cycles of fate, fortunate shifts, adaptability.' },
    { number: 'Card 11', name: 'Justice', keywords: ['Fairness', 'Truth', 'Accountability'], description: 'Lucid fairness, impartial truth-seeking, moral accountability.' },
    { number: 'Card 12', name: 'The Hanged Man', keywords: ['New perspective', 'Surrender', 'Pause'], description: 'Wisdom of non-action, viewing from inverted perspective.' },
    { number: 'Card 13', name: 'Death', keywords: ['Transformation', 'Necessary endings', 'Rebirth'], description: 'Closing of obsolete cycles, clearing the soil for rebirth.' },
    { number: 'Card 14', name: 'Temperance', keywords: ['Balance', 'Patience', 'Integration'], description: 'Blending opposites into harmonious synthesis, inner poise.' },
    { number: 'Card 15', name: 'The Devil', keywords: ['Illusion of entrapment', 'Shadow habits', 'Freedom'], description: 'Recognizing self-limiting bonds and reclaiming personal power.' },
    { number: 'Card 16', name: 'The Tower', keywords: ['Sudden breakthrough', 'Shattering illusions', 'Liberation'], description: 'Sudden collapse of false structures, clearing for authentic truth.' },
    { number: 'Card 17', name: 'The Star', keywords: ['Hope', 'Spiritual renewal', 'Serenity'], description: 'Tranquil healing, replenished faith, serene optimism.' },
    { number: 'Card 18', name: 'The Moon', keywords: ['Subconscious depths', 'Illusion', 'Dreams'], description: 'Navigating murky fears and subconscious intuition.' },
    { number: 'Card 19', name: 'The Sun', keywords: ['Radiance', 'Vitality', 'Joy', 'Clarity'], description: 'Triumphant celebration, luminous clarity, joyful vitality.' }
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

You are interpreting a 3-card reading chosen from a fixed, canonical 20-card deck.

CANONICAL 20-CARD DECK CATALOG:
${buildCatalogPromptText()}

SPREAD STRUCTURE (EXACTLY 3 CARDS):
- Position 1: Card 1 — Past / Foundation / What shaped this
- Position 2: Card 2 — Present / Active Dynamics / Where you stand
- Position 3: Card 3 — Future / Emerging Potential / Where it may lead

CARD ORIENTATION (UPRIGHT VS. REVERSED):
Each card in the spread has an orientation: Upright or Reversed.
- Upright: Direct, outward, constructive manifestation of the card's archetype and qualities.
- Reversed: Internalized processing, shadow dynamics, blocked energy, delayed manifestation, or an invitation to redirect the archetype inward.
When a card is indicated as Reversed, ground your interpretation specifically in the reversed symbolism and psychological nuances.

ANALYSIS RULES:
1. Examine each card in order (Position 1 -> Position 2 -> Position 3).
2. State the card number and official card name, along with whether it is Upright or Reversed.
3. Ground the interpretation strictly in the symbolism and keywords provided in the catalog.
4. Provide a cohesive narrative arc showing how the Past shaped the Present, and how the Present informs the emerging Future.
5. Present future trajectories as empowering possibilities rather than fatalistic predictions.
6. Do not make medical, legal, or financial guarantees.

RESPONSE STRUCTURE (Use these markdown headings):
## Cards Recognised
(List:
- **Card 1 (Past / Foundation):** [Card Name] ([Upright or Reversed]) — [Identified symbolism]
- **Card 2 (Present / Active Dynamics):** [Card Name] ([Upright or Reversed]) — [Identified symbolism]
- **Card 3 (Future / Outcome):** [Card Name] ([Upright or Reversed]) — [Identified symbolism])

## Individual Card Meanings
(Detail each card's grounded meaning and its specific significance in its spread position and orientation)

## 3-Card Spread Dynamics
(Connect the 3 cards into an overall narrative arc: how the Past influences the Present, and what that signals for the emerging Future)

## Personalised Reading
(Directly answer the user's question and reading category with deep, thoughtful, and resonant insights)

## Challenges and Opportunities
(Key obstacles to navigate and strengths to embrace based on the 3 cards)

## Practical Guidance
(Concrete, actionable advice derived from the cards)

## Final Reflection
(A grounding, inspiring closing message for contemplation)`;
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

  const { cards, image, question, spread, mode } = body;

  let cardList = [];
  if (Array.isArray(cards) && cards.length > 0) {
    cardList = cards;
  } else if (image) {
    cardList = [{ image }];
  }

  if (cardList.length === 0) {
    return respond(400, {
      error: 'Please provide your 3 tarot cards for the spread.',
    });
  }

  if (cardList.length !== 3) {
    return respond(400, {
      error: `Exactly 3 cards are required for this spread. Received ${cardList.length}.`,
    });
  }

  // Parse card data and images
  const parsedCards = [];
  for (let i = 0; i < 3; i++) {
    const raw = cardList[i];
    const imgStr = typeof raw === 'string' ? raw : (raw && raw.image ? raw.image : null);
    let parsedImg = null;

    if (imgStr) {
      parsedImg = parseImageDataUrl(imgStr);
      if (!parsedImg && mode === 'photo') {
        return respond(400, {
          error: `Card ${i + 1} is invalid or exceeds 5 MB. Please provide a valid JPG, PNG, or WEBP image.`,
        });
      }
    }

    const name = typeof raw === 'object' && raw.name ? raw.name : null;
    const number = typeof raw === 'object' && raw.number ? raw.number : `Card ${i + 1}`;
    const reversed = typeof raw === 'object' ? !!raw.reversed : false;
    const label = (typeof raw === 'object' && raw.label) ? raw.label : (i === 0 ? 'Past' : i === 1 ? 'Present' : 'Future');

    if (!name && !parsedImg) {
      return respond(400, {
        error: `Card ${i + 1} is invalid. A card name or valid image is required.`,
      });
    }

    parsedCards.push({
      position: i + 1,
      label,
      name,
      number,
      reversed,
      image: parsedImg
    });
  }

  // Validate question & spread
  const userQuestion = (typeof question === 'string' ? question : '').trim().substring(0, 500);
  const spreadKey = SPREAD_LABELS[spread] ? spread : 'general';
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

  const cardDescriptions = parsedCards.map((c) => {
    const orient = c.reversed ? 'Reversed ↺' : 'Upright';
    if (c.name) {
      return `- Position ${c.position} (${c.label}): ${c.name} (${c.number}) — ${orient}`;
    }
    return `- Position ${c.position} (${c.label}): Physical card from uploaded photo — ${orient}`;
  }).join('\n');

  const userPrompt = [
    `Reading category: ${spreadLabel}`,
    `User's question: ${userQuestion || 'No specific question provided — please provide an overarching reading based on the 3-card spread.'}`,
    '',
    'Selected 3-Card Spread:',
    cardDescriptions,
    '',
    'Please synthesize the reading, analyze each card in its designated position and orientation, and provide cohesive guidance.'
  ].join('\n');

  try {
    if (!GoogleGenerativeAI) {
      ({ GoogleGenerativeAI } = require('@google/generative-ai'));
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Build content parts
    const contentParts = [systemPrompt + '\n\n' + userPrompt];

    // Append images if available
    for (const c of parsedCards) {
      if (c.image) {
        contentParts.push({
          inlineData: {
            mimeType: c.image.mime,
            data: c.image.data
          }
        });
      }
    }

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
        error: 'The AI did not return a reading. Please try again.',
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
