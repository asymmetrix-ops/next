# Asymmetrix Landing Page — Draft Content & Colour Schema

> Draft reference for the rebrand landing page (`/landing-test-version1`).  
> Wording taken from design screenshots. Component mapping included for implementation.

---

## Page structure (top → bottom)

| # | Section | Component | Status |
|---|---------|-----------|--------|
| 1 | Navigation | `Navbar1` | Implemented |
| 2 | Hero | `Header114` | Implemented |
| 3 | Trusted by (logo strip) | `Logo3` | Implemented — replace placeholder logos |
| 4 | About | `Layout184` | Implemented |
| 5 | Platform features (01–03) | `Layout485` | Partial — features 02 & 03 need correct copy |
| 6 | Coverage (tabbed) | *TBD* | **Not yet in page** |
| 7 | Trusted by (repeat) | `Logo3_1` | Implemented — replace placeholder logos |
| 8 | Testimonial | `Testimonial1` | Implemented |
| 9 | Substack / blog feed | `Blog16` | Implemented |
| 10 | Book a demo CTA | `Cta15` | Implemented |
| 11 | Footer | `Footer1` | Implemented — fix copyright / legal links |

---

## Colour schema

### Core palette

| Token | Value | Usage |
|-------|-------|-------|
| `--asymmetrix-blue` | `hsl(228, 85%, 63%)` | Primary accent, borders, focus rings, active UI |
| `--asymmetrix-blue-dark` | `hsl(228, 85%, 55%)` | Hover state for primary accent |
| `--gradient-hero` | `linear-gradient(160deg, hsl(218, 64%, 33%) 0%, hsl(226, 84%, 44%) 50.2%, hsl(0, 0%, 0%) 100%)` | Hero, About, CTA backgrounds |
| Background — deep navy | `#000B29` / `#050827` | Main page background, blog section |
| Background — near black | `#000000` | Logo strip, footer base |
| Text — primary | `#FFFFFF` | Headlines, quotes, nav on dark |
| Text — secondary | Light grey / desaturated blue-grey | Labels, body copy, metadata, excerpts |
| Divider | Light grey (`neutral-lighter`) | Feature section separators |

### Section-specific

| Section | Background | Notes |
|---------|------------|-------|
| Hero / About / CTA | Hero gradient (blue → black) | Large vertical padding; white text throughout |
| Trusted by | Very dark navy / near black | Logos in grey/white; partner brand colours allowed in logo assets |
| Platform features | Deep navy | Large sticky `01` / `02` / `03` numerals in white |
| Coverage | Deep navy | Active tab: slightly lighter navy; inactive: transparent |
| CTA box | Blue gradient + neon blue/purple glow border | Left: headline; right: subtext + buttons |
| Data viz (Coverage graphic) | Dark UI mockup | Cyan / light blue charts and cards |

### Buttons

| Variant | Style |
|---------|-------|
| Primary | Solid white background, dark text (e.g. “Book a demo”, “Calendly”) |
| Secondary / ghost | Transparent background, thin white border, white text (e.g. “Explore the data”, “Contact Us”, “Demo”) |
| Link | White text + chevron (e.g. “Platform Features >”, “Read >”) |
| Feature CTA | Dark background, thin blue border, white text (e.g. “Our Coverage”) |

### Typography

- Font: clean modern sans-serif (Inter / system stack)
- Headlines: large, bold, white
- Section labels: small, semibold (e.g. “About”, “Platform Feature”, “Coverage”, “Substack”)
- Body: regular weight, generous line height

---

## Section content

### 1. Navigation (`Navbar1`)

**Logo:** Asymmetrix (A icon)

**Links:**
- About Us
- Press Releases
- Contact Us

**CTA button:** Talk to Sales

---

### 2. Hero (`Header114`)

**Headline:**
> Intelligence on the Data & Analytics Market

**Primary CTA:** Book a demo  
**Secondary CTA:** Explore the data

**Body copy (right column):**
> Asymmetrix is the source of truth for the Data & Analytics industry. Track companies, deals, and sub-sectors globally in real time. Built for PE firms, M&A advisors, and corporates and industry participants who need an in-depth view of the market's most dynamic space.

**Layout:** Two-column — headline + CTAs left; body copy bottom-right on desktop.

---

### 3. Trusted by — logo strip (`Logo3`)

**Heading:**
> Trusted by leading firms across the data and analytics industry

**Logos (from design — replace Relume/Webflow placeholders):**
- Collingwood
- PLURAL
- eci
- CortenCapital
- Bridgepoint
- *(additional client logos as available)*

**Behaviour:** Horizontal scrolling / marquee loop.

---

### 4. About (`Layout184`)

**Label:** About

**Headline:**
> We provide real-time data on the most dynamic market

**Body:**
> Intelligence on Data & Analytics companies was fragmented across sources, and the industry itself lacked a consistent definition. Asymmetrix provides intelligence on data, research and content providers of every shape, size and business model – uniting the sector under one taxonomy and giving stakeholders critical proprietary data on the companies, deals and people shaping the industry

**CTAs:**
- Demo (ghost button)
- Platform Features > (link)

**Layout:** Centred text on hero gradient background.

---

### 5. Platform features (`Layout485`)

Sticky large numeral on the left (`01` → `02` → `03` on scroll). Three stacked feature blocks separated by horizontal dividers.

#### Feature 01 — Financial Intelligence

**Label:** Platform Feature  
**Headline:** Financial Intelligence

**Body:**
> Asymmetrix gathers hard-to-find proprietary financial data specific to Data & Analytics companies, moving your understanding beyond generic company data providers, and enabling deal sourcing, benchmarking and market intelligence.

**CTA:** Our Coverage

---

#### Feature 02 — Deal Radar

**Label:** Platform Feature  
**Headline:** Deal Radar

**Body:**
> Know which Data & Analytics companies will transact before the rest of the market does. Asymmetrix provides proprietary intelligence on in-market companies and surfaces deal signals long before a process formally begins.

**CTA:** Product Features

---

#### Feature 03 — AI defensibility

**Label:** Platform Feature  
**Headline:** AI defensibility

**Body:**
> Asymmetrix's AI Exposure Index assesses individual data companies' AI risk exposure and defensibility. Our research reports analyse which business models AI disrupts, which it reinforces, and how this is reshaping valuations across the sector.

**CTA:** Contact Us

---

### 6. Coverage — tabbed section *(not yet in `page.tsx`)*

**Label:** Coverage

**Headline:**
> All of the data tracked in one place

**Subtext:**
> Asymmetrix monitors the full spectrum of the data and analytics market. From early-stage startups, to public companies. These are features in our platform exclusive to our clients.

**Tabs:**
1. Company profiles *(default / active)*
2. Sector intelligence
3. Investors & Advisors
4. Deal tracking
5. Market analysis

#### Tab: Company profiles (example content from design)

**Small label:** Monitor  
**Sub-heading:** Company profiles

**Description:**
> Every company profile encompasses funding history, leadership team composition, product focus, and competitive positioning. Our cutting-edge analysis includes an assessment of each company's defensibility in the AI era.

**Visual:** Dashboard mockup graphic (company card, donut chart, bar chart — cyan/blue on dark).

*(Other tabs: copy TBD — structure mirrors Company profiles with tab-specific label, heading, description, and graphic.)*

---

### 7. Trusted by — repeat (`Logo3_1`)

Same as section 3:
> Trusted by leading firms across the data and analytics industry

*(Same logo set; appears again above testimonial in design.)*

---

### 8. Testimonial (`Testimonial1`)

**Client logo:** *(replace Webflow placeholder with actual client logo)*

**Quote:**
> "Asymmetrix gave us visibility into deal flow we didn't know existed. We've closed two investments we would have missed entirely."

**Attribution:**
- **Name:** James Mitchell
- **Title:** Partner, Insight Capital

---

### 9. Substack / blog feed (`Blog16`)

**Label:** Substack

**Headline:**
> What's worth reading

**Subtext:**
> Our substack is updated weekly

**Filter tabs:** View all · Latest · Top · Discussion · Category four

#### Articles (2×2 grid)

**Article 1**
- Tag: Markets · 7 min read
- **Title:** The next wave of Data & Analytics M&A: research firms are buying their moats (oh and about that $1,350,000,000 invested yesterday)
- **Excerpt:** Owning analysis is no longer enough and a new wave of Data & Analytics M&A is already closing the gap + Kepler and AlphaSense raise big
- Link: Read >

**Article 2**
- Tag: Strategy · 8 min read
- **Title:** What MCPs mean for Data & Analytics Providers
- **Excerpt:** Asymmetrix analyzes the opportunities and challenges of MCP development for data businesses
- Link: Read >

**Article 3**
- Tag: Deals · 6 min read
- **Title:** CME and Silicon Data partner to launch first compute futures
- **Excerpt:** The world's largest derivatives exchange teams up with the pioneer of daily GPU benchmarks to build a tradable market for computing power
- Link: Read >

**Article 4**
- Tag: Deals · 9 min read
- **Title:** When data companies acquire their way to scale
- **Excerpt:** How institutional investors are positioning for the next cycle
- Link: Read >

---

### 10. Book a demo CTA (`Cta15`)

**Headline:**
> Book a demo with us today to see how we can help you

**Subtext:**
> Start with a demo or explore

**Buttons:**
- Calendly (primary — white)
- Contact Us (ghost)

**Visual:** Gradient background with glowing blue/purple border around the section container.

---

### 11. Footer (`Footer1`)

#### Column 1 — Newsletter

**Tagline:**
> Get the latest on data and analytics intelligence.

**Form:** Email input + Subscribe button  
**Disclaimer:**
> We respect your inbox and your privacy.

#### Column 2 — Product

- What we cover
- Clients

#### Column 3 — About

- About Us
- Contact us
- People
- Careers
- Press Releases
- Follow us

#### Column 4 — Stay Informed

- Substack
- LinkedIn

**Copyright:**
> © 2024 Asymmetrix. All rights reserved.

#### Bottom bar

- Privacy policy
- Terms of service
- Cookie settings

---

## Implementation notes

1. **`Layout485`** — Features 02 and 03 still use Feature 01 copy in code; update to Deal Radar and AI defensibility text above.
2. **Coverage section** — Present in designs but missing from `page.tsx`; add new component between `Layout485` and `Logo3_1`.
3. **Logo strips** — `Logo3` and `Logo3_1` use Relume/Webflow placeholder SVGs; swap for real client logos.
4. **Footer** — Bottom bar still says “© 2024 Relume”; should be Asymmetrix. Add Privacy policy link. Remove duplicate Cookie settings entry.
5. **Testimonial** — Replace Webflow logo with Insight Capital (or relevant client) logo.
6. **Blog articles** — Wire “Read >” links to actual Substack URLs when available.

---

## CSS reference

Defined in `landing-theme.css`:

```css
--asymmetrix-blue: hsl(228, 85%, 63%);
--asymmetrix-blue-dark: hsl(228, 85%, 55%);
--gradient-hero: linear-gradient(
  160deg,
  hsl(218, 64%, 33%) 0%,
  hsl(226, 84%, 44%) 50.2%,
  hsl(0, 0%, 0%) 100%
);
```

Applied via `.landing-rebrand` wrapper in `layout.tsx`.
