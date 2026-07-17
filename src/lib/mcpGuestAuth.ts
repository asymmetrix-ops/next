export const MCP_GUEST_OTP_EXPIRY_MINUTES = 30;

export const MCP_GUEST_AUTH_GENERIC_ERROR =
  "Unable to sign in. If your email is eligible for MCP Guest access, check your inbox for a one-time password.";

export const MCP_GUEST_OTP_SENT_MESSAGE =
  "If your email is eligible for MCP Guest access, a one-time password has been sent.";

export interface McpGuestOtpVerifyResponse {
  authToken?: string;
  token?: string;
  user?: {
    id?: string | number;
    email?: string;
    name?: string;
    Status?: string;
    status?: string;
    role?: string;
    roles?: string[];
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function sendMcpGuestOtp(workEmail: string): Promise<void> {
  const response = await fetch("/api/mcp-guest/otp/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: normalizeEmail(workEmail),
    }),
  });

  if (!response.ok) {
    throw new Error(MCP_GUEST_AUTH_GENERIC_ERROR);
  }
}

export async function verifyMcpGuestOtp(
  workEmail: string,
  otp: string
): Promise<McpGuestOtpVerifyResponse> {
  const response = await fetch("/api/mcp-guest/otp/verify", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizeEmail(workEmail),
      otp: otp.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(MCP_GUEST_AUTH_GENERIC_ERROR);
  }

  const data = (await response.json().catch(() => null)) as
    | McpGuestOtpVerifyResponse
    | null;

  const token = data?.authToken || data?.token;
  if (!token) {
    throw new Error(MCP_GUEST_AUTH_GENERIC_ERROR);
  }

  return { ...data, authToken: token, token };
}
