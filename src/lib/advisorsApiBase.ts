import { XANO_HOST } from "@/lib/apiBase";
const isDevelopBranch = process.env.NEXT_PUBLIC_ENVIRONMENT === "develop";

export const ADVISORS_API_BASE = isDevelopBranch
  ? `${XANO_HOST}/api:Cd_uVQYn`
  : `${XANO_HOST}/api:Cd_uVQYn`;
