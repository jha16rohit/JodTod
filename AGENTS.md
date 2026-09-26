# AGENTS.md — JodTod project memory

Read this file FIRST in every session. It summarizes the codebase so you do not
have to re-scan it. Only open individual files or `graph.json` when the task
needs more detail than what is written here.

## 1. What this is

JodTod is a group-travel expense-splitting mobile app (Splitwise-style: trips,
expenses with split methods, settlements, receipt scanning, activity feed).
It has a FastAPI async backend (`backend/`, Supabase PostgreSQL) and an
Expo React Native mobile app (`app/`, Expo Router). UI truth lives in
`docs/JODTOD_DESIGN_SPEC.md` (text mirror of 11 design sheets).

## 2. Tech stack

Backend (`backend/requirements.txt`):
- Python + FastAPI 0.141.1, Uvicorn 0.53 (port 5000, `--host 0.0.0.0 --reload`)
- SQLAlchemy 2.0.53 async (`asyncpg` 0.31) + Alembic 1.20, `psycopg` 3.3.5
- Pydantic v2 + `pydantic-settings` (config), PyJWT 2.14, `argon2-cffi` + `pwdlib`
- `pytest` 9.1.1 + `pytest-asyncio` (`asyncio_mode = auto`, `testpaths = backend/tests`)
- Database: Supabase PostgreSQL; URL normalized to `postgresql+asyncpg://`

Mobile (`app/package.json`):
- Expo SDK ~57, Expo Router ~57, React 19.2.3 / React Native 0.86.3
- NativeWind 4 + Tailwind, `expo-secure-store`, `expo-auth-session`,
  `@react-native-community/netinfo`, TypeScript
- **Rule (see `app/AGENTS.md`): read `https://docs.expo.dev/versions/v57.0.0/`
  before writing any mobile code — Expo APIs changed.**

## 3. Architecture

```
app/src                      backend/
(app) index/onboarding/      main.py ── FastAPI app, lifespan, 13 typed error handlers
(auth) login/signup/OTP/…    config.py ── Settings singleton (JWT/OTP/DB/OAuth/providers)
(tabs) home/groups/settle/   database.py ── async engine + AsyncSessionLocal + get_db + transaction()
  activity + groups/[id]/…   core/security.py ── Argon2id, SHA-256 token hash, OTP gen
components/groups|auth|…     core/jwt.py ── short-lived access JWT (sub/sid/type/iat/exp/jti)
services/auth|activity|api   dependencies/auth.py ── THE auth authority: Bearer → JWT → session → user
context/AuthContext.tsx      middleware/auth.py ── optional only, NOT registered (see §7)
config/api.ts                routes/auth_*.py (8) + users.py + activities.py ── thin HTTP layer
                             services/* (12) ── all business logic lives here
                             models/ (6 tables) + schemas/ + alembic/versions/ (4 revisions)
                             tests/ (14 files, scratch DB on :55432)
```

Data flow:
- Request → route (parse/validate via `schemas/`) → service (logic in
  `transaction(db)`) → models (PostgreSQL) → response schema. Routes never
  touch the DB directly.
- Auth: `get_bearer_token → get_current_session → get_current_user →
  require_active_user` (`backend/dependencies/auth.py`). JWT carries `sub`
  (user id) + `sid` (session id); the session row is re-checked every request
  (valid / not revoked). No DB lookup happens in middleware.
- Token storage rule: only hashes in DB (SHA-256 for refresh/OTP/email/reset
  tokens, Argon2id for passwords). Raw values go to the client only.
- Mobile: screens → `services/*.api.ts` (fetch) → backend `/api/*`;
  session persisted via `auth.storage.ts` (secure store), state in
  `context/AuthContext.tsx`, offline banner via `network.service.ts`.
- Activity feed is the only non-auth domain implemented end to end:
  `activities` table → `activity_service` → `routes/activities.py` →
  `activity.api.ts` → `(tabs)/activity.tsx` (newest-first, Today/Yesterday
  grouping on `occurred_at`).

Graph shape (1099 nodes, 3162 edges, ~50 communities): god nodes are `User`
(138 edges), `AuthenticatedUser`, `OTPPurpose`, `AccountStatus`, `Session`,
`TokenResponse`/`AuthResponse`, `SessionService`, `UserService`, `OTPError`.
Three hyper-flows: full authentication flow, activity-feed flow, mobile shell.

## 4. Key conventions

- Run backend commands from the **repo root** (`from backend.config import …`
  only resolves there). Golden path is documented in `README.md`.
- One route file + one service file per auth concern
  (`auth_signup`, `auth_login`, `auth_logout`, `auth_otp`, `auth_email`,
  `auth_password`, `auth_refresh`, `auth_oauth`).
- Error handling: services raise typed errors (`SignupError`,
  `InvalidLoginError`, `OTPError`, `RefreshError`, `OAuthError`, …);
  `main.py` maps each to `{detail, code}` JSON. Login failures are always a
  generic 401 — never reveal whether the account exists (no oracle).
- DB: `async with transaction(db)` owns commit/rollback; nested calls join
  the outer transaction. No global session. Models use UUID PKs +
  `TimestampMixin` (`models/base.py`).
- Config: `Settings` instantiates at import (`settings = get_settings()`), so
  env/`backend/.env` must exist before import — tests set env vars at the top
  of `conftest.py` for the same reason. Production validator rejects
  `mock` providers, `DEBUG=true`, wildcard CORS.
- Providers are pluggable (`otp_providers.py`); default `mock`. OTP may be
  returned in responses only when `dev_otp_disclosure_allowed`
  (non-prod + mock provider).
- Frontend: Expo Router groups `(auth)` / `(tabs)`; `groups/[id]/*` screens;
  API base URL per platform (emulator `10.0.2.2`, physical phone = LAN IP,
  never committed).
- Migrations only via Alembic; never edit an applied revision
  (`55fd1c0613a9` → `…3b0` → `7a2c9e4f1b3d` → `9c1e7a2b4d5f`).

## 5. Implemented so far

- 2026-09-18 — Backend scaffold: config, async DB engine, 5 auth tables,
  initial migration `55fd1c0613a9`, `GET /health` (`backend/`, `alembic.ini`)
- 2026-09-16/17 — Signup service + full auth layer: Argon2id hashing, JWT
  access tokens, OTP/email-verification/password-reset lifecycles, Google +
  Apple OAuth (`backend/core/`, `backend/services/`, `backend/routes/`)
- 2026-09-17/18 — Mobile login/signup + auth screens, secure token storage,
  auth context (`app/src/app/(auth)/`, `app/src/services/auth.*`)
- 2026-09-18/19 — Auth corrections, auth dependencies/middleware split,
  settle tab + group screens scaffold (`backend/dependencies/`,
  `app/src/app/(tabs)/settle.tsx`, `app/src/app/(tabs)/groups/`)
- 2026-09-25 — Complete auth (refresh rotation, logout revocation, typed
  handlers in `main.py`); activity backend (`activities` table + 2nd
  migration pair, `activity_service.py`, `routes/activities.py`) + activity
  mobile UI (`(tabs)/activity.tsx`, `activity.api.ts`)
- 2026-09-25 — Test suite: security/JWT/schemas/services/dependencies/
  activity/imports/settings coverage (`backend/tests/`, 14 files)
- 2026-09-26 — Knowledge graph generated (`graph.html`, `graph.json`,
  `GRAPH_REPORT.md`) + this file

## 6. Known issues / open TODOs

- `README.md §1` still says schemas/hashing/JWT/services/routes are "not
  implemented" — stale; they all exist now. README needs a refresh.
- No `groups`/`expenses`/`settlements`/`members` tables: activity rows carry
  denormalized detail fields instead (`models/activity.py` header explains).
  Groups/expenses/settle backend is unimplemented; mobile groups UI reads
  `lib/mockGroups.ts`.
- Receipt scanning/OCR, bill queue, settlement optimization, UPI payments,
  reports/PDF, budget alerts, notifications, global search: designed in
  `docs/JODTOD_DESIGN_SPEC.md` but not built anywhere.
- `AuthenticationMiddleware` is dead code unless explicitly mounted; do not
  treat it as enforced. `dependencies/auth.py` is the real gate.
- Tests need a scratch Postgres at `localhost:55432/jodtod_test`
  (`conftest.py` truncates tables per test); most tests fail without it.
- Uncommitted working tree at last graph run: `activity.tsx`, `AuthContext`,
  `auth.api/service/storage`, `auth.types` were modified but not committed.
- Graph thin spots (single-file communities): individual tab/profile screens,
  glass UI components, mock data — expected, not a defect.

## 7. Decisions log

- Hash-only token storage (SHA-256/Argon2id, never plaintext) so a DB leak
  does not yield usable credentials — do not add plaintext token columns.
- Generic 401 on all login failures; 404 only where caller supplied the
  destination — prevents account-enumeration oracles.
- Argon2 via `argon2-cffi` directly, not `pwdlib`, because pwdlib passes
  `salt=` unconditionally and crashes on argon2-cffi 21.x
  (`core/security.py`); pwdlib kept only as legacy-verify fallback.
- `transaction()` ownership model (first caller owns commit) instead of
  per-repository commits, keeping multi-step auth flows atomic.
- Middleware kept unregistered deliberately: JWT-claims attachment without
  DB checks is unsafe as a gate; dependency layer does both.
- Activity events denormalized (actor, category, split, participants JSONB,
  pre-formatted `amount` string) because group/expense tables do not exist
  yet — normalize when those tables are built, migrating this data.
- `mock` OTP/email providers allowed everywhere except production (validator
  in `config.py`) to keep local/dev friction-free.
- `Settings` as import-time singleton for simplicity; consequence is
  env-must-precede-import, handled in `conftest.py` and documented in README.

## 8. Graph reference

`graphify-out/graph.html` (interactive map), `graphify-out/graph.json`
(queryable data), and `graphify-out/GRAPH_REPORT.md` (communities, god nodes,
surprises) are the single canonical copies — no duplicates at the repo root.
Consult the graph — not a full re-scan — for questions like "which functions
call X", "what depends on table Y", or "how does auth flow cross modules".
`graphify query "<q>"`, `graphify path "A" "B"`, `graphify explain "X"` answer
from the graph.

## 9. Keeping this file and the graph in sync

- After any feature change or architectural decision: re-run
  `graphify update .` (code-only changes need no LLM) or the full pipeline,
  then update §5/§6/§7 above to match. Suggested: `graphify hook install`
  for post-commit auto-refresh.
- Graph outputs live only in `graphify-out/` — do not copy them to the
  repo root.
