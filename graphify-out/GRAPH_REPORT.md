# Graph Report - .  (2026-09-26)

## Corpus Check
- Large corpus: 153 files · ~916,434 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1099 nodes · 3162 edges · 50 communities detected
- Extraction: 54% EXTRACTED · 46% INFERRED · 0% AMBIGUOUS · INFERRED: 1452 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Email and password auth|Email and password auth]]
- [[_COMMUNITY_Auth sessions and refresh|Auth sessions and refresh]]
- [[_COMMUNITY_Mobile API clients|Mobile API clients]]
- [[_COMMUNITY_Activity backend|Activity backend]]
- [[_COMMUNITY_Architecture overview hubs|Architecture overview hubs]]
- [[_COMMUNITY_OTP delivery providers|OTP delivery providers]]
- [[_COMMUNITY_Signup and logout|Signup and logout]]
- [[_COMMUNITY_Test database fixtures|Test database fixtures]]
- [[_COMMUNITY_JWT middleware|JWT middleware]]
- [[_COMMUNITY_Session refresh service|Session refresh service]]
- [[_COMMUNITY_App configuration|App configuration]]
- [[_COMMUNITY_OAuth providers|OAuth providers]]
- [[_COMMUNITY_User service tests|User service tests]]
- [[_COMMUNITY_Security primitives tests|Security primitives tests]]
- [[_COMMUNITY_Auth dependency layer|Auth dependency layer]]
- [[_COMMUNITY_External auth diagnostics|External auth diagnostics]]
- [[_COMMUNITY_Onboarding and settle UI|Onboarding and settle UI]]
- [[_COMMUNITY_Logout and profile UI|Logout and profile UI]]
- [[_COMMUNITY_Import smoke tests|Import smoke tests]]
- [[_COMMUNITY_Activity screen handlers|Activity screen handlers]]
- [[_COMMUNITY_Network status service|Network status service]]
- [[_COMMUNITY_Manual login OTP test|Manual login OTP test]]
- [[_COMMUNITY_Product design concepts|Product design concepts]]
- [[_COMMUNITY_Home dashboard screen|Home dashboard screen]]
- [[_COMMUNITY_Tab bar layout|Tab bar layout]]
- [[_COMMUNITY_Auth context provider|Auth context provider]]
- [[_COMMUNITY_Auth tables migration|Auth tables migration]]
- [[_COMMUNITY_User index migration|User index migration]]
- [[_COMMUNITY_Activities table migration|Activities table migration]]
- [[_COMMUNITY_Activity columns migration|Activity columns migration]]
- [[_COMMUNITY_Group invite screen|Group invite screen]]
- [[_COMMUNITY_Shared glass UI|Shared glass UI]]
- [[_COMMUNITY_Mobile API base URL|Mobile API base URL]]
- [[_COMMUNITY_Auth error types|Auth error types]]
- [[_COMMUNITY_App index screen|App index screen]]
- [[_COMMUNITY_Root layout|Root layout]]
- [[_COMMUNITY_Email verification screen|Email verification screen]]
- [[_COMMUNITY_Auth route layout|Auth route layout]]
- [[_COMMUNITY_Group creation screen|Group creation screen]]
- [[_COMMUNITY_Group join screen|Group join screen]]
- [[_COMMUNITY_Group edit screen|Group edit screen]]
- [[_COMMUNITY_Auth loading screen|Auth loading screen]]
- [[_COMMUNITY_Offline indicator|Offline indicator]]
- [[_COMMUNITY_Mock groups data|Mock groups data]]
- [[_COMMUNITY_Health check client|Health check client]]
- [[_COMMUNITY_OTP disclosure rationale|OTP disclosure rationale]]
- [[_COMMUNITY_Phone OTP provider contract|Phone OTP provider contract]]
- [[_COMMUNITY_Email OTP provider contract|Email OTP provider contract]]
- [[_COMMUNITY_SMTP worker contract|SMTP worker contract]]
- [[_COMMUNITY_Design spec document|Design spec document]]

## God Nodes (most connected - your core abstractions)
1. `User` - 138 edges
2. `AuthenticatedUser` - 99 edges
3. `OTPPurpose` - 90 edges
4. `AccountStatus` - 88 edges
5. `Session` - 77 edges
6. `TokenResponse` - 64 edges
7. `AuthResponse` - 63 edges
8. `SessionService` - 57 edges
9. `UserService` - 50 edges
10. `OTPError` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Backend setup and runbook` --references--> `Pydantic Settings singleton (JWT, OTP, DB pool, OAuth, providers)`  [INFERRED]
  README.md → backend/config.py
- `Primary navigation: Home Groups + Activity Settle Profile` --references--> `Expo Router mobile app (auth group, tabs group, group detail routes)`  [INFERRED]
  docs/JODTOD_DESIGN_SPEC.md → app/src/app/_layout.tsx
- `Auth and onboarding screens (splash, onboarding, login, signup)` --references--> `Expo Router mobile app (auth group, tabs group, group detail routes)`  [INFERRED]
  docs/JODTOD_DESIGN_SPEC.md → app/src/app/_layout.tsx
- `Process an incoming HTTP request.` --uses--> `JWTError`  [INFERRED]
  D:\JodTod\backend\middleware\auth.py → D:\JodTod\backend\core\jwt.py
- `Token signed with a different secret is rejected.` --uses--> `JWTError`  [INFERRED]
  D:\JodTod\backend\tests\test_jwt.py → D:\JodTod\backend\core\jwt.py

## Hyperedges (group relationships)
- **Full authentication flow** — auth_signup_flow, auth_login_flow, auth_otp_flow, auth_email_flow, auth_password_flow, auth_refresh_flow, auth_oauth_flow, auth_logout_flow, session_service, user_service [INFERRED 0.80]
- **Activity feed flow** — activities_route, activity_service, activity_api_client, activity_tab, designspec_activity_feed [INFERRED 0.80]
- **Mobile app shell and navigation** — expo_router_app, auth_context, auth_api_service, groups_ui, settle_tab, activity_tab, designspec_product_navigation [INFERRED 0.75]

## Communities

### Community 0 - "Email and password auth"
Cohesion: 0.05
Nodes (146): AuthResponse, CurrentUserResponse, Issue a 6-digit email verification code.      Business logic lives in email_veri, Verify an email address with its 6-digit code.      Path preserved from the orig, send_email_verification(), verify_email(), EmailVerificationResponse, ErrorResponse (+138 more)

### Community 1 - "Auth sessions and refresh"
Cohesion: 0.05
Nodes (78): JodTod activity event model.  One row represents one user-visible activity feed, Resolve the user associated with the authenticated session., Return a standard 401 response., Resolve both authenticated user and session.      Useful when an endpoint needs:, Require the authenticated account to be active., Create a standard 401 authentication exception., Extract the raw Bearer access token from the request., Validate the JWT and resolve the corresponding database     authentication sessi (+70 more)

### Community 2 - "Mobile API clients"
Cohesion: 0.06
Nodes (80): ActivityApiError, appendMulti(), buildQuery(), fetchActivities(), fetchActivityById(), apiForgotPassword(), apiGetCurrentUser(), apiLogin() (+72 more)

### Community 3 - "Activity backend"
Cohesion: 0.09
Nodes (62): create_activity(), get_activity(), list_activities(), JodTod activity routes: user-scoped activity feed.  All routes require authentic, Return one activity owned by the authenticated user.      Powers the mobile Acti, Record one activity event for the authenticated user.      Used by expense / set, List the authenticated user's activities, newest first.      Powers the mobile A, Activity (+54 more)

### Community 4 - "Architecture overview hubs"
Cohesion: 0.04
Nodes (64): Activity feed routes (newest-first, day-grouped), Mobile activity feed API client, Activity event service layer, Activity tab UI, Expo SDK version pin instruction (read versioned docs before coding), Mobile auth API client, React AuthContext session state, Email verification token flow (+56 more)

### Community 5 - "OTP delivery providers"
Cohesion: 0.1
Nodes (52): ABC, login(), OTP, OTPDestinationType, _deliver_sync(), DeliveryResult, EmailProvider, get_email_provider() (+44 more)

### Community 6 - "Signup and logout"
Cohesion: 0.08
Nodes (37): logout_session(), LogoutError, JodTod Authentication - Logout Service  Responsibilities:     - Revoke the authe, Base class for logout failures., Raised when an explicitly requested session does not belong to     the authentic, Revoke a single authenticated session belonging to a user.      The session is r, SessionNotFoundError, _create_access_token() (+29 more)

### Community 7 - "Test database fixtures"
Cohesion: 0.08
Nodes (36): db(), db_ready(), Test configuration.  Environment variables MUST be set before any backend import, Provide a clean async session. Tables are truncated before each test     via a l, Assert the scratch database is reachable., check_database_connection(), dispose_database(), get_db() (+28 more)

### Community 8 - "JWT middleware"
Cohesion: 0.12
Nodes (33): AuthenticationMiddleware, Process an incoming HTTP request., _unauthorized(), BaseHTTPMiddleware, _algorithm(), create_access_token(), decode_access_token(), get_session_id_from_token() (+25 more)

### Community 9 - "Session refresh service"
Cohesion: 0.15
Nodes (32): refresh(), create_session(), ensure_valid(), get_active_device_session(), get_by_id(), get_user_session(), is_valid(), issue_session() (+24 more)

### Community 10 - "App configuration"
Cohesion: 0.14
Nodes (25): BaseSettings, access_token_expire_seconds(), dev_otp_disclosure_allowed(), email_verification_expire_seconds(), generate_secret(), get_settings(), normalize_cors(), password_reset_expire_seconds() (+17 more)

### Community 11 - "OAuth providers"
Cohesion: 0.19
Nodes (21): apple_auth(), _authenticate(), google_auth(), authenticate_with_provider(), _decode_with_jwks(), _email_verified(), _ensure_may_authenticate(), InvalidOAuthTokenError (+13 more)

### Community 12 - "User service tests"
Cohesion: 0.21
Nodes (24): _create_data(), Tests for user_service against the scratch DB., test_create_user_hashes_password(), test_create_user_normalizes_email(), test_create_user_requires_identifier(), test_create_user_requires_password(), test_duplicate_email_raises(), test_duplicate_phone_raises() (+16 more)

### Community 13 - "Security primitives tests"
Cohesion: 0.15
Nodes (23): generate_otp(), generate_secure_token(), generate_session_token(), hash_password(), hash_token(), SHA-256 hash of a token.      The raw token should be sent to the client, whil, Compare a raw token against its stored SHA-256 hash., Generate high-entropy random session material. (+15 more)

### Community 14 - "Auth dependency layer"
Cohesion: 0.25
Nodes (17): authentication_error(), get_bearer_token(), get_current_session(), get_current_user(), get_current_user_and_session(), require_active_user(), Tests for backend.dependencies.auth (authentication dependency layer)., test_authentication_error_is_401() (+9 more)

### Community 15 - "External auth diagnostics"
Cohesion: 0.23
Nodes (19): SMTP email adapter using Python's standard library., SMTPEmailProvider, application_settings(), masked(), print_result(), JodTod external authentication configuration diagnostics.  Run:     pytest -s, Report SMTP readiness without exposing the password or recipient., Send only when all SMTP credentials and a test recipient exist. (+11 more)

### Community 16 - "Onboarding and settle UI"
Cohesion: 0.27
Nodes (9): goToSlide(), handleNext(), handleScroll(), handleSkip(), avatarUri(), pop(), push(), resetTo() (+1 more)

### Community 17 - "Logout and profile UI"
Cohesion: 0.27
Nodes (6): logout(), # NOTE: use_cache=False gives this route its own AsyncSession., Log out an authenticated session.      By default the session bound to the acces, cancelLogout(), confirmLogout(), handleLogout()

### Community 18 - "Import smoke tests"
Cohesion: 0.36
Nodes (8): test_config_imports(), test_core_imports(), test_database_imports(), test_dependencies_imports(), test_middleware_imports(), test_models_imports(), test_schemas_imports(), test_services_imports()

### Community 19 - "Activity screen handlers"
Cohesion: 0.39
Nodes (7): handleDayPress(), handleItemPress(), handleReset(), if(), pop(), push(), toggleValue()

### Community 20 - "Network status service"
Cohesion: 0.53
Nodes (7): ensureFallbackPolling(), getNetworkState(), isOnline(), isOnlineStatus(), probeReachability(), subscribeToNetworkChanges(), toNetworkStatus()

### Community 21 - "Manual login OTP test"
Cohesion: 0.42
Nodes (7): get_base_url(), main(), print_result(), JodTod Manual Login + OTP Flow Test.  Interactive terminal test that exercises t, Read the backend base URL from environment or use default., Return a safe error message without exposing secrets., safe_error_message()

### Community 22 - "Product design concepts"
Cohesion: 0.29
Nodes (7): Expense creation and split methods (equal, unequal, percentage, item-wise, selective), Groups and trips management (create, invite, roles, settings), Receipt scanning, OCR and bill queue, Reports, analytics, budget alerts and group closure, Settlement flow (suggestions, partial payment, history), Groups list and detail UI, Settle tab UI

### Community 23 - "Home dashboard screen"
Cohesion: 0.6
Nodes (3): getGreeting(), handleLogoutPress(), handleProfilePress()

### Community 24 - "Tab bar layout"
Cohesion: 0.7
Nodes (3): isGroupsSubScreen(), renderTab(), shouldHideTabBar()

### Community 25 - "Auth context provider"
Cohesion: 0.6
Nodes (3): AuthProvider(), isAuthedResponse(), statusFor()

### Community 26 - "Auth tables migration"
Cohesion: 0.6
Nodes (3): downgrade(), create authentication tables  Revision ID: 55fd1c0613a9 Revises:  Create Date: 2, upgrade()

### Community 27 - "User index migration"
Cohesion: 0.6
Nodes (3): downgrade(), add missing user lookup indexes  Revision ID: 55fd1c0613b0 Revises: 55fd1c0613a9, upgrade()

### Community 28 - "Activities table migration"
Cohesion: 0.6
Nodes (3): downgrade(), create activities table  Revision ID: 7a2c9e4f1b3d Revises: 55fd1c0613b0 Create, upgrade()

### Community 29 - "Activity columns migration"
Cohesion: 0.6
Nodes (3): downgrade(), add activity detail columns  Revision ID: 9c1e7a2b4d5f Revises: 7a2c9e4f1b3d Cre, upgrade()

### Community 30 - "Group invite screen"
Cohesion: 0.67
Nodes (2): copyLink(), shareLink()

### Community 31 - "Shared glass UI"
Cohesion: 0.67
Nodes (2): BubbleBackdrop(), GlassCard()

### Community 32 - "Mobile API base URL"
Cohesion: 0.83
Nodes (2): devServerIp(), getBaseUrl()

### Community 33 - "Auth error types"
Cohesion: 0.5
Nodes (1): AuthError

### Community 34 - "App index screen"
Cohesion: 0.67
Nodes (1): Index()

### Community 35 - "Root layout"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 36 - "Email verification screen"
Cohesion: 0.67
Nodes (1): VerifyAccount()

### Community 37 - "Auth route layout"
Cohesion: 0.67
Nodes (1): AuthLayout()

### Community 38 - "Group creation screen"
Cohesion: 0.67
Nodes (1): handleCreate()

### Community 39 - "Group join screen"
Cohesion: 0.67
Nodes (1): handleJoin()

### Community 40 - "Group edit screen"
Cohesion: 0.67
Nodes (1): handleSave()

### Community 41 - "Auth loading screen"
Cohesion: 0.67
Nodes (1): AuthLoadingScreen()

### Community 42 - "Offline indicator"
Cohesion: 0.67
Nodes (1): OfflineIndicator()

### Community 43 - "Mock groups data"
Cohesion: 0.67
Nodes (1): getGroup()

### Community 44 - "Health check client"
Cohesion: 0.67
Nodes (1): fetchHealthCheck()

### Community 68 - "OTP disclosure rationale"
Cohesion: 1.0
Nodes (1): Whether a generated OTP may be returned to the caller for         development c

### Community 75 - "Phone OTP provider contract"
Cohesion: 1.0
Nodes (1): Deliver an OTP message to a phone number.

### Community 76 - "Email OTP provider contract"
Cohesion: 1.0
Nodes (1): Deliver an OTP email to an address.

### Community 77 - "SMTP worker contract"
Cohesion: 1.0
Nodes (1): Blocking stdlib SMTP exchange (must run in a worker thread).

### Community 109 - "Design spec document"
Cohesion: 1.0
Nodes (1): JodTod UI design spec (text mirror of 11 design sheets)

## Knowledge Gaps
- **93 isolated node(s):** `Application configuration loaded from environment variables.      Real secrets`, `Whether a generated OTP may be returned to the caller for         development c`, `Create one application-wide Settings instance.`, `Normalize common PostgreSQL URLs to an asyncpg SQLAlchemy URL.      Accepted exa`, `FastAPI dependency.      The dependency owns the session lifecycle. A successful` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Group invite screen`** (4 nodes): `invite.tsx`, `invite.tsx`, `copyLink()`, `shareLink()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared glass UI`** (4 nodes): `ui.tsx`, `ui.tsx`, `BubbleBackdrop()`, `GlassCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mobile API base URL`** (4 nodes): `devServerIp()`, `getBaseUrl()`, `api.ts`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth error types`** (4 nodes): `auth.types.ts`, `AuthError`, `.constructor()`, `auth.types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App index screen`** (3 nodes): `index.tsx`, `index.tsx`, `Index()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root layout`** (3 nodes): `_layout.tsx`, `_layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Email verification screen`** (3 nodes): `verify-email.tsx`, `verify-email.tsx`, `VerifyAccount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth route layout`** (3 nodes): `_layout.tsx`, `_layout.tsx`, `AuthLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Group creation screen`** (3 nodes): `create.tsx`, `handleCreate()`, `create.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Group join screen`** (3 nodes): `join.tsx`, `join.tsx`, `handleJoin()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Group edit screen`** (3 nodes): `edit.tsx`, `edit.tsx`, `handleSave()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth loading screen`** (3 nodes): `AuthLoadingScreen.tsx`, `AuthLoadingScreen()`, `AuthLoadingScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Offline indicator`** (3 nodes): `OfflineIndicator.tsx`, `OfflineIndicator.tsx`, `OfflineIndicator()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mock groups data`** (3 nodes): `mockGroups.ts`, `mockGroups.ts`, `getGroup()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health check client`** (3 nodes): `fetchHealthCheck()`, `api.ts`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OTP disclosure rationale`** (1 nodes): `Whether a generated OTP may be returned to the caller for         development c`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phone OTP provider contract`** (1 nodes): `Deliver an OTP message to a phone number.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Email OTP provider contract`** (1 nodes): `Deliver an OTP email to an address.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SMTP worker contract`** (1 nodes): `Blocking stdlib SMTP exchange (must run in a worker thread).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Design spec document`** (1 nodes): `JodTod UI design spec (text mirror of 11 design sheets)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Auth sessions and refresh` to `Email and password auth`, `Activity backend`, `OTP delivery providers`, `Signup and logout`, `Test database fixtures`, `Session refresh service`, `OAuth providers`, `User service tests`, `Auth dependency layer`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `create_account()` connect `Signup and logout` to `Email and password auth`, `Auth sessions and refresh`, `Activity backend`, `Test database fixtures`, `JWT middleware`, `Session refresh service`, `Security primitives tests`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `OTPPurpose` connect `Email and password auth` to `JWT middleware`, `Auth sessions and refresh`, `OTP delivery providers`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 133 inferred relationships involving `User` (e.g. with `Alembic migration environment for JodTod.  Database credentials are loaded throu` and `Get the database URL from the application's environment-driven     configuration`) actually correct?**
  _`User` has 133 INFERRED edges - model-reasoned connections that need verification._
- **Are the 95 inferred relationships involving `AuthenticatedUser` (e.g. with `JodTod user routes: current-user profile and device/session management.  All rou` and `Return the authenticated user's profile.      Used by the mobile client for sess`) actually correct?**
  _`AuthenticatedUser` has 95 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `OTPPurpose` (e.g. with `Base` and `TimestampMixin`) actually correct?**
  _`OTPPurpose` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `AccountStatus` (e.g. with `Base` and `TimestampMixin`) actually correct?**
  _`AccountStatus` has 85 INFERRED edges - model-reasoned connections that need verification._