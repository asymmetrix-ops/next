export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_PREFIX = "asymmetrix_theme";
// Last choice made in this browser, read before the first paint
export const THEME_LAST_KEY = `${THEME_STORAGE_PREFIX}:last`;
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match my computer" },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function themeStorageKey(userId?: string | number | null): string {
  return `${THEME_STORAGE_PREFIX}:${userId ?? "anon"}`;
}

// Pages outside the platform that always stay light (the home page "/" too)
export const LIGHT_ONLY_PATHS = [
  "/about-us",
  "/contact-us",
  "/press-releases",
  "/privacy-policy",
  "/terms-and-conditions",
  "/contributor-crm",
  "/admin",
  "/benchmarking",
  "/events",
  "/landing-test-version1",
  "/mcp-guest",
  "/mcp-tracker",
  "/mcp-login",
];

export function isLightOnlyPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/" ||
    LIGHT_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

// Runs before the first paint so dark users never see a light flash
export const THEME_INIT_SCRIPT = `(function(){try{var l=${JSON.stringify(LIGHT_ONLY_PATHS)},u=location.pathname;if(u==="/"||l.some(function(x){return u===x||u.indexOf(x+"/")===0}))return;var p=localStorage.getItem("${THEME_LAST_KEY}");if(p!=="light"&&p!=="dark"&&p!=="system")p="${DEFAULT_THEME_PREFERENCE}";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
