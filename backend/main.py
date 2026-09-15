"""
JodTod Backend Application

Application entry point for the FastAPI backend.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import (
    initialize_database,
    dispose_database,
)

# FastAPI application instance
from backend.routes.auth_signup import router as auth_signup_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    """

    # Startup
    await initialize_database()

    yield

    # Shutdown
    await dispose_database()


app = FastAPI(
    title=settings.app_name,
    version=settings.api_version,
    debug=settings.debug,
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Authentication Routes
# ---------------------------------------------------------------------------
app.include_router(
    auth_signup_router,
    prefix="/api/auth",
    tags=["Authentication"],
)


@app.get("/")
async def home():
    print("This is the JodTod Backend")
    return {"message": "Welcome to the JodTod Backend!"}


@app.get("/api/health", tags=["System"])
async def health_check() -> dict[str, str]:
    """
    Basic application health endpoint.
    """
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.api_version,
    }
