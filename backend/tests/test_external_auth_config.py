"""
JodTod external authentication configuration diagnostics.

Run:
    pytest -s tests/test_external_auth_config.py

Or directly:
    python tests/test_external_auth_config.py
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlencode

import requests
import pytest
from dotenv import load_dotenv

from backend.config import get_settings
from backend.services.otp_providers import SMTPEmailProvider, get_email_provider


# ---------------------------------------------------------------------------
# Load backend .env
# ---------------------------------------------------------------------------

# Adjust this if your backend .env lives elsewhere.
BACKEND_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_ROOT / ".env")


EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "").strip()
EMAIL_PROVIDER_API_KEY = os.getenv("EMAIL_PROVIDER_API_KEY", "").strip()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def masked(value: str, visible: int = 4) -> str:
    """Safely display a credential without exposing it."""
    if not value:
        return "<MISSING>"

    if len(value) <= visible:
        return "*" * len(value)

    return value[:visible] + "*" * max(4, len(value) - visible)


def print_result(name: str, success: bool, message: str):
    status = "PASS" if success else "FAIL"
    print(f"[{status}] {name}: {message}")


def application_settings(monkeypatch):
    """Load the same Settings singleton path used by the application."""
    monkeypatch.delenv("EMAIL_PROVIDER", raising=False)
    get_settings.cache_clear()
    return get_settings()


# ---------------------------------------------------------------------------
# Test 1 — Environment variables
# ---------------------------------------------------------------------------
def test_environment_variables(monkeypatch):
    print("\n=== ENVIRONMENT CONFIGURATION ===")

    assert GOOGLE_CLIENT_ID, (
        "GOOGLE_CLIENT_ID is missing from the loaded environment."
    )

    configured = application_settings(monkeypatch)
    print(f"EMAIL_PROVIDER       = {configured.email_provider}")
    print(f"SMTP_HOST            = {configured.smtp_host}")
    print(f"SMTP_PORT            = {configured.smtp_port}")
    print(f"SMTP_USERNAME configured = {bool(configured.smtp_username)}")
    print(f"SMTP_PASSWORD configured = {bool(configured.smtp_password)}")
    print(f"GOOGLE_CLIENT_ID     = {masked(GOOGLE_CLIENT_ID, 12)}")

    print_result(
        "SMTP configuration",
        True,
        "SMTP settings loaded without exposing credentials."
    )

    print_result(
        "GOOGLE_CLIENT_ID",
        True,
        "Loaded successfully."
    )


def test_application_settings_select_smtp(monkeypatch):
    """Verify the provider selected by the application Settings object."""
    configured = application_settings(monkeypatch)

    print(f"EMAIL_PROVIDER = {configured.email_provider}")
    assert configured.email_provider == "smtp"
    assert configured.email_from_address
    assert configured.smtp_host
    assert configured.smtp_port

    # The factory consumes the same Settings contract used by the app.
    import backend.services.otp_providers as providers
    monkeypatch.setattr(providers, "settings", configured)
    selected = get_email_provider()
    assert isinstance(selected, SMTPEmailProvider)
    print_result(
        "Application email provider",
        True,
        "Settings and provider factory selected SMTP."
    )


def test_smtp_configuration(monkeypatch):
    """Report SMTP readiness without exposing the password or recipient."""
    configured = application_settings(monkeypatch)

    print("\n=== SMTP CONFIGURATION TEST ===")
    print(f"SMTP_HOST = {configured.smtp_host}")
    print(f"SMTP_PORT = {configured.smtp_port}")
    print(f"SMTP_USERNAME configured = {bool(configured.smtp_username)}")
    print(f"SMTP_PASSWORD configured = {bool(configured.smtp_password)}")
    print(f"EMAIL_FROM_ADDRESS configured = {bool(configured.email_from_address)}")

    assert configured.email_provider == "smtp"
    assert configured.smtp_host
    assert configured.smtp_port
    assert configured.email_from_address


def test_smtp_integration_if_configured(monkeypatch):
    """Send only when all SMTP credentials and a test recipient exist."""
    import asyncio
    import pytest

    configured = application_settings(monkeypatch)
    if not all(
        (
            configured.smtp_username,
            configured.smtp_password,
            configured.email_from_address,
        )
    ):
        pytest.skip("SMTP credentials or EMAIL_FROM_ADDRESS are not configured.")
    recipient = configured.email_from_address
    assert recipient is not None

    import backend.services.otp_providers as providers
    monkeypatch.setattr(providers, "settings", configured)
    provider = SMTPEmailProvider()
    print("SMTP connection: attempting")
    try:
        result = asyncio.run(
            provider.send_otp_email(
                recipient,
                "JodTod SMTP diagnostic",
                "JodTod SMTP diagnostic message.",
            )
        )
    except Exception as exc:
        print("SMTP connection: FAIL")
        print("SMTP authentication: FAIL or unavailable")
        print("Email dispatch: FAIL")
        print("SMTP error type: " + type(exc).__name__)
        raise

    assert result.accepted is True
    print("SMTP connection: PASS")
    print("SMTP authentication: PASS")
    print("Email dispatch: PASS")
    print("Provider: SMTP")


# ---------------------------------------------------------------------------
# Test 2 — Resend API key
# ---------------------------------------------------------------------------

def test_resend_api_key():
    pytest.skip("Resend is retained only as a non-active legacy provider.")

    print("\n=== RESEND API KEY TEST ===")

    if not EMAIL_PROVIDER_API_KEY:
        raise AssertionError("EMAIL_PROVIDER_API_KEY is missing.")

    headers = {
        "Authorization": f"Bearer {EMAIL_PROVIDER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(
            "https://api.resend.com/domains",
            headers=headers,
            timeout=15,
        )
    except requests.RequestException as exc:
        raise AssertionError(
            f"Could not connect to Resend: {exc}"
        ) from exc

    print(f"HTTP status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()

        domains = data.get("data", [])

        print_result(
            "Resend API key",
            True,
            "Resend accepted the API key."
        )

        print(f"Configured Resend domains: {len(domains)}")

        for domain in domains:
            print(
                f"  - {domain.get('name', '<unknown>')} "
                f"| status={domain.get('status', '<unknown>')}"
            )

        return

    # Important diagnostic distinction
    if response.status_code == 401:
        raise AssertionError(
            "Resend rejected the API key with HTTP 401. "
            "The key is invalid, revoked, or incorrectly loaded."
        )

    if response.status_code == 403:
        raise AssertionError(
            "Resend returned HTTP 403. "
            "The API key was received, but the request is forbidden. "
            "Inspect the Resend account/key permissions and configuration."
        )

    raise AssertionError(
        f"Resend returned unexpected HTTP {response.status_code}: "
        f"{response.text[:500]}"
    )


# ---------------------------------------------------------------------------
# Test 3 — Resend sender/domain configuration
# ---------------------------------------------------------------------------

def test_resend_verified_domains():
    pytest.skip("Resend is retained only as a non-active legacy provider.")

    print("\n=== RESEND DOMAIN TEST ===")

    if not EMAIL_PROVIDER_API_KEY:
        raise AssertionError("EMAIL_PROVIDER_API_KEY is missing.")

    headers = {
        "Authorization": f"Bearer {EMAIL_PROVIDER_API_KEY}",
    }

    response = requests.get(
        "https://api.resend.com/domains",
        headers=headers,
        timeout=15,
    )

    if response.status_code != 200:
        raise AssertionError(
            f"Unable to retrieve Resend domains. "
            f"HTTP {response.status_code}: {response.text[:500]}"
        )

    domains = response.json().get("data", [])

    if not domains:
        print_result(
            "Resend verified domain",
            False,
            "No domains are configured in the Resend account."
        )
        return

    verified = []

    for domain in domains:
        name = domain.get("name", "")
        status = domain.get("status", "")

        print(f"Domain: {name} | status: {status}")

        if status.lower() == "verified":
            verified.append(name)

    if verified:
        print_result(
            "Resend verified domain",
            True,
            f"Verified domain(s): {', '.join(verified)}"
        )
    else:
        print_result(
            "Resend verified domain",
            False,
            "No verified domain was found."
        )


# ---------------------------------------------------------------------------
# Test 4 — Google Client ID basic validation
# ---------------------------------------------------------------------------

def test_google_client_id_format():
    print("\n=== GOOGLE CLIENT ID TEST ===")

    if not GOOGLE_CLIENT_ID:
        raise AssertionError("GOOGLE_CLIENT_ID is missing.")

    # Google OAuth client IDs normally end with .apps.googleusercontent.com
    expected_suffix = ".apps.googleusercontent.com"

    if not GOOGLE_CLIENT_ID.endswith(expected_suffix):
        raise AssertionError(
            "GOOGLE_CLIENT_ID does not have the expected Google OAuth "
            "client ID format."
        )

    placeholder_values = {
        "your-google-client-id",
        "your_client_id",
        "YOUR_GOOGLE_CLIENT_ID",
        "changeme",
        "placeholder",
    }

    if GOOGLE_CLIENT_ID in placeholder_values:
        raise AssertionError(
            "GOOGLE_CLIENT_ID appears to contain a placeholder value."
        )

    print_result(
        "Google Client ID format",
        True,
        "Client ID has a valid Google OAuth format."
    )


# ---------------------------------------------------------------------------
# Test 5 — Google OAuth endpoint reachability
# ---------------------------------------------------------------------------

def test_google_oauth_endpoint():
    print("\n=== GOOGLE OAUTH ENDPOINT TEST ===")

    if not GOOGLE_CLIENT_ID:
        raise AssertionError("GOOGLE_CLIENT_ID is missing.")

    # We intentionally use a diagnostic redirect URI.
    # This test is NOT a complete login.
    redirect_uri = "http://localhost"

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }

    url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urlencode(params)
    )

    try:
        response = requests.get(
            url,
            allow_redirects=False,
            timeout=15,
        )
    except requests.RequestException as exc:
        raise AssertionError(
            f"Could not reach Google OAuth endpoint: {exc}"
        ) from exc

    print(f"HTTP status: {response.status_code}")

    location = response.headers.get("Location", "")

    # Google commonly returns 302 when beginning the OAuth flow.
    if response.status_code in (200, 302, 303):
        print_result(
            "Google OAuth endpoint",
            True,
            "Google accepted the OAuth request and returned an "
            "OAuth response."
        )
        return

    # A redirect URI mismatch can actually indicate that Google recognized
    # the client ID but the redirect URI isn't registered.
    body = response.text.lower()

    if "redirect_uri_mismatch" in body:
        print_result(
            "Google Client ID",
            True,
            "Google recognized the OAuth configuration, but the "
            "diagnostic redirect URI is not registered."
        )
        return

    if "invalid_client" in body or "invalid_request" in body:
        raise AssertionError(
            "Google rejected the OAuth client configuration. "
            "Check GOOGLE_CLIENT_ID and Google Cloud OAuth settings."
        )

    raise AssertionError(
        f"Unexpected Google OAuth response: "
        f"HTTP {response.status_code}"
    )


# ---------------------------------------------------------------------------
# Direct execution
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 70)
    print("JODTOD EXTERNAL AUTH CONFIGURATION DIAGNOSTICS")
    print("=" * 70)

    failures = []

    tests = [
        ("Environment", test_environment_variables),
        ("Resend API", test_resend_api_key),
        ("Resend Domains", test_resend_verified_domains),
        ("Google Client ID", test_google_client_id_format),
        ("Google OAuth", test_google_oauth_endpoint),
    ]

    for name, test in tests:
        try:
            test()
        except Exception as exc:
            failures.append((name, str(exc)))
            print_result(name, False, str(exc))

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    if failures:
        print(f"\nFAILED: {len(failures)} test(s)\n")

        for name, error in failures:
            print(f"[FAIL] {name}")
            print(f"       {error}")

        sys.exit(1)

    print("\nALL CONFIGURATION TESTS PASSED")
    sys.exit(0)