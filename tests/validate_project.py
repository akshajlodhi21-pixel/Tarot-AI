"""
TAROT AI — 3-Card Architecture & Project Validator
Tests frontend 3-card slots, backend 3-card contract, 20-card catalog,
security, and serverless handlers.
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
print("  TAROT AI — 3-CARD DECK & ARCHITECTURE VALIDATION")
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

    # Verify physical image files
    img_dir = os.path.join(BASE_DIR, "tarot-cards-images")
    test("tarot-cards-images folder exists", os.path.isdir(img_dir))
    existing_images = os.listdir(img_dir) if os.path.isdir(img_dir) else []
    test("tarot-cards-images contains 20 image files", len(existing_images) == 20, f"Found {len(existing_images)}")
    for c in cards:
        fname = c.get("fileName")
        test(f"Image file exists: {fname}", fname in existing_images)

# 2. Frontend 3-Card Upload Slots
print("\n2. Frontend 3-Card Upload Slots Verification")
html_path = os.path.join(BASE_DIR, "index.html")
if os.path.isfile(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    test("index.html contains Card 1 input (#photo1)", 'id="photo1"' in html)
    test("index.html contains Card 2 input (#photo2)", 'id="photo2"' in html)
    test("index.html contains Card 3 input (#photo3)", 'id="photo3"' in html)
    test("index.html contains Card 1 dropzone (#dropzone1)", 'id="dropzone1"' in html)
    test("index.html contains Card 2 dropzone (#dropzone2)", 'id="dropzone2"' in html)
    test("index.html contains Card 3 dropzone (#dropzone3)", 'id="dropzone3"' in html)
    test("index.html contains Card counter badge (#cardCounter)", 'id="cardCounter"' in html)
    test("index.html contains individual remove buttons (#removeBtn1, 2, 3)", 'id="removeBtn1"' in html and 'id="removeBtn2"' in html and 'id="removeBtn3"' in html)
    test("index.html contains cancel/termination button (#cancelBtn)", 'id="cancelBtn"' in html)
    test("index.html contains server termination button (#stopServerBtn)", 'id="stopServerBtn"' in html)

# 3. Client JS Logic
print("\n3. Client-Side Script Verification")
js_path = os.path.join(BASE_DIR, "assets", "js", "app.js")
if os.path.isfile(js_path):
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()
    test("app.js tracks 3 discrete slots", "SLOTS_COUNT = 3" in js)
    test("app.js enforces all 3 cards before submitting", "missing" in js and "Exactly 3 are required" in js)
    test("app.js sends structured cards payload", "cards:" in js)
    test("app.js includes markdown renderer", "renderMarkdown" in js)
    test("app.js implements AbortController for execution termination", "AbortController" in js and "abort()" in js)
    test("app.js handles Escape key to cancel reading", "Escape" in js and "terminateExecution" in js)

# 4. Backend Netlify Function
print("\n4. Serverless Backend Function Verification")
fn_path = os.path.join(BASE_DIR, "netlify", "functions", "reading.js")
if os.path.isfile(fn_path):
    with open(fn_path, "r", encoding="utf-8") as f:
        fn = f.read()
    test("reading.js loads or contains 20-card catalog", "loadCardCatalog" in fn or "CARDS_CATALOG" in fn)
    test("reading.js requires exactly 3 cards", "rawImages.length !== 3" in fn or "Exactly 3 cards are required" in fn)
    test("reading.js validates each card MIME type and size", "parseImageDataUrl" in fn)
    test("reading.js injects 3 image parts into Gemini contentParts", "inlineData" in fn)
    test("reading.js enforces 3-card spread positions (Past, Present, Future)", "Position 1" in fn and "Position 2" in fn and "Position 3" in fn)

# Print summary
print("\n" + "=" * 60)
for r in results:
    print(r)
print("=" * 60)
print(f"\nTotal: {passed + failed} | Passed: {passed} | Failed: {failed}\n")

if failed > 0:
    sys.exit(1)
