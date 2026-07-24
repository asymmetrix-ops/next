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
import { isMcpGuestSession } from "@/lib/mcpGuest";
import { isContributorCrmPath } from "@/lib/userStatus";

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
  loginMcpGuestWithOtp: (email: string, otp: string) => Promise<void>;
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

        if (token) {
          const session = await authService.validateStoredSession();

          if (session) {
            setIsContributor(session.isContributor);
            setIsAuthenticated(true);
            setUser(session.user);
            setIsMcpGuest(session.isMcpGuest);

            if (session.isContributor) {
              return;
            }

            const t = getTrialInfo(token, session.user);
            setTrial(t);
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
      if (isContributorCrmPath(window.location.pathname)) {
        return;
      }
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
      const onContributorCrm = isContributorCrmPath(window.location.pathname);

      if (
        isXano &&
        !isAuthEndpoint &&
        !onContributorCrm &&
        response.status === 401
      ) {
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

      if (isContributorCrmPath(window.location.pathname)) {
        const { syncAdminSessionFromMainApp } = await import(
          "@/lib/contributorCrm/auth"
        );
        await syncAdminSessionFromMainApp();
      }
    } catch (error) {
      console.error("AuthProvider - Login failed:", error);
      throw error;
    }
  };

  const loginMcpGuestWithOtp = async (email: string, otp: string) => {
    try {
      const response = await authService.loginMcpGuestWithOtp(email, otp);
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
      console.error("AuthProvider - MCP Guest OTP login failed:", error);
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
    loginMcpGuestWithOtp,
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
