const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

export type ApiClient = {
  post: <T>(path: string, body?: any) => Promise<T>;
  get: <T>(path: string) => Promise<T>;
};

export const createApi = (sessionId?: string): ApiClient => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (sessionId) headers["x-session-id"] = sessionId;

  const post = async <T>(path: string, body?: any) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {})
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Request failed");
    return json as T;
  };

  const get = async <T>(path: string) => {
    const res = await fetch(`${API_URL}${path}`, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Request failed");
    return json as T;
  };

  return { post, get };
};
