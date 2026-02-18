# Advisor Dynamic Page — Dataset (POST Payload)

This document defines a **normalized dataset** representing *all data rendered/used* on the dynamic Advisor page (`/advisor/[id]`), suitable to send to an external service via a single `POST` call (**one payload = one page snapshot**).

> Goal: external systems can ingest the Advisor page’s complete data without needing to replicate internal APIs.

---

## POST contract (suggested)

- **Method**: `POST`
- **Path**: `/external/advisor-page-snapshot` (example)
- **Headers**: `Content-Type: application/json`
- **Body**: JSON payload defined below

---

## Payload schema (normalized)

```json
{
  "schema_version": "1.0.0",
  "captured_at": "2026-02-18T14:22:11.123Z",
  "source": {
    "app": "asymmetrix-nextjs",
    "environment": "develop",
    "page_path": "/advisor/6927",
    "page_url": "https://www.asymmetrixintelligence.com/advisor/6927",
    "advisor_id": 6927
  },
  "advisor": {
    "id": 6927,
    "name": "Example Advisor Co",
    "description": "Long-form advisor description…",
    "website_url": "https://example.com",
    "year_founded_display": "2008",
    "hq": {
      "city": "London",
      "state_province_county": "Greater London",
      "country": "United Kingdom",
      "formatted": "London, Greater London, United Kingdom"
    },
    "linkedin": {
      "logo_base64_jpeg": "/9j/4AAQSkZJRgABAQAAAQABAAD…",
      "employee_count": 1830,
      "employee_count_date": "2025-12",
      "linkedin_url": "https://www.linkedin.com/company/example/"
    },
    "portfolio_companies_count": 42
  },
  "deals_advised": {
    "total_count": 199,
    "filtered_count": 12,
    "active_filters": {
      "primary_sector_ids": [12, 31],
      "secondary_sector_ids": [105]
    },
    "items": [
      {
        "id": 12345,
        "description": "Advised on acquisition of …",
        "announcement_date": "2025-09-10",
        "announcement_date_display": "September 10, 2025",
        "deal_type": "M&A",
        "company_advised": {
          "id": 777,
          "name": "Client Co",
          "role": "Investor"
        },
        "enterprise_value": {
          "value_m": "120",
          "currency_name": "USD",
          "formatted": "USD120M"
        },
        "sectors": [
          {
            "id": 88,
            "sector_name": "Data Infrastructure",
            "sector_importance": "Primary",
            "is_derived": false
          }
        ],
        "advisor_individuals": [
          { "id": 9001, "name": "Jane Doe" }
        ],
        "other_advisors": [
          {
            "id": 55,
            "advisor_company_id": 222,
            "advisor_company_name": "Other Advisor LLP",
            "individuals_id": [101, 102]
          }
        ],
        "links": {
          "corporate_event_path": "/corporate-event/12345",
          "company_advised_path": "/investors/777"
        }
      }
    ]
  },
  "linkedin_history": {
    "monthly_employee_counts": [
      { "date": "2025-10", "employees_count": 1700 },
      { "date": "2025-11", "employees_count": 1760 },
      { "date": "2025-12", "employees_count": 1830 }
    ]
  },
  "advisor_people": {
    "current": [
      {
        "id": 1,
        "individual_id": 500,
        "name": "Jane Doe",
        "job_titles": ["Partner", "Head of D&A"]
      }
    ],
    "past": [
      {
        "id": 2,
        "individual_id": 501,
        "name": "John Smith",
        "job_titles": ["Associate"]
      }
    ],
    "sources": {
      "preferred": "linkedin_company_endpoint_roles",
      "fallbacks_used": ["advisor_profile_current", "advisor_profile_past", "advisor_profile_all"]
    }
  },
  "deal_filter_option_lists": {
    "primary_sectors": [
      { "id": 12, "sector_name": "Software" },
      { "id": 31, "sector_name": "Data & Analytics" }
    ],
    "secondary_sectors": [
      { "id": 105, "sector_name": "Data Infrastructure" }
    ]
  }
}
```

---

## Field reference

### Top-level

- **`schema_version`** *(string, required)*: Version of this payload contract.
- **`captured_at`** *(ISO string, required)*: UTC timestamp when snapshot was produced.
- **`source`** *(object, required)*: Where this snapshot came from.
- **`advisor`** *(object, required)*: Advisor profile data shown on page.
- **`deals_advised`** *(object, required)*: Deals list shown on page, including filter state.
- **`linkedin_history`** *(object, required)*: Monthly LinkedIn employee counts chart data.
- **`advisor_people`** *(object, required)*: “Advisors” (individuals) section: current/past.
- **`deal_filter_option_lists`** *(object, optional)*: Dropdown option lists for deal sector filters.

---

### `source`

- **`app`** *(string)*: Application identifier.
- **`environment`** *(string)*: e.g. `develop`, `production`.
- **`page_path`** *(string)*: Route path (e.g. `/advisor/6927`).
- **`page_url`** *(string)*: Full URL, if known.
- **`advisor_id`** *(number)*: Parsed from route param.

---

### `advisor`

Derived from `advisorData.Advisor` plus page-computed display fields.

- **`id`** *(number)*: Advisor id.
- **`name`** *(string)*: Advisor/company name.
- **`description`** *(string|null)*: Advisor description (may be long).
- **`website_url`** *(string|null)*: Advisor website URL.
- **`year_founded_display`** *(string)*: Display value from the page helper (may be `"Not available"`).
- **`hq`** *(object)*:
  - **`city`** *(string|null)*
  - **`state_province_county`** *(string|null)*
  - **`country`** *(string|null)*
  - **`formatted`** *(string)*: Concatenation used for UI.
- **`linkedin`** *(object)*:
  - **`logo_base64_jpeg`** *(string|null)*: Base64-encoded logo (as used by UI).
  - **`employee_count`** *(number|null)*: Current employee count when available.
  - **`employee_count_date`** *(string|null)*: `YYYY-MM` when available.
  - **`linkedin_url`** *(string|null)*: Company LinkedIn URL when available.
- **`portfolio_companies_count`** *(number)*: Count displayed as “Data & Analytics transactions advised”.

---

### `deals_advised`

Represents the “Deals Advised” section (table/cards) and sector filters.

- **`total_count`** *(number)*: Total deals available for this advisor (before filters).
- **`filtered_count`** *(number)*: Count of deals after applying sector filters.
- **`active_filters`** *(object)*:
  - **`primary_sector_ids`** *(number[])*: Selected primary sectors.
  - **`secondary_sector_ids`** *(number[])*: Selected sub-sectors.
- **`items`** *(array)*: Recommended: send the **filtered list** (matching the UI). If you prefer sending all deals, keep `filtered_count` and include a boolean like `items_are_filtered`.

Each deal item:

- **`id`** *(number)*: Corporate event id.
- **`description`** *(string|null)*: Deal description.
- **`announcement_date`** *(string|null)*: Raw date string (`YYYY-MM-DD`).
- **`announcement_date_display`** *(string)*: UI-formatted date (e.g. `September 10, 2025`).
- **`deal_type`** *(string|null)*: Deal type.
- **`company_advised`** *(object)*:
  - **`id`** *(number|null)*: Company advised id.
  - **`name`** *(string|null)*: Company advised name (displayed as “Client Name”).
  - **`role`** *(string|null)*: Role text (displayed as “Counterparty Advised”).
- **`enterprise_value`** *(object)*:
  - **`value_m`** *(string|number|null)*: Value in millions (raw).
  - **`currency_name`** *(string|null)*: e.g. `USD`, `GBP`.
  - **`formatted`** *(string)*: Display string used by UI.
- **`sectors`** *(array)*: Sector tags shown in “Sector(s)” column.
  - **`id`** *(number|null)*
  - **`sector_name`** *(string|null)*
  - **`sector_importance`** *(string|null)*: e.g. `"Primary"` or `"Secondary"`.
  - **`is_derived`** *(boolean|null)*: Derived tag indicator.
- **`advisor_individuals`** *(array)*: Individuals associated with the deal (names).
  - **`id`** *(number|null)*
  - **`name`** *(string|null)*
- **`other_advisors`** *(array)*: Other advisors listed on the deal.
  - **`id`** *(number|null)*
  - **`advisor_company_id`** *(number|null)*
  - **`advisor_company_name`** *(string|null)*
  - **`individuals_id`** *(number[]|null)*
- **`links`** *(object)*:
  - **`corporate_event_path`** *(string)*: `"/corporate-event/{id}"`
  - **`company_advised_path`** *(string|null)*: `"/company/{id}"` or `"/investors/{id}"`

---

### `linkedin_history`

- **`monthly_employee_counts`** *(array)*: History chart series.
  - **`date`** *(string)*: `YYYY-MM`
  - **`employees_count`** *(number)*

---

### `advisor_people`

Represents the “Advisors” section (current/past people). The page prefers role data returned by the LinkedIn/company endpoint, then falls back to advisor profile lists.

- **`current`** *(array)*
- **`past`** *(array)*

Person fields:

- **`id`** *(number)*: Role row id (or advisor-profile row id).
- **`individual_id`** *(number)*: Individual id.
- **`name`** *(string)*: Display name.
- **`job_titles`** *(string[])*: Job titles when available.

`sources`:

- **`preferred`** *(string)*: Always `"linkedin_company_endpoint_roles"` in this contract.
- **`fallbacks_used`** *(string[])*: Which fallback datasets were needed:
  - `advisor_profile_current`
  - `advisor_profile_past`
  - `advisor_profile_all`

---

### `deal_filter_option_lists` (optional)

If you want to include **everything the page loads**, include:

- **`primary_sectors`** *(array)*: Options list for the primary-sector filter.
- **`secondary_sectors`** *(array)*: Options list for the sub-sector filter (selection-dependent).

Each option:
- **`id`** *(number)*
- **`sector_name`** *(string)*

---

## Normalization rules (required)

Some backend fields may be delivered as either:
- a real array, OR
- a JSON-encoded string (e.g. `"[]"`, `"[{...}]"`)

Before sending the payload, normalize these to arrays:

- `deal.sectors` (source: `primary_sectors`)
- `deal.advisor_individuals`
- `deal.other_advisors`

Also recommended:
- trim all strings
- treat empty strings as `null` where relevant
- keep both raw and display fields for dates and enterprise values

---

## Minimal example (no deals / no history)

```json
{
  "schema_version": "1.0.0",
  "captured_at": "2026-02-18T14:22:11.123Z",
  "source": {
    "app": "asymmetrix-nextjs",
    "environment": "develop",
    "page_path": "/advisor/6927",
    "page_url": "https://www.asymmetrixintelligence.com/advisor/6927",
    "advisor_id": 6927
  },
  "advisor": {
    "id": 6927,
    "name": "Example Advisor Co",
    "description": null,
    "website_url": null,
    "year_founded_display": "Not available",
    "hq": { "city": null, "state_province_county": null, "country": null, "formatted": "" },
    "linkedin": { "logo_base64_jpeg": null, "employee_count": null, "employee_count_date": null, "linkedin_url": null },
    "portfolio_companies_count": 0
  },
  "deals_advised": {
    "total_count": 0,
    "filtered_count": 0,
    "active_filters": { "primary_sector_ids": [], "secondary_sector_ids": [] },
    "items": []
  },
  "linkedin_history": { "monthly_employee_counts": [] },
  "advisor_people": {
    "current": [],
    "past": [],
    "sources": { "preferred": "linkedin_company_endpoint_roles", "fallbacks_used": [] }
  },
  "deal_filter_option_lists": { "primary_sectors": [], "secondary_sectors": [] }
}
```

