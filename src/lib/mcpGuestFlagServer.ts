import { XANO_HOST } from "@/lib/apiBase";
export {
  normalizeCompanyUrl,
  isValidHttpUrl,
} from "@/lib/mcpGuestFlag";

export { USERS_DATA_RESEARCH_REQUESTS_URL } from "@/lib/usersDataResearchRequests";

export const MCP_GUEST_FLAG_IMAGE_API =
  process.env.MCP_GUEST_FLAG_IMAGE_API_URL ||
  `${XANO_HOST}/api:qi3EFOZR/images`;

export const MCP_GUEST_AUTH_ME_API =
  process.env.MCP_GUEST_AUTH_API_URL ||
  `${XANO_HOST}/api:vnXelut6`;
