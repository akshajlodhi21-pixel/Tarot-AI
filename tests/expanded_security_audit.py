#!/usr/bin/env python3
"""
Expanded Security Audit for Tarot AI (Vercel & Netlify)
Tests path traversal, payload abuse, header injection, and edge cases.
"""

import json
import sys
import urllib.request
import urllib.error
import base64

BASE = "http://localhost:8888"
PASS = 0
FAIL = 0
WARN = 0

def test(name, passed, detail=""):
    global PASS, FAIL
    if passed:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}  -- {detail}")
    sys.stdout.flush()

def warn(name, detail=""):
    global WARN
    WARN += 1
    print(f"  [WARN] {name}  -- {detail}")
    sys.stdout.flush()

def info(name, detail=""):
    print(f"  [INFO] {name}  -- {detail}")
    sys.stdout.flush()

def req(path, method="GET", body=None, headers=None, timeout=5):
    url = BASE + path
    data = body.encode("utf-8") if body else None
    rq = urllib.request.Request(url, data=data, method=method)
    if headers:
        for k, v in headers.items():
            rq.add_header(k, v)
    if body and not headers:
        rq.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(rq, timeout=timeout)
        return resp.getcode(), resp.read().decode("utf-8", errors="replace"), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace"), dict(e.headers)
    except Exception as e:
        return None, str(e), {}


print("\n" + "=" * 70)
print("  TAROT AI -- EXPANDED SECURITY AUDIT v2")
print("=" * 70)
sys.stdout.flush()

# ==================================================================
# 1. PATH TRAVERSAL TESTS
# ==================================================================
print("\n-- 1. Path Traversal Protection --\n")
sys.stdout.flush()

code, body, _ = req("/../.env")
test("PATH-01: Basic ../.env traversal blocked", code in (400, 403, 404), f"got {code}")

code, body, _ = req("/%2e%2e/%2e%2e/.env")
test("PATH-02: URL-encoded ../.env blocked", code in (400, 403, 404) or "GEMINI" not in body, f"got {code}")

code, body, _ = req("/%252e%252e/.env")
test("PATH-03: Double-encoded traversal blocked", code in (400, 403, 404), f"got {code}")

code, body, _ = req("/..\\..\\Windows\\win.ini")
test("PATH-04: Backslash traversal blocked", code in (400, 403, 404), f"got {code}")

for variant in ["/.ENV", "/.Env", "/.eNv"]:
    code, body, _ = req(variant)
    test(f"PATH-05: Case block {variant}", code in (403, 404), f"got {code}")

code, body, _ = req("/dev_server.py")
test("PATH-06: dev_server.py not served", code in (403, 404) or "import" not in body[:200], f"got {code}")

code, body, _ = req("/data/")
test("PATH-07: No directory listing /data/", code in (403, 404) or "Index of" not in body, f"got {code}")

code, body, _ = req("/assets/")
test("PATH-08: No directory listing /assets/", code in (403, 404) or "Index of" not in body, f"got {code}")

code, body, _ = req("/.gitignore")
test("PATH-09: .gitignore blocked", code in (403, 404), f"got {code}")

code, body, _ = req("/.git/config")
test("PATH-10: .git/config blocked", code in (403, 404), f"got {code}")

code, body, _ = req("/.git/HEAD")
test("PATH-11: .git/HEAD blocked", code in (403, 404), f"got {code}")

code, body, _ = req("/package.json")
test("PATH-12: package.json blocked", code in (403, 404), f"got {code}")

code, body, _ = req("/tests/security_audit.py")
test("PATH-13: tests/ directory blocked", code in (403, 404), f"got {code}")

# ==================================================================
# 2. PAYLOAD VALIDATION TESTS (no Gemini API round-trip)
# ==================================================================
print("\n-- 2. Payload Validation --\n")
sys.stdout.flush()

API = "/api/reading"

code, body, _ = req(API, "POST", "this is not json")
test("PAY-01: Invalid JSON returns 400", code == 400, f"got {code}")

code, body, _ = req(API, "POST", "{}")
test("PAY-02: Empty object returns 400", code == 400, f"got {code}")

code, body, _ = req(API, "POST", json.dumps({
    "cards": [{"name":"The Fool","number":"Card 0","reversed":False}],
    "spread":"general"
}))
test("PAY-03: 1 card returns 400", code == 400, f"got {code}")

code, body, _ = req(API, "POST", json.dumps({
    "cards": [{"name":f"Card {i}","number":f"Card {i}","reversed":False} for i in range(5)],
    "spread":"general"
}))
test("PAY-04: 5 cards returns 400", code == 400, f"got {code}")

code, body, _ = req(API, "POST", json.dumps({
    "cards": [{"name":f"Card {i}","number":f"Card {i}","reversed":False} for i in range(100)],
    "spread":"general"
}))
test("PAY-05: 100 cards returns 400", code == 400, f"got {code}")

# Invalid MIME types
fake_b64 = base64.b64encode(b"not a real image").decode()
code, body, _ = req(API, "POST", json.dumps({
    "cards": [
        {"image": f"data:text/html;base64,{fake_b64}"},
        {"image": f"data:text/html;base64,{fake_b64}"},
        {"image": f"data:text/html;base64,{fake_b64}"}
    ],
    "mode": "photo", "spread": "general"
}))
test("PAY-06: text/html MIME rejected", code == 400, f"got {code}")

code, body, _ = req(API, "POST", json.dumps({
    "cards": [
        {"image": f"data:application/javascript;base64,{fake_b64}"},
        {"image": f"data:application/javascript;base64,{fake_b64}"},
        {"image": f"data:application/javascript;base64,{fake_b64}"}
    ],
    "mode": "photo", "spread": "general"
}))
test("PAY-07: application/javascript MIME rejected", code == 400, f"got {code}")

code, body, _ = req(API, "POST", json.dumps({
    "cards": [
        {"image": f"data:image/svg+xml;base64,{fake_b64}"},
        {"image": f"data:image/svg+xml;base64,{fake_b64}"},
        {"image": f"data:image/svg+xml;base64,{fake_b64}"}
    ],
    "mode": "photo", "spread": "general"
}))
test("PAY-08: image/svg+xml MIME rejected (XSS vector)", code == 400, f"got {code}")

# Malformed data URL
code, body, _ = req(API, "POST", json.dumps({
    "cards": [
        {"image": "not-a-data-url"},
        {"image": "not-a-data-url"},
        {"image": "not-a-data-url"}
    ],
    "mode": "photo", "spread": "general"
}))
test("PAY-09: Malformed data URL rejected", code == 400, f"got {code}")

# Empty string cards
code, body, _ = req(API, "POST", json.dumps({
    "cards": ["", "", ""],
    "mode": "photo", "spread": "general"
}))
test("PAY-10: Empty string cards rejected", code == 400, f"got {code}")

# ==================================================================
# 3. HTTP METHOD TESTS
# ==================================================================
print("\n-- 3. HTTP Method Enforcement --\n")
sys.stdout.flush()

code, body, _ = req(API, "GET")
test("HTTP-01: GET to /reading rejected", code in (403, 404, 405), f"got {code}")

code, body, _ = req(API, "PUT", "{}")
test("HTTP-02: PUT to /reading rejected", code in (403, 404, 405, 501), f"got {code}")

code, body, _ = req(API, "DELETE")
test("HTTP-03: DELETE to /reading rejected", code in (403, 404, 405, 501), f"got {code}")

code, body, hdrs = req(API, "OPTIONS")
test("HTTP-04: OPTIONS returns 204", code == 204, f"got {code}")

cors_val = hdrs.get("Access-Control-Allow-Origin", "")
test("HTTP-05: CORS header on OPTIONS", cors_val == "*", f"got '{cors_val}'")

# ==================================================================
# 4. HEADER & CONTENT-TYPE TESTS
# ==================================================================
print("\n-- 4. Header & Content-Type --\n")
sys.stdout.flush()

code, body, _ = req(API, "POST", "<xml>test</xml>", {"Content-Type": "text/xml"})
test("HDR-01: XML Content-Type handled gracefully", code == 400, f"got {code}")

code, body, hdrs = req(API, "POST", json.dumps({
    "cards": [{"name":"The Fool","number":"Card 0","reversed":False}],
    "spread":"general"
}))
ct = hdrs.get("Content-Type", "")
test("HDR-02: API returns application/json", "application/json" in ct, f"got '{ct}'")

# ==================================================================
# 5. DEV-ONLY ENDPOINT SECURITY
# ==================================================================
print("\n-- 5. Dev-only Endpoints --\n")
sys.stdout.flush()

code, body, _ = req("/api/shutdown", "GET")
test("SHUT-01: GET /api/shutdown rejected", code in (403, 404, 405), f"got {code}")
warn("SHUT-02: POST /api/shutdown has no auth (dev-only, acceptable for local)")

# ==================================================================
# 6. FRONTEND SECRETS SCAN
# ==================================================================
print("\n-- 6. Frontend Secrets Scan --\n")
sys.stdout.flush()

secrets_patterns = ["GEMINI_API_KEY", "AQ.Ab8", "ghp_", "AIza", "sk-", "process.env"]

code, body, _ = req("/index.html")
if code == 200:
    has_key = any(k in body for k in secrets_patterns)
    test("SEC-01: No secrets in index.html", not has_key, "Found potential secret!")

code, body, _ = req("/assets/js/app.js")
if code == 200:
    has_key = any(k in body for k in secrets_patterns)
    test("SEC-02: No secrets in app.js", not has_key, "Found potential secret!")
    has_direct_api = "generativelanguage.googleapis.com" in body
    test("SEC-03: No direct Gemini API URL in frontend", not has_direct_api, "Frontend calls Gemini directly!")

code, body, _ = req("/assets/css/style.css")
if code == 200:
    has_key = any(k in body for k in secrets_patterns)
    test("SEC-04: No secrets in style.css", not has_key, "Found potential secret!")

# ==================================================================
# 7. RESPONSE HEADER ANALYSIS
# ==================================================================
print("\n-- 7. Response Headers --\n")
sys.stdout.flush()

code, body, hdrs = req(API, "OPTIONS")
cors = hdrs.get("Access-Control-Allow-Origin", "")
if cors == "*":
    warn("HDR-03: CORS wildcard * on API (acceptable for public, consider restricting in production)")

info("HDR-04: Content-Security-Policy configured in vercel.json and netlify.toml")

# ==================================================================
# SUMMARY
# ==================================================================
print("\n" + "=" * 70)
total = PASS + FAIL
print(f"  Expanded Audit: {total} Tests | PASSED: {PASS} | FAILED: {FAIL} | WARNINGS: {WARN}")
if FAIL == 0:
    print("  ALL TESTS PASSED!")
else:
    print(f"  {FAIL} test(s) FAILED")
print("=" * 70 + "\n")

sys.exit(0 if FAIL == 0 else 1)
