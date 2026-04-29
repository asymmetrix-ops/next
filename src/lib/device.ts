export type DeviceType = "mobile" | "desktop";

export function getDeviceType(breakpoint = 768): DeviceType {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < breakpoint ? "mobile" : "desktop";
}

