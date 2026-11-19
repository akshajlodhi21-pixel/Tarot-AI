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

# 4. Backend Netlify Function
print("\n4. Serverless Backend Function Verification")
fn_path = os.path.join(BASE_DIR, "netlify", "functions", "reading.js")
if os.path.isfile(fn_path):
    with open(fn_path, "r", encoding="utf-8") as f:
        fn = f.read()
    test("reading.js loads or contains 20-card catalog", "loadCardCatalog" in fn or "CARDS_CATALOG" in fn)
    test("reading.js requires exactly 3 cards", "cardList.length !== 3" in fn)
    test("reading.js supports orientation (Upright vs Reversed)", "Reversed" in fn and "Upright" in fn)
    test("reading.js enforces 3-card spread positions (Past, Present, Future)", "Position 1" in fn and "Position 2" in fn and "Position 3" in fn)

# Print summary
print("\n" + "=" * 60)
for r in results:
    print(r)
print("=" * 60)
print(f"\nTotal: {passed + failed} | Passed: {passed} | Failed: {failed}\n")

if failed > 0:
    sys.exit(1)
