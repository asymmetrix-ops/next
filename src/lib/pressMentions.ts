export type PressMention = {
  title: string;
  /** Publication or site name. */
  source: string;
  url: string;
  /** One-line description. */
  description: string;
  /** ISO date (YYYY-MM-DD), optional. */
  date?: string;
};

// Newest first. Add new mentions at the top.
export const PRESS_MENTIONS: PressMention[] = [
  {
    title: "HIEC interviews Asymmetrix CEO Alex Boden",
    source: "HIEC",
    url: "https://www.hiec.com/heads-up-with-alex-boden-ceo-of-asymmetrix/",
    description:
      "Heads Up with Alex Boden, CEO of Asymmetrix: an interview on Asymmetrix and the Data & Analytics industry.",
  },
];
