# Company Page API Endpoints

This document lists all API endpoints used for data fetching on the dynamic company page (`/company/[param]/page.tsx`).

## Base URL
```
https://xdil-abvj-o7rq.e2.xano.io
```

---

## 1. Get Company Data (Primary)
**Endpoint:** `GET /api:GYQcK4au/Get_new_company/{id}`

**Fallback:** `POST /api:GYQcK4au/Get_new_company/{id}`

**Description:** Fetches the main company data including:
- Company basic info (name, description, year founded, website, etc.)
- Location data
- Sectors (primary/secondary)
- Revenue, EBITDA, EV data
- Ownership type
- Lifecycle stage
- Employee count data
- LinkedIn data
- Management roles (current/past)
- Subsidiaries data
- Parent company data
- Income statement data
- Investors data
- Corporate events (embedded in response)
- New sectors data

**Authentication:** Optional (Bearer token if available)

**Request Methods:**
- Primary: `GET` with company ID in URL path
- Fallback: `POST` with body containing one of:
  - `{ new_company_id: number }`
  - `{ company_id: number }`
  - `{ id: number }`

**Request Example (GET):**
```http
GET https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/12345
Headers:
  Content-Type: application/json
  Accept: application/json
  Authorization: Bearer {token} (optional)
```

**Request Example (POST Fallback):**
```json
{
  "new_company_id": 12345
}
```
or
```json
{
  "company_id": 12345
}
```
or
```json
{
  "id": 12345
}
```

**Response Example:**
```json
{
  "Company": {
    "id": 12345,
    "name": "Example Company Inc.",
    "description": "A leading technology company specializing in...",
    "year_founded": 2010,
    "_years": {
      "Year": 2010
    },
    "url": "https://example.com",
    "_linkedin_data_of_new_company": {
      "linkedin_logo": "base64_encoded_image_string"
    },
    "linkedin_data": {
      "LinkedIn_URL": "https://www.linkedin.com/company/example",
      "LinkedIn_Employee": 500,
      "LinkedIn_Emp__Date": "2024-01-15",
      "linkedin_logo": "base64_encoded_image_string"
    },
    "_locations": {
      "City": "San Francisco",
      "State__Province__County": "California",
      "Country": "United States"
    },
    "_ownership_type": {
      "ownership": "Private"
    },
    "sectors_id": [
      {
        "Sector_importance": "Primary",
        "sector_name": "Software",
        "sector_id": 100
      },
      {
        "Sector_importance": "Secondary",
        "sector_name": "Cloud Computing",
        "sector_id": 101
      }
    ],
    "revenues": {
      "revenues_m": "50000",
      "rev_source": "2",
      "years_id": 2023,
      "revenues_currency": "USD",
      "_currency": {
        "Currency": "USD"
      },
      "_years": {
        "Year": 2023
      }
    },
    "EBITDA": {
      "EBITDA_m": "10000"
    },
    "ev_data": {
      "ev_value": "500000",
      "_years": {
        "Year": 2023
      },
      "_currency": {
        "Currency": "USD"
      }
    },
    "_companies_employees_count_monthly": [
      {
        "date": "2024-01-01",
        "employees_count": 450
      },
      {
        "date": "2024-02-01",
        "employees_count": 500
      }
    ],
    "Lifecycle_stage": {
      "Lifecycle_Stage": "Growth"
    },
    "Former_name": ["Old Company Name"],
    "investors": [
      {
        "id": 67890,
        "name": "Investor Fund",
        "url": "https://investor.com",
        "_is_that_investor": true
      }
    ],
    "investors_new_company": [
      {
        "id": 67890,
        "name": "Investor Fund"
      }
    ],
    "new_sectors_data": [
      {
        "sectors_payload": "{\"primary_sectors\":[{\"id\":100,\"sector_name\":\"Software\"}],\"secondary_sectors\":[{\"id\":101,\"sector_name\":\"Cloud Computing\"}]}"
      }
    ],
    "income_statement": [
      {
        "income_statements": [
          {
            "id": 1,
            "period_display_end_date": "2023-12-31",
            "period_end_date": "2023-12-31",
            "revenue": 50000000000,
            "ebit": 8000000000,
            "ebitda": 10000000000,
            "cost_of_goods_sold_currency": "USD"
          }
        ]
      }
    ]
  },
  "have_parent_company": {
    "have_parent_companies": false,
    "Parant_companies": []
  },
  "have_subsidiaries_companies": {
    "have_subsidiaries_companies": true,
    "Subsidiaries_companies": [
      {
        "id": 11111,
        "name": "Subsidiary Company",
        "description": "A subsidiary company",
        "sectors_id": [
          {
            "sector_name": "Software",
            "Sector_importance": "Primary"
          }
        ],
        "_locations": {
          "City": "New York",
          "State__Province__County": "New York",
          "Country": "United States"
        },
        "_linkedin_data_of_new_company": {
          "linkedin_employee": 50,
          "linkedin_logo": "base64_encoded_image_string"
        }
      }
    ]
  },
  "Managmant_Roles_current": [
    {
      "id": 1,
      "Individual_text": "John Doe",
      "individuals_id": 1001,
      "Status": "Current",
      "job_titles_id": [
        {
          "id": 1,
          "job_title": "CEO"
        }
      ]
    }
  ],
  "Managmant_Roles_past": [],
  "new_counterparties": [
    {
      "items": "[{\"id\":1,\"deal_type\":\"Acquisition\",\"description\":\"Company acquired XYZ\",\"announcement_date\":\"2024-01-15\",\"target_company\":{\"id\":22222,\"name\":\"Target Company\",\"page_type\":\"company\"}}]"
    }
  ],
  "investors_data": [
    {
      "items": "{\"current\":[{\"name\":\"Investor Fund\",\"investor_id\":67890,\"new_company_id\":12345}],\"past\":[]}"
    }
  ]
}
```

**Response Type:** `CompanyResponse`

**Function:** `requestCompany(id: string)` (lines 986-1042)

---

## 2. Get Corporate Events
**Endpoint:** `GET /api:y4OAXSVm/Get_investors_corporate_events`

**Query Parameters:**
- `new_company_id` (required): Company ID

**Description:** Fetches corporate events related to the company including:
- Deal types
- Target companies
- Buyers/Investors
- Sellers
- Advisors
- Deal amounts and EV data
- Announcement dates

**Authentication:** Required (Bearer token)

**Request Example:**
```http
GET https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/Get_investors_corporate_events?new_company_id=12345
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

**Response Example (New Format):**
```json
{
  "new_counterparties": [
    {
      "items": [
        {
          "id": 1,
          "deal_type": "Acquisition",
          "description": "Company acquired Target Corp",
          "announcement_date": "2024-01-15",
          "target_company": {
            "id": 22222,
            "name": "Target Corp",
            "page_type": "company"
          },
          "targets": [
            {
              "id": 22222,
              "name": "Target Corp",
              "page_type": "company",
              "counterparty_announcement_url": "https://example.com/announcement"
            }
          ],
          "target_label": "Target:",
          "buyer_investor_label": "Buyer(s) / Investor(s):",
          "buyers": [
            {
              "id": 12345,
              "name": "Acquirer Company",
              "page_type": "company",
              "counterparty_announcement_url": null
            }
          ],
          "investors": [
            {
              "id": 67890,
              "name": "Investment Fund",
              "page_type": "investor",
              "counterparty_announcement_url": null
            }
          ],
          "sellers": [],
          "other_counterparties": [
            {
              "id": 12345,
              "name": "Acquirer Company",
              "page_type": "company",
              "counterparty_id": 12345,
              "is_data_analytics": false,
              "counterparty_status": "acquirer",
              "counterparty_type_id": 1,
              "counterparty_announcement_url": null
            }
          ],
          "advisors": [
            {
              "id": 1,
              "advisor_company": {
                "id": 33333,
                "name": "Advisor Bank"
              },
              "announcement_url": "https://example.com/advisor",
              "new_company_advised": 12345,
              "counterparty_advised": 22222,
              "_new_company": {
                "id": 33333,
                "name": "Advisor Bank"
              }
            }
          ],
          "advisors_names": ["Advisor Bank"],
          "ev_display": "USD 500m",
          "investment_display": "USD 200m",
          "this_company_status": "acquirer"
        }
      ]
    }
  ],
  "New_Events_Wits_Advisors": [
    {
      "id": 1,
      "description": "Company acquired Target Corp",
      "announcement_date": "2024-01-15",
      "deal_type": "Acquisition",
      "ev_data": {
        "enterprise_value_m": "500",
        "ev_band": "500m-1b",
        "_currency": {
          "Currency": "USD"
        }
      },
      "0": [
        {
          "_new_company": {
            "id": 22222,
            "name": "Target Corp",
            "_is_that_investor": false
          }
        }
      ],
      "1": [
        {
          "_new_company": {
            "name": "Advisor Bank"
          }
        }
      ]
    }
  ]
}
```

**Response Example (Legacy Format):**
```json
{
  "New_Events_Wits_Advisors": [
    {
      "id": 1,
      "description": "Company acquired Target Corp",
      "announcement_date": "2024-01-15",
      "deal_type": "Acquisition",
      "ev_data": {
        "enterprise_value_m": "500",
        "ev_band": "500m-1b",
        "currency": {
          "Currency": "USD"
        }
      },
      "0": [
        {
          "_new_company": {
            "id": 22222,
            "name": "Target Corp",
            "_is_that_investor": false
          }
        }
      ],
      "1": [
        {
          "_new_company": {
            "name": "Advisor Bank"
          }
        }
      ]
    }
  ]
}
```

**Response Types:**
- New format: `NewCorporateEventsEnvelope` with `new_counterparties` array
- Legacy format: `LegacyCorporateEventsEnvelope` with `New_Events_Wits_Advisors` array

**Function:** `fetchCorporateEvents()` (lines 1044-1142)

**Note:** Also attempts to parse corporate events from the main company API response (embedded in `new_counterparties` field)

---

## 3. Get Company Articles (Insights & Analysis)
**Endpoint:** `GET /api:GYQcK4au/companies_articles`

**Query Parameters:**
- `new_company_id` (required): Company ID

**Description:** Fetches related content articles for the company

**Authentication:** Not required (public endpoint)

**Request Example:**
```http
GET https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/companies_articles?new_company_id=12345
```

**Response Example:**
```json
[
  {
    "id": 1001,
    "created_at": 1704067200,
    "Publication_Date": "2024-01-15",
    "Headline": "Example Company Raises $50M Series B",
    "Strapline": "Leading software company secures funding",
    "Content_Type": "Article",
    "Body": "<p>Example Company Inc. announced today...</p>",
    "sectors": [
      [
        {
          "id": 100,
          "sector_name": "Software"
        }
      ]
    ],
    "companies_mentioned": [
      {
        "id": 12345,
        "name": "Example Company Inc.",
        "locations_id": 1,
        "_locations": {
          "City": "San Francisco",
          "State__Province__County": "California",
          "Country": "United States"
        }
      }
    ],
    "Visibility": "Public",
    "Related_Documents": [
      {
        "access": "public",
        "path": "/documents/article_1001.pdf",
        "name": "Article Document",
        "type": "file",
        "size": 1024000,
        "mime": "application/pdf",
        "meta": {
          "validated": true
        },
        "url": "https://example.com/documents/article_1001.pdf"
      }
    ]
  },
  {
    "id": 1002,
    "created_at": 1703980800,
    "Publication_Date": "2024-01-14",
    "Headline": "Example Company Expands Operations",
    "Strapline": "Company opens new office in New York",
    "Content_Type": "News",
    "Body": "<p>Example Company Inc. announced the opening...</p>",
    "sectors": [
      [
        {
          "id": 100,
          "sector_name": "Software"
        }
      ]
    ],
    "companies_mentioned": [
      {
        "id": 12345,
        "name": "Example Company Inc.",
        "locations_id": 1,
        "_locations": {
          "City": "San Francisco",
          "State__Province__County": "California",
          "Country": "United States"
        }
      }
    ],
    "Visibility": "Public",
    "Related_Documents": []
  }
]
```

**Response Type:** `ContentArticle[]`

**Function:** `fetchCompanyArticles(companyIdForContent: string | number)` (lines 1144-1170)

---

## 4. Get Financial Metrics
**Endpoint:** `GET /api:GYQcK4au/company_financial_metrics`

**Query Parameters:**
- `new_company_id` (required): Company ID

**Fallback:** `POST /api:GYQcK4au/company_financial_metrics`

**Description:** Fetches detailed financial metrics including:
- Revenue, EBITDA, EV (with sources)
- Revenue multiple
- Revenue growth
- EBITDA margin
- Rule of 40
- Subscription metrics (ARR, Churn, GRR, Upsell, Cross-sell, Price increase, Revenue expansion, NRR, New client growth)
- Other metrics (EBIT, Number of clients, Revenue per client, Number of employees, Revenue per employee)

**Authentication:** Required (Bearer token)

**Request Example (GET):**
```http
GET https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/company_financial_metrics?new_company_id=12345
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
  Accept: application/json
```

**Request Example (POST Fallback):**
```json
{
  "new_company_id": 12345
}
```
or
```json
{
  "company_id": 12345
}
```
or
```json
{
  "id": 12345
}
```

**Response Example:**
```json
{
  "id": 1,
  "new_company_id": 12345,
  "Financial_Year": 2023,
  "FY_YE_Month_Dec_default": "December",
  "Rev_Currency": "USD",
  "Revenue_m": 50000,
  "Revenue_source_label": "Public",
  "Rev_source": 1,
  "ARR_pc": 85,
  "ARR_currency": "USD",
  "ARR_m": 42500,
  "ARR_source_label": "Proprietary",
  "ARR_source": 2,
  "Churn_pc": 5,
  "Churn_source_label": "Proprietary",
  "Churn_Source": 2,
  "GRR_pc": 95,
  "GRR_source_label": "Proprietary",
  "GRR_source": 2,
  "Upsell_pc": 15,
  "Upsell_source_label": "Proprietary",
  "Upsell_source": 2,
  "Cross_sell_pc": 10,
  "Cross_sell_source_label": "Proprietary",
  "Cross_sell_source": 2,
  "Price_increase_pc": 8,
  "Price_increase_source_label": "Proprietary",
  "Price_increase_source": 2,
  "Rev_expansion_pc": 20,
  "Rev_expansion_source_label": "Proprietary",
  "Rev_expansion_source": 2,
  "NRR": 120,
  "NRR_source_label": "Proprietary",
  "NRR_source": 2,
  "New_client_growth_pc": 25,
  "New_client_growth_source_label": "Proprietary",
  "New_Client_Growth_Source": 2,
  "Rev_Growth_PC": 30,
  "Rev_growth_source_label": "Public",
  "Rev_Growth_source": 1,
  "EBITDA_margin": 20,
  "EBITDA_margin_source_label": "Estimate",
  "EBITDA_margin_source": 4,
  "EBITDA_currency": "USD",
  "EBITDA_m": 10000,
  "EBITDA_source_label": "Public",
  "EBITDA_source": 1,
  "Rule_of_40": 50,
  "Rule_of_40_source_label": "Estimate",
  "Rule_of_40_source": 4,
  "Revenue_multiple": 10.5,
  "Revenue_multiple_source_label": "Estimate",
  "Rev_x_source": 4,
  "EV_currency": "USD",
  "EV": 500000,
  "EV_source_label": "Public",
  "EV_source": 1,
  "EBIT_currency": "USD",
  "EBIT_m": 8000,
  "EBIT_source_label": "Public",
  "EBIT_source": 1,
  "No_of_Clients": 1000,
  "No_of_Clients_source_label": "Proprietary",
  "No_Clients_source": 2,
  "Rev_per_client": 50000,
  "Rev_per_client_source_label": "Proprietary",
  "Rev_per_client_source": 2,
  "No_Employees": 500,
  "No_Employees_source_label": "Public",
  "No_Employees_source": 1,
  "Revenue_per_employee": 100000,
  "Revenue_per_employee_source_label": "Estimate",
  "Rev_per_employee_source": 4,
  "Data_entry_notes": "Updated Q4 2023"
}
```

**Note:** The API may return a single object or an array. If an array is returned, the first item is used.

**Response Type:** `CompanyFinancialMetrics | CompanyFinancialMetrics[]` (returns first item if array)

**Function:** `fetchFinancialMetrics(id: string | number)` (lines 1172-1229)

---

## 5. Verify Investor Status
**Endpoint:** `GET /api:y4OAXSVm/get_the_investor_new_company`

**Query Parameters:**
- `new_comp_id` (required): Entity ID to verify

**Description:** Verifies if an entity is an investor by checking for:
- Investor object
- Focus array
- Invested_DA_sectors

**Authentication:** Optional (Bearer token if available)

**Request Example:**
```http
GET https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_the_investor_new_company?new_comp_id=67890
Headers:
  Content-Type: application/json
  Accept: application/json
  Authorization: Bearer {token} (optional)
```

**Response Example (Is Investor):**
```json
{
  "Investor": {
    "id": 67890,
    "name": "Investment Fund",
    "Focus": [
      {
        "id": 1,
        "focus_name": "Software"
      }
    ],
    "Invested_DA_sectors": [
      {
        "id": 100,
        "sector_name": "Software"
      }
    ]
  }
}
```

**Response Example (Not Investor):**
```json
{}
```
or
```json
{
  "Company": {
    "id": 67890,
    "name": "Regular Company"
  }
}
```

**Response Logic:** 
- Returns `true` if response contains `Investor` object OR `Focus` array OR `Invested_DA_sectors`
- Returns `false` otherwise

**Function:** `verifyIsInvestorViaApi(id: number, headers: Record<string, string>, signal?: AbortSignal)` (lines 947-971)

**Usage:** Used in `useEffect` (lines 1464-1533) to determine correct routing for investor entities (`/investors/{id}` vs `/company/{id}`)

---

## 6. Get Investor/Company Metadata (for Routing)
**Endpoint:** `GET /api:GYQcK4au/Get_new_company/{id}`

**Description:** Used to fetch minimal metadata for each investor/company entity to determine correct routing target. This is the same endpoint as #1 but used specifically for routing resolution.

**Authentication:** Optional (Bearer token if available)

**Request Example:**
```http
GET https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/67890
Headers:
  Content-Type: application/json
  Accept: application/json
  Authorization: Bearer {token} (optional)
```

**Response Example (Company):**
```json
{
  "Company": {
    "id": 67890,
    "name": "Regular Company",
    "primary_business_focus_id": [50],
    "sectors_id": [
      {
        "Sector_importance": "Primary",
        "sector_name": "Manufacturing",
        "sector_id": 200
      }
    ]
  }
}
```

**Response Example (Investor):**
```json
{
  "Company": {
    "id": 67890,
    "name": "Investment Fund",
    "primary_business_focus_id": [74],
    "sectors_id": [
      {
        "Sector_importance": "Primary",
        "sector_name": "Venture Capital",
        "sector_id": 23877
      }
    ]
  }
}
```

**Routing Logic:**
- If `primary_business_focus_id` includes `74` (Financial Services) AND `sectors_id` includes investor sector IDs (23877, 23699, 23253, etc.) → Route to `/investors/{id}`
- Otherwise → Route to `/company/{id}`
- If route suggests company page, double-check via `verifyIsInvestorViaApi()` and override if confirmed investor

**Usage:** Called in parallel for all investors listed in the company (lines 1490-1517) to:
1. Get entity metadata
2. Determine route using `decideEntityRoute()` function
3. Double-check investor status via `verifyIsInvestorViaApi()` if route suggests company page

**Function:** Called within `useEffect` hook (lines 1464-1533)

---

## API Call Flow

1. **Initial Load:**
   - `requestCompany()` - Fetches main company data
   - `fetchCorporateEvents()` - Fetches corporate events (if authenticated)
   - `fetchCompanyArticles()` - Fetches related articles
   - `fetchFinancialMetrics()` - Fetches financial metrics (if authenticated)

2. **After Company Data Loads:**
   - Parse embedded data from company response:
     - Corporate events from `new_counterparties`
     - Investors from `investors_data`
     - Management roles from root-level fields
     - Subsidiaries from `have_subsidiaries_companies`

3. **Investor Routing Resolution:**
   - For each investor in the company:
     - Fetch entity metadata via `Get_new_company/{id}`
     - Determine route using business focus and sectors
     - Verify investor status if needed via `get_the_investor_new_company`

---

## Authentication

Most endpoints use optional authentication:
- Token stored in: `localStorage.getItem("asymmetrix_auth_token")`
- Header format: `Authorization: Bearer {token}`
- If no token, some endpoints are skipped (corporate events, financial metrics)
- Public endpoints (articles) work without authentication

---

## Error Handling

- All API calls include try-catch blocks
- Failed requests are handled gracefully (empty arrays, null values)
- GET requests have POST fallbacks for some endpoints
- Timeout protection (20 seconds) on main company fetch
- AbortController used for investor routing resolution to prevent race conditions

---

## Notes

- The main company endpoint (`Get_new_company`) embeds some data that can also be fetched separately:
  - Corporate events (also available via `Get_investors_corporate_events`)
  - Investors data (embedded in response)
- Multiple fallback strategies are used for robustness
- Some endpoints return data in both new and legacy formats (handled via type guards)

