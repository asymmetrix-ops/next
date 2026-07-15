const isDevelopBranch = process.env.NEXT_PUBLIC_ENVIRONMENT === "develop";

export const INVESTORS_API_BASE = isDevelopBranch
  ? "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop"
  : "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm";
