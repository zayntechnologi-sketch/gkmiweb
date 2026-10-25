import { useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "gm_panitia_natal_token";

export interface PanitiaUser {
  username: string;
}

/** Autentikasi khusus Panitia Natal (terpisah dari login admin). */
export function usePanitiaAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<PanitiaUser | null>(null);
  const [checking, setChecking] = useState(true);

  const verify = useCallback(async (t: string | null) => {
    if (!t) { setUser(null); setChecking(false); return; }
    try {
      const res = await fetch("/api/panitia/verify", { headers: { "x-panitia-token": t } });
      const data = await res.json();
      if (data.valid) {
        setUser({ username: data.username });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    setChecking(false);
  }, []);

  useEffect(() => { verify(token); }, [token, verify]);

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/panitia/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || "Login gagal.";
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser({ username: data.username });
      return null;
    } catch {
      return "Tidak dapat terhubung ke server.";
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback((url: string, opts: RequestInit = {}) => {
    return fetch(url, {
      cache: "no-store",
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...(opts.headers || {}),
        "x-panitia-token": token || ""
      }
    });
  }, [token]);

  return { token, user, checking, login, logout, authFetch };
}
