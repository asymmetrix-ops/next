const isDevelopBranch = process.env.NEXT_PUBLIC_ENVIRONMENT === "develop";

export const ADVISORS_API_BASE = isDevelopBranch
  ? "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn:develop"
  : "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn";
