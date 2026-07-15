export const COMPANY_TABLE_STYLES = `
  .company-section {
    width: 100%;
  }
  .company-table-scroll {
    overflow-x: auto;
    width: 100%;
  }
  .company-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }
  .company-table th {
    text-align: left;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
    user-select: none;
  }
  .company-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
    font-size: 14px;
    color: #000;
    line-height: 1.5;
  }
  .company-table-cell-wrap {
    white-space: normal;
    word-break: break-word;
  }
  .company-table-th-sortable {
    cursor: pointer;
  }
  .company-table-th-draggable {
    cursor: grab;
  }
  .company-table-th-dragging {
    opacity: 0.45;
  }
  .company-table-th-drag-over {
    box-shadow: inset 0 -2px 0 #0f172a;
  }
  .company-table-sticky-frozen,
  .company-table-sticky-logo {
    position: sticky;
    z-index: 3;
    background: #fff;
    box-shadow: 2px 0 4px rgba(15, 23, 42, 0.06);
  }
  .company-table thead th.company-table-sticky-frozen,
  .company-table thead th.company-table-sticky-logo {
    z-index: 7;
    background: #f9fafb;
  }
  .company-logo-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 60px;
  }
  .company-logo {
    width: 60px;
    height: 40px;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  .company-logo-placeholder {
    width: 60px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #718096;
    background: #f1f5f9;
    border-radius: 8px;
  }
  .company-name {
    color: #0075df;
    text-decoration: underline;
    cursor: pointer;
    font-weight: 500;
  }
  .company-description-truncated {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .expand-description {
    color: #0075df;
    text-decoration: underline;
    cursor: pointer;
    font-size: 12px;
    margin-top: 4px;
    display: block;
  }
  .company-table-col-follow {
    min-width: 120px;
    text-align: center;
  }
  .company-table th.company-table-col-follow,
  .company-table td.company-table-col-follow {
    text-align: center;
  }
  .company-follow-cell {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .company-table th.company-table-col-name,
  .company-table td.company-table-col-name {
    max-width: 280px;
    width: 280px;
  }
  .company-table-col-name .company-table-entity-name,
  .company-table-col-name .company-name {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    word-break: normal;
    overflow-wrap: anywhere;
  }
`;
