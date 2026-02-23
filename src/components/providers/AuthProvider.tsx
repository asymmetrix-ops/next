"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@/lib/auth";
import { getTrialInfo, TrialInfo } from "@/lib/trial";
import {
  UNAUTHORIZED_EVENT,
  XANO_DOMAIN,
  AUTH_PATH_EXCLUSIONS,
  dispatchUnauthorized,
} from "@/lib/authEvents";

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  Status?: string;
  status?: string;
  role?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  // Trial info derived from token + user
  isTrial: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialExpiresAt?: Date;
  trialDaysLeft?: number;
  // Login modal safeguard
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  loginVersion: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState<TrialInfo>({
    isTrial: false,
    isTrialActive: false,
    isTrialExpired: false,
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginVersion, setLoginVersion] = useState(0);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        const userData = authService.getUser();

        // Only check for token, since user data might not be available
        if (token) {
          setIsAuthenticated(true);
          setUser(userData || { id: "user", email: "user@example.com" });
          const t = getTrialInfo(token, userData);
          setTrial(t);

          // If Status missing, refresh from /auth/me then recompute
          const hasStatus = !!(
            userData &&
            (userData.Status || userData.status)
          );
          if (!hasStatus) {
            const refreshed = await authService.fetchMe();
            if (refreshed) {
              setUser(refreshed);
              const t2 = getTrialInfo(token, refreshed);
              setTrial(t2);
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setTrial({
            isTrial: false,
            isTrialActive: false,
            isTrialExpired: false,
          });
        }
      } catch (error) {
        console.error("AuthProvider - Error checking auth:", error);
        setIsAuthenticated(false);
        setUser(null);
        setTrial({
          isTrial: false,
          isTrialActive: false,
          isTrialExpired: false,
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Listen for the global "session expired" signal fired by the fetch
  // interceptor (below) or any service file that calls dispatchUnauthorized().
  useEffect(() => {
    const handleUnauthorized = () => {
      authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setTrial({ isTrial: false, isTrialActive: false, isTrialExpired: false });
      setShowLoginModal(true);
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  // Global fetch interceptor — transparently watches every Xano API response.
  // When the backend returns { code: "ERROR_CODE_UNAUTHORIZED" } in the body
  // (expired token mid-session), it fires the auth:unauthorized event so the
  // login modal appears without redirecting away from the current page.
  useEffect(() => {
    const original = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const response = await original.apply(window, args);

      // Scope to our backend only; skip auth endpoints (wrong password etc.)
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
          ? args[0].url
          : String(args[0]);

      const isXano = url.includes(XANO_DOMAIN);
      const isAuthEndpoint = AUTH_PATH_EXCLUSIONS.some((p) => url.includes(p));

      if (isXano && !isAuthEndpoint && response.status === 401) {
        // Parse body without consuming the original Response so callers can
        // still read it normally.
        response
          .clone()
          .json()
          .then((body: { code?: string }) => {
            if (body?.code === "ERROR_CODE_UNAUTHORIZED") {
              dispatchUnauthorized();
            }
          })
          .catch(() => {
            // Non-JSON 401 from Xano — treat as expired token
            dispatchUnauthorized();
          });
      }

      return response;
    };

    return () => {
      window.fetch = original;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setIsAuthenticated(true);
      setUser(response.user);
      const token = authService.getToken();
      const t = getTrialInfo(token, response.user);
      setTrial(t);
      // Close login modal and bump version to remount the protected page,
      // which re-triggers all useEffect API calls with the now-valid token.
      setShowLoginModal(false);
      setLoginVersion((v) => v + 1);
    } catch (error) {
      console.error("AuthProvider - Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setTrial({ isTrial: false, isTrialActive: false, isTrialExpired: false });
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    isTrial: trial.isTrial,
    isTrialActive: trial.isTrialActive,
    isTrialExpired: trial.isTrialExpired,
    trialExpiresAt: trial.trialExpiresAt,
    trialDaysLeft: trial.daysLeft,
    showLoginModal,
    setShowLoginModal,
    loginVersion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
