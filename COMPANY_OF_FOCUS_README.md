## Company of Focus – Company Overview & Financial Snapshot

This document explains how the **Company of Focus** feature works for Insights & Analysis articles, including:

- The **Xano APIs** used
- The **data contract** for `company_overview` and `financial_overview`
- How the **front‑end mapping** and UI rendering work in `src/app/article/[id]/page.tsx`

---

## 1. APIs

### 1.1. Content API

Used to load the base article:

- **Endpoint**:  
  `GET https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content/{content_id}`

- **Auth**:  
  `Authorization: Bearer {asymmetrix_auth_token}` from `localStorage`.

- **Relevant fields**:
  - `Content_Type` / `content_type` / `Content.Content_type` / `Content.Content_Type`
    - Used to detect content type (e.g. `"Company Analysis"`, `"Executive Interview"`).
  - `Company_of_Focus`
    - New field on the Content table; if populated, we will try to fetch company data.

The article page normalises the response and stores it as `ArticleDetail`:

```tsx
interface ArticleDetail {
  id: number;
  Publication_Date: string;
  Headline: string;
  Strapline: string;
  Content_Type?: string;
  content_type?: string;
  Content?: { Content_type?: string; Content_Type?: string };
  Body: string;
  // ...
}
```

---

### 1.2. Company of Focus API

Used to enrich an article with Company Overview + Financial Snapshot:

- **Endpoint**:  
  `GET https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/aritcle_company_of_focus?content_id={id}`

- **Auth**:  
  `Authorization: Bearer {asymmetrix_auth_token}`

- **Request**:

```json
GET /api:Z3F6JUiu/aritcle_company_of_focus?content_id=29
```

- **Response**: array with one item (first element used):

```json
[
  {
    "id": 2201,
    "name": "Energy Aspects",
    "url": "https://www.energyaspects.com/",
    "description": "...",
    "logo": "base64...",
    "linkedin_url": "https://www.linkedin.com/company/energy-aspects",
    "company_overview": "{... JSON string ...}",
    "financial_overview": "{... JSON string ...}"
  }
]
```

#### 1.2.1. `company_overview` shape

Parsed into `CompanyOfFocusOverview`:

```tsx
interface CompanyOfFocusOverview {
  management?: Array<{
    id?: number;
    name?: string;
    job_titles?: string[];
    linkedin_url?: string;
    individual_id?: number;
    status?: string;
  }>;
  hq_location?: {
    id?: number;
    city?: string;
    state_province_county?: string;
    country?: string;
    lat?: string;
    lng?: string;
  };
  year_founded?: number | string | null;
  employee_count?: number | null;
  ownership_type?: string | null;
  investors_owners?: Array<{
    id?: number;
    name?: string;
    url?: string;
  }>;
}
```

#### 1.2.2. `financial_overview` shape

Parsed into `CompanyOfFocusFinancialOverview`:

```tsx
interface CompanyOfFocusFinancialOverview {
  // core metrics (values in millions / percent)
  arr_m?: number | string | null;
  ebitda_m?: number | string | null;
  revenue_m?: number | string | null;
  enterprise_value_m?: number | string | null;
  revenue_multiple?: number | string | null;
  revenue_growth_pc?: number | string | null;
  rule_of_40?: number | string | null;

  // currencies
  ev_currency?: string | null;
  ebitda_currency?: string | null;
  revenue_currency?: string | null;

  // per‑metric source labels (e.g. "Estimate")
  revenue_source?: string | null;
  arr_source?: string | null;
  ebitda_source?: string | null;
  ev_source?: string | null;
  revenue_multiple_source?: string | null;
  revenue_growth_source?: string | null;
  rule_of_40_source?: string | null;
}
```

Example payload (stringified in Xano):

```json
{
  "arr_m": 82,
  "ebitda_m": 14.9,
  "revenue_m": 82.8,
  "enterprise_value_m": 538,
  "revenue_multiple": 6.5,
  "revenue_growth_pc": 21,
  "rule_of_40": 39,
  "ev_currency": "USD",
  "ebitda_currency": "USD",
  "revenue_currency": "USD",
  "revenue_source": "Estimate",
  "arr_source": "Estimate",
  "ebitda_source": "Estimate",
  "ev_source": "Estimate",
  "revenue_multiple_source": "Estimate",
  "revenue_growth_source": "Estimate",
  "rule_of_40_source": "Estimate"
}
```

---

### 1.3. PDF Export API

The PDF export API (`POST /api/export-article-pdf`) receives article data including `Company_of_Focus` as a **boolean flag**:

- **Endpoint**:  
  `POST /api/export-article-pdf`

- **Request body**:

```json
{
  "id": 99,
  "Headline": "Article Title",
  "Content_Type": "Company Analysis",
  "Company_of_Focus": true,
  "Body": "<p>Article content...</p>"
}
```

**Note**: In the PDF API context, `Company_of_Focus` is a **boolean** (`true`/`false`) indicating whether the article has a company of focus, rather than the company ID/object used in the Content API. This flag can be used to determine whether to include Company Overview and Financial Snapshot sections in the PDF export.

The PDF export route (`src/app/api/export-article-pdf/route.ts`) currently accepts article data but does not yet render Company Overview or Financial Snapshot sections. If needed, the PDF generation can be enhanced to:

1. Check if `Company_of_Focus === true` and `Content_Type` matches "Company Analysis" or "Executive Interview"
2. Optionally fetch company data using the Company of Focus API (same endpoint as the article page)
3. Render Company Overview and Financial Snapshot sections in the PDF HTML template

---

## 2. Front‑end behaviour (article page)

### 2.1. When is Company of Focus fetched?

In `src/app/article/[id]/page.tsx`, a second effect fetches Company of Focus when:

- The article is loaded, **and**
- `Content_Type` is either:
  - `"Company Analysis"` or
  - `"Executive Interview"` (case‑insensitive), **and**
- The article has a non‑null `Company_of_Focus` field.

Key logic:

```tsx
useEffect(() => {
  const fetchCompanyOfFocus = async () => {
    if (!article) {
      setCompanyOfFocus(null);
      return;
    }

    const contentType = (
      article.Content_Type ||
      article.content_type ||
      article.Content?.Content_type ||
      article.Content?.Content_Type ||
      ""
    ).trim();

    const isCompanyAnalysisOrExecInterview =
      /^(company\s*analysis|executive\s*interview)$/i.test(contentType);

    const hasCompanyOfFocus =
      (article as unknown as { Company_of_Focus?: unknown }).Company_of_Focus !=
      null;

    if (!isCompanyAnalysisOrExecInterview || !hasCompanyOfFocus) {
      setCompanyOfFocus(null);
      return;
    }

    // ... call /aritcle_company_of_focus and parse company_overview / financial_overview
  };

  fetchCompanyOfFocus();
}, [article, articleId]);
```

The parsed response is stored in:

```tsx
const [companyOfFocus, setCompanyOfFocus] =
  useState<CompanyOfFocusApiItem | null>(null);
```

and later used to render the sidebar UI.

---

### 2.2. Company Overview rendering

Still in `page.tsx`, when `companyOfFocus` is present and the content type matches, we render **Company Overview** in the right‑hand column:

```tsx
{overview && (
  <div style={styles.section /* + border, bg, padding */}>
    <h2 style={styles.sectionTitle}>Company Overview</h2>
    <div>
      <div style={styles.infoRow}>
        <span style={styles.label}>HQ Location</span>
        <span style={styles.value}>{hqLocation}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Year Founded</span>
        <span style={styles.value}>{yearFounded}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Ownership Type</span>
        <span style={styles.value}>{ownership}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Investor(s) / Owner(s)</span>
        <span style={{ ...styles.value, display: "flex", flexWrap: "wrap" }}>
          {/* investor chips */}
        </span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Management</span>
        <span style={{ ...styles.value, display: "flex", flexWrap: "wrap" }}>
          {/* management chips */}
        </span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Number of Employees</span>
        <span style={styles.value}>{employeeCount}</span>
      </div>
    </div>
  </div>
)}
```

#### 2.2.1. Investor chips

Investors/owners are shown as pills. We prefer **internal** investor pages when possible:

```tsx
const investorItems = overview?.investors_owners || [];

// inside "Investor(s) / Owner(s)" row
{investorItems && investorItems.length ? (
  investorItems
    .filter((inv) => inv && inv.name)
    .map((inv, idx) => {
      const name = inv.name || "";
      const id = typeof inv.id === "number" ? inv.id : null;
      const internalHref = id && id > 0 ? `/investors/${id}` : "";
      const href = internalHref || inv.url || "";

      if (!href) {
        return <span key={`${name}-${idx}`} style={styles.companyTag}>{name}</span>;
      }

      if (internalHref) {
        return (
          <Link
            key={`${name}-${idx}`}
            href={internalHref}
            style={styles.companyTag}
            prefetch={false}
          >
            {name}
          </Link>
        );
      }

      return (
        <a
          key={`${name}-${idx}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.companyTag}
        >
          {name}
        </a>
      );
    })
) : (
  <span>{investors}</span>
)}
```

#### 2.2.2. Management chips

Management is filtered to **current CEO/founder‑type roles**, and links to the dynamic individual page when possible:

```tsx
const managementEntries =
  overview?.management && overview.management.length
    ? overview.management.filter((m) => {
        const titles = m.job_titles || [];
        const hasTitle = titles.some((t) =>
          /ceo|founder/i.test((t || "").toString())
        );
        const status = (m.status || "").toString().trim();
        const isCurrent = !status || /^current$/i.test(status);
        return hasTitle && isCurrent;
      })
    : [];

// inside "Management" row
{managementEntries && managementEntries.length ? (
  managementEntries.map((m, idx) => {
    const name = m.name || "";
    const individualId =
      m.individual_id ?? (typeof m.id === "number" ? m.id : undefined);
    const internalHref = individualId ? `/individual/${individualId}` : "";
    const href = internalHref || m.linkedin_url || "";
    // render Link to /individual/{id} when possible, otherwise external LinkedIn, otherwise plain text
  })
) : (
  <span>{management}</span>
)}
```

---

## 3. Financial Snapshot rendering

### 3.1. Header

The header shows a currency suffix, mirroring the dynamic company page:

```tsx
const currencyForHeader =
  (financial?.ev_currency ||
    financial?.revenue_currency ||
    financial?.ebitda_currency ||
    "") || "";

const financialHeader = currencyForHeader
  ? `Financial Snapshot (${currencyForHeader})`
  : "Financial Snapshot";
```

### 3.2. Values and labels

The rows are rendered with the **same labels and units** as the Company Profile metrics section:

```tsx
<div style={styles.infoRow}>
  <span style={styles.label}>Revenue (m)</span>
  <span style={styles.value} title={getFinancialSourceTooltip(financial.revenue_source)}>
    {revenueDisplay}
  </span>
</div>
<div style={styles.infoRow}>
  <span style={styles.label}>ARR (m)</span>
  <span style={styles.value} title={getFinancialSourceTooltip(financial.arr_source)}>
    {arrDisplay}
  </span>
</div>
<div style={styles.infoRow}>
  <span style={styles.label}>EBITDA (m)</span>
  <span style={styles.value} title={getFinancialSourceTooltip(financial.ebitda_source)}>
    {ebitdaDisplay}
  </span>
</div>
<div style={styles.infoRow}>
  <span style={styles.label}>Enterprise Value (m)</span>
  <span style={styles.value} title={getFinancialSourceTooltip(financial.ev_source)}>
    {evDisplay}
  </span>
</div>
<div style={styles.infoRow}>
  <span style={styles.label}>Revenue Multiple (x)</span>
  <span
    style={styles.value}
    title={getFinancialSourceTooltip(financial.revenue_multiple_source)}
  >
    {revenueMultipleDisplay}
  </span>
</div>
<div style={styles.infoRow}>
  <span style={styles.label}>Revenue Growth (%)</span>
  <span
    style={styles.value}
    title={getFinancialSourceTooltip(financial.revenue_growth_source)}
  >
    {revenueGrowthDisplay}
  </span>
</div>
<div style={styles.infoRow}>
  <span style={styles.label}>Rule of 40 (%)</span>
  <span
    style={styles.value}
    title={getFinancialSourceTooltip(financial.rule_of_40_source)}
  >
    {ruleOf40Display}
  </span>
</div>
```

### 3.3. Formatting helpers (mirroring Company Profile)

Revenue / ARR / EBITDA / EV use `formatPlainNumber` (copied from the company page) so decimals match exactly; multiples and percents use Company‑style helpers:

```tsx
// Amounts
const revenueDisplay = financial
  ? formatPlainNumber(financial.revenue_m)
  : "Not available";
// ... same for arr_m, ebitda_m, enterprise_value_m

// Multiple (e.g. "6.5x", "8x")
const formatMultiple = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Not available";
  const num = Number(value);
  if (!Number.isFinite(num)) return "Not available";
  const rounded = Math.round(num * 10) / 10;
  return `${rounded.toLocaleString()}x`;
};

// Percents (e.g. "21%", "39%")
const formatPercent = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Not available";
  const num = Number(value);
  if (!Number.isFinite(num)) return "Not available";
  return `${Math.round(num)}%`;
};
```

### 3.4. Source tooltips

Each metric uses the API’s per‑metric source label to show a tooltip on hover:

```tsx
const getFinancialSourceTooltip = (
  source?: string | null
): string | undefined => {
  if (!source) return undefined;
  const trimmed = source.toString().trim();
  if (!trimmed) return undefined;
  return `Source: ${trimmed}`;
};
```

CSS (very similar to the company page, adapted for the article layout):

```css
.article-financial-metrics {
  overflow: visible !important;
}
.article-financial-metrics span[title] {
  position: relative;
  cursor: help;
}
.article-financial-metrics span[title]:hover::after {
  content: attr(title);
  position: absolute;
  right: 0;
  bottom: 100%;
  transform: translateY(-6px);
  background: rgba(17, 24, 39, 0.95);
  color: #fff;
  font-size: 12px;
  line-height: 1.2;
  padding: 6px 8px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 20;
  pointer-events: none;
}
.article-financial-metrics span[title]:hover::before {
  content: '';
  position: absolute;
  right: 8px;
  bottom: calc(100% - 2px);
  border: 6px solid transparent;
  border-top-color: rgba(17, 24, 39, 0.95);
  z-index: 21;
  pointer-events: none;
}
```

---

## 4. Summary

- The **Content** API determines when to show Company of Focus (Company Analysis + Executive Interview with `Company_of_Focus` set).
- The **Company of Focus** API provides a normalised `company_overview` and `financial_overview` payload, including per‑metric sources.
- The **article sidebar UI**:
  - Mirrors the **dynamic Company Profile** layout and formatting for:
    - Company Overview fields
    - Financial Snapshot labels, units and decimal places
    - Per‑metric “Source: …” tooltips
  - Routes investor and management chips to the correct **internal** pages wherever possible.


