export const CORPORATE_EVENTS_LIST_TABLE_STYLES = `
  .corporate-events-list-section .company-table-scroll {
    overflow-x: hidden;
  }
  .corporate-events-list-section .company-table {
    width: 100%;
    table-layout: fixed;
    min-width: 0;
  }
  .corporate-events-list-section .company-table th,
  .corporate-events-list-section .company-table td {
    white-space: normal;
    vertical-align: top;
  }
  .corporate-events-list-section .company-table-cell-wrap {
    max-width: none;
  }
  .corporate-events-list-section .company-table-event-cell .company-name,
  .corporate-events-list-section .company-table-event-cell .link-blue {
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    display: inline;
  }
  .corporate-events-list-section .company-table-target-cell .company-table-entity-subtitle {
    white-space: normal;
    word-break: break-word;
  }
  .corporate-events-list-section .company-table-parties-cell .muted-row,
  .corporate-events-list-section .company-table-advisors-cell {
    font-size: 13px;
    line-height: 1.4;
    color: #0f172a;
  }
  .corporate-events-list-section .company-table-parties-cell .muted-row {
    margin: 2px 0;
  }
  .corporate-events-list-section .company-table-parties-cell .muted-row strong,
  .corporate-events-list-section .company-table-advisors-cell .search-multi-value-cell {
    font-size: inherit;
  }
  .corporate-events-list-section .company-table-advisor-entry {
    margin-bottom: 6px;
  }
  .corporate-events-list-section .company-table-advisor-entry:last-child {
    margin-bottom: 0;
  }
  .corporate-events-list-section .company-table-advisor-individuals {
    margin-top: 2px;
    padding-left: 8px;
    font-size: 12px;
    line-height: 1.35;
    color: #64748b;
  }
`;
