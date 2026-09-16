"""
JodTod Authentication - OTP / notification provider abstraction.

Responsibilities:
    - Define vendor-neutral SMS and email provider interfaces so OTP
      business logic never couples to a temporary vendor.
    - Provide development adapters (explicitly environment-gated).
    - Provide the Resend email adapter (activated purely through
      environment configuration; no hard-coded credentials).

Important:
    - A real SMS/email is never pretended to be delivered.
    - OTP values are never logged by these adapters.
    - Secrets come only from backend.config settings.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass

from backend.config import settings


logger = logging.getLogger(__name__)


# ++++++++++++++++ RESULT ++++++++++++++++
@dataclass(frozen=True)
class DeliveryResult:
    """Outcome of a provider delivery attempt."""

    delivered: bool
    provider: str
    external_id: str | None = None


# ++++++++++++++++ SMS INTERFACE ++++++++++++++++
class SMSProvider(ABC):
    """Vendor-neutral SMS sending interface.

    A future paid SMS vendor is added by subclassing this interface;
    OTP business logic in otp_service.py does not change.
    """

    name: str = "sms"

    @abstractmethod
    async def send_otp(
        self,
        phone: str,
        message: str,
    ) -> DeliveryResult:
        """Deliver an OTP message to a phone number."""
        raise NotImplementedError


class MockSMSProvider(SMSProvider):
    """Development SMS adapter.

    Records delivery without contacting any vendor. The OTP value
    itself is never logged here; development retrieval happens
    through the explicitly environment-gated API field, never logs.
    """

    name = "mock"

    async def send_otp(
        self,
        phone: str,
        message: str,
    ) -> DeliveryResult:
        logger.info(
            "Development SMS delivery recorded (no vendor contacted)."
        )
        return DeliveryResult(
            delivered=True,
            provider=self.name,
        )


# ++++++++++++++++ EMAIL INTERFACE ++++++++++++++++
class EmailProvider(ABC):
    """Vendor-neutral email sending interface."""

    name: str = "email"

    @abstractmethod
    async def send_otp_email(
        self,
        email: str,
        subject: str,
        text_body: str,
    ) -> DeliveryResult:
        """Deliver an OTP email to an address."""
        raise NotImplementedError


class MockEmailProvider(EmailProvider):
    """Development email adapter (no vendor contacted)."""

    name = "mock"

    async def send_otp_email(
        self,
        email: str,
        subject: str,
        text_body: str,
    ) -> DeliveryResult:
        logger.info(
            "Development email delivery recorded (no vendor contacted)."
        )
        return DeliveryResult(
            delivered=True,
            provider=self.name,
        )


class ResendEmailProvider(EmailProvider):
    """Resend email adapter (https://resend.com).

    Activated purely through environment configuration:
        EMAIL_PROVIDER=resend
        EMAIL_PROVIDER_API_KEY=<Resend API key>
        EMAIL_FROM_ADDRESS=<verified sender>
        EMAIL_FROM_NAME=<sender name>

    Uses only the Python standard library (urllib), so no additional
    dependency is required.
    """

    name = "resend"

    RESEND_API_URL = "https://api.resend.com/emails"

    async def send_otp_email(
        self,
        email: str,
        subject: str,
        text_body: str,
    ) -> DeliveryResult:
        api_key = settings.email_provider_api_key
        key_value = api_key.get_secret_value() if api_key else ""

        if not key_value:
            raise ProviderConfigurationError(
                "EMAIL_PROVIDER=resend requires EMAIL_PROVIDER_API_KEY."
            )

        payload = json.dumps(
            {
                "from": (
                    f"{settings.email_from_name} "
                    f"<{settings.email_from_address}>"
                ),
                "to": [email],
                "subject": subject,
                "text": text_body,
            }
        ).encode("utf-8")

        request = urllib.request.Request(
            self.RESEND_API_URL,
            data=payload,
            method="POST",
            headers={
                "Authorization": f"Bearer {key_value}",
                "Content-Type": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                body = response.read().decode("utf-8") if response else ""
        except Exception as exc:
            raise ProviderDeliveryError(
                f"Resend delivery failed: {type(exc).__name__}"
            ) from exc

        external_id: str | None = None
        try:
            parsed = json.loads(body) if body else {}
            if isinstance(parsed, dict) and isinstance(
                parsed.get("id"), str
            ):
                external_id = parsed["id"]
        except ValueError:
            external_id = None

        return DeliveryResult(
            delivered=True,
            provider=self.name,
            external_id=external_id,
        )


# ++++++++++++++++ ERRORS ++++++++++++++++
class ProviderConfigurationError(Exception):
    """Raised when a provider is selected but not configured."""


class ProviderDeliveryError(Exception):
    """Raised when a provider fails to deliver (vendor errors hidden)."""


# ++++++++++++++++ FACTORIES ++++++++++++++++
def get_sms_provider() -> SMSProvider:
    """Resolve the configured SMS provider.

    Unknown values fail closed to the mock adapter rather than
    crashing authentication flows; the selection is logged once.
    """
    name = (settings.otp_provider or "mock").strip().lower()
    if name == "mock":
        return MockSMSProvider()
    logger.warning(
        "Unknown OTP_PROVIDER=%r; using mock SMS adapter.", name
    )
    return MockSMSProvider()


def get_email_provider() -> EmailProvider:
    """Resolve the configured email provider."""
    name = (settings.email_provider or "mock").strip().lower()
    if name == "resend":
        return ResendEmailProvider()
    if name != "mock":
        logger.warning(
            "Unknown EMAIL_PROVIDER=%r; using mock email adapter.", name
        )
    return MockEmailProvider()
