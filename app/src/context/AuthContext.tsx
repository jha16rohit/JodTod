/**
 * Global authentication state — SINGLE source of truth.
 *
 * Screens must read auth state from useAuth() and never keep their own
 * copy of "is the user authenticated". Screens must not decide auth
 * navigation themselves beyond calling login()/signup()/logout().
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getAuthTokens,
  getCachedUser,
} from "../services/auth.storage";
import * as AuthService from "../services/auth.service";
import {
  isOnline,
  isOnlineStatus,
  subscribeToNetworkChanges,
} from "../services/network.service";
import type {
  AuthStatus,
  AuthUser,
  LoginRequest,
  SendOTPRequest,
  SignupRequest,
  VerifyEmailRequest,
  VerifyOTPRequest,
} from "../types/auth.types";

export interface AuthContextValue {
  user: AuthUser | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;
  authStatus: AuthStatus;
  error: string | null;
  login: (input: LoginRequest) => Promise<void>;
  signup: (input: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
  sendOTP: (input: SendOTPRequest) => Promise<unknown>;
  verifyOTP: (input: VerifyOTPRequest) => Promise<unknown>;
  verifyEmail: (input: VerifyEmailRequest) => Promise<unknown>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function statusFor(params: {
  bootstrapped: boolean;
  hasUser: boolean;
  offline: boolean;
  error: string | null;
}): AuthStatus {
  if (!params.bootstrapped) return "loading";
  if (params.offline && params.hasUser) return "offline";
  if (params.hasUser) return "authenticated";
  if (params.error) return "error";
  return "unauthenticated";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const syncSessionId = useCallback(async () => {
    try {
      const tokens = await getAuthTokens();
      if (mountedRef.current) setSessionId(tokens.sessionId);
    } catch {
      // Non-fatal; session id is auxiliary.
    }
  }, []);

  const restoreSession = useCallback(async () => {
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const online = await isOnline().catch(() => true);
      if (mountedRef.current) setIsOffline(!online);
      const result = await AuthService.restoreSession({ online });
      if (!mountedRef.current) return;
      setUser(result.user);
      if (result.user) {
        await syncSessionId();
      } else {
        setSessionId(null);
      }
      if (result.offline) {
        setIsOffline(true);
      }
      if (!result.restored && !result.offline && !result.user) {
        setError(null);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setUser(null);
      setSessionId(null);
      setError(e instanceof Error ? e.message : "Failed to restore session.");
    } finally {
      if (mountedRef.current) {
        setBootstrapped(true);
        setIsLoading(false);
      }
    }
  }, [syncSessionId]);

  // Bootstrap once on mount.
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Single app-level network subscription.
  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((status) => {
      if (!mountedRef.current) return;
      const online = isOnlineStatus(status);
      setIsOffline(!online);
      // Revalidate against the server on reconnection when a session exists.
      if (online && bootstrapped) {
        void (async () => {
          try {
            const cached = await getCachedUser();
            const tokens = await getAuthTokens();
            if (!tokens.refreshToken) return;
            if (!cached && !user) {
              await restoreSession();
              return;
            }
            try {
              const fresh = await AuthService.getCurrentUser();
              if (mountedRef.current) {
                setUser(fresh);
                await syncSessionId();
                setError(null);
              }
            } catch {
              // Keep cached session; next authenticated request will
              // refresh or expire honestly via the api layer.
            }
          } catch {
            // Non-fatal.
          }
        })();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapped, restoreSession, syncSessionId]);

  const login = useCallback(
    async (input: LoginRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await AuthService.login(input);
        if (!mountedRef.current) return;
        setUser(response.user);
        setSessionId(response.tokens.session_id ?? null);
        setIsOffline(false);
      } catch (e) {
        if (!mountedRef.current) return;
        const message = e instanceof Error ? e.message : "Login failed.";
        setError(message);
        throw e;
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    },
    []
  );

  const signup = useCallback(async (input: SignupRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthService.signup(input);
      if (!mountedRef.current) return;
      setUser(response.user);
      setSessionId(response.tokens.session_id ?? null);
      setIsOffline(false);
    } catch (e) {
      if (!mountedRef.current) return;
      const message = e instanceof Error ? e.message : "Signup failed.";
      setError(message);
      throw e;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await AuthService.logout(sessionId);
    } catch (e) {
      // Logout always clears local state; surface server error if any.
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Logout failed.");
      }
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setSessionId(null);
        setError(null);
        setIsLoading(false);
      }
    }
  }, [sessionId]);

  const refreshSession = useCallback(async () => {
    try {
      await AuthService.refreshSession();
      await syncSessionId();
      const fresh = await AuthService.getCurrentUser().catch(() => null);
      if (mountedRef.current && fresh) setUser(fresh);
    } catch (e) {
      if (!mountedRef.current) return;
      setUser(null);
      setSessionId(null);
      setError(e instanceof Error ? e.message : "Session refresh failed.");
      throw e;
    }
  }, [syncSessionId]);

  const sendOTP = useCallback(async (input: SendOTPRequest) => {
    return AuthService.sendOTP(input);
  }, []);

  const verifyOTP = useCallback(async (input: VerifyOTPRequest) => {
    return AuthService.verifyOTP(input);
  }, []);

  const verifyEmail = useCallback(async (input: VerifyEmailRequest) => {
    return AuthService.verifyEmail(input);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(() => {
    const hasUser = user !== null;
    return {
      user,
      sessionId,
      isAuthenticated: hasUser,
      isLoading,
      isOffline,
      authStatus: statusFor({ bootstrapped, hasUser, offline: isOffline, error }),
      error,
      login,
      signup,
      logout,
      refreshSession,
      restoreSession,
      sendOTP,
      verifyOTP,
      verifyEmail,
      clearError,
    };
  }, [
    user,
    sessionId,
    isLoading,
    isOffline,
    bootstrapped,
    error,
    login,
    signup,
    logout,
    refreshSession,
    restoreSession,
    sendOTP,
    verifyOTP,
    verifyEmail,
    clearError,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
