import { useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "gm_admin_token";

export interface AdminUser {
  username: string;
}

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  // Verify token on mount / when token changes
  const verify = useCallback(async (t: string | null) => {
    if (!t) { setUser(null); setChecking(false); return; }
    try {
      const res = await fetch("/api/admin/verify", {
        headers: { "x-admin-token": t }
      });
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
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      return err.error || "Login gagal.";
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser({ username: data.username });
    return null; // no error
  };

  const logout = async () => {
    if (token) {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "x-admin-token": token }
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  // Helper for authed fetch calls
  const authFetch = useCallback((url: string, opts: RequestInit = {}) => {
    return fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "x-admin-token": token || ""
      }
    });
  }, [token]);

  return { token, user, checking, login, logout, authFetch };
}
