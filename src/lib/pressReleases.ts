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
  {
    slug: "product-updates",
    category: "Product Updates",
    title:
      "Asymmetrix Launches Deal Radar, Redesigned Company Profiles, and Enhanced Filtering",
    strapline:
      "Q2 2026 product updates bring real-time deal intelligence, AI defensibility benchmarking, and improved search to institutional investors",
    date: "2026-06-01",
    location: "London",
    sections: [
      {
        type: "paragraph",
        text: "London — June 2026 — Asymmetrix Intelligence has shipped three major product updates designed to help institutional investors track and act on market opportunities faster.",
      },
      {
        type: "heading",
        text: "Deal Radar: Live Transaction Intelligence",
      },
      {
        type: "paragraph",
        text: "Deal Radar brings proprietary intelligence on upcoming transactions and deal signals directly into the Asymmetrix dashboard. Investors can now see early-stage deal activity across the Data & Analytics sector, surfacing acquisition targets and portfolio company moves up to 18 months before they hit the market.",
      },
      {
        type: "heading",
        text: "Company Profile Redesign: AI Defensibility Index",
      },
      {
        type: "paragraph",
        text: "The redesigned company profile goes beyond basic operational metrics. It now includes information on companies' core products, user bases, and use cases — plus Asymmetrix' proprietary AI Defensibility Index, a framework measuring each company's vulnerability to AI replication. This addresses a critical question for investors evaluating software businesses in a rapidly changing AI landscape.",
      },
      {
        type: "heading",
        text: "Improved Search and Filtering",
      },
      {
        type: "paragraph",
        text: "Every filter applied now appears as an editable chip at the top of the companies list, giving users complete visibility into what's narrowing their results. Filters can be edited in-place or removed instantly. Any filter can also become a column with a single click, enabling the exact view each user needs.",
      },
      {
        type: "quote",
        text: "This quarter we focused on helping investors find the deals that matter and understand the companies behind them. Deal Radar changes how early investors identify opportunities. The AI Defensibility Index addresses something institutional money is asking about every week now. And the search redesign makes our platform feel less like a database and more like a working tool.",
        attribution: "Alex Boden, CEO of Asymmetrix",
      },
      {
        type: "paragraph",
        text: "The updates are available now to all Asymmetrix subscribers. Q3 priorities include financial intelligence screening (revenue, EBITDA, ARR, NRR benchmarking), MCP integration for AI workflow embedding, and competitive benchmarking tools.",
      },
      {
        type: "contact",
        name: "Honor Crean",
        email: "h.crean@asymmetrixintelligence.com",
      },
    ],
  },
  {
    slug: "25-clients-milestone",
    category: "Company Milestone",
    title:
      "Asymmetrix Reaches 25+ Clients, Expanding Across PE, Corporates, and Advisors",
    strapline:
      "Six months after launch, platform adopted by institutional investors, private equity firms, and M&A advisors across Europe and North America",
    date: "2026-07-01",
    location: "London",
    sections: [
      {
        type: "paragraph",
        text: "London — July 2026 — Asymmetrix Intelligence has crossed 25 active clients, marking a milestone validation of its thesis that institutional investors and operators lack integrated intelligence on the Data & Analytics sector. The client base spans PE firms, corporates, M&A advisors, and institutional investors across Europe and North America.",
      },
      {
        type: "paragraph",
        text: "Among early adopters are Burghclere, Collingwood, ECI, Endicott Capital, FPE, Mayfair, Motyve, Perwyn, Plural, and Raymond James — representing some of the most active allocators in the D&A space.",
      },
      {
        type: "quote",
        text: "Getting to 25 clients in six months tells us we're solving a real problem. These aren't pilot users or free trial sign-ups. They're paying customers who rely on our data to make allocation decisions, identify targets, and understand market structure. That validation gave us the confidence to raise our seed round and build toward the next phase.",
        attribution: "Alex Boden, CEO of Asymmetrix",
      },
      {
        type: "paragraph",
        text: "The milestone coincides with Asymmetrix' seed funding announcement and the appointment of Neil Bradford as Chairman. The platform now tracks 6,300+ companies across 42 sectors, 2,700+ investors, 270+ advisors, and 5,000+ deals. Recent product launches — Deal Radar, the redesigned Company Profile with AI Defensibility Index, and enhanced search and filtering — are expanding use cases across the investor base.",
      },
      {
        type: "paragraph",
        text: "The next phase involves geographic expansion, financial metrics integration, and deeper integrations with investor workflows via MCP (Model Context Protocol) partnerships.",
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
