import React, { createContext, useContext, useMemo, useState } from "react";
import { createApi } from "../api";
import { usePrivy } from "@privy-io/expo";

const devMode = (process.env.EXPO_PUBLIC_DEV_MODE || "true") === "true";

type AuthState = {
  sessionId?: string;
  email?: string;
  privyToken?: string;
  loading: boolean;
  loginWithGmail: () => Promise<void>;
  mockLogin: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, login, getAccessToken, logout: privyLogout } = usePrivy() as any;
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [privyToken, setPrivyToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const loginWithGmail = async () => {
    setLoading(true);
    try {
      // @ts-expect-error - Privy Expo types vary by version
      await login({ loginMethods: ["google"] });
      // @ts-expect-error - Privy Expo types vary by version
      const token = await getAccessToken();
      const api = createApi();
      const { sessionId: newSessionId } = await api.post<{ sessionId: string }>("/api/auth/session", {
        privyToken: token
      });
      setPrivyToken(token);
      setSessionId(newSessionId);
    } finally {
      setLoading(false);
    }
  };

  const mockLogin = async () => {
    if (!devMode) return;
    setLoading(true);
    try {
      const api = createApi();
      const { sessionId: newSessionId } = await api.post<{ sessionId: string }>("/api/auth/session", {
        privyToken: "dev"
      });
      setPrivyToken("dev");
      setSessionId(newSessionId);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setSessionId(undefined);
    setPrivyToken(undefined);
    if (privyLogout) await privyLogout();
  };

  const value = useMemo(
    () => ({
      sessionId,
      email: user?.email?.address,
      privyToken,
      loading,
      loginWithGmail,
      mockLogin,
      logout
    }),
    [sessionId, user?.email?.address, privyToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext missing");
  return ctx;
};
