# AGENTS.md — JodTod (persistent project memory)

> Read this FIRST on every session. Only dig into `graph.json` / individual files when the task needs more detail than here.
> Frontend Expo rule lives in `app/AGENTS.md` (pin Expo v57 docs). Backend rule: run everything from repo root.

## 1. What this is

JodTod is a group-expense splitting app (trips/groups → expenses → balances → settlements → trip closure).
Repo = FastAPI auth + activity backend (`backend/`, Supabase Postgres) + Expo Router mobile app (`app/`). Design spec in `docs/JODTOD_DESIGN_SPEC.md` is the product source of truth; `README.md` is partly stale (see §6).

## 2. Tech stack

Backend (`backend/requirements.txt`, pinned):
- Python + FastAPI `0.141.1` / Starlette `1.6.0` / Uvicorn `0.53.0`, Pydantic `2.13.5` + pydantic-settings `2.15.0`
- SQLAlchemy `2.0.53` (async) + Alembic `1.20.0`, drivers asyncpg `0.31.0` + psycopg `3.3.5` (Supabase Postgres)
- Auth/sec: PyJWT `2.14.0`, pwdlib `0.3.1` + argon2-cffi, email-validator, python-multipart; tests pytest `9.1.1` + pytest-asyncio `1.4.0` (`asyncio_mode=auto`, `testpaths=backend/tests`)

Frontend (`app/package.json`):
- Expo SDK `~57.0.25` (see `app/AGENTS.md`: read `https://docs.expo.dev/versions/v57.0.0/` before coding), expo-router `~57.0.23`, React `19.2.3`, React Native `0.86.3`
- expo-secure-store, @react-native-async-storage/async-storage, @react-native-community/netinfo `12.0.1`, NativeWind `^4.2.6` + tailwindcss `^3.4.19`, TypeScript `~6.0.3`

Infra: Supabase Postgres, JWT access + opaque refresh sessions, SMTP email provider (stdlib, worker thread), `alembic.ini` → `script_location=backend/alembic`.

## 3. Architecture (from graph: 1093 nodes / 2725 edges / 110 communities)

Mental model — mobile shell → auth gate → API → service-per-flow → Postgres:

- **Mobile shell (`app/src/app/`)**: expo-router file routes. `index.tsx` splash gate (waits ~3700ms, reads `useAuth()`, routes to `/(tabs)` | `/verify-email` | `/onboarding`). Groups: `(tabs)/groups/index|create|join` → `[id]/index|expenses|members|settings|invite|edit`. Profile cluster: `profile|edit-profile|personal-information|preferences|linked-accounts|app-settings|help-support|about-jodtod`. Auth cluster: `(auth)/login|login-otp|signup|verify-email`. Graph hyperedges: auth flow, groups flow, profile-settings flow.
- **Mobile state (`app/src/context/AuthContext.tsx` + `services/`)**: `AuthContext` is the SINGLE source of truth (`user/sessionId/isAuthenticated/isVerificationPending/isLoading/isOffline`). Screens never keep own auth copy. `services/auth.service.ts` orchestrates, `auth.api.ts` is thin HTTP, `auth.storage.ts` persists tokens, `network.service.ts` probes reachability (`isOnline/subscribeToNetworkChanges`), `activity.api.ts` feeds Activity tab. Graph: `h_offline_auth_coordination`, `h_token_refresh_singleflight`.
- **API edge (`backend/main.py`, all routers under `/api`)**: `auth_signup|auth_login|auth_logout|auth_otp|auth_email|auth_password|auth_refresh|auth_oauth`, plus `users`, `activities`. `GET /api/health` (README says `/health` — stale) + `GET /`.
- **Service-per-flow (`backend/services/`)**: `auth_login_service` (password), `phone_auth_service` + `email_login_otp` + `otp_service` + `otp_providers` (SMTP), `email_verification_service`, `password_reset_service`, `auth_signup_service`, `auth_refresh_service` (rotation), `auth_logout_service`, `session_service`, `user_service`, `token_service`, `auth_oauth_service` (Google/Apple), `activity_service` (user-scoped newest-first feed). Cross-cutting flows in graph: password-login→`SessionService.issue_session`→refresh-rotate; OTP issue→verify→phone-login session.
- **Gate (`backend/dependencies/auth.py`, `backend/middleware/auth.py`, `backend/core/jwt.py`)**: Bearer extractor → JWT verify → current user+session → `require_active_user`. God nodes: `User` (137 edges), `AuthenticatedUser` (98), `OTPPurpose` (89), `Session` (76) — everything bridges through User/Session.
- **Data (`backend/models/` + `backend/alembic/versions/`)**: `users`, `sessions` (refresh-token hash only), `otp_records` (hash/expiry/attempts/lock), `email_verifications`, `password_resets`, `activities` (+ detail columns migration). Only changed via Alembic; 4 migrations applied: `55fd1c0613a9` auth tables → `55fd1c0613b0` user lookup indexes → `7a2c9e4f1b3d` activities → `9c1e7a2b4d5f` activity details.
- **Config/DB (`backend/config.py`, `backend/database.py`)**: `Settings` singleton from `backend/.env` (never commit); async engine init/dispose in lifespan, fail-fast if DB unreachable.

## 4. Key conventions

- **Repo-root imports**: always run from `D:\JodTod` (`from backend.config import settings`). Never run from inside `backend/`. Backend port default is `5001` in `config.py` (README says `5000` — stale).
- **Typed service errors → safe HTTP in `main.py`**: services raise `*Error(message, code, status_code)` (`SignupError/DuplicateAccountError`, `LoginError/InvalidLoginError`, `LogoutError`, `OTPError`, `RefreshError`, `OAuthError`, `ProviderConfigurationError/DeliveryError`). Handlers map to `{detail, code}` JSON. Login = generic 401 (no user-enumeration oracle); OTP uses 429 for cooldown/lockout, 404 only for caller-supplied destination.
- **Token hygiene**: raw tokens to client, SHA-256 hashes at rest (`core/security.hash_token`); Argon2 passwords; 6-digit OTP/email codes; refresh rotation reuses→revokes family; dev OTP disclosure gated by config flag.
- **Mobile**: file-based routing groups `(auth)/(tabs)/groups/[id]`; shared UI in `components/groups/` (`GroupCard/GroupForm/BalanceSummary/ExpenseRow/MemberRow/...`); constants in `constants/auth.constants.ts` (`AUTH_API_PATHS/STORAGE_KEYS/OTP_CONFIG/NETWORK_CONFIG`), types in `types/auth.types.ts` mirror backend schemas; `lib/mockGroups.ts` still backs group screens (backend has no groups/expenses tables yet — activity feed only).
- **DB**: never hand-edit Supabase tables; `alembic check` → `revision --autogenerate` → review → `upgrade head`. Never edit applied migrations.
- **Tests**: `pytest.ini` session-scoped asyncio; `conftest.py` truncates scratch DB per test; manual OTP script `test_manual_login_otp_flow.py` is interactive (`pytest -s`).
- **Secrets**: `backend/.env`, JWT/DB/OAuth/SMTP creds, LAN IPs never committed (5 sensitive files skipped by graph detect).

## 5. Implemented so far

- 2026-09-15 — Auth foundation + architecture (config/DB/models/migrations layout) — `backend/config.py`, `backend/database.py`, `backend/models/`
- 2026-09-16 — Authentication layer (JWT, hashing, OTP, sessions) — `backend/core/`, `backend/services/otp_service.py`, `session_service.py`
- 2026-09-19 — Settle page (mobile) — `app/src/app/(tabs)/settle.tsx`
- 2026-09-25 — Complete Auth (signup/login/logout/refresh/OTP/email/password/OAuth/users routers + services + exception mapping) — `backend/routes/auth_*.py`, `backend/services/auth_*.py`, `backend/main.py`
- 2026-09-25 — Activity backend (user-scoped feed + 2 migrations + tests) — `backend/routes/activities.py`, `backend/services/activity_service.py`, `backend/models/activity.py`, `backend/alembic/versions/7a2c9e4f*`, `9c1e7a2b*`
- 2026-09-25 — Activity UI + plus-button entry — `app/src/app/(tabs)/activity.tsx`, `components/AddActionBottomSheet/`
- 2026-09-26 — Groups UI (list/create/join/detail/expenses/members/settings/invite/edit + shared components, still on `mockGroups`) — `app/src/app/(tabs)/groups/`, `app/src/components/groups/`
- 2026-09-26 — Login system update + form UI (AuthContext single-truth, offline indicator, storage) — `app/src/context/AuthContext.tsx`, `app/src/services/auth.*`, `components/auth/`
- 2026-09-27 — Home page update — `app/src/app/(tabs)/index.tsx`, `app/src/app/index.tsx`
- 2026-09-27 — Knowledge graph + this memory file — `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, `AGENTS.md`

## 6. Known issues / open TODOs

- `README.md` drift: says schemas/services/routes/middleware "not implemented" (they are), says `mobile/` (real dir is `app/`), health at `/health` (real `/api/health`), port `5000` (config default `5001`). Don't trust README for scope; trust graph + code.
- No groups/expenses/settlements backend yet — mobile group screens read `lib/mockGroups.ts`. Design spec expects full expense lifecycle, receipt OCR queue, settlement suggestions, offline sync, trip-report closure — none implemented server-side.
- Graph flags 3 AMBIGUOUS edges to verify: `EmailVerification` → `request_email_login_otp()` (`maybe_uses_legacy_table`); offline-sync → final-closure; edit-profile form → personal-info view (`maybe_updates`).
- 124 isolated nodes / many singleton communities (config prose, splash PNGs `app/assets/images/jodtod/`, `Images/` mockups) — vision nodes are purpose-only, no OCR; thin test communities are noise.
- `backend/routes/__init__.py` empty; routers wired individually in `main.py` — keep that pattern.
- SMTP send is blocking stdlib → must stay in worker thread; provider misconfig returns 503/502 (see handlers).

## 7. Decisions log

- Repo-root execution: `backend.*` absolute imports chosen so Alembic/pytest/uvicorn share one path; hence "run from root" rule — don't "fix" by adding sys.path hacks.
- Service-per-auth-flow (not one auth.py): isolates password vs OTP vs OAuth vs refresh vs logout blast radius; exception mapping stays in `main.py` for uniform safe messages.
- No-oracle errors: generic login 401 + scoped 404s to prevent account enumeration; keep when adding password-reset (already `password_reset_service.py`).
- Hash-only token storage + rotation-reuse-revokes: stolen DB rows aren't usable sessions; don't store raw refresh tokens.
- `AuthContext` single-truth + `network.service` offline-first: phone clients go offline; screens must not duplicate auth state or self-navigate beyond login/logout calls.
- Expo SDK 57 pinned (`app/AGENTS.md`): Expo breaking changes burned us before — check versioned docs before any Expo API use.
- Alembic-only DDL + reviewed autogenerate: Supabase dashboard edits would drift; migrations `55fd1c0613a9→…→9c1e7a2b4d5f` are the ledger.
- Graphify AST (952 nodes) + semantic chunks (231 nodes) merged: AST owns imports/structure, semantic owns flows/rationale; re-run `graphify update` for code-only changes, full pipeline when docs/images change.

## 8. Graph reference

`graphify-out/graph.html` / `graphify-out/graph.json` (+ `graphify-out/GRAPH_REPORT.md`) are the queryable map — consult them instead of re-scanning for "which functions call X", "what bridges auth ↔ activity", or cross-community impact; use `graphify query|path|explain` (e.g. `graphify query "how does refresh rotation work"`). Graph files live only in `graphify-out/` (not the repo root).

---
*Sync rule: after any feature/architecture change, re-run Graphify (`graphify update .` for code-only, full `/graphify .` for docs/images, or `graphify hook install` for auto git-hook rebuilds) and update §5 + §7 here so narrative never drifts from graph/code.*
