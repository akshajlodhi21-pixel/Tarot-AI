"""
ARCANA — Local Development Server (3-Card Spread Edition)
Zero-dependency Python dev server for Tarot AI.
Serves static frontend assets and emulates the Netlify serverless function:
POST /.netlify/functions/reading
"""

import http.server
import socketserver
import json
import os
import re
import urllib.request
import urllib.error

PORT = 8888
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Load .env file if present ─────────────────────────────────
def load_env():
    env_vars = {}
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.isfile(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

ENV = load_env()

# ── Load 20-Card Catalog ──────────────────────────────────────
def load_card_catalog():
    catalog_path = os.path.join(BASE_DIR, "data", "cards_catalog.json")
    if os.path.isfile(catalog_path):
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading catalog: {e}")
    return []

CARDS_CATALOG = load_card_catalog()

def build_catalog_prompt_text():
    lines = []
    for c in CARDS_CATALOG:
        kw = ", ".join(c.get("keywords", []))
        lines.append(f"- {c.get('number')}: {c.get('name')} | Keywords: {kw} | Meaning: {c.get('description', '')}")
    return "\n".join(lines)

SPREAD_LABELS = {
    "general": "General Reading",
    "love": "Love and Relationships",
    "career": "Career and Professional Life",
    "growth": "Personal Growth",
    "future": "Future Possibilities"
}

def build_system_prompt():
    return f"""You are an experienced, thoughtful tarot interpreter specializing in 3-card spread interpretations.

You are interpreting a physical 3-card reading chosen from a fixed, canonical 20-card deck.

CANONICAL 20-CARD DECK CATALOG:
{build_catalog_prompt_text()}

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
(A grounding, inspiring closing message for reflection)"""

def parse_image_data_url(image_str):
    if not image_str or not isinstance(image_str, str):
        return None
    match = re.match(r"^data:([^;,]+)(?:;[a-zA-Z0-9.+-]+=[a-zA-Z0-9.+-]+)*;base64,(.+)$", image_str, re.DOTALL)
    if not match:
        return None
    mime_type = match.group(1).lower().strip()
    base64_data = re.sub(r"\s+", "", match.group(2))
    if mime_type not in ["image/jpeg", "image/png", "image/webp"]:
        return None
    if len(base64_data) * 3 / 4 > 5 * 1024 * 1024:
        return None
    return {"mime": mime_type, "data": base64_data}

class ArcanaDevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        # ── Security Audit: Block access to sensitive files & dotfiles ──
        clean_path = self.path.split('?')[0].split('#')[0]
        segments = [s.lower() for s in clean_path.split('/') if s]
        blocked_names = {'.env', '.env.local', '.env.example', '.gitignore', '.git', 'package.json', 'package-lock.json'}
        blocked_dirs  = {'.git', 'node_modules', 'tests'}

        if any(seg in blocked_names for seg in segments) or any(d in segments for d in blocked_dirs) or clean_path.endswith('.env'):
            self.send_response(403)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Forbidden: Access to sensitive file is blocked."}).encode("utf-8"))
            return

        super().do_GET()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path.startswith("/.netlify/functions/reading"):
            self.handle_reading()
        elif self.path == "/api/shutdown":
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Server shutting down..."}).encode("utf-8"))
            import threading
            threading.Thread(target=self.server.shutdown).start()
        else:
            self.send_json_error(404, "Endpoint not found.")

    def handle_reading(self):
        # Reload env on every request to pick up updated keys dynamically
        current_env = load_env()

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_json_error(400, "Empty request body.")
            return

        body_raw = self.rfile.read(content_length).decode("utf-8")
        try:
            data = json.loads(body_raw)
        except Exception:
            self.send_json_error(400, "Invalid JSON payload.")
            return

        cards_input = data.get("cards", [])
        image_input = data.get("image", None)
        question = data.get("question", "").strip()[:500]
        spread = data.get("spread", "general")

        raw_images = []
        if isinstance(cards_input, list) and len(cards_input) > 0:
            for item in cards_input:
                if isinstance(item, dict) and "image" in item:
                    raw_images.append(item["image"])
                elif isinstance(item, str):
                    raw_images.append(item)
        elif image_input:
            raw_images = [image_input]

        if len(raw_images) != 3:
            self.send_json_error(400, f"Exactly 3 cards are required. Received {len(raw_images)}.")
            return

        parsed_images = []
        for i, img in enumerate(raw_images):
            parsed = parse_image_data_url(img)
            if not parsed:
                self.send_json_error(400, f"Card {i + 1} is invalid or exceeds 5 MB. Please upload a JPG, PNG or WEBP.")
                return
            parsed_images.append(parsed)

        # Check API Key
        api_key = os.environ.get("GEMINI_API_KEY") or current_env.get("GEMINI_API_KEY")
        model = os.environ.get("GEMINI_MODEL") or current_env.get("GEMINI_MODEL") or "gemini-flash-latest"

        if not api_key or api_key == "your_gemini_api_key_here":
            self.send_json_error(
                500,
                "GEMINI_API_KEY is not configured in .env. Please add your Google Gemini API key to .env to run live readings."
            )
            return

        spread_label = SPREAD_LABELS.get(spread, "General Reading")
        user_prompt = f"Reading category: {spread_label}\nUser's question: {question or 'No specific question provided — please provide an overarching reading based on the 3-card spread.'}\n\nI have uploaded 3 images corresponding to the 3-card spread:\n- First image: Card 1 (Past / Foundation)\n- Second image: Card 2 (Present / Active Dynamics)\n- Third image: Card 3 (Future / Emerging Outcome)\n\nPlease identify each card from the 20-card catalog and deliver the structured 3-card reading."

        full_prompt = build_system_prompt() + "\n\n" + user_prompt

        # Prioritize reliable fast models
        models_to_try = [model]
        for fallback in ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        reading_text = None
        last_error = None

        for current_model in models_to_try:
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
            parts_list = [{"text": full_prompt}]
            for p in parsed_images:
                parts_list.append({
                    "inline_data": {
                        "mime_type": p["mime"],
                        "data": p["data"]
                    }
                })

            payload = {"contents": [{"parts": parts_list}]}
            req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )

            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    candidates = resp_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        reading_text = "".join(p.get("text", "") for p in parts)
                        if reading_text and reading_text.strip():
                            break
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace")
                print(f"Gemini API [{current_model}] returned HTTP {e.code}: {err_body[:200]}")
                last_error = e
                # Retry on temporary spikes (503) or not found (404)
                if e.code in (503, 404):
                    continue
                elif e.code == 429:
                    self.send_json_error(429, "The AI service is currently busy. Please wait a moment and try again.")
                    return
                elif e.code in (401, 403):
                    self.send_json_error(500, "The Gemini API key is invalid or lacks required permissions.")
                    return
                else:
                    break
            except Exception as e:
                print(f"Gemini API exception [{current_model}]: {e}")
                last_error = e
                continue

        if reading_text:
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"reading": reading_text}).encode("utf-8"))
        else:
            self.send_json_error(502, "The AI service encountered an error or temporary capacity limit. Please try again in a few moments.")

    def send_json_error(self, status_code, message):
        self.send_response(status_code)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    with ThreadedTCPServer(("", PORT), ArcanaDevHandler) as httpd:
        print("\n" + "=" * 55)
        print("  ✦ ARCANA — 3-CARD TAROT AI DEVELOPMENT SERVER ✦")
        print("=" * 55)
        print(f"  > Web App URL:      http://localhost:{PORT}")
        print(f"  > Serverless Route: http://localhost:{PORT}/.netlify/functions/reading")
        print(f"  > 20-Card Catalog:  {len(CARDS_CATALOG)} cards loaded")
        print(f"  > Concurrency:      Multi-Threaded (Non-blocking)")
        print("=" * 55)
        print("  Server is running. Press Ctrl+C in terminal to stop.\n")
        httpd.serve_forever()

if __name__ == "__main__":
    run()
