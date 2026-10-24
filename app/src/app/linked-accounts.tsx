/**
 * Linked Accounts (Page 07) — real provider connection management.
 *
 * Every state comes from GET /api/users/me/linked-accounts (identity
 * from the Bearer session). Google linking reuses the existing
 * expo-auth-session ID-token flow (same config as login/signup): the
 * client only ever sends the provider ID token, the backend verifies
 * it server-side and attaches the identity to the CURRENT user —
 * never creates a user, never replaces the session.
 *
 * Email/Phone rows show the canonical JodTod record (linking Google
 * never replaces them). Apple/Facebook have no configured backend
 * integration and render a safe unavailable state — never fake.
 */

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  googleClientId,
  googleOAuthBlockedReason,
  googleRedirectUri,
} from "../services/google-oauth";
import { useAuth } from "../context/AuthContext";
import { isOnline } from "../services/network.service";
import {
  DEFAULT_LINKED_STATE,
  LinkedAccountsApiError,
  fetchLinkedAccounts,
  getCachedLinkedState,
  linkProvider,
  saveCachedLinkedState,
  unlinkProvider,
  type LinkableProvider,
  type LinkedAccountsState,
} from "../services/linked-accounts.api";

/**
 * expo-auth-session throws from its render hook when no client ID is
 * resolvable, so an unresolvable build gets a non-empty placeholder.
 * It is never sent to Google: `handleConnectGoogle` blocks before
 * prompting whenever `googleClientId()` returns nothing.
 */
const UNCONFIGURED_CLIENT_ID = "unconfigured-google-client-id";

const GOOGLE_LINK_FAILED_MESSAGE =
  "Google connection could not be completed. Please try again.";

/**
 * Turns a Google authorization error into a user-safe message.
 *
 * Only the sanitized error code is inspected; the provider description,
 * client ID and redirect URI are deliberately not surfaced.
 */
function googleFailureMessage(result: {
  errorCode?: string | null;
  error?: { code?: string | null } | null;
}): string {
  const code = result.error?.code ?? result.errorCode ?? "";
  switch (code) {
    case "access_denied":
    case "user_cancelled":
    case "Canceled":
      return "Google access was cancelled.";
    case "invalid_request":
    case "unauthorized_client":
      return "This build is not authorised for Google linking yet. Please update JodTod and try again.";
    case "invalid_grant":
      return "Google connection expired before it completed. Please try again.";
    case "network_error":
    case "io_error":
    case "cannot_connect":
      return "Could not reach Google. Check your connection and try again.";
    default:
      return GOOGLE_LINK_FAILED_MESSAGE;
  }
}

type BusyAction = "connect-google" | "disconnect-google" | null;

export default function LinkedAccounts() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [state, setState] = useState<LinkedAccountsState>({ ...DEFAULT_LINKED_STATE });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const busyRef = useRef<BusyAction>(null);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const googleBlockedReason = googleOAuthBlockedReason();
  const googleConfigured = googleBlockedReason === null;
  const [googleRequest, , promptGoogleAsync] = Google.useIdTokenAuthRequest({
    // Resolved by google-oauth.ts from the Android OAuth client only.
    // The Web client ID is never used here: Google rejects a Web client
    // paired with the jodtod://oauth custom scheme (400 invalid_request).
    clientId: googleClientId() ?? UNCONFIGURED_CLIENT_ID,
    // Explicit and deterministic (jodtod://oauth). Without this,
    // expo-auth-session calls makeRedirectUri() and sends exp://<lan-ip>
    // when running in Expo Go, which Google cannot accept.
    redirectUri: googleRedirectUri(),
    scopes: ["openid", "email", "profile"],
    // Security parameters are left at the library's correct defaults for
    // this flow: expo-auth-session generates `state` and an OIDC `nonce`
    // and rejects a callback whose values do not match. PKCE is not
    // applicable here because without a client secret the provider
    // resolves to the implicit `response_type=id_token` flow, and
    // expo-auth-session only enables PKCE for the authorization-code
    // flow. Nothing is disabled to work around an error.
  });

  const loadState = useCallback(async () => {
    try {
      const cached = await getCachedLinkedState();
      if (mountedRef.current && cached) {
        setState(cached);
        setLoading(false);
      }
    } catch {
      // Cache is best-effort.
    }
    if (mountedRef.current) setError(null);
    try {
      const fresh = await fetchLinkedAccounts();
      if (!mountedRef.current) return;
      setState(fresh);
      void saveCachedLinkedState(fresh);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Could not load linked accounts.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // SINGLE loading trigger: useFocusEffect.
  //
  // useFocusEffect already runs on the first focus, so the previous
  // paired useEffect duplicated the initial fetch. One trigger only:
  //   opened   -> one load
  // revisited -> one load (a link/unlink made elsewhere stays visible)
  useFocusEffect(
    useCallback(() => {
      void loadState();
    }, [loadState]),
  );

  const applyFresh = useCallback(
    async (fresh: LinkedAccountsState) => {
      if (!mountedRef.current) return;
      setState(fresh);
      void saveCachedLinkedState(fresh);
      await refreshUser().catch(() => undefined);
    },
    [refreshUser],
  );

  const handleConnectGoogle = useCallback(async () => {
    if (busyRef.current) return;
    if (!(await isOnline().catch(() => true))) {
      setError("You are offline. Connect to the internet and try again.");
      return;
    }
    if (!googleConfigured) {
      setError(googleBlockedReason ?? "Google connection is not available in this build.");
      return;
    }
    if (!googleRequest) {
      setError("Google sign-in is still loading. Try again in a moment.");
      return;
    }
    if (mountedRef.current) {
      setBusy("connect-google");
      setError(null);
    }
    try {
      const result = await promptGoogleAsync();
      if (result.type === "cancel" || result.type === "dismiss") {
        // User backed out: no error, no state change.
        return;
      }
      if (result.type === "error") {
        // Previously every non-success result returned silently, so a
        // Google 400 invalid_request left no feedback at all.
        if (mountedRef.current) setError(googleFailureMessage(result));
        return;
      }
      if (result.type !== "success") {
        if (mountedRef.current) {
          setError("Google connection could not be completed. Please try again.");
        }
        return;
      }
      const idToken =
        (result as { params?: { id_token?: string } }).params?.id_token ??
        (result as { authentication?: { idToken?: string } }).authentication?.idToken;
      if (!idToken) {
        if (mountedRef.current) setError("Google did not return an identity credential.");
        return;
      }
      const fresh = await linkProvider("google", idToken);
      await applyFresh(fresh);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof LinkedAccountsApiError && e.status === 409) {
        setError("This Google account is already linked to another JodTod user.");
      } else if (e instanceof LinkedAccountsApiError && e.status === 503) {
        setError("Google sign-in is not configured on the server yet.");
      } else {
        // Raw provider/auth errors can embed the client ID or redirect
        // URL, so they are never surfaced verbatim.
        setError(GOOGLE_LINK_FAILED_MESSAGE);
      }
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  }, [applyFresh, googleBlockedReason, googleConfigured, googleRequest, promptGoogleAsync]);

  const handleDisconnect = useCallback(
    (provider: LinkableProvider) => {
      if (busyRef.current) return;
      const label = provider === "google" ? "Google" : "Apple";
      Alert.alert(
        `Disconnect ${label}?`,
        `JodTod will no longer be linked to this ${label} account.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: () => {
              void (async () => {
                if (!(await isOnline().catch(() => true))) {
                  if (mountedRef.current) {
                    setError("You are offline. Connect to the internet and try again.");
                  }
                  return;
                }
                if (mountedRef.current) {
                  setBusy("disconnect-google");
                  setError(null);
                }
                try {
                  const fresh = await unlinkProvider(provider);
                  await applyFresh(fresh);
                } catch (e) {
                  if (!mountedRef.current) return;
                  setError(e instanceof Error ? e.message : "Could not disconnect.");
                } finally {
                  if (mountedRef.current) setBusy(null);
                }
              })();
            },
          },
        ],
      );
    },
    [applyFresh],
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#F5F9FC]">
      {/* Background */}
      <Image
        source={require("../../assets/images/jodtod/background_home.png")}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full"
      />

      <View className="relative z-10 flex-1 p-6">
        {/* Header: back (top-left) | title | spacer */}
        <View className="mb-6 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            Linked Accounts
          </Text>
          <View className="h-11 w-11" />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0B3D62" />
            <Text className="mt-3 text-[13px] font-medium text-[#4B5A66]">
              Loading linked accounts...
            </Text>
          </View>
        ) : error && !state.email.connected && !state.google.connected && !state.phone.connected ? (
          <View className="items-center rounded-2xl border border-red-300/60 bg-white/60 px-4 py-5">
            <Text className="text-center text-[13px] font-medium text-red-600">
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => void loadState()}
              activeOpacity={0.7}
              className="mt-3 rounded-full bg-[#0B3D62] px-4 py-2"
            >
              <Text className="text-[13px] font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
            {error ? (
              <View className="mb-4 rounded-2xl border border-red-300/60 bg-white/60 px-4 py-3">
                <Text className="text-[13px] font-medium text-red-600">{error}</Text>
              </View>
            ) : null}

            {/* Google */}
            <ProviderRow
              icon="logo-google"
              iconColor="#EA4335"
              title="Google"
              subtitle={
                state.google.connected
                  ? (state.google.email ?? "Connected")
                  : "Connect with Google"
              }
              status={
                state.google.connected ? (
                  <ConnectedBadge />
                ) : busy === "connect-google" ? (
                  <BusyBadge label="Connecting..." />
                ) : (
                  <ActionButton label="Connect" onPress={() => void handleConnectGoogle()} />
                )
              }
              action={
                state.google.connected ? (
                  <DisconnectButton
                    busy={busy === "disconnect-google"}
                    onPress={() => handleDisconnect("google")}
                  />
                ) : null
              }
            />

            {/* Phone Number */}
            <ProviderRow
              icon="call-outline"
              iconColor="#0B3D62"
              title="Phone Number"
              subtitle={state.phone.phone ?? "Not connected"}
              status={
                state.phone.connected ? (
                  <ConnectedBadge />
                ) : (
                  <ActionButton
                    label="Add"
                    onPress={() => router.push("/personal-information")}
                  />
                )
              }
            />

            {/* Email */}
            <ProviderRow
              icon="mail-outline"
              iconColor="#0B3D62"
              title="Email"
              subtitle={state.email.email ?? "Not connected"}
              status={
                state.email.connected ? (
                  <ConnectedBadge
                    label={state.email.verified ? "Verified" : "Connected"}
                  />
                ) : null
              }
            />

            {/* Apple (not configured) */}
            <ProviderRow
              icon="logo-apple"
              iconColor="#14212B"
              title="Apple"
              subtitle="Connect with Apple"
              status={<UnavailableBadge />}
            />

            {/* Facebook (no integration) */}
            <ProviderRow
              icon="logo-facebook"
              iconColor="#1877F2"
              title="Facebook"
              subtitle="Connect with Facebook"
              status={<UnavailableBadge />}
            />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function ProviderRow({
  icon,
  iconColor,
  title,
  subtitle,
  status,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  status: React.ReactNode;
  action?: React.ReactNode | null;
}) {
  return (
    <View className="mb-3 rounded-[18px] border border-white/20 bg-white/50 px-4 py-4">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/60">
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-medium text-[#14212B]">{title}</Text>
          <Text className="mt-0.5 text-[12px] text-[#6B7280]" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {status}
      </View>
      {action ? <View className="mt-3 items-end">{action}</View> : null}
    </View>
  );
}

function ConnectedBadge({ label = "Connected" }: { label?: string }) {
  return (
    <View className="flex-row items-center rounded-full bg-[#00B894]/15 px-3 py-1.5">
      <Ionicons name="checkmark-circle" size={15} color="#00896B" />
      <Text className="ml-1 text-[12px] font-bold text-[#00896B]">{label}</Text>
    </View>
  );
}

function BusyBadge({ label }: { label: string }) {
  return (
    <View className="flex-row items-center rounded-full bg-black/5 px-3 py-1.5">
      <ActivityIndicator size="small" color="#0B3D62" />
      <Text className="ml-1.5 text-[12px] font-bold text-[#4B5A66]">{label}</Text>
    </View>
  );
}

function UnavailableBadge() {
  return (
    <View className="rounded-full bg-black/10 px-3 py-1.5">
      <Text className="text-[11px] font-semibold text-[#4B5A66]">
        Not available yet
      </Text>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="rounded-full bg-[#00B894] px-5 py-2"
    >
      <Text className="text-[13px] font-bold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function DisconnectButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Disconnect"
      className={`flex-row items-center rounded-full border border-red-300/60 bg-white px-4 py-2 ${
        busy ? "opacity-60" : ""
      }`}
    >
      {busy ? <ActivityIndicator size="small" color="#EF4444" /> : null}
      <Text className={`text-[13px] font-bold text-red-500 ${busy ? "ml-1.5" : ""}`}>
        {busy ? "Disconnecting..." : "Disconnect"}
      </Text>
    </TouchableOpacity>
  );
}
