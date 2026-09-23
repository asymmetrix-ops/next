"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, loginWithApi } from "@/lib/contributorCrm/api";
import { authService, type User } from "@/lib/contributorCrm/auth";

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(authService.getUser());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      throw new Error("Email and password are required.");
    }
    const { authToken } = await loginWithApi(email.trim(), password);
    authService.setAuthToken(authToken);
    const userData = await fetchMe(authToken);
    authService.setUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    authService.clearUser();
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, login, logout, isLoading };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
