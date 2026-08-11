import { authService } from "@/lib/auth";
import { getTokenUserStatus } from "@/lib/userStatus";
import { EXPORT_ALL_ENTITIES_CAP } from "./types";

function isAdminStatus(value: unknown): boolean {
  const status = String(value ?? "").toLowerCase();
  return status === "admin" || status.includes("admin");
}

function isAdminExportSession(): boolean {
  const user = authService.getUser();
  if (user) {
    if (isAdminStatus(user.Status ?? user.status ?? user.role)) return true;

    const roles = (user.roles ?? []).map((role) => String(role).toLowerCase());
    if (roles.includes("admin")) return true;
  }

  return isAdminStatus(getTokenUserStatus(authService.getToken()));
}

/** Row cap for full-list exports; admins export the full result set. */
export function getFullListExportCap(uncapped = false): number {
  if (uncapped || isAdminExportSession()) {
    return Number.POSITIVE_INFINITY;
  }
  return EXPORT_ALL_ENTITIES_CAP;
}

export function capExportTotalCount(
  totalCount: number,
  uncapped = false
): number {
  const cap = getFullListExportCap(uncapped);
  if (!Number.isFinite(cap)) return totalCount;
  return Math.min(totalCount, cap);
}

export function hasReachedExportCap(count: number, uncapped = false): boolean {
  const cap = getFullListExportCap(uncapped);
  if (!Number.isFinite(cap)) return false;
  return count >= cap;
}

export function applyFullListExportCap<T>(items: T[], uncapped = false): T[] {
  const cap = getFullListExportCap(uncapped);
  if (!Number.isFinite(cap)) return items;
  return items.slice(0, cap);
}
