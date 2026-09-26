# Graph Report - .  (2026-09-27)

## Corpus Check
- Large corpus: 162 files · ~917,675 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1093 nodes · 2725 edges · 59 communities detected
- Extraction: 45% EXTRACTED · 55% INFERRED · 0% AMBIGUOUS · INFERRED: 1496 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Password Login Service|Password Login Service]]
- [[_COMMUNITY_Auth Data Models|Auth Data Models]]
- [[_COMMUNITY_Logout Middleware Flow|Logout Middleware Flow]]
- [[_COMMUNITY_JWT Auth Dependencies|JWT Auth Dependencies]]
- [[_COMMUNITY_Mobile Auth API Client|Mobile Auth API Client]]
- [[_COMMUNITY_Activity Feed Backend|Activity Feed Backend]]
- [[_COMMUNITY_Session Refresh Flow|Session Refresh Flow]]
- [[_COMMUNITY_Database Test Harness|Database Test Harness]]
- [[_COMMUNITY_Mobile Navigation Shell|Mobile Navigation Shell]]
- [[_COMMUNITY_OTP Email Verification|OTP Email Verification]]
- [[_COMMUNITY_App Configuration Settings|App Configuration Settings]]
- [[_COMMUNITY_Password Hashing Security|Password Hashing Security]]
- [[_COMMUNITY_Mobile Screens Routing|Mobile Screens Routing]]
- [[_COMMUNITY_External Auth Diagnostics|External Auth Diagnostics]]
- [[_COMMUNITY_Group Expense UI|Group Expense UI]]
- [[_COMMUNITY_Product Design Spec|Product Design Spec]]
- [[_COMMUNITY_Project Docs Setup|Project Docs Setup]]
- [[_COMMUNITY_Auth State Management|Auth State Management]]
- [[_COMMUNITY_Network Reachability Service|Network Reachability Service]]
- [[_COMMUNITY_Auth Initial Migration|Auth Initial Migration]]
- [[_COMMUNITY_OAuth Google Apple|OAuth Google Apple]]
- [[_COMMUNITY_Manual OTP Test Script|Manual OTP Test Script]]
- [[_COMMUNITY_OAuth Unit Tests|OAuth Unit Tests]]
- [[_COMMUNITY_Mobile API Base URL|Mobile API Base URL]]
- [[_COMMUNITY_Group Edit Mock Data|Group Edit Mock Data]]
- [[_COMMUNITY_Auth Types Errors|Auth Types Errors]]
- [[_COMMUNITY_Mock Groups Tailwind|Mock Groups Tailwind]]
- [[_COMMUNITY_Splash Branding Assets|Splash Branding Assets]]
- [[_COMMUNITY_Email OTP Schemas|Email OTP Schemas]]
- [[_COMMUNITY_Service Lifecycle Tests|Service Lifecycle Tests]]
- [[_COMMUNITY_JWT Hashing Tests|JWT Hashing Tests]]
- [[_COMMUNITY_Test DB Fixtures|Test DB Fixtures]]
- [[_COMMUNITY_Test Env Imports|Test Env Imports]]
- [[_COMMUNITY_Auth Response Types|Auth Response Types]]
- [[_COMMUNITY_Onboarding Splash Assets|Onboarding Splash Assets]]
- [[_COMMUNITY_Dev OTP Disclosure|Dev OTP Disclosure]]
- [[_COMMUNITY_Phone OTP Provider|Phone OTP Provider]]
- [[_COMMUNITY_Email OTP Provider|Email OTP Provider]]
- [[_COMMUNITY_SMTP Blocking Send|SMTP Blocking Send]]
- [[_COMMUNITY_Root Stack Layout|Root Stack Layout]]
- [[_COMMUNITY_Auth Loading Component|Auth Loading Component]]
- [[_COMMUNITY_Activity Test Suite|Activity Test Suite]]
- [[_COMMUNITY_Test Create Helper|Test Create Helper]]
- [[_COMMUNITY_Activity Schema Check|Activity Schema Check]]
- [[_COMMUNITY_Token Service Tests|Token Service Tests]]
- [[_COMMUNITY_JWT Rejection Tests|JWT Rejection Tests]]
- [[_COMMUNITY_Secure Token Tests|Secure Token Tests]]
- [[_COMMUNITY_Auth API Paths|Auth API Paths]]
- [[_COMMUNITY_Auth Storage Keys|Auth Storage Keys]]
- [[_COMMUNITY_OTP Timeout Config|OTP Timeout Config]]
- [[_COMMUNITY_Network Timeout Config|Network Timeout Config]]
- [[_COMMUNITY_OTP Purpose Types|OTP Purpose Types]]
- [[_COMMUNITY_Action Card UI|Action Card UI]]
- [[_COMMUNITY_Babel Presets|Babel Presets]]
- [[_COMMUNITY_Metro NativeWind Wrapper|Metro NativeWind Wrapper]]
- [[_COMMUNITY_Splash Divider Asset|Splash Divider Asset]]
- [[_COMMUNITY_Splash People Asset|Splash People Asset]]
- [[_COMMUNITY_Splash Tagline Asset|Splash Tagline Asset]]
- [[_COMMUNITY_Design Mockups Folder|Design Mockups Folder]]

## God Nodes (most connected - your core abstractions)
1. `User` - 137 edges
2. `AuthenticatedUser` - 98 edges
3. `OTPPurpose` - 89 edges
4. `AccountStatus` - 87 edges
5. `Session` - 76 edges
6. `TokenResponse` - 63 edges
7. `AuthResponse` - 62 edges
8. `SessionService` - 56 edges
9. `UserService` - 50 edges
10. `OTPError` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Tests for the JWT foundation layer (backend.core.jwt).  Verified against install` --uses--> `JWTError`  [INFERRED]
  D:\JodTod\backend\tests\test_jwt.py → D:\JodTod\backend\core\jwt.py
- `Token signed with a different secret is rejected.` --uses--> `JWTError`  [INFERRED]
  D:\JodTod\backend\tests\test_jwt.py → D:\JodTod\backend\core\jwt.py
- `Signup Request Schema` --rationale_for--> `hash_password()`  [INFERRED]
  backend/schemas/auth.py → D:\JodTod\backend\core\security.py
- `Login Request Schema` --rationale_for--> `verify_password()`  [INFERRED]
  backend/schemas/auth.py → D:\JodTod\backend\core\security.py
- `generate_otp()` --shares_data_with--> `OTP Policy Config`  [INFERRED]
  D:\JodTod\backend\core\security.py → backend/config.py

## Hyperedges (group relationships)
- **Group financial flow: expenses feed balances into optimized settlement and closure** — jodtod_design_spec_group_lifecycle, jodtod_design_spec_expense_lifecycle, jodtod_design_spec_settlement_suggestions [INFERRED 0.75]
- **Capture to expense via OCR queue with offline persistence and sync** — jodtod_design_spec_receipt_ocr_queue, jodtod_design_spec_expense_lifecycle, jodtod_design_spec_offline_sync [INFERRED 0.75]
- **Password Auth Flow** — login_endpoint, jwt_create_access_token, auth_get_current_session [INFERRED 0.85]
- **OTP Verification Flow** — otp_send_endpoint, otp_verify_endpoint, models_otp_purpose [INFERRED 0.80]
- **Session Lifecycle** — logout_endpoint, refresh_endpoint, users_revoke_session_endpoint [INFERRED 0.78]
- **password login issues session via SessionService and refresh rotates it** — auth_login_service_login_with_password, session_service_issue_session, auth_refresh_service_refresh_tokens [INFERRED 0.90]
- **OTP issue then verify then phone login session pattern shared across email and phone** — otp_service_request_otp, otp_service_verify_otp_code, phone_auth_service_verify_login_otp [EXTRACTED 0.90]
- **activity service persists Activity model created then extended by migrations** — activity_service_create_activity, activity_activity, 7a2c9e4f1b3d_create_activities_table_upgrade [INFERRED 0.85]
- **auth flow: onboarding -> login/signup -> otp/verify-email -> tabs** — onboarding_screen, login_screen, login_otp_screen, signup_screen, verify_email_screen, auth_layout, index_route, tabs_layout, tabs_home [EXTRACTED 0.95]
- **groups flow: groups list -> create/join -> detail (tab bar hidden on sub-screens)** — groups_list, groups_create, groups_join, tabs_layout, tabs_home, tabs_settle [EXTRACTED 0.93]
- **profile settings flow: home -> profile -> edit/personal/preferences/linked/app-settings/help/about + logout** — tabs_home, profile_screen, edit_profile_screen, personal_information_screen, preferences_screen, linked_accounts_screen, app_settings_screen, help_support_screen, about_jodtod_screen, login_screen [EXTRACTED 0.92]
- **h_group_detail_composition** — group_detail_screen, balance_summary_component, member_stack_component [INFERRED 0.95]
- **h_group_management_flow** — group_settings_screen, confirm_sheet_component, group_edit_screen [INFERRED 0.93]
- **h_offline_auth_coordination** — auth_context_provider, auth_storage_layer, network_service [INFERRED 0.96]
- **h_token_refresh_singleflight** — auth_api_client, auth_storage_layer, auth_service_orchestrator [INFERRED 0.97]
- **frontend auth constants + types mirror backend schemas and API prefix** — auth_constants_auth_api_paths, auth_types_user [INFERRED 0.93]
- **AnimatedIntro orchestrates splash image sequence then onboarding preload** — animatedintro_animatedintro, animatedintro_onboarding_preload [INFERRED 0.90]

## Communities

### Community 0 - "Password Login Service"
Cohesion: 0.06
Nodes (114): AuthResponse, Password login.      Validates the identifier (email or phone) + password, opens, _ensure_account_may_authenticate(), InvalidLoginError, login_with_password(), LoginError, JodTod Authentication - Login Service  Password login validates credentials and, Validate identifier + password and open an authenticated session.      Email/pas (+106 more)

### Community 1 - "Auth Data Models"
Cohesion: 0.06
Nodes (86): ABC, JodTod activity event model.  One row represents one user-visible activity feed, Base, Base, Shared SQLAlchemy model primitives.  Kept separate from the requested entity fil, Reusable PostgreSQL UUID primary key., UTC database timestamps maintained by PostgreSQL., TimestampMixin (+78 more)

### Community 2 - "Logout Middleware Flow"
Cohesion: 0.05
Nodes (74): AuthenticationMiddleware, CurrentUserResponse, logout(), # NOTE: use_cache=False gives this route its own AsyncSession., Log out an authenticated session.      By default the session bound to the acces, logout_session(), LogoutError, JodTod Authentication - Logout Service  Responsibilities:     - Revoke the authe (+66 more)

### Community 3 - "JWT Auth Dependencies"
Cohesion: 0.04
Nodes (82): Create Activity Endpoint, Get Activity Endpoint, List Activities Endpoint, authentication_error(), get_bearer_token(), get_current_session(), get_current_user(), get_current_user_and_session() (+74 more)

### Community 4 - "Mobile Auth API Client"
Cohesion: 0.05
Nodes (69): apiForgotPassword(), apiGetCurrentUser(), apiLogin(), apiLoginWithGoogle(), apiLogout(), apiRefresh(), apiResetPassword(), apiSendEmailVerification() (+61 more)

### Community 5 - "Activity Feed Backend"
Cohesion: 0.06
Nodes (75): create activities table  Revision ID: 7a2c9e4f1b3d Revises: 55fd1c0613b0 Create, upgrade(), add activity detail columns  Revision ID: 9c1e7a2b4d5f Revises: 7a2c9e4f1b3d Cre, upgrade(), create_activity(), get_activity(), list_activities(), JodTod activity routes: user-scoped activity feed.  All routes require authentic (+67 more)

### Community 6 - "Session Refresh Flow"
Cohesion: 0.08
Nodes (52): Rotate a refresh token and issue a new token pair.      Rotation reuse revokes t, refresh(), _ensure_may_authenticate(), request_email_login_otp(), verify_email_login_otp(), create_session(), ensure_valid(), get_active_device_session() (+44 more)

### Community 7 - "Database Test Harness"
Cohesion: 0.04
Nodes (39): db(), db_ready(), Test configuration.  Environment variables MUST be set before any backend import, Provide a clean async session. Tables are truncated before each test     via a l, Assert the scratch database is reachable., check_database_connection(), Database Dispose, dispose_database() (+31 more)

### Community 8 - "Mobile Navigation Shell"
Cohesion: 0.05
Nodes (19): ActivityApiError, appendMulti(), buildQuery(), fetchActivities(), fetchActivityById(), getAuthorizationHeader(), groupExpensesByDate(), set() (+11 more)

### Community 9 - "OTP Email Verification"
Cohesion: 0.11
Nodes (28): Issue a 6-digit email verification code.      Business logic lives in email_veri, Verify an email address with its 6-digit code.      Path preserved from the orig, send_email_verification(), verify_email(), EmailVerificationResponse, Issue a one-time code for a destination + purpose.      Phone-login codes requir, Verify a one-time code.      Purpose PHONE_LOGIN opens a full authenticated sess, send_otp() (+20 more)

### Community 10 - "App Configuration Settings"
Cohesion: 0.09
Nodes (18): BaseSettings, generate_secret(), get_settings(), JodTod Backend Configuration Production-oriented environment configuration., Application configuration loaded from environment variables.      Real secrets, Create one application-wide Settings instance., Settings, Async Database Engine (+10 more)

### Community 11 - "Password Hashing Security"
Cohesion: 0.1
Nodes (26): Password Policy Config, Verify Email Endpoint, generate_otp(), generate_secure_token(), generate_session_token(), hash_password(), hash_token(), SHA-256 hash of a token.      The raw token should be sent to the client, whil (+18 more)

### Community 12 - "Mobile Screens Routing"
Cohesion: 0.14
Nodes (22): About JodTod static info, App Settings (language/privacy/data), Unauthenticated group guard, Edit Profile form, Create Group form screen, Join Group via invite code, Groups list with search + status filter, Help & Support FAQs + contact (+14 more)

### Community 13 - "External Auth Diagnostics"
Cohesion: 0.19
Nodes (19): SMTP email adapter using Python's standard library., SMTPEmailProvider, application_settings(), masked(), print_result(), JodTod external authentication configuration diagnostics.  Run:     pytest -s, Report SMTP readiness without exposing the password or recipient., Send only when all SMTP credentials and a test recipient exist. (+11 more)

### Community 14 - "Group Expense UI"
Cohesion: 0.19
Nodes (20): BalanceSummary, ConfirmSheet, EmptyState, Expense entity, ExpenseRow, FilterTabs, GroupDetails screen, EditGroup screen (+12 more)

### Community 15 - "Product Design Spec"
Cohesion: 0.15
Nodes (15): Authentication and Onboarding Splash Login Signup, Design-Level Data Relationships User Groups Expenses Settlements, Expense Lifecycle Split Methods Review Success, Final Closure Trip Report PDF Share Celebration, Group Lifecycle Create Active Settle Close Archived, Product-Level Navigation Model Home Groups Plus Activity Settle, Offline Mode Sync Conflict Pending Sync, Rationale Textual Design Reference for Coding Agent Without Images (+7 more)

### Community 16 - "Project Docs Setup"
Cohesion: 0.2
Nodes (11): Expo Versioned Docs v57.0.0, Rationale Expo Has Changed Pin Exact Version, CLAUDE Reference to AGENTS.md, FastAPI App GET health backend main.py, Backend Configuration backend config.py, Database Engine and Connection Check, JodTod Backend and Mobile App, Expo Mobile App Install Start API Address (+3 more)

### Community 17 - "Auth State Management"
Cohesion: 0.31
Nodes (9): activity.api client, fetchHealthCheck, auth.api client, AuthProvider, auth.service orchestrator, auth session state, auth.storage layer, network.service (+1 more)

### Community 19 - "Network Reachability Service"
Cohesion: 0.43
Nodes (7): ensureFallbackPolling(), getNetworkState(), isOnline(), isOnlineStatus(), probeReachability(), subscribeToNetworkChanges(), toNetworkStatus()

### Community 20 - "Auth Initial Migration"
Cohesion: 0.25
Nodes (4): create authentication tables  Revision ID: 55fd1c0613a9 Revises:  Create Date: 2, upgrade(), add missing user lookup indexes  Revision ID: 55fd1c0613b0 Revises: 55fd1c0613a9, upgrade()

### Community 21 - "OAuth Google Apple"
Cohesion: 0.36
Nodes (7): apple_auth(), _authenticate(), google_auth(), Sign up or log in with a Google ID token.      The token is verified server-side, Sign up or log in with an Apple identity token.      Same architecture and linki, OAuthRequest, Authenticate with a provider-issued ID token.      The backend validates the tok

### Community 22 - "Manual OTP Test Script"
Cohesion: 0.36
Nodes (7): get_base_url(), main(), print_result(), JodTod Manual Login + OTP Flow Test.  Interactive terminal test that exercises t, Read the backend base URL from environment or use default., Return a safe error message without exposing secrets., safe_error_message()

### Community 23 - "OAuth Unit Tests"
Cohesion: 0.47
Nodes (4): Focused Google OIDC validation tests without network or database access., test_invalid_google_identity_is_rejected(), test_valid_google_identity_is_verified(), _token()

### Community 25 - "Mobile API Base URL"
Cohesion: 0.5
Nodes (4): API_URL constant, devServerIp(), getBaseUrl(), API prefix config

### Community 27 - "Group Edit Mock Data"
Cohesion: 0.5
Nodes (2): EditGroup(), getGroup()

### Community 29 - "Auth Types Errors"
Cohesion: 0.67
Nodes (1): AuthError

### Community 30 - "Mock Groups Tailwind"
Cohesion: 0.67
Nodes (3): AddActionBottomSheet, MOCK_GROUPS dataset, tailwind content config

### Community 31 - "Splash Branding Assets"
Cohesion: 0.67
Nodes (3): 3.png wordmark visual, AnimatedIntro component, app package dependencies

### Community 43 - "Email OTP Schemas"
Cohesion: 1.0
Nodes (2): Send Email Verification Endpoint, OTP Response Schema

### Community 44 - "Service Lifecycle Tests"
Cohesion: 1.0
Nodes (2): list_activities filter coverage, SessionService lifecycle tests

### Community 45 - "JWT Hashing Tests"
Cohesion: 1.0
Nodes (2): JWT roundtrip + extractor tests, password and token hashing tests

### Community 46 - "Test DB Fixtures"
Cohesion: 1.0
Nodes (2): db fixture with TRUNCATE, activity_user fixture

### Community 47 - "Test Env Imports"
Cohesion: 1.0
Nodes (2): testing env var setup, import smoke contract

### Community 48 - "Auth Response Types"
Cohesion: 1.0
Nodes (2): AuthResponse + LoginResult, User / AuthUser type

### Community 49 - "Onboarding Splash Assets"
Cohesion: 1.0
Nodes (2): onboarding asset preload, background_animation splash bg

### Community 78 - "Dev OTP Disclosure"
Cohesion: 1.0
Nodes (1): Whether a generated OTP may be returned to the caller for         development c

### Community 85 - "Phone OTP Provider"
Cohesion: 1.0
Nodes (1): Deliver an OTP message to a phone number.

### Community 86 - "Email OTP Provider"
Cohesion: 1.0
Nodes (1): Deliver an OTP email to an address.

### Community 87 - "SMTP Blocking Send"
Cohesion: 1.0
Nodes (1): Blocking stdlib SMTP exchange (must run in a worker thread).

### Community 90 - "Root Stack Layout"
Cohesion: 1.0
Nodes (1): Root Stack layout with AuthProvider

### Community 91 - "Auth Loading Component"
Cohesion: 1.0
Nodes (1): AuthLoadingScreen

### Community 92 - "Activity Test Suite"
Cohesion: 1.0
Nodes (1): test_activity.py test suite

### Community 93 - "Test Create Helper"
Cohesion: 1.0
Nodes (1): _create helper

### Community 94 - "Activity Schema Check"
Cohesion: 1.0
Nodes (1): ActivityResponse schema check

### Community 95 - "Token Service Tests"
Cohesion: 1.0
Nodes (1): TokenService token pair tests

### Community 96 - "JWT Rejection Tests"
Cohesion: 1.0
Nodes (1): JWT rejection cases

### Community 97 - "Secure Token Tests"
Cohesion: 1.0
Nodes (1): secure token and OTP generation tests

### Community 98 - "Auth API Paths"
Cohesion: 1.0
Nodes (1): AUTH_API_PATHS

### Community 99 - "Auth Storage Keys"
Cohesion: 1.0
Nodes (1): AUTH_STORAGE_KEYS

### Community 100 - "OTP Timeout Config"
Cohesion: 1.0
Nodes (1): OTP_CONFIG + timeouts

### Community 101 - "Network Timeout Config"
Cohesion: 1.0
Nodes (1): NETWORK_CONFIG

### Community 102 - "OTP Purpose Types"
Cohesion: 1.0
Nodes (1): OTPPurpose + OTP requests

### Community 103 - "Action Card UI"
Cohesion: 1.0
Nodes (1): ActionCard

### Community 104 - "Babel Presets"
Cohesion: 1.0
Nodes (1): babel presets

### Community 105 - "Metro NativeWind Wrapper"
Cohesion: 1.0
Nodes (1): metro nativewind wrapper

### Community 106 - "Splash Divider Asset"
Cohesion: 1.0
Nodes (1): 1.png splash divider visual

### Community 107 - "Splash People Asset"
Cohesion: 1.0
Nodes (1): 2.png people+money visual

### Community 108 - "Splash Tagline Asset"
Cohesion: 1.0
Nodes (1): 4.png tagline visual

### Community 109 - "Design Mockups Folder"
Cohesion: 1.0
Nodes (1): Images/ design mockups folder

## Ambiguous Edges - Review These
- `EmailVerification` → `request_email_login_otp()`  [AMBIGUOUS]
  backend/services/email_login_otp.py · relation: maybe_uses_legacy_table
- `Offline Mode Sync Conflict Pending Sync` → `Final Closure Trip Report PDF Share Celebration`  [AMBIGUOUS]
  docs/JODTOD_DESIGN_SPEC.md · relation: conceptually_related_to
- `Edit Profile form` → `Personal Information read view`  [AMBIGUOUS]
  graphify-out\.graphify_chunk_04.json · relation: maybe_updates

## Knowledge Gaps
- **124 isolated node(s):** `JodTod Backend Configuration Production-oriented environment configuration.`, `Application configuration loaded from environment variables.      Real secrets`, `Whether a generated OTP may be returned to the caller for         development c`, `Create one application-wide Settings instance.`, `JodTod Authentication Backend Production SQLAlchemy database infrastructure.  De` (+119 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Group Edit Mock Data`** (4 nodes): `edit.tsx`, `mockGroups.ts`, `EditGroup()`, `getGroup()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Types Errors`** (3 nodes): `auth.types.ts`, `AuthError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Email OTP Schemas`** (2 nodes): `Send Email Verification Endpoint`, `OTP Response Schema`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Lifecycle Tests`** (2 nodes): `list_activities filter coverage`, `SessionService lifecycle tests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `JWT Hashing Tests`** (2 nodes): `JWT roundtrip + extractor tests`, `password and token hashing tests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test DB Fixtures`** (2 nodes): `db fixture with TRUNCATE`, `activity_user fixture`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Env Imports`** (2 nodes): `testing env var setup`, `import smoke contract`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Response Types`** (2 nodes): `AuthResponse + LoginResult`, `User / AuthUser type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Onboarding Splash Assets`** (2 nodes): `onboarding asset preload`, `background_animation splash bg`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dev OTP Disclosure`** (1 nodes): `Whether a generated OTP may be returned to the caller for         development c`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phone OTP Provider`** (1 nodes): `Deliver an OTP message to a phone number.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Email OTP Provider`** (1 nodes): `Deliver an OTP email to an address.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SMTP Blocking Send`** (1 nodes): `Blocking stdlib SMTP exchange (must run in a worker thread).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Stack Layout`** (1 nodes): `Root Stack layout with AuthProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Loading Component`** (1 nodes): `AuthLoadingScreen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Activity Test Suite`** (1 nodes): `test_activity.py test suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Create Helper`** (1 nodes): `_create helper`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Activity Schema Check`** (1 nodes): `ActivityResponse schema check`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Token Service Tests`** (1 nodes): `TokenService token pair tests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `JWT Rejection Tests`** (1 nodes): `JWT rejection cases`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Secure Token Tests`** (1 nodes): `secure token and OTP generation tests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth API Paths`** (1 nodes): `AUTH_API_PATHS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Storage Keys`** (1 nodes): `AUTH_STORAGE_KEYS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OTP Timeout Config`** (1 nodes): `OTP_CONFIG + timeouts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Network Timeout Config`** (1 nodes): `NETWORK_CONFIG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OTP Purpose Types`** (1 nodes): `OTPPurpose + OTP requests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Action Card UI`** (1 nodes): `ActionCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Babel Presets`** (1 nodes): `babel presets`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Metro NativeWind Wrapper`** (1 nodes): `metro nativewind wrapper`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Splash Divider Asset`** (1 nodes): `1.png splash divider visual`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Splash People Asset`** (1 nodes): `2.png people+money visual`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Splash Tagline Asset`** (1 nodes): `4.png tagline visual`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Design Mockups Folder`** (1 nodes): `Images/ design mockups folder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EmailVerification` and `request_email_login_otp()`?**
  _Edge tagged AMBIGUOUS (relation: maybe_uses_legacy_table) - confidence is low._
- **What is the exact relationship between `Offline Mode Sync Conflict Pending Sync` and `Final Closure Trip Report PDF Share Celebration`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Edit Profile form` and `Personal Information read view`?**
  _Edge tagged AMBIGUOUS (relation: maybe_updates) - confidence is low._
- **Why does `User` connect `Password Login Service` to `Auth Data Models`, `Logout Middleware Flow`, `JWT Auth Dependencies`, `Activity Feed Backend`, `Session Refresh Flow`, `Database Test Harness`, `OTP Email Verification`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `OTPPurpose` connect `Auth Data Models` to `Password Login Service`, `Logout Middleware Flow`, `JWT Auth Dependencies`, `Activity Feed Backend`, `OTP Email Verification`, `OAuth Google Apple`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 133 inferred relationships involving `User` (e.g. with `Alembic migration environment for JodTod.  Database credentials are loaded throu` and `Get the database URL from the application's environment-driven     configuration`) actually correct?**
  _`User` has 133 INFERRED edges - model-reasoned connections that need verification._
- **Are the 95 inferred relationships involving `AuthenticatedUser` (e.g. with `JodTod user routes: current-user profile and device/session management.  All rou` and `Return the authenticated user's profile.      Used by the mobile client for sess`) actually correct?**
  _`AuthenticatedUser` has 95 INFERRED edges - model-reasoned connections that need verification._