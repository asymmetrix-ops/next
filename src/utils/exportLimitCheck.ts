import { authService } from "@/lib/auth";

// exported_companies_files is read from /auth/me response

const EXPORT_LIMIT = 10;

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

    const endpoint = `/api/auth-me`;

    // Call internal API route (server-side to Xano) to avoid CORS
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // pass token in a custom header for SSR route to use if cookie not present
        "x-asym-token": token,
      },
      credentials: "include",
    });

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

    // Check if user is admin - admins get unlimited exports
    const userStatus = (anyData["Status"] as string | undefined) ?? "";
    const isAdmin = userStatus.toLowerCase().includes("admin");

    if (isAdmin) {
      return {
        canExport: true,
        exportsLeft: EXPORT_LIMIT, // Show full limit for display purposes
        exportedFiles,
      };
    }

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
