"use client";

import { useRef, useState } from "react";

// Login page for the Xano-hosted MCP OAuth flow ("test" MCP server).
// Xano redirects the browser here with ?mcp_request=<id>. Flow: sign in (Client users only),
// show consent, then hand the browser to the continue URL returned by Xano.
// Set MCP_LOGIN_URL in Xano to https://www.asymmetrixintelligence.com/mcp-login
const BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6"; // Authentication group, live branch

async function call(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.reason || String(res.status));
  return data;
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "#f8fafc",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    padding: 10,
    margin: "6px 0",
    font: "inherit",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
  },
  button: {
    width: "100%",
    padding: 10,
    margin: "6px 0",
    font: "inherit",
    cursor: "pointer",
    border: "1px solid #0f172a",
    borderRadius: 8,
    background: "#0f172a",
    color: "#fff",
  },
  secondary: { background: "#fff", color: "#0f172a" },
  error: { color: "#b00020", minHeight: "1.4em", margin: "8px 0 0" },
};

export default function McpLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const authRef = useRef(null);

  const getMcpRequest = () =>
    new URLSearchParams(window.location.search).get("mcp_request");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const mcpRequest = getMcpRequest();
      if (!mcpRequest) throw new Error("Missing mcp_request");
      // Fresh session token: Xano requires it to be less than 10 minutes old at complete.
      const { token } = await call("POST", "/mcp/login", { email, password });
      authRef.current = { Authorization: `Bearer ${token}` };
      const info = await call(
        "GET",
        `/mcp/request?mcp_request=${encodeURIComponent(mcpRequest)}`,
        null,
        authRef.current
      );
      setConsent(info);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision) {
    setError("");
    setBusy(true);
    try {
      const { continue_url } = await call(
        "POST",
        "/mcp/complete",
        { mcp_request: getMcpRequest(), decision },
        authRef.current
      );
      // Top-level navigation, never fetch: the continue URL is single-use.
      window.location.assign(continue_url);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Sign in to Asymmetrix MCP</h2>
        {!consent ? (
          <form onSubmit={handleLogin}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={styles.button} disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <div>
            <p>
              {consent.client_name} (returns to {consent.callback_host || "app"}) wants to
              access {consent.server_name}
            </p>
            <button style={styles.button} disabled={busy} onClick={() => decide("approve")}>
              Approve
            </button>
            <button
              style={{ ...styles.button, ...styles.secondary }}
              disabled={busy}
              onClick={() => decide("deny")}
            >
              Deny
            </button>
          </div>
        )}
        <p style={styles.error}>{error}</p>
      </div>
    </main>
  );
}
