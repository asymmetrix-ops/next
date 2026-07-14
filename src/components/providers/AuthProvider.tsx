"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { authService } from "@/lib/auth";
import { getTrialInfo, TrialInfo } from "@/lib/trial";
import {
  UNAUTHORIZED_EVENT,
  XANO_DOMAIN,
  AUTH_PATH_EXCLUSIONS,
  dispatchUnauthorized,
} from "@/lib/authEvents";
import { isContributorSession } from "@/lib/userStatus";
import { isMcpGuestSession } from "@/lib/mcpGuest";

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
  loginMcpGuest: (email: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  // Trial info derived from token + user
  isTrial: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isMcpGuest: boolean;
  trialExpiresAt?: Date;
  trialDaysLeft?: number;
  // Prospect session (from ?ref= middleware cookies)
  isProspect: boolean;
  prospectEmail: string | null;
  // Login modal safeguard
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  loginVersion: number;
  isContributor: boolean;
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
  const [isContributor, setIsContributor] = useState(false);
  const [isMcpGuest, setIsMcpGuest] = useState(false);
  const [isProspect, setIsProspect] = useState(false);
  const [prospectEmail, setProspectEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const prospectResp = await fetch("/api/prospect-session", {
          credentials: "include",
          cache: "no-store",
        });
        if (prospectResp.ok) {
          const prospectData = (await prospectResp.json()) as {
            isProspect?: boolean;
            email?: string | null;
          };
          setIsProspect(!!prospectData.isProspect);
          setProspectEmail(prospectData.email ?? null);
        }

        const token = authService.getToken();
        const userData = authService.getUser();

        if (token) {
          authService.ensureAuthCookie();
          const contributor = isContributorSession(token, userData);
          setIsContributor(contributor);
          setIsAuthenticated(true);
          setUser(userData || { id: "user", email: "user@example.com" });
          setIsMcpGuest(isMcpGuestSession(token, userData));

          if (contributor) {
            return;
          }

          const t = getTrialInfo(token, userData);
          setTrial(t);

          const hasStatus = !!(
            userData &&
            (userData.Status || userData.status || userData.role)
          );
          if (!hasStatus) {
            const refreshed = await authService.fetchMe();
            if (refreshed) {
              setUser(refreshed);
              const t2 = getTrialInfo(token, refreshed);
              setTrial(t2);
              setIsMcpGuest(isMcpGuestSession(token, refreshed));
            } else if (isContributorSession(token, null)) {
              setIsContributor(true);
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setIsContributor(false);
          setIsMcpGuest(false);
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
        setIsContributor(false);
        setIsMcpGuest(false);
        setIsProspect(false);
        setProspectEmail(null);
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

  useLayoutEffect(() => {
    const handleUnauthorized = () => {
      authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setIsContributor(false);
      setIsMcpGuest(false);
      setTrial({ isTrial: false, isTrialActive: false, isTrialExpired: false });
      setShowLoginModal(true);
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useLayoutEffect(() => {
    const original = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const response = await original.apply(window, args);

      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
          ? args[0].url
          : String(args[0]);

      const isXano = url.includes(XANO_DOMAIN);
      const isAuthEndpoint = AUTH_PATH_EXCLUSIONS.some((p) => url.includes(p));

      if (isXano && !isAuthEndpoint && response.status === 401) {
        response
          .clone()
          .json()
          .then((body: { code?: string }) => {
            if (body?.code === "ERROR_CODE_UNAUTHORIZED") {
              dispatchUnauthorized();
            }
          })
          .catch(() => {
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
      setIsContributor(false);
      setIsAuthenticated(true);
      setUser(response.user);
      const token = authService.getToken();
      const t = getTrialInfo(token, response.user);
      setTrial(t);
      setIsMcpGuest(isMcpGuestSession(token, response.user));
      setShowLoginModal(false);
      setLoginVersion((v) => v + 1);
    } catch (error) {
      console.error("AuthProvider - Login failed:", error);
      throw error;
    }
  };

  const loginMcpGuest = async (email: string) => {
    try {
      const response = await authService.signupMcpGuest(email);
      setIsContributor(false);
      setIsAuthenticated(true);
      setUser(response.user);
      const token = authService.getToken();
      setTrial({
        isTrial: false,
        isTrialActive: false,
        isTrialExpired: false,
      });
      setIsMcpGuest(isMcpGuestSession(token, response.user));
      setShowLoginModal(false);
      setLoginVersion((v) => v + 1);
    } catch (error) {
      console.error("AuthProvider - MCP Guest login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setIsContributor(false);
    setIsMcpGuest(false);
    setTrial({ isTrial: false, isTrialActive: false, isTrialExpired: false });
  };

  const value = {
    isAuthenticated,
    user,
    login,
    loginMcpGuest,
    logout,
    loading,
    isTrial: trial.isTrial,
    isTrialActive: trial.isTrialActive,
    isTrialExpired: trial.isTrialExpired,
    isMcpGuest,
    isProspect,
    prospectEmail,
    trialExpiresAt: trial.trialExpiresAt,
    trialDaysLeft: trial.daysLeft,
    showLoginModal,
    setShowLoginModal,
    loginVersion,
    isContributor,
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
