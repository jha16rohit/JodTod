# backend/schemas/linked_accounts.py

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

LinkableProvider = Literal["google", "apple"]


class LinkProviderRequest(BaseModel):
    """
    Link a provider to the CURRENT authenticated user.

    Only the provider ID token is accepted; the backend verifies it
    server-side (issuer/audience/expiry/subject/signature) and derives
    identity from the claims. Client-supplied emails/subjects are never
    trusted. Never creates a user, never replaces the session.
    """

    model_config = ConfigDict(extra="ignore")

    id_token: str = Field(min_length=10, max_length=8192)


class EmailLinkState(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    connected: bool = False
    email: Optional[str] = None
    verified: bool = False


class PhoneLinkState(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    connected: bool = False
    phone: Optional[str] = None
    verified: bool = False


class ProviderLinkState(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    connected: bool = False
    email: Optional[str] = None
    connected_at: Optional[datetime] = None
    last_verified_at: Optional[datetime] = None


class UnavailableProviderState(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    connected: bool = False
    available: bool = False


class LinkedAccountsResponse(BaseModel):
    """
    Real connection state for the Linked Accounts screen.

    Safe metadata only: no tokens, secrets, or provider subjects.
    Facebook has no backend integration and always reports
    connected=False / available=False.
    """

    model_config = ConfigDict(from_attributes=True)

    email: EmailLinkState = Field(default_factory=EmailLinkState)
    phone: PhoneLinkState = Field(default_factory=PhoneLinkState)
    google: ProviderLinkState = Field(default_factory=ProviderLinkState)
    apple: ProviderLinkState = Field(default_factory=ProviderLinkState)
    facebook: UnavailableProviderState = Field(
        default_factory=UnavailableProviderState
    )
