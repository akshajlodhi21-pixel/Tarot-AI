"""
TAROT AI — 3-Card Architecture & Project Validator
Tests frontend 3-card slots, 20-card deck library, orientation toggles,
backend 3-card contract, 20-card catalog, security, and serverless handlers.
"""

import os
import re
import json
import sys

BASE_DIR = r"c:\Users\HP\OneDrive\Desktop\Tarot AI"

passed = 0
failed = 0
results = []

def test(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
        results.append(f"  ✓ {name}")
    else:
        failed += 1
        results.append(f"  ✗ {name}" + (f" ({details})" if details else ""))

print("\n" + "=" * 60)
print("  TAROT AI — 3-CARD INTERACTIVE DECK ARCHITECTURE VALIDATION")
print("=" * 60 + "\n")

# 1. 20-Card Catalog Verification
print("1. 20-Card Catalog Verification")
catalog_path = os.path.join(BASE_DIR, "data", "cards_catalog.json")
test("data/cards_catalog.json exists", os.path.isfile(catalog_path))

if os.path.isfile(catalog_path):
    with open(catalog_path, "r", encoding="utf-8") as f:
        cards = json.load(f)
    test("Catalog contains exactly 20 cards", len(cards) == 20, f"Found {len(cards)}")
    test("Card 0 is The Fool", cards[0].get("number") == "Card 0" and "Fool" in cards[0].get("name"))
    test("Card 1 is The Magician", cards[1].get("number") == "Card 1" and "Magician" in cards[1].get("name"))
    test("Card 2 is The High Priestess", cards[2].get("number") == "Card 2" and "High Priestess" in cards[2].get("name"))
    test("All cards have number, name, keywords, and description", all("number" in c and "name" in c and "keywords" in c and "description" in c for c in cards))

# 2. Frontend 3-Card Interactive Deck UI
print("\n2. Frontend Interactive Deck & Slots Verification")
html_path = os.path.join(BASE_DIR, "index.html")
if os.path.isfile(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    test("index.html contains Mode Switcher tabs (#tabDeck, #tabPhoto)", 'id="tabDeck"' in html and 'id="tabPhoto"' in html)
    test("index.html contains 20-Card Library Grid (#cardLibrary)", 'id="cardLibrary"' in html)
    test("index.html contains 3 spread slots (#slotPast, #slotPresent, #slotFuture)", 'id="slotPast"' in html and 'id="slotPresent"' in html and 'id="slotFuture"' in html)
    test("index.html contains orientation toggle buttons (#orientPast, #orientPresent, #orientFuture)", 'id="orientPast"' in html and 'id="orientPresent"' in html and 'id="orientFuture"' in html)
    test("index.html contains toolbar actions (#drawRandomBtn, #clearSpreadBtn)", 'id="drawRandomBtn"' in html and 'id="clearSpreadBtn"' in html)
    test("index.html contains slot counter label (#cardCounter)", 'id="cardCounter"' in html)
    test("index.html contains cancel/termination button (#cancelBtn)", 'id="cancelBtn"' in html)
    test("index.html contains server termination button (#stopServerBtn)", 'id="stopServerBtn"' in html)
    test("index.html contains photo mode fallback inputs (#photo1, 2, 3)", 'id="photo1"' in html and 'id="photo2"' in html and 'id="photo3"' in html)

# 3. Client JS Logic
print("\n3. Client-Side Script Verification")
js_path = os.path.join(BASE_DIR, "assets", "js", "app.js")
if os.path.isfile(js_path):
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()
    test("app.js embeds or references 20 CARDS_CATALOG", "CARDS_CATALOG" in js)
    test("app.js manages deckSlots for past, present, future", "deckSlots" in js and "past:" in js and "future:" in js)
    test("app.js renders 20 cards in library grid", "renderCardLibrary" in js and "lib-card-btn" in js)
    test("app.js handles upright / reversed toggles", "toggleOrientation" in js or "orientBtn" in js)
    test("app.js supports random draw 3 toolbar action", "drawRandomBtn" in js)
    test("app.js supports clear spread action", "clearSpreadBtn" in js)
    test("app.js enforces 3 cards before submitting", "missing" in js)
    test("app.js includes lightweight markdown renderer", "renderMarkdown" in js)
    test("app.js implements AbortController for execution termination", "AbortController" in js and "abort()" in js)
    test("app.js handles Escape key to cancel reading", "Escape" in js and "terminateExecution" in js)
    test("app.js implements SpeechSynthesis Voice Reader", "speechSynthesis" in js and "SpeechSynthesisUtterance" in js)
    test("app.js implements markdown cleaner for speech", "cleanMarkdownForSpeech" in js)
    test("app.js implements language detection for English and Hindi", "detectLanguage" in js and "0900" in js)
    test("app.js implements chunking to prevent browser speech cutoff", "chunks" in js and "sentenceRegex" in js)
    test("app.js binds Listen, Play/Pause, Stop, and Replay controls", "listenBtn" in js and "ctrlPlayPauseBtn" in js and "ctrlStopBtn" in js and "ctrlReplayBtn" in js)

# 4. Frontend AI Voice Reader UI Verification
print("\n4. AI Voice Reader UI Verification")
if os.path.isfile(html_path):
    test("index.html contains Listen to Reading button (#listenBtn)", 'id="listenBtn"' in html)
    test("index.html contains Audio Player card (#voicePlayerCard)", 'id="voicePlayerCard"' in html)
    test("index.html contains audio controls (#ctrlPlayPauseBtn, #ctrlStopBtn, #ctrlReplayBtn)", 'id="ctrlPlayPauseBtn"' in html and 'id="ctrlStopBtn"' in html and 'id="ctrlReplayBtn"' in html)
    test("index.html contains progress bar (#playerProgressTrack, #playerProgressFill)", 'id="playerProgressTrack"' in html and 'id="playerProgressFill"' in html)
    test("index.html contains Voice Settings drawer (#voiceSettingsPanel)", 'id="voiceSettingsPanel"' in html)
    test("index.html contains voice, rate, and pitch controls (#voiceSelect, #rateSlider, #pitchSlider)", 'id="voiceSelect"' in html and 'id="rateSlider"' in html and 'id="pitchSlider"' in html)

# 5. Backend Serverless Functions (Vercel & Netlify)
print("\n5. Serverless Backend Function Verification")
v_fn_path = os.path.join(BASE_DIR, "api", "reading.js")
test("api/reading.js (Vercel Serverless Function) exists", os.path.isfile(v_fn_path))
if os.path.isfile(v_fn_path):
    with open(v_fn_path, "r", encoding="utf-8") as f:
        v_fn = f.read()
    test("api/reading.js handles Vercel req/res signature", "module.exports" in v_fn and "req, res" in v_fn)
    test("api/reading.js requires exactly 3 cards", "cardList.length !== 3" in v_fn)
    test("api/reading.js supports orientation (Upright vs Reversed)", "Reversed" in v_fn and "Upright" in v_fn)

v_cfg = os.path.join(BASE_DIR, "vercel.json")
test("vercel.json exists", os.path.isfile(v_cfg))
if os.path.isfile(v_cfg):
    with open(v_cfg, "r", encoding="utf-8") as f:
        v_data = json.load(f)
    test("vercel.json configures maxDuration 60", v_data.get("functions", {}).get("api/reading.js", {}).get("maxDuration") == 60)
    test("vercel.json configures Content-Security-Policy", any("Content-Security-Policy" in str(h) for h in v_data.get("headers", [])))

fn_path = os.path.join(BASE_DIR, "netlify", "functions", "reading.js")
if os.path.isfile(fn_path):
    with open(fn_path, "r", encoding="utf-8") as f:
        fn = f.read()
    test("netlify reading.js loads or contains 20-card catalog", "loadCardCatalog" in fn or "CARDS_CATALOG" in fn)
    test("netlify reading.js requires exactly 3 cards", "cardList.length !== 3" in fn)
    test("netlify reading.js supports orientation (Upright vs Reversed)", "Reversed" in fn and "Upright" in fn)
    test("netlify reading.js enforces 3-card spread positions (Past, Present, Future)", "Position 1" in fn and "Position 2" in fn and "Position 3" in fn)

# 6. Admin Judge Mode Verification
print("\n6. Admin Judge Mode & Lock System Verification")
lock_store_path = os.path.join(BASE_DIR, "api", "_lock_store.js")
test("api/_lock_store.js exists", os.path.isfile(lock_store_path))
if os.path.isfile(lock_store_path):
    with open(lock_store_path, "r", encoding="utf-8") as f:
        ls_code = f.read()
    test("Lock store defaults to locked state", "locked: true" in ls_code)
    test("Lock store verifies admin PIN securely with timingSafeEqual", "timingSafeEqual" in ls_code)
    test("Lock store creates and verifies HMAC tokens", "createAdminToken" in ls_code and "verifyAdminToken" in ls_code)

admin_ep_path = os.path.join(BASE_DIR, "api", "admin.js")
test("api/admin.js exists", os.path.isfile(admin_ep_path))
if os.path.isfile(admin_ep_path):
    with open(admin_ep_path, "r", encoding="utf-8") as f:
        adm_code = f.read()
    test("api/admin.js supports unlock action", "action === 'unlock'" in adm_code)
    test("api/admin.js supports lock action", "action === 'lock'" in adm_code)
    test("api/admin.js supports set-timeout action", "action === 'set-timeout'" in adm_code)
    test("api/admin.js mitigates brute force attacks", "isLoginRateLimited" in adm_code or "failedAttempts" in adm_code)

lock_status_path = os.path.join(BASE_DIR, "api", "lock-status.js")
test("api/lock-status.js exists", os.path.isfile(lock_status_path))

if os.path.isfile(html_path):
    test("index.html contains Lock Screen Overlay (#lockScreenOverlay)", 'id="lockScreenOverlay"' in html)
    test("index.html contains Admin Login Modal (#adminModal)", 'id="adminModal"' in html)
    test("index.html contains Admin Floating Bar (#adminBar)", 'id="adminBar"' in html)
    test("index.html contains Admin Settings Modal (#adminSettingsModal)", 'id="adminSettingsModal"' in html)

if os.path.isfile(js_path):
    test("app.js checks lock status on startup and intervals", "fetchLockStatus" in js)
    test("app.js handles admin unlock with PIN submission", "handleAdminUnlock" in js)
    test("app.js handles admin immediate lock", "handleAdminLock" in js)
    test("app.js handles inactivity auto-lock", "checkInactivity" in js or "autoLockMinutes" in js)
    test("app.js immediately halts voice narration when locked", "stopVoiceReader" in js)

if os.path.isfile(v_fn_path):
    test("api/reading.js blocks readings with HTTP 423 when locked", "423" in v_fn and "getLockState" in v_fn)

dev_path = os.path.join(BASE_DIR, "dev_server.py")
if os.path.isfile(dev_path):
    with open(dev_path, "r", encoding="utf-8") as f:
        dev_code = f.read()
    test("dev_server.py supports /api/admin endpoint", "handle_admin" in dev_code)
    test("dev_server.py supports /api/lock-status endpoint", "/api/lock-status" in dev_code)
    test("dev_server.py blocks readings with HTTP 423 when locked", "423" in dev_code and "DEV_LOCK_STATE" in dev_code)

# Print summary
print("\n" + "=" * 60)
for r in results:
    print(r)
print("=" * 60)
print(f"\nTotal: {passed + failed} | Passed: {passed} | Failed: {failed}\n")

if failed > 0:
    sys.exit(1)
