# Arcana — AI Tarot Experience

An elegant, AI-powered tarot card interpretation web application. Users can upload photographs of physical tarot cards and receive deeply personalised readings powered by computer vision and generative AI using Google's Gemini models.

---

## Architecture Overview

```
┌────────────────────────────────┐
│      Browser (Client)          │
│  - Vanilla HTML5 / CSS3 / JS   │
│  - Drag & Drop / Mobile Upload │
│  - Client Validation (5MB max) │
│  - Markdown Result Renderer    │
└───────────────┬────────────────┘
                │ POST /.netlify/functions/reading
                ▼
┌────────────────────────────────┐
│   Netlify Serverless Function  │
│  - Node.js runtime             │
│  - Method & CORS Enforcement   │
│  - In-Memory Rate Limiting     │
│  - MIME & Size Verification    │
│  - Secure Server-Side API Call │
└───────────────┬────────────────┘
                │ Multimodal Payload (inlineData base64)
                ▼
┌────────────────────────────────┐
│       Google Gemini API        │
│  - Model: gemini-2.0-flash     │
│  - Visual Card Recognition     │
│  - Symbolism & Spread Analysis │
│  - Structured Output Sections  │
└────────────────────────────────┘
```

---

## Key Features

1. **Computer Vision Tarot Recognition**
   - Analyzes photographs of physical tarot cards.
   - Distinguishes Major Arcana, Minor Arcana, suits, numbers, and visible orientation (upright/reversed).
   - Identifies multiple cards in a spread and interprets inter-card dynamics.
   - Strict anti-hallucination instruction: explicitly flags unclear or obscured cards rather than guessing.

2. **Reading Categories**
   - 🌟 **General Guidance:** Overall themes and life directions.
   - 💖 **Love & Relationships:** Connection, communication, and emotional dynamics.
   - 💼 **Career & Purpose:** Work opportunities, vocational path, and strategic choices.
   - 🌱 **Personal Growth:** Self-awareness, inner patterns, and transformative habits.
   - 🔮 **Future Possibilities:** Emerging trajectories, potential outcomes, and preparedness.

3. **Structured Interpretations**
   - Markdown-rendered output formatted into:
     - `Cards Recognised`
     - `Individual Card Meanings`
     - `Overall Spread Interpretation`
     - `Personalised Reading`
     - `Possible Path Ahead`
     - `Challenges and Opportunities`
     - `Practical Guidance`
     - `Final Reflection`
   - One-click clipboard copy and reset for new readings.

4. **Privacy & Security**
   - `GEMINI_API_KEY` is strictly server-side and never exposed to the client.
   - Uploaded card images are processed in-memory and never permanently stored.
   - Visible privacy notice informing users of third-party AI processing.
   - In-memory rate limiting (10 requests per minute per IP) to mitigate abuse.

---

## Project Structure

```
Tarot AI/
├── index.html                   # Main production frontend
├── tarot-index.html             # Original preserved foundation file
├── assets/
│   ├── css/
│   │   └── style.css            # Mystical dark aesthetic & responsive layout
│   └── js/
│       └── app.js               # Client validation, upload, fetch & markdown parser
├── netlify/
│   └── functions/
│       └── reading.js           # Secure serverless backend calling Gemini
├── tests/
│   ├── backend.test.js          # Node.js backend validation suite
│   └── validate_project.py      # Comprehensive 65-point project validation suite
├── netlify.toml                 # Netlify build, publish, and function routing
├── package.json                 # Node dependencies and scripts
├── .env.example                 # Template for required environment variables
├── .gitignore                   # Excludes secrets, node_modules, and cache
└── README.md                    # Complete project documentation
```

---

## Configuration & Environment Variables

Create a `.env` file in the project root (never commit this file to git):

```bash
# Required: Google Gemini API key
# Obtain a free key at: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_private_api_key_here

# Optional: Gemini model (defaults to gemini-2.0-flash)
# Must be a vision-capable Gemini model
GEMINI_MODEL=gemini-2.0-flash
```

---

## Local Development

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: Installed with Node
- **Netlify CLI** (optional, recommended for local function emulation):
  ```bash
  npm install -g netlify-cli
  ```

### 2. Setup
1. Clone or open the project directory:
   ```bash
   cd "Tarot AI"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and insert your Gemini API key:
   ```bash
   cp .env.example .env
   ```

### 3. Running Locally
Using the Netlify CLI, start the local development server with serverless function emulation:
```bash
netlify dev
```
By default, the server runs at:
```
http://localhost:8888
```
This serves `index.html` and emulates `/.netlify/functions/reading`.

---

## Running Automated Tests

### 1. Full Project Architecture Validation (Python 3)
Verifies 65 structural checkpoints including file integrity, configuration, frontend controls, MIME validation, serverless error contracts, and regex behavior:
```bash
py -3 tests/validate_project.py
```

### 2. Backend Unit Test Suite (Node.js)
Tests HTTP methods, preflight CORS, missing parameters, invalid MIME types, oversized payloads, rate limiting, and safe error responses:
```bash
node tests/backend.test.js
```

---

## Netlify Deployment Instructions

### Method A: Deploy via Netlify Web UI (GitHub / GitLab / Bitbucket)
1. Push your repository to your Git provider (ensure `.env` is ignored by `.gitignore`).
2. Log in to [Netlify](https://app.netlify.com).
3. Click **Add new site** > **Import an existing project**.
4. Select your repository.
5. Netlify will automatically detect `netlify.toml`:
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
6. Go to **Site Configuration** > **Environment variables**:
   - Add `GEMINI_API_KEY` = `your_gemini_api_key`
   - Add `GEMINI_MODEL` = `gemini-2.0-flash`
7. Click **Deploy Site**.

### Method B: Deploy via Netlify CLI
1. Log in to your Netlify account:
   ```bash
   netlify login
   ```
2. Link or create a new site:
   ```bash
   netlify init
   ```
3. Set your environment variables in Netlify:
   ```bash
   netlify env:set GEMINI_API_KEY "your_gemini_api_key"
   netlify env:set GEMINI_MODEL "gemini-2.0-flash"
   ```
4. Deploy to production:
   ```bash
   netlify deploy --prod
   ```

---

## Testing Scenarios Matrix

| Scenario | Expected Result |
|---|---|
| **Single Tarot Card** | Identifies card name, arcana, upright/reversed state, and focused interpretation. |
| **Three-Card Spread** | Identifies all visible cards, explains individual meanings, and articulates thematic relationships. |
| **Blurry / Obscured Photo** | Explicitly acknowledges unreadable cards without hallucinating fake identities. |
| **Non-Tarot Image** | Returns a polite message stating no tarot cards could be identified and prompts for a clearer image. |
| **Unsupported Format (.gif, .svg)** | Client and server return a clean 400 error requiring JPG, PNG, or WEBP. |
| **Oversized File (> 5MB)** | Client alerts user before transmission; server rejects with 400 status. |
| **Missing API Key** | Server responds with safe 500 error without exposing stack traces or internals. |

---

## Disclaimers & Ethics

Arcana is designed for personal reflection, meditation, and creative storytelling. Tarot interpretations should not be used as substitutes for medical, legal, psychological, or financial counsel.
