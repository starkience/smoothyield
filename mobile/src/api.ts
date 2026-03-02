import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const BASE_URL = (extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001")
  .replace(/\/$/, "");

export const getApiBaseUrl = () => BASE_URL;

export const createApi = (sessionId?: string | null) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["x-session-id"] = sessionId;

  const request = async <T = any>(method: string, path: string, body?: any): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.message || (data as any)?.error || `HTTP ${res.status}`);
    return data as T;
  };

  return {
    get: <T = any>(path: string) => request<T>("GET", path),
    post: <T = any>(path: string, body: any) => request<T>("POST", path, body),
  };
};
