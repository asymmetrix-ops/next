"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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

// Marker prefix sent by the Xano mcp/login endpoint when the user has no MCP seat.
const NO_ACCESS_CODE = "MCP_ACCESS_DENIED";

const inputClass =
  "px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const primaryButtonClass =
  "px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClass =
  "px-4 py-3 w-full font-medium text-gray-800 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

export default function McpLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  const authRef = useRef(null);

  const getMcpRequest = () =>
    new URLSearchParams(window.location.search).get("mcp_request");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setNoAccess(false);
    setBusy(true);
    try {
      const mcpRequest = getMcpRequest();
      if (!mcpRequest) {
        throw new Error(
          "This page is opened by your AI assistant when you connect Asymmetrix. Start the connection from there."
        );
      }
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
      if (String(err.message).startsWith(NO_ACCESS_CODE)) {
        setNoAccess(true);
        setError("");
      } else if (/invalid credentials/i.test(err.message)) {
        setError("Invalid email or password.");
      } else {
        setError(err.message);
      }
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
    <div className="min-h-screen bg-[#F9FAFC]">
      <header className="flex relative justify-between items-center px-4 py-3 bg-white border-b border-gray-200 sm:px-6">
        <Link href="/" className="flex gap-3 items-center text-gray-900 no-underline">
          <Image
            src="/icons/logo.svg"
            alt="Logo"
            width={40}
            height={40}
            style={{ borderRadius: "50%" }}
          />
          <span className="font-bold tracking-wide">ASYMMETRIX</span>
        </Link>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="px-6 w-full max-w-xl">
          {noAccess ? (
            <div className="text-center">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">No MCP access</h1>
              <p className="mb-6 text-gray-600">
                Your account is not enabled for MCP access. Please contact your Asymmetrix
                administrator to get a seat.
              </p>
              <button
                type="button"
                onClick={() => setNoAccess(false)}
                className={secondaryButtonClass}
              >
                Try another account
              </button>
            </div>
          ) : !consent ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">Connect to Asymmetrix</h1>
                <p className="text-gray-600">
                  Sign in with your Asymmetrix account to connect your AI assistant.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {error ? (
                  <div className="px-4 py-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button type="submit" disabled={busy} className={primaryButtonClass}>
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">Authorize access</h1>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-900">{consent.client_name}</span>
                  {consent.callback_host ? ` (${consent.callback_host})` : ""} wants to access
                  your Asymmetrix account through{" "}
                  <span className="font-medium text-gray-900">{consent.server_name}</span>.
                </p>
              </div>

              <div className="space-y-4">
                {error ? (
                  <div className="px-4 py-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                    {error}
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("approve")}
                  className={primaryButtonClass}
                >
                  {busy ? "Please wait..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("deny")}
                  className={secondaryButtonClass}
                >
                  Deny
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
