export {
  normalizeCompanyUrl,
  isValidHttpUrl,
} from "@/lib/mcpGuestFlag";

export { USERS_DATA_RESEARCH_REQUESTS_URL } from "@/lib/usersDataResearchRequests";

export const MCP_GUEST_FLAG_IMAGE_API =
  process.env.MCP_GUEST_FLAG_IMAGE_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR:v1/images";

export const MCP_GUEST_AUTH_ME_API =
  process.env.MCP_GUEST_AUTH_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:v1";
