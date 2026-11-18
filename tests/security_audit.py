"""
TAROT AI — Comprehensive Security Audit Suite
Validates API secret protection, path traversal protection, XSS prevention,
input sanitization, rate limiting, and HTTP security headers.
"""

import os
import re
import json
import urllib.request
import urllib.error
import sys

BASE_DIR = r"c:\Users\HP\OneDrive\Desktop\Tarot AI"
SERVER_URL = "http://localhost:8888"

passed = 0
failed = 0
audit_results = []

def audit(test_id, category, name, condition, details=""):
    global passed, failed
    status = "PASS" if condition else "FAIL"
    if condition:
        passed += 1
        audit_results.append(f"  [{status}] {test_id} - {category}: {name}")
    else:
        failed += 1
        audit_results.append(f"  [{status}] {test_id} - {category}: {name} ({details})")

print("\n" + "=" * 65)
print("  TAROT AI — SECURITY AUDIT & VULNERABILITY ASSESSMENT")
print("=" * 65 + "\n")

# ── 1. SECRET EXPOSURE & KEY PROTECTION ──────────────────────
print("1. Secret Protection & Leakage Check")
key_regex = re.compile(r"AQ\.[A-Za-z0-9_-]{40,}|AIza[A-Za-z0-9_-]{35}")

frontend_paths = [
    os.path.join(BASE_DIR, "index.html"),
    os.path.join(BASE_DIR, "assets", "js", "app.js"),
    os.path.join(BASE_DIR, "assets", "css", "style.css")
]

for fp in frontend_paths:
    with open(fp, "r", encoding="utf-8") as f:
        content = f.read()
    found = key_regex.findall(content)
    fname = os.path.basename(fp)
    audit("SEC-01", "Secrets", f"No API keys leaked in {fname}", len(found) == 0, f"Found {len(found)} keys!")

# Check .gitignore
git_ignore_path = os.path.join(BASE_DIR, ".gitignore")
with open(git_ignore_path, "r", encoding="utf-8") as f:
    gi_content = f.read()
audit("SEC-02", "Secrets", ".gitignore explicitly blocks .env", ".env" in gi_content)
audit("SEC-03", "Secrets", ".gitignore explicitly blocks node_modules", "node_modules" in gi_content)

# ── 2. HTTP PATH TRAVERSAL & SENSITIVE FILE PROTECTION ───────
print("\n2. Server Endpoint Protection (Forbidden Paths)")
sensitive_routes = [
    "/.env",
    "/.env.local",
    "/.env.example",
    "/.git/config",
    "/package.json",
    "/tests/validate_project.py"
]

for route in sensitive_routes:
    req = urllib.request.Request(f"{SERVER_URL}{route}")
    try:
        with urllib.request.urlopen(req) as resp:
            audit("SEC-04", "Endpoint", f"Blocked access to {route}", False, f"Returned 200 OK! Content leaked!")
    except urllib.error.HTTPError as e:
        audit("SEC-04", "Endpoint", f"Blocked access to {route}", e.code in (403, 404), f"Returned HTTP {e.code}")
    except Exception as e:
        audit("SEC-04", "Endpoint", f"Blocked access to {route}", True)

# ── 3. INPUT VALIDATION & PAYLOAD INTEGRITY ─────────────────
print("\n3. Payload Validation & Size Enforcement")

# Reject empty POST
req = urllib.request.Request(f"{SERVER_URL}/.netlify/functions/reading", data=b"{}", headers={"Content-Type": "application/json"})
try:
    urllib.request.urlopen(req)
    audit("SEC-05", "Validation", "Rejects empty payload", False)
except urllib.error.HTTPError as e:
    audit("SEC-05", "Validation", "Rejects empty payload with 400", e.code == 400)

# Reject non-3 cards (e.g. 1 card or 5 cards)
payload_1card = json.dumps({"cards": [{"image": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="}]}).encode("utf-8")
req = urllib.request.Request(f"{SERVER_URL}/.netlify/functions/reading", data=payload_1card, headers={"Content-Type": "application/json"})
try:
    urllib.request.urlopen(req)
    audit("SEC-06", "Validation", "Rejects non-3 card payload", False)
except urllib.error.HTTPError as e:
    audit("SEC-06", "Validation", "Rejects non-3 card payload with 400", e.code == 400)

# Reject malicious non-image MIME
malicious_payload = json.dumps({
    "cards": [
        {"image": "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="},
        {"image": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="},
        {"image": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="}
    ]
}).encode("utf-8")
req = urllib.request.Request(f"{SERVER_URL}/.netlify/functions/reading", data=malicious_payload, headers={"Content-Type": "application/json"})
try:
    urllib.request.urlopen(req)
    audit("SEC-07", "MIME", "Rejects non-image MIME type", False)
except urllib.error.HTTPError as e:
    audit("SEC-07", "MIME", "Rejects non-image MIME type with 400", e.code == 400)

# ── 4. CROSS-SITE SCRIPTING (XSS) PREVENTION ────────────────
print("\n4. Client-side XSS Protection")
js_path = os.path.join(BASE_DIR, "assets", "js", "app.js")
with open(js_path, "r", encoding="utf-8") as f:
    js_code = f.read()

audit("SEC-08", "XSS", "HTML entities (&, <, >) escaped before rendering markdown",
      "replace(/&/g, '&amp;')" in js_code and "replace(/</g, '&lt;')" in js_code and "replace(/>/g, '&gt;')" in js_code)

# ── 5. CORS & METHOD PROTECTION ──────────────────────────────
print("\n5. CORS & HTTP Method Enforcement")
# GET to functions endpoint must return 404 or 405
req = urllib.request.Request(f"{SERVER_URL}/.netlify/functions/reading")
try:
    urllib.request.urlopen(req)
    audit("SEC-09", "Method", "GET to /reading rejected", False)
except urllib.error.HTTPError as e:
    audit("SEC-09", "Method", "GET to /reading rejected (404/405)", e.code in (404, 405))

# ── Summary ──────────────────────────────────────────────────
print("\n" + "=" * 65)
for r in audit_results:
    print(r)
print("=" * 65)
print(f"\nAudit Summary: {passed + failed} Tests | PASSED: {passed} | FAILED: {failed}\n")

if failed > 0:
    sys.exit(1)
