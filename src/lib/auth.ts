interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
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
    return localStorage.getItem(this.tokenKey);
  }

  // Store token and user
  setAuth(token: string, user: AuthUser): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Get stored user
  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Login with email/password
  async login(email: string, password: string): Promise<LoginResponse> {
    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";
    console.log("Auth API URL:", apiUrl); // Debug log

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    this.setAuth(data.token, data.user);
    return data;
  }

  // Register new user
  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<LoginResponse> {
    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

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

  // Logout
  logout(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Get auth headers for API calls
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const authService = new AuthService();
export type { AuthUser, LoginResponse };
