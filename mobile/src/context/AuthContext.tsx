import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePrivy, useLoginWithOAuth } from "@privy-io/expo";
import { createApi } from "../api";

interface AuthContextValue {
  /** Backend session ID — null when not authenticated */
  sessionId: string | null;
  /** User's email address from Privy */
  email: string | null;
  /** True while Privy is initialising or while bootstrapping the backend session */
  loading: boolean;
  /** Kick off Google OAuth login */
  loginWithGoogle: () => void;
  /** Log out from both Privy and the backend session */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  sessionId: null,
  email: null,
  loading: true,
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
        const data = await api.post<{ sessionId: string }>("/api/auth/session", { privyToken });
        if (!cancelled) setSessionId(data.sessionId);
      } catch (err) {
        console.error("[Auth] session bootstrap failed:", err);
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
        loading: !isReady || bootstrapping,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
