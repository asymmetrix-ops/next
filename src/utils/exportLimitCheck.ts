import { authService } from "@/lib/auth";

// exported_companies_files is read from /auth/me response

const EXPORT_LIMIT = 4;

export const checkExportLimit = async (): Promise<{
  canExport: boolean;
  exportsLeft: number;
  exportedFiles: number;
}> => {
  try {
    const token = authService.getToken();
    if (!token) {
      console.warn(
        "checkExportLimit: No auth token found. User may be logged out."
      );
      return {
        canExport: false,
        exportsLeft: 0,
        exportedFiles: 0,
      };
    }

    const apiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";
    const endpoint = `${apiUrl}/auth/me`;

    // Call /auth/me to read exported_companies_files; prefer standard Bearer
    let response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    // Fallback: some environments might expect the raw token header
    if (response.status === 401) {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        credentials: "include",
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} ${
          body || ""
        }`
      );
    }

    const raw: unknown = await response.json();
    const anyData = (raw || {}) as Record<string, unknown>;
    // Support both correct and typo key just in case
    const exportedFiles = Number(
      (anyData["exported_companies_files"] as number | undefined) ??
        (anyData["exported_compamies_fiels"] as number | undefined) ??
        0
    );
    const exportsLeft = EXPORT_LIMIT - exportedFiles;

    return {
      canExport: exportsLeft > 0,
      exportsLeft: Math.max(0, exportsLeft),
      exportedFiles,
    };
  } catch (error) {
    console.error("Error checking export limit:", error);
    // On error, allow export but log the issue
    return {
      canExport: true,
      exportsLeft: EXPORT_LIMIT,
      exportedFiles: 0,
    };
  }
};

export { EXPORT_LIMIT };
