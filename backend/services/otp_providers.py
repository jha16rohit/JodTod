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

import asyncio
import json
import logging
import smtplib
import urllib.request
from urllib.error import HTTPError, URLError
from abc import ABC, abstractmethod
from dataclasses import dataclass
from email.message import EmailMessage

from backend.config import settings


logger = logging.getLogger(__name__)


# ++++++++++++++++ RESULT ++++++++++++++++
@dataclass(frozen=True)
class DeliveryResult:
    """Outcome of a provider delivery attempt."""

    # "accepted" means the provider accepted our request. It is not evidence
    # that an SMS/email reached the recipient's device or inbox.
    accepted: bool
    provider: str
    delivery_status: str
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
            accepted=False,
            provider=self.name,
            delivery_status="unavailable",
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
            accepted=False,
            provider=self.name,
            delivery_status="unavailable",
        )


class SMTPEmailProvider(EmailProvider):
    """SMTP email adapter using Python's standard library."""

    name = "smtp"

    @staticmethod
    def _deliver_sync(
        message: EmailMessage,
        username: str,
        password: str,
        host: str,
        port: int,
    ) -> None:
        """Blocking stdlib SMTP exchange (must run in a worker thread)."""
        with smtplib.SMTP(
            host,
            port,
            timeout=15,
        ) as server:
            server.starttls()
            server.login(username, password)
            server.send_message(message)

    async def send_otp_email(
        self,
        email: str,
        subject: str,
        text_body: str,
    ) -> DeliveryResult:
        username = (settings.smtp_username or "").strip()
        password = (
            settings.smtp_password.get_secret_value()
            if settings.smtp_password
            else ""
        )
        if not username or not password:
            raise ProviderConfigurationError(
                "EMAIL_PROVIDER=smtp requires SMTP_USERNAME and SMTP_PASSWORD."
            )

        message = EmailMessage()
        message["From"] = (
            f"{settings.email_from_name} <{settings.email_from_address}>"
        )
        message["To"] = email
        message["Subject"] = subject
        message.set_content(text_body)

        try:
            # Never block the FastAPI event loop with sync sockets.
            await asyncio.to_thread(
                self._deliver_sync,
                message,
                username,
                password,
                settings.smtp_host,
                settings.smtp_port,
            )
        except smtplib.SMTPAuthenticationError as exc:
            logger.error(
                "Email delivery failed: provider=smtp smtp_host=%s sender=%s recipient=%s status=failed error_type=authentication",
                settings.smtp_host,
                settings.email_from_address,
                email,
            )
            raise ProviderDeliveryError(
                "SMTP authentication failed. Check the SMTP username and App Password."
            ) from exc
        except (smtplib.SMTPException, OSError) as exc:
            logger.error(
                "Email delivery failed: provider=smtp smtp_host=%s sender=%s recipient=%s status=failed error_type=%s",
                settings.smtp_host,
                settings.email_from_address,
                email,
                type(exc).__name__,
            )
            raise ProviderDeliveryError("SMTP email delivery failed.") from exc

        logger.info(
            "Email delivery accepted: provider=smtp smtp_host=%s sender=%s recipient=%s status=accepted",
            settings.smtp_host,
            settings.email_from_address,
            email,
        )
        return DeliveryResult(
            accepted=True,
            provider=self.name,
            delivery_status="accepted",
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
                status_code = response.status
                body = response.read().decode("utf-8") if response else ""
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            logger.error(
                "Resend rejected email: status=%s response=%s recipient=%s from=%s",
                exc.code,
                error_body[:1000],
                email,
                settings.email_from_address,
            )
            raise ProviderDeliveryError(
                "Resend rejected the email request."
            ) from exc
        except (URLError, TimeoutError) as exc:
            logger.error(
                "Resend request failed: error=%s recipient=%s from=%s",
                type(exc).__name__,
                email,
                settings.email_from_address,
            )
            raise ProviderDeliveryError(
                "Resend could not be reached."
            ) from exc
        except Exception as exc:
            logger.error(
                "Resend request failed: error=%s recipient=%s from=%s",
                type(exc).__name__,
                email,
                settings.email_from_address,
            )
            raise ProviderDeliveryError(
                "Resend delivery failed."
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

        logger.info(
            "Resend accepted email: status=%s message_id=%s recipient=%s from=%s",
            status_code,
            external_id,
            email,
            settings.email_from_address,
        )

        return DeliveryResult(
            accepted=True,
            provider=self.name,
            delivery_status="accepted",
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
    if name == "smtp":
        return SMTPEmailProvider()
    if name == "resend":
        return ResendEmailProvider()
    if name != "mock":
        raise ProviderConfigurationError(
            f"Unsupported EMAIL_PROVIDER={name!r}. Configure smtp or mock."
        )
    return MockEmailProvider()
