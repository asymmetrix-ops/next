export {
  normalizeCompanyUrl,
  isValidHttpUrl,
} from "@/lib/mcpGuestFlag";

export const MCP_GUEST_FLAG_API_BASE =
  process.env.MCP_GUEST_FLAG_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:UXwnqlMz/mcp_guest_request";

export const MCP_GUEST_FLAG_IMAGE_API =
  process.env.MCP_GUEST_FLAG_IMAGE_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/images";

export const MCP_GUEST_AUTH_ME_API =
  process.env.MCP_GUEST_AUTH_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";
