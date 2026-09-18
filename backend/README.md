# JodTod Backend & Full-Stack Development README

> **Purpose:** This document is the single onboarding and operating
> guide for developers working on the JodTod backend and integrating the
> React Native/Expo frontend with it.
>
> A developer who clones/pulls the repository should be able to use this
> README to install dependencies, configure the environment, connect to
> the database, run migrations, start the backend, connect the mobile
> app, test authentication APIs, and understand the development workflow
> without relying on undocumented local-machine setup.

------------------------------------------------------------------------

## 1. Project Overview

JodTod is structured as a full-stack application with:

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Mobile frontend         React Native + Expo     UI, navigation, local
                                                  auth state, API calls

  Backend API             FastAPI                 Authentication,
                                                  business APIs,
                                                  validation,
                                                  authorization

  ORM                     SQLAlchemy 2.x          Database models and
                                                  database access

  Database                PostgreSQL via Supabase Persistent application
                                                  data

  Migrations              Alembic                 Version-controlled
                                                  database schema

  Authentication          JWT + refresh-token     Access control and
                          sessions                session management

  Secure mobile storage   Expo SecureStore        Sensitive
                                                  authentication secrets

  Local/non-sensitive     AsyncStorage/local      Cached application
  storage                 storage as appropriate  state

  Package/environment     Python virtual          Backend dependency
                          environment             isolation
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 2. Repository Structure

The authentication foundation follows this structure:

``` text
JodTod/
│
├── backend/
│   ├── __init__.py
│   ├── .env
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── session.py
│   │   ├── otp.py
│   │   ├── email_verification.py
│   │   └── password_reset.py
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   └── user.py
│   │
│   ├── core/
│   │   ├── security.py
│   │   └── jwt.py
│   │
│   ├── services/
│   │   ├── session_service.py
│   │   ├── user_service.py
│   │   └── token_service.py
│   │
│   ├── middleware/
│   │   └── auth.py
│   │
│   ├── dependencies/
│   │   └── auth.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   └── users.py
│   │
│   └── alembic/
│       ├── env.py
│       ├── README
│       ├── script.py.mako
│       └── versions/
│
├── mobile/
│   ├── app/
│   ├── components/
│   └── src/
│       ├── types/
│       ├── constants/
│       ├── services/
│       ├── context/
│       └── ...
│
├── alembic.ini
├── .gitignore
└── README.md
```

------------------------------------------------------------------------

# 3. Important Development Rule

## Always run backend commands from repository root

Correct:

``` powershell
cd D:\JodTod
```

Then:

``` powershell
python ...
alembic ...
uvicorn ...
```

Do **not** normally run package-based commands from:

``` text
D:\JodTod\backend
```

The backend uses imports such as:

``` python
from backend.config import settings
```

Therefore the repository root must be on the Python import path.

------------------------------------------------------------------------

# 4. Prerequisites

Install the following before starting:

  Requirement         Recommended
  ------------------- -------------------------------------------------
  Python              Python 3.11+
  Node.js             Current LTS
  npm                 Bundled with Node.js
  Git                 Current stable
  PostgreSQL client   Optional; useful for direct DB inspection
  Expo CLI/tooling    Use the project's configured Expo workflow
  Android Studio      Required for Android emulator development
  Xcode               Required for iOS simulator development on macOS
  Expo Go             Useful for physical-device development

The backend does **not** require a locally running PostgreSQL server
because the project database is hosted on Supabase.

------------------------------------------------------------------------

# 5. Clone / Pull the Repository

For a new developer:

``` powershell
git clone <REPOSITORY_URL>
cd JodTod
```

For an existing developer:

``` powershell
git pull
```

Always check the current branch before making changes:

``` powershell
git branch
git status
```

------------------------------------------------------------------------

# 6. Backend Virtual Environment

## Windows PowerShell

From:

``` text
D:\JodTod
```

create the virtual environment:

``` powershell
python -m venv backend\.venv
```

Activate it:

``` powershell
.\backend\.venv\Scripts\Activate.ps1
```

You should see:

``` text
(.venv)
```

in the terminal prompt.

## If PowerShell blocks activation

If Windows reports an execution-policy error, use:

``` powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then activate again:

``` powershell
.\backend\.venv\Scripts\Activate.ps1
```

------------------------------------------------------------------------

# 7. Backend Dependencies

The repository should contain a dependency file such as:

``` text
requirements.txt
```

Install dependencies:

``` powershell
pip install -r requirements.txt
```

If the project is using a different dependency-management file, follow
that file as the source of truth.

Verify important packages:

``` powershell
python -c "import fastapi; print('FASTAPI OK')"
```

``` powershell
python -c "import sqlalchemy; print('SQLALCHEMY OK:', sqlalchemy.__version__)"
```

``` powershell
python -c "import alembic; print('ALEMBIC OK:', alembic.__version__)"
```

``` powershell
python -c "import psycopg; print('PSYCOPG OK:', psycopg.__version__)"
```

------------------------------------------------------------------------

# 8. Environment Configuration

## Backend `.env`

Create:

``` text
backend/.env
```

Do **not** commit the real `.env` to Git.

The project configuration loads `.env` relative to `backend/config.py`,
so it works regardless of whether the developer runs commands from the
repository root.

The configuration should contain at minimum:

``` env
APP_NAME=JodTod API
ENVIRONMENT=development
DEBUG=true

JWT_SECRET_KEY=<LONG_RANDOM_SECRET>
JWT_ALGORITHM=HS256

DATABASE_URL=postgresql+asyncpg://<SUPABASE_USER>:<PASSWORD>@<SUPABASE_HOST>:5432/postgres
```

Additional authentication/provider variables should be configured
according to the fields defined in:

``` text
backend/config.py
```

Examples include:

``` env
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

OTP_LENGTH=6
OTP_EXPIRE_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60

EMAIL_VERIFICATION_EXPIRE_HOURS=24
PASSWORD_RESET_EXPIRE_MINUTES=30

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

OTP_PROVIDER=
EMAIL_PROVIDER=
```

Use the exact variable names defined by the current `Settings` class. Do
not invent alternative names.

------------------------------------------------------------------------

# 9. Secrets Policy

Never commit:

``` text
backend/.env
```

Never commit:

-   JWT secret keys
-   OAuth client secrets
-   Apple private keys
-   SMTP credentials
-   SMS provider credentials
-   database passwords
-   refresh tokens
-   access tokens

Use placeholders in:

``` text
.env.example
```

Example:

``` env
JWT_SECRET_KEY=replace-with-a-secure-secret
DATABASE_URL=replace-with-database-url
```

Developers should create their own local:

``` text
backend/.env
```

from `.env.example`.

------------------------------------------------------------------------

# 10. Generate a Secure JWT Secret

Do not reuse another developer's secret.

Generate one with Python:

``` powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Put the generated value into:

``` env
JWT_SECRET_KEY=<generated-value>
```

------------------------------------------------------------------------

# 11. Database Architecture

JodTod uses:

``` text
Supabase PostgreSQL
```

The application uses:

``` text
postgresql+asyncpg://
```

for asynchronous runtime database access.

Alembic uses:

``` text
postgresql+psycopg://
```

for migration execution.

This distinction is intentional.

  Use case                  Driver
  ------------------------- ----------------------
  FastAPI runtime           `asyncpg`
  SQLAlchemy async engine   `postgresql+asyncpg`
  Alembic migrations        `psycopg`
  Direct PostgreSQL CLI     `psql`

------------------------------------------------------------------------

# 12. Supabase Database

The database is the shared development PostgreSQL instance.

The application database name is:

``` text
postgres
```

Do not create a separate local:

``` text
jodtod
```

database unless the project architecture is explicitly changed.

A typical Supabase connection URL is:

``` env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/postgres
```

If the password contains URL-reserved characters, URL-encode them before
placing the value in the connection string.

------------------------------------------------------------------------

# 13. Verify Configuration

From repository root:

``` powershell
python -c "from backend.config import settings; print('CONFIG OK'); print(settings.app_name); print('JWT:', bool(settings.jwt_secret_key)); print('DB:', bool(settings.database_url))"
```

Expected:

``` text
CONFIG OK
JodTod API
JWT: True
DB: True
```

Never print the actual secret or full database URL.

------------------------------------------------------------------------

# 14. Verify Database Connectivity

Run:

``` powershell
python -c "import asyncio; from backend.database import check_database_connection; asyncio.run(check_database_connection()); print('DATABASE CONNECTION: OK')"
```

Expected:

``` text
DATABASE CONNECTION: OK
```

If this fails, do not immediately modify database code.

Check:

1.  `.env` exists.
2.  `DATABASE_URL` is correct.
3.  Supabase project is available.
4.  Database password is correct.
5.  Password special characters are URL-encoded.
6.  Network access is available.
7.  Required Python driver is installed.

------------------------------------------------------------------------

# 15. Alembic

Alembic is the only supported mechanism for versioning the database
schema.

The root configuration is:

``` text
alembic.ini
```

Migration environment:

``` text
backend/alembic/env.py
```

Migration versions:

``` text
backend/alembic/versions/
```

------------------------------------------------------------------------

# 16. Verify Alembic

``` powershell
alembic --version
```

Then:

``` powershell
python -c "import psycopg; print('PSYCOPG OK:', psycopg.__version__)"
```

------------------------------------------------------------------------

# 17. Current Authentication Database Schema

The initial authentication migration creates:

``` text
users
sessions
otp_records
email_verifications
password_resets
```

Alembic also maintains:

``` text
alembic_version
```

------------------------------------------------------------------------

# 18. Authentication Model Responsibilities

## `users`

Stores the application's user/account identity.

Important concepts include:

-   UUID user ID
-   name
-   email
-   phone
-   password hash
-   email verification state
-   phone verification state
-   account status
-   active state
-   last login
-   soft-delete timestamp
-   Google identity
-   Apple identity
-   timestamps

------------------------------------------------------------------------

## `sessions`

Stores server-side refresh-token sessions.

Important concepts include:

-   user ID
-   device ID
-   device name
-   platform
-   app version
-   refresh-token hash
-   token family ID
-   expiration
-   last usage
-   revocation
-   revocation reason
-   IP address
-   user agent
-   active state

The raw refresh token should not be stored in the database.

------------------------------------------------------------------------

## `otp_records`

Stores OTP lifecycle information.

Important concepts include:

-   user
-   purpose
-   destination type
-   destination
-   OTP hash
-   expiration
-   attempt count
-   maximum attempts
-   consumed timestamp
-   sent timestamp
-   resend availability
-   lock timestamp

The raw OTP must not be stored.

------------------------------------------------------------------------

## `email_verifications`

Stores email verification tokens as hashes.

The raw verification token must not be persisted.

------------------------------------------------------------------------

## `password_resets`

Stores password-reset token hashes and lifecycle information.

The raw reset token must not be persisted.

------------------------------------------------------------------------

# 19. Initial Migration

The initial migration was generated as:

``` text
55fd1c0613a9_create_authentication_tables.py
```

The revision ID is:

``` text
55fd1c0613a9
```

For a clean clone, first check the migration state:

``` powershell
alembic current
```

Then:

``` powershell
alembic upgrade head
```

Do not manually create the authentication tables in Supabase.

------------------------------------------------------------------------

# 20. Creating Future Migrations

Whenever a SQLAlchemy model changes:

### Step 1 --- Modify the model

Example:

``` text
backend/models/user.py
```

### Step 2 --- Verify model imports

Make sure the model is imported into the Alembic metadata registration
path.

### Step 3 --- Check differences

``` powershell
alembic check
```

### Step 4 --- Generate migration

``` powershell
alembic revision --autogenerate -m "describe schema change"
```

### Step 5 --- Review the generated migration manually

Never blindly apply an autogenerated migration.

Check:

-   tables
-   columns
-   nullability
-   defaults
-   indexes
-   unique constraints
-   foreign keys
-   cascade behavior
-   enum changes
-   upgrade order
-   downgrade order
-   data-destructive operations

### Step 6 --- Apply

``` powershell
alembic upgrade head
```

### Step 7 --- Verify

``` powershell
alembic current
```

------------------------------------------------------------------------

# 21. Migration Safety Rules

Never:

``` text
DROP production tables manually
```

Never:

``` text
DELETE migration files that have already been applied
```

Never:

``` text
edit an already-applied migration to change its historical meaning
```

For a schema correction, create a new migration.

Before destructive migrations:

1.  understand the data impact;
2.  back up/confirm recovery procedures;
3.  test against a safe database;
4.  review the migration;
5.  obtain project approval where required.

------------------------------------------------------------------------

# 22. Running the FastAPI Backend

The backend entry point is:

``` text
backend/main.py
```

From repository root:

``` powershell
uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```

The development backend should therefore be reachable at:

``` text
http://localhost:5000
```

From another device on the same LAN, use the development machine's LAN
IP:

``` text
http://<DEVELOPER-LAN-IP>:5000
```

Do not hard-code another developer's LAN IP into source code.

------------------------------------------------------------------------

# 23. Backend Health Check

The current backend health route is:

``` text
GET /health
```

Test locally:

``` powershell
Invoke-WebRequest http://localhost:5000/health
```

Or:

``` powershell
curl http://localhost:5000/health
```

Expected response contains:

``` json
{
  "status": "ok",
  "service": "JodTod API",
  "version": "..."
}
```

If the project later standardizes on:

``` text
/api/v1
```

the frontend and backend health endpoints must be updated together.

------------------------------------------------------------------------

# 24. Backend API Versioning

The intended API architecture is:

``` text
/api/v1/...
```

Keep versioning consistent.

Example:

``` text
/api/v1/auth/...
/api/v1/users/...
```

Do not create random endpoint prefixes such as:

``` text
/auth
/api/auth
/api/v1/auth
```

without deciding the API convention first.

When changing the public API contract, update:

-   backend route
-   schema
-   frontend API service
-   auth service
-   tests
-   documentation

------------------------------------------------------------------------

# 25. CORS

Development CORS must allow the actual frontend origin(s).

For local web/Expo development, the configured origins may include
values such as:

``` env
CORS_ALLOWED_ORIGINS=["http://localhost:8081","http://127.0.0.1:8081"]
CORS_ALLOW_CREDENTIALS=true
```

For a physical device, use the actual Expo/network origin required by
the current development environment.

Do not use:

``` text
allow_origins=["*"]
```

with credentialed authentication as a production solution.

------------------------------------------------------------------------

# 26. Mobile Frontend Setup

The mobile application is under:

``` text
mobile/
```

Install dependencies:

``` powershell
cd mobile
npm install
```

Then return to repository root when running backend commands.

Start Expo:

``` powershell
npx expo start
```

Depending on the project configuration, developers can then use:

``` text
Android emulator
iOS simulator
Expo Go
Web
```

------------------------------------------------------------------------

# 27. Frontend API URL

The frontend currently uses an API configuration similar to:

``` typescript
import { Platform } from 'react-native';

const LOCAL_IP = '192.168.1.100';

const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000';
    }

    if (Platform.OS === 'ios') {
      return 'http://localhost:5000';
    }

    return `http://${LOCAL_IP}:5000`;
  }

  return 'https://api.yourproductiondomain.com';
};

export const API_URL = getBaseUrl();
```

### Important

`10.0.2.2` is normally used by an Android emulator to access the host
machine.

`localhost` from a physical phone means the phone itself, not the
developer's computer.

For a physical device, use the developer computer's LAN IP:

``` text
http://<YOUR-LAN-IP>:5000
```

Do not commit a developer-specific IP address as a permanent production
configuration.

------------------------------------------------------------------------

# 28. Finding the Developer's LAN IP on Windows

Run:

``` powershell
ipconfig
```

Find the active network adapter's:

``` text
IPv4 Address
```

For example:

``` text
192.168.1.100
```

Then the phone can use:

``` text
http://192.168.1.100:5000
```

provided:

-   phone and computer are on the same network;
-   backend is bound to `0.0.0.0`;
-   Windows Firewall allows port 5000.

------------------------------------------------------------------------

# 29. Backend + Mobile Startup Order

For normal full-stack development:

### Terminal 1 --- Backend

``` powershell
cd D:\JodTod
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```

### Terminal 2 --- Mobile

``` powershell
cd D:\JodTod\mobile
npm install
npx expo start
```

Then launch the required emulator/device.

------------------------------------------------------------------------

# 30. Authentication Architecture

JodTod authentication is server-authoritative.

The intended model is:

``` text
Mobile App
   │
   │ credentials / OAuth / OTP
   ▼
FastAPI
   │
   ├── User Service
   ├── Token Service
   ├── Session Service
   ├── Security/JWT
   └── PostgreSQL
```

The mobile app must not become the authority for account validity.

------------------------------------------------------------------------

# 31. Access Token

Access tokens should be:

-   short-lived;
-   JWT-based;
-   signed using the configured JWT secret;
-   validated by the backend;
-   used for protected API requests.

The mobile client should not treat an access token as permanently valid.

When an access token expires, the client should use the
refresh-token/session mechanism.

------------------------------------------------------------------------

# 32. Refresh Token

Refresh tokens are long-lived credentials.

Security rules:

-   store securely on the device;
-   never put them in ordinary logs;
-   never store raw refresh tokens in PostgreSQL;
-   store only a hash server-side;
-   rotate refresh tokens;
-   revoke compromised sessions;
-   support session/device-level logout.

------------------------------------------------------------------------

# 33. Offline / Trusted Local Session

The application may retain enough local authentication state to support
trusted offline behavior.

This does **not** mean:

``` text
offline = permanently authenticated
```

The application should maintain explicit authentication states.

Examples:

``` text
loading
unauthenticated
authenticated
offline_authenticated
session_expired
verification_required
```

The backend remains authoritative whenever network access is available.

------------------------------------------------------------------------

# 34. Password Security

Passwords must never be stored in plaintext.

Store only a strong password hash.

Never:

``` text
password = database column
```

Never log:

``` text
password
OTP
refresh token
access token
reset token
verification token
```

Use the project's configured password hashing mechanism in:

``` text
backend/core/security.py
```

------------------------------------------------------------------------

# 35. OTP Security

OTP values must not be stored as plaintext.

Expected flow:

``` text
Client
  │
  │ request OTP
  ▼
Backend
  │
  ├── generate OTP
  ├── hash OTP
  ├── store hash
  ├── set expiration
  ├── set attempts
  └── send OTP
```

Verification:

``` text
Client sends OTP
        │
        ▼
Backend retrieves active OTP
        │
        ├── check expiry
        ├── check lock
        ├── check attempts
        ├── verify hash
        └── consume OTP
```

OTP controls include:

-   expiration;
-   resend cooldown;
-   maximum attempts;
-   lockout;
-   one-time consumption.

------------------------------------------------------------------------

# 36. Email Verification

Email verification should use a time-limited verification token.

The database stores:

``` text
token_hash
```

not the raw token.

Expected lifecycle:

``` text
signup
  ↓
create verification token
  ↓
send email
  ↓
user opens verification link
  ↓
backend validates token
  ↓
mark email_verified = true
  ↓
consume token
```

------------------------------------------------------------------------

# 37. Password Reset

Password-reset tokens must be:

-   random;
-   time-limited;
-   single-use;
-   stored hashed;
-   invalidated after successful use.

Expected lifecycle:

``` text
forgot password
      ↓
request reset
      ↓
generate token
      ↓
store hash
      ↓
send reset link
      ↓
verify token
      ↓
set new password
      ↓
consume token
      ↓
revoke appropriate sessions if required
```

------------------------------------------------------------------------

# 38. Google Authentication

Google signup/login should be treated as an identity-provider
authentication flow.

The backend should validate the identity-provider credential/token
according to the implementation.

Do not trust arbitrary client-provided:

``` text
google_subject
email
```

as proof of authentication.

The backend should establish the authenticated identity from validated
provider credentials.

------------------------------------------------------------------------

# 39. Apple Authentication

Apple signup/login follows the same server-authoritative principle.

The backend must validate Apple identity credentials before linking or
creating the account.

Do not allow the client to simply submit:

``` text
apple_subject = ...
```

and treat that as authentication.

------------------------------------------------------------------------

# 40. Account Linking

When multiple authentication methods belong to one person, linking must
be handled carefully.

Potential identities include:

``` text
phone
email
Google
Apple
password
```

Never automatically merge accounts solely because two unverified records
have the same email/phone.

Account linking should require appropriate proof of ownership.

------------------------------------------------------------------------

# 41. Session Management

Each authenticated device/session should be represented server-side.

A session contains information such as:

``` text
user_id
device_id
platform
app_version
refresh_token_hash
token_family_id
expires_at
last_used_at
revoked_at
revoke_reason
```

This enables:

-   logout;
-   session revocation;
-   device management;
-   refresh-token rotation;
-   compromise handling.

------------------------------------------------------------------------

# 42. Backend Development Hierarchy

Follow this order when implementing Phase 1 authentication:

  ---------------------------------------------------------------------------------------------------
                         Order Area                  Files
  ---------------------------- --------------------- ------------------------------------------------
                             1 Configuration         `backend/config.py`

                             2 Database              `backend/database.py`

                             3 Models                `backend/models/*`

                             4 Schemas               `backend/schemas/auth.py`,
                                                     `backend/schemas/user.py`

                             5 Security              `backend/core/security.py`

                             6 JWT                   `backend/core/jwt.py`

                             7 Session service       `backend/services/session_service.py`

                             8 User service          `backend/services/user_service.py`

                             9 Token service         `backend/services/token_service.py`

                            10 Auth middleware       `backend/middleware/auth.py`

                            11 Auth dependencies     `backend/dependencies/auth.py`

                            12 Auth routes           `backend/routes/auth.py`

                            13 User routes           `backend/routes/users.py`

                            14 Application wiring    `backend/main.py`

                            15 Mobile auth types     `mobile/src/types/auth.types.ts`

                            16 Auth constants        `mobile/src/constants/auth.constants.ts`

                            17 Secure storage        `mobile/src/services/auth.storage.ts`

                            18 API layer             `mobile/src/services/auth.api.ts`

                            19 Auth service          `mobile/src/services/auth.service.ts`

                            20 Network service       `mobile/src/services/network.service.ts`

                            21 Auth context          `mobile/src/context/AuthContext.tsx`

                            22 Root navigation       `mobile/app/_layout.tsx`

                            23 Entry routing         `mobile/app/index.tsx`

                            24 Auth navigation       `mobile/app/(auth)/_layout.tsx`

                            25 App navigation        `mobile/app/(tabs)/_layout.tsx`

                            26 Protected app screen  `mobile/app/(tabs)/index.tsx`

                            27 Auth loading UI       `mobile/components/auth/AuthLoadingScreen.tsx`
  ---------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 43. Backend Code Responsibilities

Keep responsibilities separated.

### `config.py`

Only configuration/environment concerns.

### `database.py`

Only database engine/session/transaction infrastructure.

### `models/`

Only persistence models and ORM relationships.

### `schemas/`

Only request/response validation contracts.

### `core/security.py`

Password hashing, OTP/token hashing, cryptographic security utilities.

### `core/jwt.py`

JWT creation, decoding and validation.

### `services/`

Business logic and persistence orchestration.

### `middleware/`

Request-level processing.

### `dependencies/`

FastAPI dependency injection and authentication context.

### `routes/`

HTTP API endpoints.

### `main.py`

Application assembly, middleware, lifespan, routers and system-level
configuration.

------------------------------------------------------------------------

# 44. Frontend Code Responsibilities

### `auth.types.ts`

TypeScript authentication contracts.

### `auth.constants.ts`

Authentication constants and stable configuration.

### `auth.storage.ts`

Secure token/session storage.

### `auth.api.ts`

Raw API communication.

### `auth.service.ts`

Authentication workflows.

### `network.service.ts`

Connectivity/network-state behavior.

### `AuthContext.tsx`

Global authentication state.

### `_layout.tsx`

Application-level navigation/auth bootstrapping.

Do not put all authentication logic directly inside screens.

------------------------------------------------------------------------

# 45. API Contract Rule

Whenever backend developers change an API:

1.  Update backend schema.
2.  Update route.
3.  Update service if required.
4.  Update response/request types.
5.  Update mobile API service.
6.  Update mobile auth service.
7.  Update UI behavior if necessary.
8.  Test both sides.

Do not silently change:

``` text
field name
field type
HTTP method
HTTP status
response shape
error shape
```

without updating the client.

------------------------------------------------------------------------

# 46. Error Handling

Backend APIs should return predictable error responses.

Frontend code should not depend on parsing arbitrary human-readable
exception strings.

Prefer structured errors such as:

``` json
{
  "detail": "Invalid OTP"
}
```

or the project's standardized error schema.

Authentication failures should use appropriate HTTP status codes.

Examples:

  Condition                                       Typical status
  --------------------------------------------- ----------------
  Invalid request                                            400
  Authentication required/invalid credentials                401
  Authenticated but not authorized                           403
  Resource not found                                         404
  Rate limited                                               429
  Server failure                                             500

Follow the project's actual API contract when implemented.

------------------------------------------------------------------------

# 47. Logging Rules

Development logs must never contain:

``` text
password
OTP
JWT
refresh token
reset token
verification token
OAuth client secret
database password
private key
```

Safe examples:

``` text
Authentication request received
OTP verification failed
Session revoked
User login successful
Database connection successful
```

Avoid logging sensitive request bodies.

------------------------------------------------------------------------

# 48. Git Workflow

Before starting:

``` powershell
git status
git pull
```

Create a feature branch:

``` powershell
git checkout -b feature/<name>
```

Examples:

``` text
feature/auth-jwt
feature/auth-otp
feature/auth-google
feature/auth-mobile
```

Commit focused changes:

``` powershell
git add .
git commit -m "Implement JWT authentication"
```

Before pushing:

``` powershell
git status
git diff
```

Then:

``` powershell
git push origin feature/<name>
```

------------------------------------------------------------------------

# 49. Merge Workflow

Before merging a branch:

1.  Pull the latest target branch.
2.  Rebase/merge as required by team policy.
3.  Run backend tests.
4.  Run migration checks.
5.  Run frontend checks.
6.  Verify no secrets are committed.
7.  Verify API contracts.
8.  Verify migration files.
9.  Push the branch.
10. Open the pull request.

------------------------------------------------------------------------

# 50. What to Do After Pulling Someone Else's Backend Changes

Run:

``` powershell
git pull
```

Activate environment:

``` powershell
.\backend\.venv\Scripts\Activate.ps1
```

Install any dependency changes:

``` powershell
pip install -r requirements.txt
```

Check migrations:

``` powershell
alembic current
```

Then:

``` powershell
alembic upgrade head
```

Verify configuration:

``` powershell
python -c "from backend.config import settings; print('CONFIG OK'); print('JWT:', bool(settings.jwt_secret_key)); print('DB:', bool(settings.database_url))"
```

Verify database:

``` powershell
python -c "import asyncio; from backend.database import check_database_connection; asyncio.run(check_database_connection()); print('DATABASE CONNECTION: OK')"
```

Then start the backend:

``` powershell
uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```

------------------------------------------------------------------------

# 51. What to Do After Pulling Frontend Changes

From:

``` text
mobile/
```

run:

``` powershell
npm install
```

Then:

``` powershell
npx expo start
```

If dependencies or native configuration changed, follow the project's
Expo/native rebuild requirements.

Do not assume that clearing caches is always necessary.

------------------------------------------------------------------------

# 52. Standard Troubleshooting

## Problem: `ModuleNotFoundError: No module named 'backend'`

You are probably running from the wrong directory.

Fix:

``` powershell
cd D:\JodTod
```

Then rerun the command.

------------------------------------------------------------------------

## Problem: `JWT_SECRET_KEY` or `DATABASE_URL` missing

Verify:

``` powershell
Test-Path .\backend\.env
```

Then verify names without exposing values:

``` powershell
Get-Content .\backend\.env | Select-String "^(JWT_SECRET_KEY|DATABASE_URL)="
```

The file must be:

``` text
D:\JodTod\backend\.env
```

not merely:

``` text
D:\JodTod\.env
```

unless the configuration architecture has explicitly been changed.

------------------------------------------------------------------------

## Problem: Database connection fails

Run:

``` powershell
python -c "import asyncio; from backend.database import check_database_connection; asyncio.run(check_database_connection()); print('DATABASE CONNECTION: OK')"
```

Inspect the exact error.

Do not randomly change:

-   host
-   port
-   SSL
-   database driver
-   pool configuration

without checking the actual error first.

------------------------------------------------------------------------

## Problem: Alembic cannot connect

Check:

``` powershell
alembic current
```

Then:

``` powershell
alembic check
```

Confirm:

``` text
backend/alembic/env.py
```

loads the application database configuration.

------------------------------------------------------------------------

## Problem: Alembic detects unexpected changes

Run:

``` powershell
alembic check
```

Then inspect:

``` text
backend/models/
```

and the current database schema.

Do not immediately generate a migration.

Determine whether the detected change is:

-   intentional;
-   an accidental model difference;
-   an existing schema drift;
-   a missing migration.

------------------------------------------------------------------------

## Problem: Mobile app cannot reach backend

Check:

``` text
Backend is running
        ↓
Port 5000 is open
        ↓
Backend bound to 0.0.0.0
        ↓
Correct API URL in mobile app
        ↓
Phone and PC on same network
        ↓
Firewall permits port 5000
```

For Android emulator:

``` text
10.0.2.2:5000
```

For physical device:

``` text
<PC-LAN-IP>:5000
```

------------------------------------------------------------------------

# 53. Recommended Verification Checklist

Before declaring a backend change complete:

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Check                               Command
  ----------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Git clean/understood                `git status`

  Config                              `python -c "from backend.config import settings; print('CONFIG OK')"`

  DB                                  `python -c "import asyncio; from backend.database import check_database_connection; asyncio.run(check_database_connection()); print('DATABASE CONNECTION: OK')"`

  Alembic                             `alembic current`

  Migration drift                     `alembic check`

  Backend imports                     `python -c "import backend.main; print('BACKEND IMPORT OK')"`

  Server                              `uvicorn backend.main:app --host 0.0.0.0 --port 5000`

  Health                              `GET /health`

  Frontend dependencies               `npm install`

  Expo                                `npx expo start`
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 54. Authentication Testing Checklist

Before merging authentication changes:

### Signup

-   [ ] Email signup
-   [ ] Phone signup
-   [ ] Duplicate email
-   [ ] Duplicate phone
-   [ ] Invalid input
-   [ ] Password validation
-   [ ] OTP generation
-   [ ] OTP expiry
-   [ ] OTP attempt limit
-   [ ] OTP resend cooldown

### Login

-   [ ] Email/password login
-   [ ] Phone OTP login
-   [ ] Invalid credentials
-   [ ] Unverified account behavior
-   [ ] Suspended account
-   [ ] Disabled account
-   [ ] Deleted account

### Email verification

-   [ ] Verification email sent
-   [ ] Valid token
-   [ ] Invalid token
-   [ ] Expired token
-   [ ] Already-consumed token

### Password reset

-   [ ] Reset request
-   [ ] Valid reset token
-   [ ] Expired token
-   [ ] Consumed token
-   [ ] Password update
-   [ ] Appropriate session revocation

### Google

-   [ ] New Google account
-   [ ] Existing Google account
-   [ ] Invalid credential
-   [ ] Account linking

### Apple

-   [ ] New Apple account
-   [ ] Existing Apple account
-   [ ] Invalid credential
-   [ ] Account linking

### Sessions

-   [ ] Access token
-   [ ] Refresh token
-   [ ] Refresh rotation
-   [ ] Logout
-   [ ] Session revocation
-   [ ] Expired session
-   [ ] Multiple devices
-   [ ] Revoked refresh token

### Offline

-   [ ] Network available
-   [ ] Network unavailable
-   [ ] Trusted local session
-   [ ] Local session expiry
-   [ ] Reconnection
-   [ ] Server revalidation

------------------------------------------------------------------------

# 55. Definition of Done --- Backend

A backend authentication feature is not complete merely because the
endpoint returns `200`.

It is complete when:

-   [ ] Model is correct.
-   [ ] Schema is correct.
-   [ ] Service logic is separated.
-   [ ] Security rules are implemented.
-   [ ] Database transaction behavior is correct.
-   [ ] Migration exists if schema changed.
-   [ ] Migration has been reviewed.
-   [ ] Error handling is consistent.
-   [ ] Sensitive data is not logged.
-   [ ] Tests exist.
-   [ ] Existing authentication flows still work.
-   [ ] API contract is documented.
-   [ ] Frontend integration is updated where necessary.

------------------------------------------------------------------------

# 56. Definition of Done --- Frontend

A frontend authentication feature is complete when:

-   [ ] TypeScript types are updated.
-   [ ] API service is updated.
-   [ ] Auth service is updated.
-   [ ] Secure storage behavior is correct.
-   [ ] AuthContext state is correct.
-   [ ] Loading state is handled.
-   [ ] Offline state is handled where applicable.
-   [ ] Navigation guards are correct.
-   [ ] API errors are displayed appropriately.
-   [ ] Tokens are never logged.
-   [ ] Logout clears the correct local state.
-   [ ] Expired sessions are handled.
-   [ ] Physical-device testing is completed when relevant.

------------------------------------------------------------------------

# 57. Production Rules

Development configuration must never accidentally become production
configuration.

Before production:

-   [ ] Production database URL configured securely.
-   [ ] Production JWT secret generated separately.
-   [ ] Debug disabled.
-   [ ] Production CORS configured.
-   [ ] OAuth production credentials configured.
-   [ ] Email/SMS provider configured.
-   [ ] Rate limits enabled.
-   [ ] Secure transport enabled.
-   [ ] Secrets stored in a secret manager/environment system.
-   [ ] Database backups/recovery confirmed.
-   [ ] Logging reviewed.
-   [ ] Monitoring configured.
-   [ ] Migration process reviewed.
-   [ ] API documentation updated.

Never use development secrets in production.

------------------------------------------------------------------------

# 58. Developer Onboarding --- Fast Path

A new backend developer should be able to follow this sequence:

``` powershell
git clone <REPOSITORY_URL>
cd JodTod

python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Create backend/.env from .env.example
# Add valid development Supabase DATABASE_URL
# Add a unique JWT_SECRET_KEY

python -c "from backend.config import settings; print('CONFIG OK'); print('JWT:', bool(settings.jwt_secret_key)); print('DB:', bool(settings.database_url))"

python -c "import asyncio; from backend.database import check_database_connection; asyncio.run(check_database_connection()); print('DATABASE CONNECTION: OK')"

alembic upgrade head

alembic current

uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```

Then open:

``` text
http://localhost:5000/health
```

------------------------------------------------------------------------

# 59. Developer Onboarding --- Mobile

In another terminal:

``` powershell
cd JodTod\mobile

npm install

npx expo start
```

Configure the mobile API URL according to the device:

  Device                    Backend address
  ------------------------- ---------------------------
  Android emulator          `http://10.0.2.2:5000`
  iOS simulator             `http://localhost:5000`
  Physical Android/iPhone   `http://<PC-LAN-IP>:5000`
  Web                       `http://localhost:5000`

------------------------------------------------------------------------

# 60. Before Opening a Pull Request

Run:

``` powershell
git status
```

Then verify:

``` powershell
alembic check
```

Then:

``` powershell
python -c "import backend.main; print('BACKEND IMPORT OK')"
```

Then start the backend and verify:

``` text
GET /health
```

For frontend changes:

``` powershell
cd mobile
npm install
npx expo start
```

Finally inspect:

``` powershell
git diff
```

Make sure there are no:

``` text
.env
secrets
passwords
tokens
private keys
local machine paths
developer-specific IP addresses
```

in the commit.

------------------------------------------------------------------------

# 61. Current Authentication Foundation Status

The authentication database foundation has been established.

Current completed foundation:

``` text
Configuration
      ↓
Database
      ↓
SQLAlchemy Models
      ↓
Alembic
      ↓
Initial Authentication Schema
```

The authentication schema contains:

``` text
users
sessions
otp_records
email_verifications
password_resets
```

The next implementation hierarchy is:

``` text
Schemas
   ↓
Security / Password / OTP Hashing
   ↓
JWT
   ↓
Session Service
   ↓
User Service
   ↓
Token Service
   ↓
Auth Middleware
   ↓
Auth Dependencies
   ↓
Auth Routes
   ↓
User Routes
   ↓
Mobile Auth Types
   ↓
Secure Storage
   ↓
API Service
   ↓
Auth Service
   ↓
Network Service
   ↓
AuthContext
   ↓
Navigation / Protected Routes
```

------------------------------------------------------------------------

# 62. Golden Rules for Future Developers

1.  **Run backend commands from the repository root.**
2.  **Never commit `.env` or secrets.**
3.  **Never store raw passwords.**
4.  **Never store raw OTPs.**
5.  **Never store raw refresh tokens.**
6.  **Never trust client-provided identity claims without validation.**
7.  **Never manually create or alter migration-managed tables in
    Supabase.**
8.  **Always review autogenerated migrations.**
9.  **Create a new migration for changes to an already-applied
    migration.**
10. **Keep backend business logic out of route functions when it belongs
    in services.**
11. **Keep authentication state centralized in `AuthContext` on
    mobile.**
12. **Use SecureStore for sensitive mobile credentials.**
13. **Never log authentication secrets.**
14. **Keep API contracts synchronized between backend and frontend.**
15. **Do not hard-code another developer's LAN IP.**
16. **Test authentication failure paths, not only successful paths.**
17. **Treat the backend as the authority for authentication and
    authorization.**
18. **When something fails, inspect the exact error before changing
    architecture/configuration.**

------------------------------------------------------------------------

# 63. Quick Command Reference

## Backend

``` powershell
cd D:\JodTod
.\backend\.venv\Scripts\Activate.ps1
```

``` powershell
pip install -r requirements.txt
```

``` powershell
alembic upgrade head
```

``` powershell
alembic current
```

``` powershell
alembic check
```

``` powershell
uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```

## Config test

``` powershell
python -c "from backend.config import settings; print('CONFIG OK'); print('JWT:', bool(settings.jwt_secret_key)); print('DB:', bool(settings.database_url))"
```

## Database test

``` powershell
python -c "import asyncio; from backend.database import check_database_connection; asyncio.run(check_database_connection()); print('DATABASE CONNECTION: OK')"
```

## Mobile

``` powershell
cd D:\JodTod\mobile
npm install
npx expo start
```

------------------------------------------------------------------------

# 64. Final Onboarding Principle

If a developer has:

-   cloned the repository;
-   installed Python and Node;
-   created the backend virtual environment;
-   installed dependencies;
-   created `backend/.env`;
-   supplied valid Supabase credentials;
-   supplied a development JWT secret;
-   run `alembic upgrade head`;
-   started FastAPI on port `5000`;
-   started Expo;

then the developer should have a complete local development environment
without modifying source code simply to make the project run.

If a developer has to ask another developer for undocumented commands,
manually create database tables, copy secrets from another developer, or
modify Python imports just to start the project, the onboarding
documentation or repository configuration should be improved.
