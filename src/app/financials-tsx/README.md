# Asymmetrix — Financials (TSX)

Build-ready TypeScript React components for the Financials screener section.

## Files

| File | Description |
|---|---|
| `types.ts` | All shared TypeScript interfaces (FinRow, ColumnDef, Tweaks, etc.) |
| `financials-data.ts` | Company dataset, filter definitions, periods, currencies, sector median |
| `financials-columns.ts` | Column category inventory for the Control Room modal |
| `financials-table.tsx` | FinancialsTable, Cell, Sparkline, buildColumns — the visible table |

## Usage

```tsx
import { FIN_ROWS, FIN_COLUMN_DEFAULT_VISIBILITY, FIN_COLUMN_ORDER } from './financials-data';
import { FinancialsTable } from './financials-table';

// column visibility state lives in your parent
const [columnVisibility, setColumnVisibility] = useState(FIN_COLUMN_DEFAULT_VISIBILITY);
const visibleColumnIds = FIN_COLUMN_ORDER.filter(id => columnVisibility[id]);

const tweaks: Tweaks = {
  sectionName: 'Financials',
  showMedian: false,
  colorMultiples: false,
  chipStyle: 'neutral',
  chipIcon: true,
  density: 'comfortable',
};

<FinancialsTable
  rows={FIN_ROWS}
  tweaks={tweaks}
  currencySymbol="$"
  sortId="revenue"
  sortDir="desc"
  onSort={(id) => { /* update sort state */ }}
  visibleColumnIds={visibleColumnIds}
/>
```

## CSS tokens required

The components reference CSS custom properties from the Asymmetrix design system.
Link `colors_and_type.css` (included) into your app's entry point:

```css
@import './colors_and_type.css';
```

## Notes

- The Control Room modal (`columns-modal.jsx`) is not yet converted to TSX —
  a TypeScript version is in progress.
- Filter bar components (`filter-bar`, `filter-picker`, `filter-editors`) are
  separate and available on request.
