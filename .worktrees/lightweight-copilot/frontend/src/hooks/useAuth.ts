import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api";

// In prototype/demo mode, the backend bypasses auth. Auto-issue a dummy token
// so RequireAuth still lets users straight into the app.
const DEMO_MODE = (import.meta.env.VITE_SKIP_AUTH ?? "true").toString() === "true";
if (DEMO_MODE && typeof window !== "undefined" && !getToken()) {
  setToken("demo");
}

export function useAuth() {
  const [token, setTok] = useState<string | null>(getToken());

  useEffect(() => {
    const handler = () => setTok(getToken());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await api.auth.login(email, password);
    setTok(getToken());
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
  }, []);

  return { token, isAuthed: !!token || DEMO_MODE, login, logout, demoMode: DEMO_MODE };
}
