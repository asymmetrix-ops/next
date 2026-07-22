export const USERS_DATA_RESEARCH_REQUESTS_URL =
  process.env.USERS_DATA_RESEARCH_REQUESTS_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:XlV_SpG5/users_data_research_requests";

export const MCP_GUEST_COMPANY_FLAG_TYPE = "MCP Company Flag";

export const MCP_GUEST_COMPANY_FLAG_CATEGORY = "Data";

export type UsersDataResearchRequestPayload = {
  companyName: string;
  companyUrl: string;
  proofUrl: string;
  proofImageUrl: string;
  type: string;
  request_details: string;
  submitted_by: number;
  category: string;
  company_name: string;
  company_url: string;
  proof_url: string;
  proof_image_url: string;
};

export function buildMcpGuestCompanyFlagPayload(input: {
  companyName: string;
  companyUrl: string;
  proofUrl: string;
  proofImageUrl: string;
  submittedBy: number;
  submitterEmail?: string;
}): UsersDataResearchRequestPayload {
  const { companyName, companyUrl, proofUrl, proofImageUrl, submittedBy, submitterEmail } =
    input;

  const requestDetailsParts = [
    "MCP guest flagged a company for the MCP companies list.",
    "",
    `Company: ${companyName}`,
    `Company URL: ${companyUrl}`,
  ];

  if (proofUrl) {
    requestDetailsParts.push(`Proof URL: ${proofUrl}`);
  }
  if (proofImageUrl) {
    requestDetailsParts.push(`Proof image: ${proofImageUrl}`);
  }
  if (submitterEmail) {
    requestDetailsParts.push(`Submitter email: ${submitterEmail}`);
  }

  return {
    companyName,
    companyUrl,
    proofUrl,
    proofImageUrl,
    type: MCP_GUEST_COMPANY_FLAG_TYPE,
    request_details: requestDetailsParts.join("\n"),
    submitted_by: submittedBy,
    category: MCP_GUEST_COMPANY_FLAG_CATEGORY,
    company_name: companyName,
    company_url: companyUrl,
    proof_url: proofUrl,
    proof_image_url: proofImageUrl,
  };
}
