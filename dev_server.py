"""
ARCANA — Local Development Server (3-Card Interactive Deck + Vision Edition)
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
import time
import hmac
import hashlib

PORT = 8888
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Global Dev Lock State ─────────────────────────────────────
DEV_LOCK_STATE = {
    "locked": True,
    "autoLockMinutes": 0,
    "updatedAt": int(time.time())
}

# ── Load .env file dynamically ────────────────────────────────
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
    "general": "General Guidance (Overall themes and direction)",
    "love": "Love & Relationships (Connection and communication)",
    "career": "Career & Purpose (Work, growth and choices)",
    "growth": "Personal Growth (Self-awareness and inner change)",
    "future": "Future Possibilities (What may lie ahead)"
}

def build_system_prompt():
    return f"""You are an experienced, thoughtful tarot interpreter specializing in 3-card spread interpretations.

You are interpreting a 3-card reading chosen from a fixed, canonical 20-card deck.

CANONICAL 20-CARD DECK CATALOG:
{build_catalog_prompt_text()}

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
(A grounding, inspiring closing message for contemplation)"""

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
        # ── API: Lock Status Endpoint ─────────────────────────────
        if self.path.startswith("/api/lock-status") or self.path.startswith("/.netlify/functions/lock-status"):
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(json.dumps(DEV_LOCK_STATE).encode("utf-8"))
            return

        if self.path.startswith("/api/admin") or self.path.startswith("/.netlify/functions/admin"):
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(DEV_LOCK_STATE).encode("utf-8"))
            return

        # ── Security Audit: Block access to sensitive files & dotfiles ──
        raw_path = self.path.split('?')[0].split('#')[0]
        # Normalize Windows backslashes and URL decode
        import urllib.parse
        clean_path = urllib.parse.unquote(raw_path).replace('\\', '/')
        segments = [s.lower() for s in clean_path.split('/') if s]
        blocked_names = {'.env', '.env.local', '.env.example', '.gitignore', '.git', 'package.json', 'package-lock.json', 'dev_server.py', 'vercel.json'}
        blocked_dirs  = {'.git', 'node_modules', 'tests', 'api'}

        if (
            '..' in segments or 
            any(seg in blocked_names for seg in segments) or 
            any(d in segments for d in blocked_dirs) or 
            clean_path.endswith('.env') or
            clean_path.startswith('/..')
        ):
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
        if self.path.startswith("/api/reading") or self.path.startswith("/.netlify/functions/reading"):
            self.handle_reading()
        elif self.path.startswith("/api/admin") or self.path.startswith("/.netlify/functions/admin"):
            self.handle_admin()
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

    def handle_admin(self):
        current_env = load_env()
        admin_pin = current_env.get("ADMIN_PIN") or current_env.get("ADMIN_PASSWORD") or "9198"
        content_length = int(self.headers.get("Content-Length", 0))
        body_raw = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            data = json.loads(body_raw)
        except Exception:
            self.send_json_error(400, "Invalid JSON payload.")
            return

        action = data.get("action")
        if action == "unlock":
            pin = str(data.get("pin", "")).strip()
            if pin == str(admin_pin).strip():
                DEV_LOCK_STATE["locked"] = False
                DEV_LOCK_STATE["updatedAt"] = int(time.time())
                self.send_response(200)
                self.send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                token = "dev_admin_token_" + str(int(time.time()))
                self.wfile.write(json.dumps({
                    "success": True,
                    "locked": False,
                    "autoLockMinutes": DEV_LOCK_STATE["autoLockMinutes"],
                    "token": token,
                    "message": "ARCANA unlocked."
                }).encode("utf-8"))
            else:
                time.sleep(0.5)
                self.send_response(401)
                self.send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "Incorrect Admin PIN. Please verify your credentials.",
                    "code": "INVALID_PIN"
                }).encode("utf-8"))
        elif action == "lock":
            DEV_LOCK_STATE["locked"] = True
            DEV_LOCK_STATE["updatedAt"] = int(time.time())
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "locked": True,
                "autoLockMinutes": DEV_LOCK_STATE["autoLockMinutes"],
                "message": "ARCANA locked."
            }).encode("utf-8"))
        elif action == "set-timeout":
            minutes = int(data.get("autoLockMinutes", 0))
            DEV_LOCK_STATE["autoLockMinutes"] = minutes
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "autoLockMinutes": minutes
            }).encode("utf-8"))
        elif action == "verify-token":
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "valid": True,
                "locked": DEV_LOCK_STATE["locked"],
                "autoLockMinutes": DEV_LOCK_STATE["autoLockMinutes"]
            }).encode("utf-8"))
        else:
            self.send_json_error(400, f"Unknown action '{action}'")

    def handle_reading(self):
        # ── Lock State Check ──
        if DEV_LOCK_STATE.get("locked", True):
            self.send_json_error(423, "ARCANA is currently locked. The experience will begin shortly.")
            return

        current_env = load_env()

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_json_error(400, "Empty request body.")
            return
        if content_length > 25 * 1024 * 1024:
            self.send_json_error(413, "Payload too large. Maximum size is 25 MB.")
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
        mode = data.get("mode", "deck")

        card_list = []
        if isinstance(cards_input, list) and len(cards_input) > 0:
            card_list = cards_input
        elif image_input:
            card_list = [{"image": image_input}]

        if len(card_list) != 3:
            self.send_json_error(400, f"Exactly 3 cards are required. Received {len(card_list)}.")
            return

        parsed_cards = []
        for i, raw in enumerate(card_list):
            img_str = raw if isinstance(raw, str) else (raw.get("image") if isinstance(raw, dict) else None)
            parsed_img = None
            if img_str:
                parsed_img = parse_image_data_url(img_str)
                if not parsed_img and (mode == "photo" or img_str.startswith("data:")):
                    self.send_json_error(400, f"Card {i + 1} has an invalid image format or exceeds 5 MB.")
                    return

            name = raw.get("name") if isinstance(raw, dict) else None
            number = raw.get("number") if isinstance(raw, dict) else f"Card {i + 1}"
            reversed_flag = bool(raw.get("reversed", False)) if isinstance(raw, dict) else False
            label = raw.get("label", "Past" if i == 0 else ("Present" if i == 1 else "Future")) if isinstance(raw, dict) else ("Past" if i == 0 else ("Present" if i == 1 else "Future"))

            if not name and not parsed_img:
                self.send_json_error(400, f"Card {i + 1} is invalid. A card name or valid image is required.")
                return

            parsed_cards.append({
                "position": i + 1,
                "label": label,
                "name": name,
                "number": number,
                "reversed": reversed_flag,
                "image": parsed_img
            })

        # Check API Key
        api_key = os.environ.get("GEMINI_API_KEY") or current_env.get("GEMINI_API_KEY")
        model = os.environ.get("GEMINI_MODEL") or current_env.get("GEMINI_MODEL") or "gemini-3.5-flash-lite"

        if not api_key or api_key == "your_gemini_api_key_here":
            self.send_json_error(
                500,
                "GEMINI_API_KEY is not configured in .env. Please add your Google Gemini API key to .env."
            )
            return

        spread_label = SPREAD_LABELS.get(spread, "General Guidance")

        card_lines = []
        for c in parsed_cards:
            orient = "Reversed ↺" if c["reversed"] else "Upright"
            if c["name"]:
                card_lines.append(f"- Position {c['position']} ({c['label']}): {c['name']} ({c['number']}) — {orient}")
            else:
                card_lines.append(f"- Position {c['position']} ({c['label']}): Physical card from photo — {orient}")

        user_prompt = f"Reading category: {spread_label}\nUser's question: {question or 'No specific question provided — please provide an overarching reading based on the 3-card spread.'}\n\nSelected 3-Card Spread:\n" + "\n".join(card_lines) + "\n\nPlease deliver the structured 3-card reading according to the guidelines."

        full_prompt = build_system_prompt() + "\n\n" + user_prompt

        models_to_try = ["gemini-3.5-flash-lite"]
        if model and model not in models_to_try:
            models_to_try.append(model)
        for fallback in ["gemini-3.8-flash", "gemini-flash-latest"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        reading_text = None
        for current_model in models_to_try:
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
            parts_list = [{"text": full_prompt}]

            # Selective multimodal: Only append base64 images if in photo mode
            if mode == "photo":
                for c in parsed_cards:
                    if c["image"]:
                        parts_list.append({
                            "inline_data": {
                                "mime_type": c["image"]["mime"],
                                "data": c["image"]["data"]
                            }
                        })

            payload = {"contents": [{"parts": parts_list}]}
            payload_json = json.dumps(payload)

            # Try curl.exe first for instant Windows networking & Happy Eyeballs IPv4
            import subprocess, shutil
            if shutil.which("curl"):
                try:
                    proc = subprocess.run(
                        ["curl.exe", "-s", "-X", "POST", api_url, "-H", "Content-Type: application/json", "--data-binary", "@-"],
                        input=payload_json.encode("utf-8"),
                        capture_output=True,
                        timeout=45
                    )
                    if proc.returncode == 0:
                        resp_data = json.loads(proc.stdout.decode("utf-8", errors="replace"))
                        if "error" in resp_data:
                            print(f"Gemini API [{current_model}] error: {resp_data['error']}")
                            continue
                        candidates = resp_data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            reading_text = "".join(p.get("text", "") for p in parts)
                            if reading_text and reading_text.strip():
                                break
                except Exception as c_err:
                    print(f"curl attempt failed: {c_err}")

            req = urllib.request.Request(
                api_url,
                data=payload_json.encode("utf-8"),
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
                continue

        if reading_text:
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"reading": reading_text}).encode("utf-8"))
        else:
            self.send_json_error(502, "The AI service encountered an error. Please try again.")

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
