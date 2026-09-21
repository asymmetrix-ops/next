Asymmetrix – Platform Documentation

Overview

This repository contains the Asymmetrix Next.js (App Router) application. It provides market intelligence across Data & Analytics companies, investors, advisors, individuals, corporate events, and editorial content (Insights & Analysis).

Tech stack

- Next.js 14 (App Router) with React 18
- TypeScript, Tailwind CSS (utility classes, custom CSS variables via globals.css)
- Recharts (charts), react-hot-toast, Zustand, shadcn-like utilities (tailwindcss-animate)
- Xano backend APIs (environment-configurable)

Getting started

Prerequisites

- Node.js LTS (>= 18)

Install and run

1. Install dependencies:
   npm install
2. Create .env.local from env.example and set NEXT_PUBLIC_XANO_API_URL:
   NEXT_PUBLIC_XANO_API_URL=https://<your-xano-project>/api:<version>
3. Start dev server on port 3001:
   npm run dev
4. Build and start (production):
   npm run build && npm run start

Scripts (package.json)

- dev: next dev -p 3001
- build: next build
- start: next start -p 3001
- lint: next lint
- type-check: tsc --noEmit

Deployment

- Vercel configuration present in vercel.json (git deployments enabled for main/master/develop/staging).
- next.config.js configures image domains, headers, compression, and redirects.

Auth

- Client-side token stored under localStorage key asymmetrix_auth_token (see src/lib/auth.ts).
- Some routes and API calls expect a valid auth token; unauthenticated users may be redirected to /login.

Design system and color scheme

Global tokens (src/app/globals.css)

- Uses CSS variables in HSL for theming:
  --primary: 228 85% 63% (Asymmetrix blue)
  --asymmetrix-blue: 228 85% 63%
  --asymmetrix-blue-dark: 228 85% 55%
  --asymmetrix-blue-light: 228 85% 70%
  --asymmetrix-text-light: 228 20% 75%
  --asymmetrix-bg-light: 0 0% 97%
- Additional tokens: background/foreground, card, popover, border, input, ring, secondary, muted, accent, destructive.
- Dark mode tokens are defined under .dark.

Tailwind (tailwind.config.js)

- Tailwind reads CSS variables and maps to semantic colors (primary, secondary, etc.) and custom keys (asymmetrix-blue, etc.).
- Includes tailwindcss-animate.

Global utilities (src/app/globals.css)

- .container-custom, .btn-primary, .btn-secondary, .card, .input-field.

Navigation & layout

Root layout (src/app/layout.tsx)

- Adds global metadata, Hotjar/Google Analytics scripts, and providers (AuthProvider, AnalyticsProvider). Favicon from /public/icons/favicon.svg.

Header (src/components/Header.tsx)

- Left: logo linking to home. Desktop nav to major sections. Mobile menu with hamburger.
- Right: Logout button (clears token via authService and routes to /login).
  Sections include: Dashboard (/home-user), Companies, Sectors, Investors, Advisors, Individuals, Corporate Events, Insights & Analysis.

Home (src/app/page.tsx)

- Public marketing landing: HomeHeader, hero, market/solution/reports sections, Footer.

About Us (src/app/about-us/page.tsx)

- Marketing page: vision hero with gradient overlay, team (Founder), values, CTA, custom gradient footer.

Data pages (logged in)

Companies (src/app/companies/page.tsx)

- Search + filters: countries, provinces, cities, primary/secondary sectors, hybrid business focus, ownership type, LinkedIn members range.
- Results as table (desktop) and cards (mobile). Pagination and CSV export (when filters applied).
- Row links to company profile at /company/[id].

Company profile (src/app/company/[param]/page.tsx)

- Overview: sectors (primary/derived from sub-sectors), year founded (intelligent extraction), website, ownership, HQ, lifecycle stage, investors.
- Financial metrics: revenue, EBITDA, EV (currency-aware). LinkedIn employee chart.
- Management: current and past roles with links to individuals.
- Subsidiaries (table with logo, description, sectors, LinkedIn members, country) with expand/collapse.
- Corporate events (summary table), and related Asymmetrix articles (cards).

Investors (src/app/investors/page.tsx)

- Search + filters: location (countries/provinces/cities), primary/secondary sectors, investor types, portfolio range.
- Stats summary (counts by investor type and total investments), table and mobile cards, pagination.
- Links to investor detail at /investors/[id].

Investor profile (src/app/investors/[id]/page.tsx)

- Overview: focus, year founded, HQ, website, LinkedIn.
- Invested D&A sectors.
- Description and investment team (current/past) with deep-links to individuals.
- Current and past portfolio (tables + mobile cards) with pagination.
- Corporate events table (links to event pages).

Advisors (src/app/advisors/page.tsx)

- Search + filters: location (countries/provinces/cities), primary/secondary sectors. Shows counts (FA, CDD, VDD, Mgmt advisory, NOMAD).
- Table and mobile cards, pagination. Links to advisor profile /advisor/[id].

Advisor profile (src/app/advisor/[param]/page.tsx)

- Overview: sectors, year founded, HQ, website, transaction count.
- Description. Historic LinkedIn employee chart.
- Advisors (current/past) with titles; Corporate events table and mobile cards with links to event, investors/companies, and other advisors.

Individuals (src/app/individuals/page.tsx)

- Search + filters: location, primary/secondary sectors, job titles, statuses (Current, Past).
- Stats (totals, CEOS, roles, founders), table + mobile cards, pagination. Links to individual profile.

Individual profile (src/app/individual/[param]/page.tsx)

- Overview: location, LinkedIn, optional bio.
- Roles (table with company logo, company link, status, role, URL).
- Corporate events: table of events the person is related to, with links to event, other individuals, advisors.
- Related individuals table (company, person, status, role).

Corporate events (src/app/corporate-events/page.tsx)

- Comprehensive filter/search UI (location, sectors, event fields, bands; using service types). CSV export available.
- Large responsive table on desktop with relevant columns; mobile cards.
- Pagination. Links to detail /corporate-event/[id].

Corporate event detail (src/app/corporate-event/[id]/page.tsx)

- Event header: description, report-incorrect-data mailto.
- Key facts: deal type, announced/closed dates, investment amount, enterprise value (currency formatted).
- Sectors (primary derived via sub-sector mapping) and sub-sectors.
- Counterparties: table/cards with logo, company, type, announcement URL, individuals. Links to investor/company/individuals when applicable.
- Advisors: table/cards with advisor, role, advising (links), announcement URL.

Insights & Analysis (src/app/insights-analysis/page.tsx)

- Search for editorial content with pagination.
- Cards list with headline, date, strapline, companies and sectors mentioned. Links to /article/[id].

Other routes

- /sectors, /sector/[id]: sector listings and details (linked throughout profiles).
- /home-user: dashboard entry (Header highlights as “Dashboard”).
- /login, /register: authentication UI (uses authService).

Styling & theming summary

- Primary brand color: Asymmetrix Blue hsl(228, 85%, 63%). Darker and lighter variants available via tokens.
- Page UIs primarily use scoped CSS-in-JS style objects and small utility classes; tables/cards are responsive with desktop tables hidden on mobile via media queries. Tailwind utilities are available globally.

Images and media

- next.config.js allows remote image domains: asymmetrix.info and asymmetrixintelligence.com; most logos are base64 from API.

Analytics & tracking

- Hotjar and Google Analytics are injected in RootLayout.

Accessibility and UX notes

- Links for navigation are plain anchors augmented with SPA navigation where possible; many links include underlines and brand color cues.
- Mobile views switch to card layouts; pagination condenses with ellipses.

Environment variables

- NEXT_PUBLIC_XANO_API_URL: Base URL for Xano APIs.
- Optional: CUSTOM_KEY (read in next.config.js), Vercel settings as needed.

Troubleshooting

- 401/redirects: ensure token exists (localStorage key: asymmetrix_auth_token). Login via /login.
- Empty lists: verify API URL and that the account has data access.
- Images not rendering: base64 logos may be missing in API; placeholders are shown.
