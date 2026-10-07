export type PressReleaseSection =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "contact"; name: string; email: string };

export type PressRelease = {
  slug: string;
  category: string;
  title: string;
  strapline: string;
  date: string;
  location: string;
  sections: PressReleaseSection[];
};

export const PRESS_RELEASES: PressRelease[] = [
  {
    slug: "seed-funding",
    category: "Seed Funding",
    title:
      "Asymmetrix Raises £500k in Seed Funding to Expand Data & Analytics Intelligence Platform",
    strapline:
      "Investment from seasoned data and research sector leaders accelerates growth of the source of truth for institutional investors in the D&A landscape",
    date: "2025-04-01",
    location: "London",
    sections: [
      {
        type: "paragraph",
        text: "London — April 2025 — Asymmetrix Intelligence, the subscription intelligence platform mapping the global Data & Analytics industry, has closed a $500,000 seed round led by Neil Bradford, alongside Andrew Addams and Charlie Teviot. The capital will fuel platform expansion, product development, and client growth across institutional investors, PE firms, M&A advisors, and corporates.",
      },
      {
        type: "paragraph",
        text: "The Data & Analytics sector comprises dozens of fragmented business categories from Information Services and DaaS to Market Intelligence and B2B Media. Asymmetrix unites this landscape into a single source of truth, with profiles on 6,300+ companies across 42+ sectors, deal coverage spanning 5,000+ transactions, and actionable intelligence on 2,700+ investors and 270+ advisors.",
      },
      {
        type: "quote",
        text: "The D&A space is structurally broken — investors and operators lack the integrated intelligence they need to navigate it. This round validates that the market is ready for a single source of truth. We're building the intelligence layer that PE firms, corporates, and advisors rely on to make better decisions in the fastest-moving corner of software.",
        attribution: "Alex Boden, Asymmetrix CEO",
      },
      {
        type: "paragraph",
        text: "Asymmetrix' early client base includes Burghclere, Collingwood, ECI, Endicott Capital, FPE, Mayfair, Motive, Perwyn, Plural, and Raymond James.",
      },
      {
        type: "contact",
        name: "Honor Crean",
        email: "h.crean@asymmetrixintelligence.com",
      },
    ],
  },
];

export function getPressRelease(slug: string): PressRelease | undefined {
  return PRESS_RELEASES.find((release) => release.slug === slug);
}

export function formatPressReleaseDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
