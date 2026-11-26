"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  applyTheme,
  DEFAULT_THEME_PREFERENCE,
  isLightOnlyPath,
  isThemePreference,
  THEME_LAST_KEY,
  themeStorageKey,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: DEFAULT_THEME_PREFERENCE,
  resolvedTheme: "light",
  setPreference: () => {},
});

function readStored(key: string): ThemePreference | null {
  try {
    const value = window.localStorage.getItem(key);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: ThemePreference): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts for this page view
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const key = themeStorageKey(user?.id);
  const [preference, setPreferenceState] = useState<ThemePreference>(
    DEFAULT_THEME_PREFERENCE
  );
  const [systemIsDark, setSystemIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Load this user's saved choice, or the last one made in this browser
  useEffect(() => {
    if (loading) {
      setPreferenceState(readStored(THEME_LAST_KEY) ?? DEFAULT_THEME_PREFERENCE);
    } else if (user) {
      const saved = readStored(key) ?? DEFAULT_THEME_PREFERENCE;
      setPreferenceState(saved);
      writeStored(THEME_LAST_KEY, saved);
    } else {
      setPreferenceState(readStored(THEME_LAST_KEY) ?? DEFAULT_THEME_PREFERENCE);
    }
    setReady(true);
  }, [key, loading, user]);

  // Follow the computer's own setting for "Match my computer"
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const update = () => setSystemIsDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Keep other open tabs in step
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key && isThemePreference(event.newValue)) {
        setPreferenceState(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const resolvedTheme: ResolvedTheme = isLightOnlyPath(pathname)
    ? "light"
    : preference === "system"
      ? systemIsDark
        ? "dark"
        : "light"
      : preference;

  useEffect(() => {
    if (ready) applyTheme(resolvedTheme);
  }, [ready, resolvedTheme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      writeStored(key, next);
      writeStored(THEME_LAST_KEY, next);
    },
    [key]
  );

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
