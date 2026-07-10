"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@/lib/auth";
import { getTrialInfo, TrialInfo } from "@/lib/trial";
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
  const [isMcpGuest, setIsMcpGuest] = useState(false);

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
          setIsMcpGuest(isMcpGuestSession(token, userData));

          // If Status missing, refresh from /auth/me then recompute
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
          setIsMcpGuest(false);
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
        setIsMcpGuest(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setIsAuthenticated(true);
      setUser(response.user);
      const token = authService.getToken();
      const t = getTrialInfo(token, response.user);
      setTrial(t);
      setIsMcpGuest(isMcpGuestSession(token, response.user));
    } catch (error) {
      console.error("AuthProvider - Login failed:", error);
      throw error;
    }
  };

  const loginMcpGuest = async (email: string) => {
    try {
      const response = await authService.signupMcpGuest(email);
      setIsAuthenticated(true);
      setUser(response.user);
      const token = authService.getToken();
      setTrial({
        isTrial: false,
        isTrialActive: false,
        isTrialExpired: false,
      });
      setIsMcpGuest(isMcpGuestSession(token, response.user));
    } catch (error) {
      console.error("AuthProvider - MCP Guest login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setTrial({ isTrial: false, isTrialActive: false, isTrialExpired: false });
    setIsMcpGuest(false);
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
    trialExpiresAt: trial.trialExpiresAt,
    trialDaysLeft: trial.daysLeft,
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
