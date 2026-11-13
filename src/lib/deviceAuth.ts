// Device registration / login security (phase 1).
// Same Xano backend group used by sessionExpired.ts, kept as its own constant so this
// feature can evolve independently from the legacy auth.ts base URL.
const DEVICE_AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

const DEVICE_TOKEN_KEY = "asymmetrix_device_token";

export type DeviceKind = "web" | "mcp";

export interface LoginApiResponse {
  authToken: string | null;
  device_confirmation_required: boolean;
  device_id?: number;
  confirmation_id?: number;
  device_token?: string;
  expires_in?: number;
}

export interface ApiError {
  code?: string;
  message: string;
}

export interface DeviceSummary {
  id: number;
  kind: string;
  label?: string | null;
  status?: string;
  first_ip?: string;
  last_ip?: string;
  last_seen_at?: number;
  trusted_at?: number | null;
}

export type ConfirmDeviceError =
  | "invalid_code"
  | "expired"
  | "already_used"
  | "too_many_attempts"
  | "device_limit_reached";

export interface ConfirmDeviceResponse {
  confirmed: boolean;
  device_id?: number;
  error?: ConfirmDeviceError;
  attempts_left?: number;
  max_devices?: number;
  devices?: DeviceSummary[];
}

export interface DevicesListResponse {
  devices: DeviceSummary[];
  current_device_id: number | null;
}

/** Thrown by loginWithDevice() when the backend requires device confirmation. */
export class DeviceConfirmationRequiredError extends Error {
  confirmationId: number;
  deviceToken: string;
  expiresIn: number;

  constructor(data: {
    confirmation_id: number;
    device_token: string;
    expires_in: number;
  }) {
    super("Device confirmation required");
    this.name = "DeviceConfirmationRequiredError";
    this.confirmationId = data.confirmation_id;
    this.deviceToken = data.device_token;
    this.expiresIn = data.expires_in;
  }
}

export class LoginApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "LoginApiError";
    this.code = code;
  }
}

export function loginApiErrorFromResponse(
  data: unknown,
  fallbackMessage: string
): LoginApiError {
  const err = (data as ApiError) || { message: fallbackMessage };
  return new LoginApiError(err.message || fallbackMessage, err.code);
}

export const SSO_REQUIRED_DEFAULT_MESSAGE =
  "Your organisation requires SSO sign-in.";

export const SSO_ACCOUNT_DISABLED_MESSAGE =
  "Your account is not enabled. Contact your administrator.";

export function getDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setDeviceToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearDeviceToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Best-effort "Browser on OS" label for the device registration screen. */
export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Web browser";
  const ua = navigator.userAgent || "";

  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";

  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return `${browser} on ${os}`;
}

/**
 * Calls POST /auth/login with device registration fields.
 * Throws DeviceConfirmationRequiredError when the backend requires confirmation
 * (also persists the (possibly new) device_token in that case, per spec).
 * Throws LoginApiError for all other non-2xx / error responses.
 */
export async function loginWithDevice(
  email: string,
  password: string,
  kind: DeviceKind = "web"
): Promise<LoginApiResponse> {
  const deviceToken = getDeviceToken();
  const deviceLabel = kind === "web" ? getDeviceLabel() : undefined;

  const response = await fetch(`${DEVICE_AUTH_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: (email || "").trim().toLowerCase(),
      password,
      device_token: deviceToken || undefined,
      device_label: deviceLabel,
      kind,
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // ignore, handled below
  }

  if (!response.ok) {
    const err = (data as ApiError) || { message: "Login failed" };
    throw new LoginApiError(err.message || "Login failed", err.code);
  }

  const payload = data as LoginApiResponse;

  // Any time the backend returns a new device_token, it must overwrite the stored
  // one — an old/revoked token produces a fresh pending device on the next attempt.
  if (payload.device_token) {
    setDeviceToken(payload.device_token);
  }

  if (payload.device_confirmation_required) {
    throw new DeviceConfirmationRequiredError({
      confirmation_id: payload.confirmation_id as number,
      device_token: payload.device_token as string,
      expires_in: payload.expires_in as number,
    });
  }

  return payload;
}

export async function confirmDevice(params: {
  confirmation_id: number;
  code?: string;
  link_token?: string;
  replace_device_id?: number;
}): Promise<ConfirmDeviceResponse> {
  const response = await fetch(`${DEVICE_AUTH_API_URL}/auth/device/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  // Spec: always 200 for expected outcomes; still guard against transport errors
  // (and the SSO-blocking error, which can also surface here as {code, message}).
  if (!response.ok) {
    let message = "Could not confirm device.";
    let code: string | undefined;
    try {
      const err = (await response.json()) as ApiError;
      message = err.message || message;
      code = err.code;
    } catch {
      // ignore
    }
    throw new LoginApiError(message, code);
  }

  return (await response.json()) as ConfirmDeviceResponse;
}

export async function fetchDevices(authToken: string): Promise<DevicesListResponse> {
  const response = await fetch(`${DEVICE_AUTH_API_URL}/devices`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });
  if (!response.ok) {
    throw new LoginApiError("Could not load devices.");
  }
  return (await response.json()) as DevicesListResponse;
}

export async function revokeDevice(
  authToken: string,
  deviceId: number
): Promise<{ revoked: boolean; device_id: number; was_current: boolean }> {
  const response = await fetch(`${DEVICE_AUTH_API_URL}/devices/${deviceId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });
  if (!response.ok) {
    if (response.status === 404) throw new LoginApiError("Device not found.");
    if (response.status === 400) throw new LoginApiError("Device already revoked.");
    throw new LoginApiError("Could not revoke device.");
  }
  return response.json();
}
