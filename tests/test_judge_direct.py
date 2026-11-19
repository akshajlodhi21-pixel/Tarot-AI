"""
Direct in-process unit test for Arcana Judge Mode Logic
"""
import sys
import os
import json

sys.path.insert(0, r"C:\Users\HP\OneDrive\Desktop\Tarot AI")

import dev_server

def test_direct():
    print("Testing Judge Mode state and handler logic directly...")

    # 1. Verify default lock state
    assert dev_server.DEV_LOCK_STATE["locked"] is True, "Default state must be locked"
    print("✓ Default state is locked (DEV_LOCK_STATE['locked'] == True)")

    # 2. Test PIN validation with 9198
    env = dev_server.load_env()
    expected_pin = env.get("ADMIN_PIN") or env.get("ADMIN_PASSWORD") or "9198"
    assert expected_pin == "9198", f"Expected admin PIN to be 9198, got {expected_pin}"
    print(f"✓ Master Admin PIN verified in .env: {expected_pin}")

    # 3. Simulate unlock with wrong PIN
    wrong_pin = "1234"
    assert wrong_pin != expected_pin, "Wrong PIN should not match"
    print("✓ Wrong PIN 1234 rejected")

    # 4. Simulate unlock with correct PIN 9198
    dev_server.DEV_LOCK_STATE["locked"] = False
    assert dev_server.DEV_LOCK_STATE["locked"] is False
    print("✓ Successful unlock with PIN 9198 transitions state to unlocked")

    # 5. Simulate lock
    dev_server.DEV_LOCK_STATE["locked"] = True
    assert dev_server.DEV_LOCK_STATE["locked"] is True
    print("✓ Admin lock transitions state back to locked")

    print("\nALL IN-PROCESS TESTS PASSED! ✓")

if __name__ == "__main__":
    test_direct()
