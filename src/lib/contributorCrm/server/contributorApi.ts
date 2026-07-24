import { getContributorServiceToken } from "@/lib/contributorCrm/server/serviceAuth";

const FIN_METRICS_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:tDNMS_i0";
const COMPANY_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";
const XANO_NEW_FILE_ENDPOINT =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/new_file";

export async function serviceAuthorizedHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = await getContributorServiceToken();
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

export async function postServiceChangeRequest(
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${FIN_METRICS_BASE}/change_request`, {
    method: "POST",
    headers: await serviceAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to submit change request (${res.status})`);
  }
}

export async function postServiceDataContributionNotification(
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${FIN_METRICS_BASE}/notifications/data-contribution`, {
    method: "POST",
    headers: await serviceAuthorizedHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Failed to send data contribution notification (${res.status})`
    );
  }
}

export async function uploadServiceFile(file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file, file.name);

  const res = await fetch(XANO_NEW_FILE_ENDPOINT, {
    method: "POST",
    headers: await serviceAuthorizedHeaders(),
    body: fd,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `File upload failed (${res.status})`);
  }

  return res.json().catch(() => ({}));
}

export async function fetchServiceCompany(companyId: string): Promise<unknown> {
  const headers = await serviceAuthorizedHeaders({
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  const endpoint = `${COMPANY_API_BASE}/Get_new_company/${companyId}`;

  const getResponse = await fetch(endpoint, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  if (getResponse.ok) {
    return getResponse.json();
  }

  const candidateBodies = [
    { new_company_id: Number(companyId) },
    { company_id: Number(companyId) },
    { id: Number(companyId) },
  ];

  for (const body of candidateBodies) {
    const postResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (postResponse.ok) {
      return postResponse.json();
    }
  }

  const text = await getResponse.text().catch(() => "");
  throw new Error(
    text || `Failed to fetch company (${getResponse.status} ${getResponse.statusText})`
  );
}
