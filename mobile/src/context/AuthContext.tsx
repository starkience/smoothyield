import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePrivy, useLoginWithOAuth } from "@privy-io/expo";
import { createApi, getApiBaseUrl } from "../api";

interface AuthContextValue {
  /** Backend session ID — null when not authenticated */
  sessionId: string | null;
  /** User's email address from Privy */
  email: string | null;
  /** True while Privy is initialising or while bootstrapping the backend session */
  loading: boolean;
  /** Get a fresh Privy access token (for wallet signing; use before stake/deploy). */
  getAccessToken: () => Promise<string | null>;
  /** Kick off Google OAuth login */
  loginWithGoogle: () => void;
  /** Log out from both Privy and the backend session */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  sessionId: null,
  email: null,
  loading: true,
  getAccessToken: async () => null,
  loginWithGoogle: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isReady, logout: privyLogout, getAccessToken } = usePrivy();
  const { login: oauthLogin } = useLoginWithOAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Once Privy authenticates, exchange the Privy token for a backend session.
  useEffect(() => {
    if (!user || sessionId) return;

    let cancelled = false;
    const bootstrap = async () => {
      setBootstrapping(true);
      try {
        const privyToken = await getAccessToken();
        if (!privyToken || cancelled) return;
        const api = createApi();
        const url = "/api/auth/session";
        const data = await api.post<{ sessionId: string }>(url, { privyToken });
        if (!cancelled) setSessionId(data.sessionId);
      } catch (err: any) {
        const msg = err?.message || String(err);
        console.warn("[Auth] session bootstrap failed (backend unreachable):", msg);
        console.warn("[Auth] API base URL:", getApiBaseUrl());
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Clear session when Privy user logs out.
  useEffect(() => {
    if (!user && sessionId) setSessionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loginWithGoogle = useCallback(() => {
    oauthLogin({ provider: "google" });
  }, [oauthLogin]);

  const logout = useCallback(async () => {
    setSessionId(null);
    await privyLogout();
  }, [privyLogout]);

  const email: string | null =
    user?.email?.address ??
    user?.google?.email ??
    null;

  return (
    <AuthContext.Provider
      value={{
        sessionId,
        email,
        loading: !isReady,
        getAccessToken: async () => getAccessToken() ?? null,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
