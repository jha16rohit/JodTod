# backend/middleware/auth.py

import json
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.jwt import JWTError, decode_access_token


class AuthenticationMiddleware(
    BaseHTTPMiddleware
):
    """
    Lightweight authentication middleware.

    Responsibilities:
    - Inspect Authorization header.
    - Validate Bearer JWT when one is supplied.
    - Attach validated JWT claims to request.state.

    Responsibilities intentionally NOT handled here:
    - Database user lookup.
    - Database session lookup.
    - Session revocation checks.

    Those operations belong in backend/dependencies/auth.py.

    Note: This middleware is NOT registered in main.py. The FastAPI
    dependency layer in dependencies/auth.py is the single
    authoritative authentication strategy. This module is retained
    for optional use.
    """

    # ============================================================
    # PUBLIC PATHS
    # ============================================================

    DEFAULT_PUBLIC_PATHS = {
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
        "/api/health",
        "/api/v1/health",
        "/api/v1/auth/login",
        "/api/v1/auth/signup",
        "/api/v1/auth/send-otp",
        "/api/v1/auth/verify-otp",
        "/api/v1/auth/verify-email",
        "/api/v1/auth/refresh",
    }

    # ============================================================
    # INITIALIZATION
    # ============================================================

    def __init__(
        self,
        app,
        public_paths: set[str] | None = None,
    ):
        super().__init__(app)

        self.public_paths = (
            public_paths
            if public_paths is not None
            else self.DEFAULT_PUBLIC_PATHS
        )

    # ============================================================
    # REQUEST HANDLER
    # ============================================================

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """
        Process an incoming HTTP request.
        """

        request.state.authenticated = False
        request.state.token_claims = None
        request.state.access_token = None

        # --------------------------------------------------------
        # PREFLIGHT
        # --------------------------------------------------------

        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        # --------------------------------------------------------
        # PUBLIC ROUTES
        # --------------------------------------------------------

        if path in self.public_paths:
            return await call_next(request)

        # --------------------------------------------------------
        # AUTHORIZATION HEADER
        # --------------------------------------------------------

        authorization = request.headers.get(
            "Authorization"
        )

        if not authorization:
            return await call_next(request)

        # --------------------------------------------------------
        # PARSE BEARER TOKEN
        # --------------------------------------------------------

        scheme, separator, token = (
            authorization.partition(" ")
        )

        if (
            not separator
            or scheme.lower() != "bearer"
            or not token.strip()
        ):
            return await self._unauthorized(
                "Invalid authorization header."
            )

        token = token.strip()

        # --------------------------------------------------------
        # VALIDATE JWT
        # --------------------------------------------------------

        try:
            claims = decode_access_token(token)

        except JWTError:
            return await self._unauthorized(
                "Invalid or expired access token."
            )

        # --------------------------------------------------------
        # ATTACH REQUEST AUTH STATE
        # --------------------------------------------------------

        request.state.authenticated = True
        request.state.token_claims = claims
        request.state.access_token = token

        return await call_next(request)

    # ============================================================
    # UNAUTHORIZED RESPONSE
    # ============================================================

    @staticmethod
    async def _unauthorized(
        detail: str,
    ) -> Response:
        """
        Return a standard 401 response.
        """

        return Response(
            content=json.dumps({"detail": detail}),
            status_code=401,
            media_type="application/json",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )