interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  // Backend-provided role/status fields
  Status?: string; // e.g., "Admin"
  status?: string; // lowercase variant just in case
  role?: string; // some backends use a single role field
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

class AuthService {
  private tokenKey = "asymmetrix_auth_token";
  private userKey = "asymmetrix_user";

  // Get stored token
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const token = localStorage.getItem(this.tokenKey);
      return token;
    } catch (error) {
      console.error("Error getting token from localStorage:", error);
      return null;
    }
  }

  // Store token and user
  setAuth(token: string, user: AuthUser): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(user));

      // Also store in cookie for SSR access
      document.cookie = `${this.tokenKey}=${token}; path=/; max-age=${
        7 * 24 * 60 * 60
      }; SameSite=Lax`; // 7 days
    } catch (error) {
      console.error("Error storing auth data:", error);
    }
  }

  // Update only the stored user
  setUser(user: AuthUser): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } catch (error) {
      console.error("Error storing user data:", error);
    }
  }

  // Get stored user
  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const userStr = localStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Login with email/password
  async login(email: string, password: string): Promise<LoginResponse> {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();

    // Handle the actual API response structure
    const token = data.authToken || data.token;

    // Get user data from /auth/me endpoint
    let user: AuthUser;
    try {
      const userResponse = await fetch(`${apiUrl}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        user = userData;
      } else {
        // Fallback user data if /auth/me fails
        user = { id: "user", email: "user@example.com" };
      }
    } catch (error) {
      console.error("AuthService - Error fetching user data:", error);
      user = { id: "user", email: "user@example.com" };
    }

    this.setAuth(token, user);
    return { token, user };
  }

  // Fetch current user via /auth/me using stored token
  async fetchMe(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;
    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";
    try {
      const userResponse = await fetch(`${apiUrl}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!userResponse.ok) return null;
      const userData = (await userResponse.json()) as AuthUser;
      this.setUser(userData);
      return userData;
    } catch (e) {
      console.error("AuthService - fetchMe failed", e);
      return null;
    }
  }

  // Register new user
  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<LoginResponse> {
    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

    const response = await fetch(`${apiUrl}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    const data = await response.json();
    this.setAuth(data.token, data.user);
    return data;
  }

  // Request password reset email (no auth required)
  async requestPasswordReset(email: string): Promise<void> {
    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

    const response = await fetch(`${apiUrl}/request_password_reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }
  }

  // Update password using magic link token (token from URL passed in body)
  async updatePassword(
    token: string,
    password: string,
    confirmPassword: string
  ): Promise<void> {
    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

    const response = await fetch(`${apiUrl}/update_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        confirm_password: confirmPassword,
        token,
      }),
    });

    if (!response.ok) {
      throw new Error("Password reset failed");
    }
  }

  // Logout
  logout(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);

      // Also clear cookies
      document.cookie = `${this.tokenKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  }

  // Get auth headers for API calls
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const authService = new AuthService();
export type { AuthUser, LoginResponse };
