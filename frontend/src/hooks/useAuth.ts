import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api";

// The pitch backend may bypass authentication, but the frontend retains a small
// local session so the landing, sign-in and sign-up journey behaves like a real
// product. It deliberately creates no new backend endpoint or remote account.
const DEMO_MODE = (import.meta.env.VITE_SKIP_AUTH ?? "true").toString() === "true";
const DEMO_SESSION_KEY = "trust-copilot-demo-session";

function hasDemoSession() {
  return typeof window !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "true";
}

export function useAuth() {
  const [token, setTok] = useState<string | null>(getToken());
  const [demoSession, setDemoSession] = useState(hasDemoSession);

  useEffect(() => {
    const handler = () => {
      setTok(getToken());
      setDemoSession(hasDemoSession());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (DEMO_MODE) {
      setToken("demo");
      setTok("demo");
      return;
    }
    await api.auth.login(email, password);
    setTok(getToken());
  }, []);

  const startDemo = useCallback((_name?: string, _email?: string) => {
    if (DEMO_MODE) setToken("demo");
    localStorage.setItem(DEMO_SESSION_KEY, "true");
    setTok(getToken());
    setDemoSession(true);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
    localStorage.removeItem(DEMO_SESSION_KEY);
    setDemoSession(false);
  }, []);

  return {
    token,
    isAuthed: DEMO_MODE ? demoSession : !!token,
    login,
    startDemo,
    logout,
    demoMode: DEMO_MODE,
  };
}
