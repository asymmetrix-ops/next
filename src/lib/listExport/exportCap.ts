import { authService } from "@/lib/auth";
import { getTokenUserStatus } from "@/lib/userStatus";
import { EXPORT_ALL_ENTITIES_CAP } from "./types";

function isAdminExportSession(): boolean {
  const user = authService.getUser();
  if (user) {
    const status = String(
      user.Status ?? user.status ?? user.role ?? ""
    ).toLowerCase();
    if (status === "admin") return true;

    const roles = (user.roles ?? []).map((role) => String(role).toLowerCase());
    if (roles.includes("admin")) return true;
  }

  return getTokenUserStatus(authService.getToken()) === "admin";
}

/** Row cap for full-list exports; admins export the full result set. */
export function getFullListExportCap(): number {
  return isAdminExportSession()
    ? Number.POSITIVE_INFINITY
    : EXPORT_ALL_ENTITIES_CAP;
}

export function capExportTotalCount(totalCount: number): number {
  const cap = getFullListExportCap();
  if (!Number.isFinite(cap)) return totalCount;
  return Math.min(totalCount, cap);
}

export function hasReachedExportCap(count: number): boolean {
  const cap = getFullListExportCap();
  if (!Number.isFinite(cap)) return false;
  return count >= cap;
}

export function applyFullListExportCap<T>(items: T[]): T[] {
  const cap = getFullListExportCap();
  if (!Number.isFinite(cap)) return items;
  return items.slice(0, cap);
}
