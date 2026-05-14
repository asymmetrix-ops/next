# V3 cards — per-card source (React ES modules)

Every card from the V3 Summary layout, split into its own `.jsx` file with
proper `import` / `export default`. Drop the folder into any React project
(Vite, Next, CRA — anything that handles `.jsx`).

## Quick start

```jsx
import OverviewCard from './cards/OverviewCard.jsx';
// or via the barrel
import { OverviewCard, FinMetricsIncomeCard } from './cards';

export default function App() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      <OverviewCard />
      <FinMetricsIncomeCard />
    </div>
  );
}
```

The cards render mock Morningstar data straight from `tokens.jsx`. To wire
them to real data, edit `COMPANY` in `tokens.jsx` — or refactor each card
to take props (each card consumes a single `c = COMPANY` reference at the
top, so the change is one line per card).

## Layout (V3 grid)

```
┌────────────────┬────────────────┬────────────────┐
│ OverviewCard   │ DescriptionCard│ FinMetrics-    │   row 1
│                │                │ IncomeCard ▤   │
├────────────────┴────────────────┼────────────────┤
│ InsightsCard            (2 col) │ SubscriptionCd │   row 2
├────────────────┬────────────────┼────────────────┤
│ ProductData-   │ ProductUsers-  │ RevenueModel-  │   row 3
│ Toggle ▤       │ Card           │ Card           │
├────────────────┴────────────────┼────────────────┤
│ EventsCard              (2 col) │ HeadcountCard  │   row 4
├────────────────┬────────────────┼────────────────┤
│ SubsCard                (2 col) │ ManagementCard │   row 5
└────────────────┴────────────────┴────────────────┘

▤ = tabbed (multi-view) card
```

## Files

| File | Default export | What it shows |
|---|---|---|
| `tokens.jsx` | named: `T`, `COMPANY` | Design tokens + mock company data |
| `shared.jsx` | named: `Pill`, `KV`, `Logo`, `Spark` | Cross-card primitives |
| `_helpers.jsx` | named: `SUMMARY_LINKS`, `Delta`, `LinkedH`, `LinkPanel`, `WeightChip`, `PctBar`, `MiniKV`, `TagRow` | Internal helpers |
| `OverviewCard.jsx` | `OverviewCard` | Sector tags + key facts |
| `DescriptionCard.jsx` | `DescriptionCard` | Long-form description |
| `FinMetricsIncomeCard.jsx` | `FinMetricsIncomeCard` | 3-tab: Metrics · Peers · Income |
| `InsightsCard.jsx` | `InsightsCard` | Two latest insights + pager |
| `SubscriptionCard.jsx` | `SubscriptionCard` | ARR / NRR / GDR mini-rows |
| `ProductDataToggle.jsx` | `ProductDataToggle` | 2-tab: Product type ⇆ Data collection |
| `ProductUsersCard.jsx` | `ProductUsersCard` | Accordion of user segments |
| `RevenueModelCard.jsx` | `RevenueModelCard` | Revenue streams, Main/Minor |
| `EventsCard.jsx` | `EventsCard` | Corporate events table |
| `HeadcountCard.jsx` | `HeadcountCard` | Headline count + SVG line chart |
| `SubsCard.jsx` | `SubsCard` | Subsidiaries table with sparklines |
| `ManagementCard.jsx` | `ManagementCard` | Top 3 management table |
| `index.jsx` | barrel | Re-exports everything above |

## Dependency graph

```
tokens.jsx                (no deps)
shared.jsx       → tokens.jsx
_helpers.jsx     → tokens.jsx, shared.jsx
<Card>.jsx       → tokens.jsx, shared.jsx (some), _helpers.jsx
```

Each card file's header comment lists its specific imports.

## Notes

- Every card is a pure React component — no `window.*` globals, no
  side-effects, no host bridge. Safe for SSR.
- Mouse-hover state lives in local `useState`, no global stores.
- Cards intentionally render `width: 100%; height: 100%` so they fill
  whatever grid cell or flex container you place them in.
- `HeadcountCard` uses `React.useId()` for its SVG gradient `id` to stay
  unique across multiple instances on the same page.
- Hex/oklch colors are hard-coded in `tokens.jsx`. If you have a real
  design-token pipeline, swap `T` for your token import.
