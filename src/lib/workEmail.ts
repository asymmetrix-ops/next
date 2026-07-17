const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "tutanota.com",
  "hey.com",
  "inbox.com",
  "rocketmail.com",
  "aim.com",
  "qq.com",
  "163.com",
  "126.com",
  "rediffmail.com",
]);

export const WORK_EMAIL_REQUIRED_MESSAGE =
  "Please use your work email address. Personal email domains are not accepted.";

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function getEmailDomain(email: string): string | null {
  const normalized = normalizeEmailAddress(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return null;
  }
  return normalized.slice(atIndex + 1);
}

export function isPersonalEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return true;
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

export function isWorkEmail(email: string): boolean {
  const normalized = normalizeEmailAddress(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return false;
  }
  return !isPersonalEmail(normalized);
}

export function assertWorkEmail(email: string): void {
  if (!isWorkEmail(email)) {
    throw new Error(WORK_EMAIL_REQUIRED_MESSAGE);
  }
}
