export const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL ??
  "https://calendly.com/d/cvxj-zdj-nss/intro-call-with-asymmetrix";

const CALENDLY_WIDGET_CSS =
  "https://assets.calendly.com/assets/external/widget.css";
const CALENDLY_WIDGET_JS =
  "https://assets.calendly.com/assets/external/widget.js";

type CalendlyWindow = Window & {
  Calendly?: {
    initPopupWidget: (opts: { url: string }) => void;
    initInlineWidget: (opts: {
      url: string;
      parentElement: HTMLElement;
      resize?: boolean;
    }) => void;
  };
};

let loadPromise: Promise<void> | null = null;

function ensureCalendlyStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[data-calendly-widget="true"]')) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = CALENDLY_WIDGET_CSS;
  link.setAttribute("data-calendly-widget", "true");
  document.head.appendChild(link);
}

export function ensureCalendlyReady(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const Calendly = (window as CalendlyWindow).Calendly;
  if (Calendly) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    ensureCalendlyStyles();

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-calendly-widget="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Calendly script failed to load")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = CALENDLY_WIDGET_JS;
    script.async = true;
    script.setAttribute("data-calendly-widget", "true");
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Calendly script failed to load"));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}

export function prefetchCalendly() {
  void ensureCalendlyReady().catch(() => {
    /* fall back to direct link on click */
  });
}

export async function openCalendlyPopup(url: string = CALENDLY_URL) {
  if (typeof window === "undefined") return;

  try {
    await ensureCalendlyReady();
    const Calendly = (window as CalendlyWindow).Calendly;
    if (Calendly?.initPopupWidget) {
      Calendly.initPopupWidget({ url });
      return;
    }
  } catch {
    /* fall through */
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function openCalendlyInNewTab(url: string = CALENDLY_URL) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
