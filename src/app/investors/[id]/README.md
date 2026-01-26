# `src/app/investors/[id]/page.tsx` — PDF Data Contract

This route renders the **Investor Detail** page at `GET /investors/:id` (Next.js App Router).  
It is a **client component** (`"use client"`) and fetches data directly from Xano APIs.

This document describes:
- **What data is used on this page**
- **Where it comes from (API calls + auth)**
- **How it is normalized/mapped**
- A **stable JSON payload** you can send to a PDF service to reproduce the UI

---

## Data sources (HTTP)

All fetches:
- Use `credentials: "include"`
- Add `Authorization: Bearer ${localStorage.getItem("asymmetrix_auth_token")}` when token exists
- Use `Content-Type: application/json`

### 1) Investor profile (primary page model)

**Endpoint**
- `GET https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_the_investor_new_company?new_comp_id=:investorId`

**Used to render**
- Page header: investor name + logo
- Overview: Focus, Year founded, HQ, Website, LinkedIn
- Invested D&A sectors
- Description
- Investment Team (current + past)

**Raw response (consumed as `raw`)**

This page treats the response as an `InvestorData`-like object:
- `Investor`
- `Focus`
- `Invested_DA_sectors`
- `Investment_Team_Roles_current`
- `Investment_Team_Roles_past`

### 2) Current portfolio companies

**Endpoint**
- `GET https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_current_partfolio?new_comp_id=:investorId&page=:page&per_page=50`

**Response formats supported**
- **Array format**: `[item0, item1, ...]` where `item0` may also contain pagination-like keys (e.g. `itemsreceived`, `curpage`, `nextpage`, `prevpage`, `offset`, `pagetotal`)
- **Object format**: `{ items, itemsReceived, curPage, nextPage, prevPage, offset, perPage, pageTotal }`

**Used to render**
- Current Portfolio table (desktop) + cards (mobile)
- Pagination (if `pageTotal > 1`)

### 3) Past portfolio companies

**Endpoint**
- `GET https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_past_portfolio?new_comp_id=:investorId&page=:page&per_page=50`

Same response-format handling and mapping as **Current portfolio**.

### 4) Corporate events

**Endpoint**
- `GET https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/Get_investors_corporate_events?new_company_id=:investorId`

**Response formats supported**
- `{ Corporate_Events: CorporateEvent[] }`
- `{ New_Events_Wits_Advisors: CorporateEvent[] }`

**Used to render**
- Corporate Events table (via `CorporateEventsSection` → `CorporateEventsTable`)
- “See More / Show Less” behavior (default `maxInitialEvents=3`)

### 5) LinkedIn history (employees time series + preferred LinkedIn URL)

**Endpoint**
- `GET https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/:investorId`

**Used to render**
- Historic LinkedIn Data line chart
- Preferred LinkedIn URL (if present)

---

## Normalization/mapping performed by this page

### A) `Invested_DA_sectors` normalization

The profile endpoint sometimes returns `Invested_DA_sectors` as a legacy array, and sometimes as a nested structure containing a JSON string snapshot.

This page normalizes it to an array of:

```json
{ "id": 123, "sector_name": "Some Sector" }
```

Fallback path if `raw.Invested_DA_sectors` is not an array:
- looks for `raw.Invested_DA_sectors.da_sectors[0].investor_snapshot`
- parses JSON
- uses `snapshot.Invested_DA_sectors` if it is an array

### B) Portfolio item normalization (`mapPortfolioItem`)

Portfolio endpoints may return stringified JSON in some fields. This page normalizes each portfolio item into:

```json
{
  "id": 1,
  "name": "Company",
  "locations_id": 0,
  "sectors_id": [{ "sector_name": "Sector", "Sector_importance": "Primary" }],
  "description": "",
  "year_invested": 2020,
  "year_exited": null,
  "linkedin_data": { "LinkedIn_Employee": 0, "linkedin_logo": "" },
  "_locations": { "Country": "US" },
  "_is_that_investor": false,
  "_linkedin_data_of_new_company": { "linkedin_employee": 0, "linkedin_logo": "" },
  "related_to_investor_individuals": [{ "id": 1, "name": "Jane Doe", "job_titles": [] }]
}
```

Normalization rules:
- `sectors_id`: parsed from JSON if needed; expected array of `{ sector_name, Sector_importance }`
- `_locations`: parsed from JSON if needed; only `Country` is used in UI
- `_linkedin_data_of_new_company`: parsed from JSON if needed; used for **logo + employee count**
- `linkedin_data`: parsed from JSON if needed (legacy); not used by this UI for count/logo (it prefers `_linkedin_data_of_new_company`)
- `year_invested`: chooses first non-empty among `year_invested`, `Year_Invested`, `yearInvested` else `null`
- `year_exited`: chooses first non-empty among `year_exited`, `Year_Exited`, `yearExited` else `null`
- `related_to_investor_individuals`: parsed from JSON if needed. Each item is normalized to:
  - `id`: `Number(ri.id)` must be finite and `> 0`
  - `name`: `ri.name` or `ri.advisor_individuals` (trimmed)
  - `job_titles`: array of strings if present

### C) Corporate events advisor normalization (investor events endpoint)

The investor corporate events endpoint can return advisors in two shapes:
- normalized: `advisor_company: { id, name }`
- “flat”: `advisor_company_id` + `advisor_company_name`

This page converts each `event.advisors[]` into a list where each advisor prefers:
- `advisor_company: { id: advisor_company_id, name: advisor_company_name }`
- otherwise falls back to nested `advisor_company.id/name`

This is done so `CorporateEventsTable` can build a consistent `advisorList` (and allow click-to-navigate when the id exists).

### D) Investment team “resolved ID” enrichment

The profile endpoint provides team members as names + job titles, but not necessarily a stable individual id.

This page resolves ids by name using:
- `GET https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_all_individuals?search_query=:name&Offset=1&Per_page=10`
- finds exact match where `Individuals_list.items[].advisor_individuals === name`
- caches results in a `Map<string, number>` and pre-resolves all current+past names on load

For PDF, you can either:
- include resolved ids (recommended), or
- include names only (and keep links out of the PDF)

### E) LinkedIn history mapping

From `Get_new_company/:id`, this page maps:
- `data.Company._companies_employees_count_monthly[]` → `LinkedInHistory[]`:
  - `{ date: item.date || "", employees_count: item.employees_count || 0 }`

Preferred LinkedIn URL is taken from the first available:
- `data.Company.linkedin_data.LinkedIn_URL`
- `data.Company._linkedin_data_of_new_company.LinkedIn_URL`

---

## UI → data mapping (what the PDF should reproduce)

### Page meta
- **Document title**: `Asymmetrix – ${Investor.name}`
- **Page header**:
  - Logo: `Investor._linkedin_data_of_new_company.linkedin_logo` (base64)
  - Title: `Investor.name`
  - CTA: “Contribute Data” mailto (not necessary for PDF)

### Left column sections
- **Overview**
  - Focus: `Focus[].sector_name` joined by `, `
  - Year founded: `Investor._years.Year`
  - HQ: derived string: `City, State__Province__County, Country` (with leading/trailing commas trimmed)
  - Website: `Investor.url`
  - LinkedIn URL: `linkedinUrl` (preferred, from LinkedIn history API) else `Investor._linkedin_data_of_new_company.LinkedIn_URL`
- **Historic LinkedIn Data**
  - Chart points: `linkedInHistory[]` (date + employees_count)
  - Display date formatting: month label derived from `YYYY-MM` → `"MMM YYYY"` (US locale)
- **Invested D&A sectors**
  - Links: `/sector/:id` using `Invested_DA_sectors[]`
- **Description**
  - `Investor.description` (rendered with `whiteSpace: pre-wrap`)
- **Investment Team**
  - Current: `Investment_Team_Roles_current[]`
  - Past: `Investment_Team_Roles_past[]` (only shown if non-empty)
  - Each card:
    - Name: `member.Individual_text`
    - Job titles: `member.job_titles_id[].job_title`
    - Link: `/individual/:resolvedId` (only if id resolved)

### Right column sections
- **Current Portfolio**
  - Desktop table columns:
    - Logo: `company._linkedin_data_of_new_company.linkedin_logo` (base64)
    - Name: `/company/:company.id`
    - Sectors: first 3 `company.sectors_id[].sector_name` (append `"..."` if more)
    - Year Invested: `company.year_invested` (or `"Not available"`)
    - Related Individuals: first 3 `related_to_investor_individuals[]` names linking to `/individual/:id` (append `"..."` if more)
    - LinkedIn Members: `company._linkedin_data_of_new_company.linkedin_employee` (number formatted with locale commas)
    - Country: `company._locations.Country`
  - Mobile cards show a subset with slightly different truncation (Individuals: first 2)
  - Pagination:
    - Visible if `portfolioPagination.pageTotal > 1`
    - Buttons enabled based on `prevPage` / `nextPage`
- **Past Portfolio**
  - Table columns:
    - Logo, Name, Sectors (first 3), Year Exited, Related Individuals (first 3), LinkedIn Members, Country
  - Pagination: visible if `pastPortfolioPagination.pageTotal > 1`
- **Corporate Events**
  - Rendered via `CorporateEventsSection` + `CorporateEventsTable`
  - Defaults:
    - `maxInitialEvents = 3`
    - `truncateDescriptionLength = 180`
    - `showSectors = false`
  - Table columns:
    - Event Details (click → `/corporate-event/:id`)
    - Parties (targets/buyers/investors/sellers derived)
    - Deal Details (EV / investment amount / band / funding stage)
    - Advisor(s) (clickable; id navigates to `/advisor/:id` else name triggers lookup)

### Responsive rules (important for PDF layout decisions)

The page itself swaps UI for portfolio:
- `@media (max-width: 768px)`:
  - hides `.portfolio-table-container`
  - shows `.portfolio-cards`
  - pagination compacts (wrap + smaller buttons)
  - investment team grid becomes 1 column
- `@media (min-width: 769px)`:
  - shows table; hides cards

For PDF generation you typically want **desktop layout** (tables), regardless of screen size.

---

## PDF service payload (recommended stable contract)

The page fetches from multiple endpoints and performs client-only normalization. For PDF generation, the easiest and most reliable approach is:

1) **Aggregator** (web app / backend): call the same upstream APIs server-side, apply the same normalization, and produce a single JSON payload.
2) **PDF service**: accept that payload and render a PDF template.

### Payload: `InvestorPdfPayloadV1` (entire JSON structure)

```json
{
  "schema_version": "investor_pdf_payload_v1",
  "generated_at": "2026-01-26T00:00:00.000Z",
  "source": {
    "route": "/investors/:id",
    "investor_id": "123",
    "auth": {
      "uses_bearer_token": true,
      "uses_credentials_include": true
    },
    "upstream": {
      "investor_profile": {
        "method": "GET",
        "url": "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_the_investor_new_company",
        "query": { "new_comp_id": "123" }
      },
      "portfolio_current": {
        "method": "GET",
        "url": "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_current_partfolio",
        "query": { "new_comp_id": "123", "page": 1, "per_page": 50 }
      },
      "portfolio_past": {
        "method": "GET",
        "url": "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_past_portfolio",
        "query": { "new_comp_id": "123", "page": 1, "per_page": 50 }
      },
      "corporate_events": {
        "method": "GET",
        "url": "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/Get_investors_corporate_events",
        "query": { "new_company_id": "123" }
      },
      "linkedin_history": {
        "method": "GET",
        "url": "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/123"
      }
    }
  },
  "ui": {
    "title": "Asymmetrix – Investor Name",
    "layout": {
      "columns": 2,
      "preferred_variant": "desktop_tables"
    },
    "corporate_events": {
      "max_initial_events": 3,
      "truncate_description_length": 180,
      "show_sectors": false
    }
  },
  "investor": {
    "id": 123,
    "name": "Investor Name",
    "description": "Long description text",
    "website_url": "https://example.com",
    "year_founded": 2000,
    "years": { "id": 1, "Year": "2000" },
    "hq": {
      "city": "City",
      "state_province_county": "State",
      "country": "Country",
      "display": "City, State, Country"
    },
    "linkedin": {
      "url": "https://www.linkedin.com/company/example",
      "logo_base64_jpeg": "BASE64_NO_DATA_URI_PREFIX",
      "logo_data_uri": "data:image/jpeg;base64,BASE64_NO_DATA_URI_PREFIX"
    }
  },
  "overview": {
    "focus_sectors": [
      { "id": 1, "sector_name": "Sector A" }
    ],
    "invested_da_sectors": [
      { "id": 2, "sector_name": "D&A Sector" }
    ]
  },
  "linkedin_history": {
    "series": [
      { "date": "2024-01", "employees_count": 10 }
    ]
  },
  "investment_team": {
    "current": [
      {
        "name": "Jane Doe",
        "job_titles": ["Partner"],
        "resolved_individual_id": 111,
        "profile_path": "/individual/111"
      }
    ],
    "past": [
      {
        "name": "John Smith",
        "job_titles": ["Associate"],
        "resolved_individual_id": null,
        "profile_path": null
      }
    ]
  },
  "portfolio": {
    "current": {
      "pagination": {
        "items_received": 0,
        "cur_page": 1,
        "next_page": null,
        "prev_page": null,
        "offset": 0,
        "per_page": 50,
        "page_total": 0
      },
      "items": [
        {
          "id": 1001,
          "name": "Company A",
          "company_path": "/company/1001",
          "country": "US",
          "sectors": [
            { "sector_name": "AI", "Sector_importance": "Primary" }
          ],
          "year_invested": 2021,
          "linkedin": {
            "employees": 1234,
            "logo_base64_jpeg": "BASE64_NO_DATA_URI_PREFIX",
            "logo_data_uri": "data:image/jpeg;base64,BASE64_NO_DATA_URI_PREFIX"
          },
          "related_individuals": [
            {
              "id": 111,
              "name": "Jane Doe",
              "job_titles": ["Partner"],
              "profile_path": "/individual/111"
            }
          ]
        }
      ]
    },
    "past": {
      "pagination": {
        "items_received": 0,
        "cur_page": 1,
        "next_page": null,
        "prev_page": null,
        "offset": 0,
        "per_page": 50,
        "page_total": 0
      },
      "items": [
        {
          "id": 2001,
          "name": "Company B",
          "company_path": "/company/2001",
          "country": "GB",
          "sectors": [
            { "sector_name": "FinTech", "Sector_importance": "Primary" }
          ],
          "year_exited": 2023,
          "linkedin": {
            "employees": 500,
            "logo_base64_jpeg": "BASE64_NO_DATA_URI_PREFIX",
            "logo_data_uri": "data:image/jpeg;base64,BASE64_NO_DATA_URI_PREFIX"
          },
          "related_individuals": []
        }
      ]
    }
  },
  "corporate_events": {
    "items": [
      {
        "id": 999,
        "description": "Event description text",
        "description_truncated": "Event description text",
        "announcement_date": "2025-01-01",
        "deal_type": "Investment",
        "investment_display": null,
        "ev_display": null,
        "investment_data": {
          "investment_amount_m": "10",
          "Funding_stage": "Series A",
          "funding_stage": "Series A",
          "currency": { "Currency": "USD" },
          "currency_id": "1"
        },
        "ev_data": {
          "enterprise_value_m": 100,
          "ev_band": "100-200",
          "currency": { "Currency": "USD" },
          "currency_id": "1"
        },
        "targets": [
          {
            "id": 1001,
            "name": "Target Company",
            "path": "/company/1001",
            "route": "company",
            "entity_type": "company"
          }
        ],
        "target_label": "Target",
        "target_counterparty": {
          "new_company_counterparty": 1001,
          "new_company": { "id": 1001, "name": "Target Company", "_location": { "Country": "US" } },
          "_new_company": { "id": 1001, "name": "Target Company", "_location": { "Country": "US" } }
        },
        "other_counterparties": [
          {
            "id": 3001,
            "name": "Counterparty",
            "page_type": "company",
            "counterparty_id": 3001,
            "is_data_analytics": false,
            "counterparty_status": "Investor",
            "counterparty_type_id": 1,
            "counterparty_announcement_url": null,
            "_new_company": { "id": 3001, "name": "Counterparty", "_is_that_investor": false },
            "_counterparty_type": { "counterparty_status": "Investor" }
          }
        ],
        "advisors": [
          {
            "id": 4001,
            "advisor_company": { "id": 4001, "name": "Advisor Firm" },
            "announcement_url": null,
            "new_company_advised": 1001,
            "counterparty_advised": 3001,
            "advisor_company_id": 4001,
            "advisor_company_name": "Advisor Firm",
            "advised_company": { "id": 1001, "name": "Target Company", "route": "company", "entity_type": "company" }
          }
        ],
        "event_path": "/corporate-event/999"
      }
    ]
  }
}
```

### Minimal mapping notes (raw → payload)

- **Investor logo**:
  - Raw: `Investor._linkedin_data_of_new_company.linkedin_logo` (base64)
  - PDF payload: include both `logo_base64_jpeg` and optionally `logo_data_uri`
- **LinkedIn URL**:
  - Prefer: `Get_new_company/:id → Company.linkedin_data.LinkedIn_URL`
  - Fallback: `Company._linkedin_data_of_new_company.LinkedIn_URL`
  - Last fallback: `Investor._linkedin_data_of_new_company.LinkedIn_URL`
- **Portfolio sectors**:
  - Raw may be a JSON string; parse to array
  - UI shows first 3 sector names (and ellipsis)
- **Corporate events advisors**:
  - Normalize `advisor_company_id/name` into `advisor_company: {id,name}`
- **Corporate events “Parties”/deal metrics**:
  - The UI derives these from `targets`, `target_counterparty`, `other_counterparties`, and `investment_data`/`ev_data`.
  - For PDF, either:
    - replicate the same derivation logic in your renderer, or
    - precompute `parties_display` and `deal_metrics_display` fields in the payload.

