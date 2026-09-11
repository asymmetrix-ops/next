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
      "Investment from seasoned Data & Analytics sector leaders accelerates growth of the institutional intelligence platform mapping the global Data & Analytics landscape",
    date: "2026-09-01",
    location: "London",
    sections: [
      {
        type: "paragraph",
        text:
          "London — September 2026 — Asymmetrix, the subscription intelligence platform mapping the global Data & Analytics industry, closed a £500,000 seed round in April 2025, led by Neil Bradford, alongside investors Andrew Adams and Charlie Teviot. The capital is fueling platform expansion, product development, and client acquisition across institutional investors, PE firms, M&A advisors, and corporates.",
      },
      {
        type: "paragraph",
        text:
          "Neil Bradford is the founder of energy benchmark provider General Index, and previously led FE fundinfo and Argus Media. Charlie Teviot founded private markets data, insights and analytics provider With Intelligence, which exited in 2025 to S&P Global. Andrew Adams is CEO of global payments network Freemarket, a senior adviser at Houlihan Lokey, and the former CEO of Data & Analytics corporate finance advisory firm, Quayle Munro.",
      },
      {
        type: "paragraph",
        text:
          "The Data & Analytics sector is large, fragmented and highly opaque, as highlighted by the many other names it goes by, including Information Services, DaaS, Market Intelligence or B2B Media.",
      },
      {
        type: "paragraph",
        text:
          "For institutional investors and operators, navigating the fragmented Data & Analytics sector without integrated intelligence remains a persistent challenge. Asymmetrix solves this challenge through comprehensive coverage: 6,500+ company profiles across 40+ sectors, deal coverage spanning 6,000+ transactions, and actionable intelligence on 3,500+ investors and 300+ advisors.",
      },
      {
        type: "quote",
        text:
          "The Data & Analytics sector is structurally broken for investors and operators trying to navigate it. We are building the single source of truth sector participants actually need to understand this unique and unmapped sector.",
        attribution: "Alex Boden, CEO of Asymmetrix",
      },
      {
        type: "quote",
        text:
          "Asymmetrix is bringing key insights on a sector that has emerged as a powerhouse of growth and value creation. The team has deep knowledge and experience of what differentiates Data & Analytics businesses, and the platform is quickly becoming an essential tool.",
        attribution: "Neil Bradford",
      },
      {
        type: "paragraph",
        text:
          "As of September 2026, Asymmetrix now works with 27+ clients including Burghclere, Collingwood, ECI, Endicott Capital, FPE, Mayfair, Motive, Perwyn, Plural, and Raymond James.",
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
