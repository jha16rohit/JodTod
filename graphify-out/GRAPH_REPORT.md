# Graph Report - JodTod  (2026-09-27)

## Corpus Check
- 202 files · ~1,008,728 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1842 nodes · 6210 edges · 63 communities detected
- Extraction: 38% EXTRACTED · 61% INFERRED · 0% AMBIGUOUS · INFERRED: 3819 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]

## God Nodes (most connected - your core abstractions)
1. `User` - 343 edges
2. `AccountStatus` - 130 edges
3. `AuthenticatedUser` - 128 edges
4. `Session` - 103 edges
5. `UserService` - 92 edges
6. `OTPPurpose` - 89 edges
7. `SessionService` - 89 edges
8. `Group` - 72 edges
9. `TokenResponse` - 67 edges
10. `Activity` - 66 edges

## Surprising Connections (you probably didn't know these)
- `set()` --calls--> `test_models_imports()`  [INFERRED]
  app\src\components\groups\GroupForm.tsx → backend\tests\test_imports.py
- `set()` --calls--> `test_user_public_never_exposes_secrets()`  [INFERRED]
  app\src\components\groups\GroupForm.tsx → backend\tests\test_schemas.py
- `set()` --calls--> `test_token_pair_fields()`  [INFERRED]
  app\src\components\groups\GroupForm.tsx → backend\tests\test_services.py
- `JWTError` --uses--> `Process an incoming HTTP request.`  [INFERRED]
  backend\core\jwt.py → backend\middleware\auth.py
- `JWTError` --uses--> `Tests for the JWT foundation layer (backend.core.jwt).  Verified against install`  [INFERRED]
  backend\core\jwt.py → backend\tests\test_jwt.py

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

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (185): AuthResponse, _ensure_account_may_authenticate(), login_with_password(), JodTod Authentication - Login Service  Password login validates credentials and, Validate identifier + password and open an authenticated session.      Email/pas, # NOTE: the user lookup runs INSIDE the transaction below. A SELECT, Base class for login failures., Generic authentication failure.      Raised for every login failure (unknown ide (+177 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (156): JodTod activity event model.  One row represents one user-visible activity feed, GroupLedger, Load many groups' ledgers in 3 queries total (no N+1)., Net balance per member: positive = group owes them (creditor),     negative = th, Amount `user_id` currently owes `person_id` in this group.      Positive = user, A group is settled only when every member net is exactly zero., Minimum-transaction settlement plan (greedy debtor/creditor match).      Returns, Pairwise net direction from the authenticated user's view.      `net` is what th (+148 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (127): CurrentUserResponse, Issue a 6-digit email verification code.      Business logic lives in email_veri, Verify an email address with its 6-digit code.      Path preserved from the orig, send_email_verification(), verify_email(), EmailVerificationResponse, ErrorResponse, ForgotPasswordRequest (+119 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (127): Rotate a refresh token and issue a new token pair.      Rotation reuse revokes t, refresh(), count_my_group_expenses(), count_my_groups(), count_my_trips(), get_or_create(), update_preferences(), _avatar_path() (+119 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (106): ABC, InvalidLoginError, LoginError, LogoutError, Base class for logout failures., OAuthError, JodTod Authentication - Refresh Service.  Responsibilities:     - Resolve the se, Generic refresh failure (safe message, no oracle). (+98 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (110): authentication_error(), get_bearer_token(), get_current_session(), get_current_user(), get_current_user_and_session(), require_active_user(), _create_refresh_token(), link_provider_account() (+102 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (108): create_activity(), get_activity(), list_activities(), JodTod activity routes: user-scoped activity feed.  All routes require authentic, Return one activity owned by the authenticated user.      Powers the mobile Acti, Return one activity owned by the authenticated user.      Powers the mobile Acti, Record one activity event for the authenticated user.      Used by expense / set, Record one activity event for the authenticated user.      Used by expense / set (+100 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (73): apiForgotPassword(), apiGetCurrentUser(), apiLogin(), apiLoginWithGoogle(), apiLogout(), apiRefresh(), apiResetPassword(), apiSendEmailVerification() (+65 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (76): count_confirmed_for_group(), direction_for(), is_settled(), load_ledger(), load_ledgers(), member_nets(), money(), pairwise_net() (+68 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (54): ActivityApiError, appendMulti(), buildQuery(), fetchActivities(), fetchActivityById(), getAuthorizationHeader(), avatarOrEmpty(), acceptInvitation() (+46 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (72): AuthenticationMiddleware, Process an incoming HTTP request., _create_access_token(), _unauthorized(), BaseHTTPMiddleware, _algorithm(), create_access_token(), decode_access_token() (+64 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (48): handleSubmit(), groupExpensesByDate(), asNullableString(), asString(), createGroup(), fetchGroupDetail(), fetchGroupExpenses(), fetchGroupSuggestions() (+40 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (44): db(), db_ready(), Test configuration.  Environment variables MUST be set before any backend import, Provide a clean async session. Tables are truncated before each test     via a l, Assert the scratch database is reachable., check_database_connection(), dispose_database(), get_db() (+36 more)

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (38): GroupPermissionError, member_user_ids(), add_member(), AddMemberRequest, archive_group(), ArchiveGroupResponse, create_group(), CreateGroupRequest (+30 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (16): BaseSettings, generate_secret(), get_settings(), JodTod Backend Configuration Production-oriented environment configuration., Application configuration loaded from environment variables.      Real secrets, Create one application-wide Settings instance., Settings, Tests for backend.config Settings behavior. (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (22): FaqService, list_faqs(), List active FAQs with optional category + search filters., create_support_request(), CreateSupportRequest, FaqListResponse, FaqResponse, list_faqs() (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (15): Authentication and Onboarding Splash Login Signup, Design-Level Data Relationships User Groups Expenses Settlements, Expense Lifecycle Split Methods Review Success, Final Closure Trip Report PDF Share Celebration, Group Lifecycle Create Active Settle Close Archived, Product-Level Navigation Model Home Groups Plus Activity Settle, Offline Mode Sync Conflict Pending Sync, Rationale Textual Design Reference for Coding Agent Without Images (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (11): Expo Versioned Docs v57.0.0, Rationale Expo Has Changed Pin Exact Version, CLAUDE Reference to AGENTS.md, FastAPI App GET health backend main.py, Backend Configuration backend config.py, Database Engine and Connection Check, JodTod Backend and Mobile App, Expo Mobile App Install Start API Address (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.38
Nodes (9): extraConfig(), googleAppScheme(), googleClientId(), googleOAuthBlockedReason(), googleOAuthEnvironment(), googleRedirectUri(), isExpoGo(), isGoogleOAuthAvailable() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.39
Nodes (8): ensureFallbackPolling(), getNetworkState(), isOnline(), isOnlineStatus(), isProbeCanceled(), probeReachability(), subscribeToNetworkChanges(), toNetworkStatus()

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (1): test_models_imports()

### Community 22 - "Community 22"
Cohesion: 0.36
Nodes (7): get_base_url(), main(), print_result(), JodTod Manual Login + OTP Flow Test.  Interactive terminal test that exercises t, Read the backend base URL from environment or use default., Return a safe error message without exposing secrets., safe_error_message()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (2): create groups expenses settlements tables  Revision ID: h8c9d0e1f2a3 Revises: g7, # NOTE: the PG ENUM types are created implicitly by op.create_table

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (2): EditGroup(), getGroup()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (1): create authentication tables  Revision ID: 55fd1c0613a9 Revises:  Create Date: 2

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): add missing user lookup indexes  Revision ID: 55fd1c0613b0 Revises: 55fd1c0613a9

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (1): create activities table  Revision ID: 7a2c9e4f1b3d Revises: 55fd1c0613b0 Create

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (1): add activity detail columns  Revision ID: 9c1e7a2b4d5f Revises: 7a2c9e4f1b3d Cre

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): create user preferences table  Revision ID: a1b2c3d4e5f6 Revises: f1a2b3c4d5e6 C

### Community 34 - "Community 34"
Cohesion: 0.5
Nodes (1): create faqs table and seed curated entries  Revision ID: b2c3d4e5f6a7 Revises: a

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (1): add users avatar_url  Revision ID: b3f8c2a91d4e Revises: 9c1e7a2b4d5f Create Dat

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (1): create support requests table  Revision ID: c3d4e5f6a7b8 Revises: b2c3d4e5f6a7 C

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (1): add provider emails to users  Revision ID: d4e5f6a7b8c9 Revises: c3d4e5f6a7b8 Cr

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (1): add display_name to user preferences  Revision ID: e5f6a7b8c9d0 Revises: d4e5f6a

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (1): add users username  Revision ID: f1a2b3c4d5e6 Revises: b3f8c2a91d4e Create Date:

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (1): create group invitations table  Revision ID: f6a7b8c9d0e1 Revises: e5f6a7b8c9

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (1): add provider link timestamps to users  Revision ID: g7a8b9c0d1e2 Revises: f6a

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (2): devServerIp(), getBaseUrl()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (1): AuthError

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): Create one application-wide Settings instance.

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): Deliver an OTP message to a phone number.

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (1): Deliver an OTP email to an address.

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): Blocking stdlib SMTP exchange (must run in a worker thread).

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): Whether a generated OTP may be returned to the caller for         development c

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): Normalize common PostgreSQL URLs to an asyncpg SQLAlchemy URL.      Accepted exa

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (1): FastAPI dependency.      The dependency owns the session lifecycle. A successful

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (1): Explicit transaction boundary for multi-step operations.      The first transact

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (1): Fail fast if the database is unavailable.

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (1): Perform non-destructive database initialization checks.      Schema creation sho

### Community 113 - "Community 113"
Cohesion: 1.0
Nodes (1): Release all pooled database connections during application shutdown.

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (1): Return database health without exposing connection details.

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): Assert the scratch database is reachable.

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (1): Link a provider to the CURRENT authenticated user.      Only the provider ID tok

### Community 117 - "Community 117"
Cohesion: 1.0
Nodes (1): Static preferences for the authenticated user.      Missing preference rows are

### Community 118 - "Community 118"
Cohesion: 1.0
Nodes (1): Partial preference update for PATCH /users/me/preferences.      Only supplied fi

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (1): Dynamic notification counts for the authenticated user.      Derived at read tim

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (1): Assert the scratch database is reachable.

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (1): 1.png splash divider visual

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (1): 2.png people+money visual

### Community 123 - "Community 123"
Cohesion: 1.0
Nodes (1): 3.png wordmark visual

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (1): 4.png tagline visual

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (1): background_home splash bg

### Community 126 - "Community 126"
Cohesion: 1.0
Nodes (1): Images/ design mockups folder

## Ambiguous Edges - Review These
- `EmailVerification` → `request_email_login_otp()`  [AMBIGUOUS]
  backend/services/email_login_otp.py · relation: maybe_uses_legacy_table
- `Offline Mode Sync Conflict Pending Sync` → `Final Closure Trip Report PDF Share Celebration`  [AMBIGUOUS]
  docs/JODTOD_DESIGN_SPEC.md · relation: conceptually_related_to

## Knowledge Gaps
- **122 isolated node(s):** `JodTod Backend Configuration Production-oriented environment configuration.`, `Application configuration loaded from environment variables.      Real secrets`, `Create one application-wide Settings instance.`, `Create one application-wide Settings instance.`, `JodTod Authentication Backend Production SQLAlchemy database infrastructure.  De` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (9 nodes): `test_imports.py`, `test_config_imports()`, `test_core_imports()`, `test_database_imports()`, `test_dependencies_imports()`, `test_middleware_imports()`, `test_models_imports()`, `test_schemas_imports()`, `test_services_imports()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `h8c9d0e1f2a3_create_groups_expenses_settlements.py`, `downgrade()`, `create groups expenses settlements tables  Revision ID: h8c9d0e1f2a3 Revises: g7`, `# NOTE: the PG ENUM types are created implicitly by op.create_table`, `upgrade()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `edit.tsx`, `mockGroups.ts`, `EditGroup()`, `getGroup()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `downgrade()`, `create authentication tables  Revision ID: 55fd1c0613a9 Revises:  Create Date: 2`, `upgrade()`, `55fd1c0613a9_create_authentication_tables.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `downgrade()`, `add missing user lookup indexes  Revision ID: 55fd1c0613b0 Revises: 55fd1c0613a9`, `upgrade()`, `55fd1c0613b0_add_missing_user_lookup_indexes.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `downgrade()`, `create activities table  Revision ID: 7a2c9e4f1b3d Revises: 55fd1c0613b0 Create`, `upgrade()`, `7a2c9e4f1b3d_create_activities_table.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `downgrade()`, `add activity detail columns  Revision ID: 9c1e7a2b4d5f Revises: 7a2c9e4f1b3d Cre`, `upgrade()`, `9c1e7a2b4d5f_add_activity_detail_columns.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `downgrade()`, `create user preferences table  Revision ID: a1b2c3d4e5f6 Revises: f1a2b3c4d5e6 C`, `upgrade()`, `a1b2c3d4e5f6_create_user_preferences.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `downgrade()`, `create faqs table and seed curated entries  Revision ID: b2c3d4e5f6a7 Revises: a`, `upgrade()`, `b2c3d4e5f6a7_create_faqs_seed.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (4 nodes): `downgrade()`, `add users avatar_url  Revision ID: b3f8c2a91d4e Revises: 9c1e7a2b4d5f Create Dat`, `upgrade()`, `b3f8c2a91d4e_add_users_avatar_url.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `c3d4e5f6a7b8_create_support_requests.py`, `downgrade()`, `create support requests table  Revision ID: c3d4e5f6a7b8 Revises: b2c3d4e5f6a7 C`, `upgrade()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `d4e5f6a7b8c9_add_provider_emails.py`, `downgrade()`, `add provider emails to users  Revision ID: d4e5f6a7b8c9 Revises: c3d4e5f6a7b8 Cr`, `upgrade()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (4 nodes): `e5f6a7b8c9d0_add_display_name.py`, `downgrade()`, `add display_name to user preferences  Revision ID: e5f6a7b8c9d0 Revises: d4e5f6a`, `upgrade()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `f1a2b3c4d5e6_add_users_username.py`, `downgrade()`, `add users username  Revision ID: f1a2b3c4d5e6 Revises: b3f8c2a91d4e Create Date:`, `upgrade()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (4 nodes): `f6a7b8c9d0e1_create_group_invitations.py`, `downgrade()`, `create group invitations table  Revision ID: f6a7b8c9d0e1 Revises: e5f6a7b8c9`, `upgrade()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (4 nodes): `g7a8b9c0d1e2_link_timestamps.py`, `downgrade()`, `add provider link timestamps to users  Revision ID: g7a8b9c0d1e2 Revises: f6a`, `upgrade()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `devServerIp()`, `getBaseUrl()`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `auth.types.ts`, `AuthError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Create one application-wide Settings instance.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `Deliver an OTP message to a phone number.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `Deliver an OTP email to an address.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `Blocking stdlib SMTP exchange (must run in a worker thread).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Whether a generated OTP may be returned to the caller for         development c`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `Normalize common PostgreSQL URLs to an asyncpg SQLAlchemy URL.      Accepted exa`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `FastAPI dependency.      The dependency owns the session lifecycle. A successful`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `Explicit transaction boundary for multi-step operations.      The first transact`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `Fail fast if the database is unavailable.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `Perform non-destructive database initialization checks.      Schema creation sho`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `Release all pooled database connections during application shutdown.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `Return database health without exposing connection details.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `Assert the scratch database is reachable.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (1 nodes): `Link a provider to the CURRENT authenticated user.      Only the provider ID tok`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (1 nodes): `Static preferences for the authenticated user.      Missing preference rows are`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (1 nodes): `Partial preference update for PATCH /users/me/preferences.      Only supplied fi`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (1 nodes): `Dynamic notification counts for the authenticated user.      Derived at read tim`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (1 nodes): `Assert the scratch database is reachable.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (1 nodes): `1.png splash divider visual`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (1 nodes): `2.png people+money visual`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (1 nodes): `3.png wordmark visual`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (1 nodes): `4.png tagline visual`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (1 nodes): `background_home splash bg`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (1 nodes): `Images/ design mockups folder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EmailVerification` and `request_email_login_otp()`?**
  _Edge tagged AMBIGUOUS (relation: maybe_uses_legacy_table) - confidence is low._
- **What is the exact relationship between `Offline Mode Sync Conflict Pending Sync` and `Final Closure Trip Report PDF Share Celebration`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `User` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 12`, `Community 13`, `Community 15`?**
  _High betweenness centrality (0.266) - this node is a cross-community bridge._
- **Why does `getAuthorizationHeader()` connect `Community 9` to `Community 11`, `Community 7`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `set()` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 5`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 20`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Are the 339 inferred relationships involving `User` (e.g. with `Alembic migration environment for JodTod.  Database credentials are loaded throu` and `Get the database URL from the application's environment-driven     configuration`) actually correct?**
  _`User` has 339 INFERRED edges - model-reasoned connections that need verification._
- **Are the 128 inferred relationships involving `AccountStatus` (e.g. with `Base` and `TimestampMixin`) actually correct?**
  _`AccountStatus` has 128 INFERRED edges - model-reasoned connections that need verification._