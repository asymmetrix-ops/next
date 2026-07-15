import { SEARCH_MULTI_VALUE_STYLES } from "./SearchEntityMultiValueCell";

export const SEARCH_BULK_TOOLBAR_STYLES = `
    .search-bulk-action-toolbar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
      padding: 12px 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      font-size: 13px;
      color: #1e3a8a;
    }
    .search-bulk-action-toolbar-summary {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search-bulk-action-toolbar-count {
      font-weight: 600;
    }
    .search-bulk-action-toolbar-clear {
      background: transparent;
      border: none;
      color: #2563eb;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      padding: 0;
    }
    .search-bulk-action-toolbar-clear:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .search-bulk-action-toolbar-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 14px;
    }
    .search-bulk-action-toolbar-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .search-bulk-action-toolbar-label {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      white-space: nowrap;
    }
    .search-bulk-action-toolbar-btn {
      height: 32px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #0f172a;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .search-bulk-action-toolbar-btn:hover:not(:disabled) {
      background: #f8fafc;
    }
    .search-bulk-action-toolbar-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .search-bulk-action-toolbar-btn-primary {
      background: #0f172a;
      border-color: #0f172a;
      color: #fff;
    }
    .search-bulk-action-toolbar-btn-primary:hover:not(:disabled) {
      background: #1e293b;
    }
    .search-bulk-action-toolbar-select,
    .search-bulk-action-toolbar-input {
      height: 32px;
      padding: 0 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      font-size: 12px;
      color: #0f172a;
      min-width: 160px;
    }
    .search-bulk-action-toolbar-input {
      min-width: 140px;
    }
    .search-bulk-action-toolbar-progress {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .search-bulk-action-toolbar-progress-bar {
      flex: 1;
      height: 6px;
      background: #dbeafe;
      border-radius: 999px;
      overflow: hidden;
    }
    .search-bulk-action-toolbar-progress-fill {
      height: 100%;
      background: #2563eb;
      transition: width 0.2s ease;
    }
    .search-bulk-action-toolbar-progress-text {
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
    }
`;

export const SEARCH_TABLE_STYLES = `
    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: 4px;
    }
    .company-table-col-loading {
      background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .company-section {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow-x: hidden;
      padding: 16px 28px;
    }
    .company-section-embedded {
      padding: 16px 0;
    }
    .company-section-embedded .company-table-scroll {
      box-shadow: none;
      border-radius: 0;
    }
    .company-section-embedded .company-table {
      padding: 0;
      box-shadow: none;
      border-radius: 0;
    }
    .company-stats {
      background: #fff;
      padding: 16px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .stats-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 12px 0;
    }
    .stats-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }
    .stats-item {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .stats-item:last-child {
      border-bottom: none;
    }
    .stats-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
    }
    .stats-value {
      font-size: 16px;
      color: #000;
      font-weight: 600;
    }
    .company-table {
      width: max-content;
      min-width: 100%;
      background: #fff;
      padding: 16px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 8px;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: auto;
      font-size: 13px;
    }
    .company-table-scroll {
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
      max-width: 100%;
      max-height: min(72vh, calc(100vh - 240px));
      border-radius: 8px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      background: #fff;
    }
    .company-table-scroll .company-table {
      box-shadow: none;
      border-radius: 0;
      margin: 0;
    }
    .company-columns-button {
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #1a202c;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .company-columns-button.primary {
      border-color: #0075df;
      color: #0075df;
    }
    .company-table-cell-wrap {
      white-space: normal !important;
      word-break: break-word;
      overflow-wrap: break-word;
      max-width: 320px;
    }
    .company-table th.company-table-col-name,
    .company-table td.company-table-col-name,
    th.company-table-col-name,
    td.company-table-col-name {
      max-width: 280px;
      width: 280px;
    }
    .company-table-col-name .company-table-entity-name {
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
      word-break: normal;
      overflow-wrap: anywhere;
    }
    .company-table-select-cell {
      position: sticky;
      left: 0;
      z-index: 3;
      background: #fff;
      box-shadow: 1px 0 0 #e2e8f0;
    }
    .company-table tbody .company-table-select-cell input[type="checkbox"] {
      opacity: 0;
      transition: opacity 0.15s ease;
      cursor: pointer;
    }
    .company-table tbody tr:hover .company-table-select-cell input[type="checkbox"],
    .company-table tbody tr.company-table-row-selected .company-table-select-cell input[type="checkbox"],
    .company-table tbody .company-table-select-cell input[type="checkbox"]:focus-visible {
      opacity: 1;
    }
    .company-table thead .company-table-select-cell input[type="checkbox"] {
      cursor: pointer;
    }
    ${SEARCH_BULK_TOOLBAR_STYLES}
    .company-table thead .company-table-select-cell {
      z-index: 6;
    }
    .company-table td.company-table-sticky-frozen {
      background: #fff;
    }
    .company-table-entity-name-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .company-table-entity-name-text {
      min-width: 0;
      overflow: hidden;
    }
    .company-table-entity-name {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
      text-decoration: none;
    }
    .company-table-entity-name-link {
      cursor: pointer;
    }
    .company-table-entity-name-link:hover {
      color: #0f172a;
    }
    .company-table-entity-subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .edit-company-btn {
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      color: #0075df;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
    }
    .edit-company-btn:hover {
      background: #dbeafe;
      color: #0369a1;
    }
    .company-table th,
    .company-table td {
      padding: 8px 12px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      min-width: 120px;
      white-space: nowrap;
    }
    .company-table th {
      font-weight: 700;
      color: #64748b;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 4;
    }
    .company-table tbody tr:hover td {
      background: #f8fafc;
    }
    .company-table tbody tr:hover td.company-table-sticky-frozen,
    .company-table tbody tr:hover td.company-table-select-cell {
      background: #f8fafc;
    }
    .company-table-th-sortable {
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    .company-table-th-sortable:hover {
      background: #f1f5f9;
    }
    .company-table-th-draggable {
      cursor: grab;
    }
    .company-table-th-draggable:active {
      cursor: grabbing;
    }
    .company-table-th-dragging {
      opacity: 0.55;
    }
    .company-table-th-drag-over {
      box-shadow: inset 0 -3px 0 #0370aa;
      background: #eff6ff;
    }
    .company-table-sort-indicator {
      margin-left: 4px;
      font-size: 10px;
      color: #64748b;
    }
    .company-table-pin-indicator {
      display: inline-flex;
      align-items: center;
      margin-left: 4px;
      color: #94a3b8;
      vertical-align: middle;
    }
    .company-table th.company-table-col-follow,
    .company-table td.company-table-col-follow {
      text-align: center;
      min-width: 120px;
      max-width: 140px;
    }
    .company-table th.company-table-col-follow {
      z-index: 4;
      background: #f8fafc;
    }
    .company-table td.company-table-col-follow {
      position: relative;
      z-index: 0;
    }
    .company-follow-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
      z-index: 0;
    }
    .company-table-row-selected {
      background: #EFF6FF;
    }
    .company-table tr.company-table-row-selected > td.company-table-sticky-frozen,
    .company-table tr.company-table-row-selected > td.company-table-select-cell {
      background: #EFF6FF;
    }
    .company-table thead th.company-table-sticky-frozen {
      z-index: 7;
      background: #f8fafc;
    }
    .company-table td {
      font-size: 13px;
      color: #0f172a;
      line-height: 1.4;
    }
    .company-logo {
      width: 60px;
      height: 40px;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      vertical-align: middle;
      border-radius: 8px;
    }
    .company-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }
    .link-blue {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }
    .link-blue:hover {
      color: #005bb5;
    }
    .muted-row {
      font-size: 12px;
      color: #4a5568;
      margin: 4px 0;
    }
    .company-description {
      line-height: 1.4;
    }
    .company-long-text {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0 4px;
      max-width: 320px;
      line-height: 1.4;
    }
    .company-long-text-content {
      min-width: 0;
      flex: 1 1 auto;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .company-long-text-content-clamped {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .company-long-text-content-full {
      white-space: normal;
    }
    .company-long-text-toggle {
      flex: 0 0 auto;
      align-self: flex-end;
      background: none;
      border: none;
      padding: 0;
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }
    .company-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .expand-description {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-left: 4px;
      display: inline;
      white-space: nowrap;
    }
    .sectors-list {
      max-width: 300px;
      line-height: 1.3;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .error {
      text-align: center;
      padding: 20px;
      color: #e53e3e;
      background-color: #fed7d7;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      padding: 8px;
    }
    .pagination-button {
      padding: 8px 12px;
      border: none;
      background: none;
      color: #000;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      transition: color 0.2s;
      text-decoration: none;
    }
    .pagination-button:hover {
      color: #0075df;
    }
    .pagination-button.active {
      color: #0075df;
      text-decoration: underline;
      font-weight: 500;
    }
    .pagination-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      color: #666;
    }
    .pagination-nav {
      font-weight: 500;
      white-space: nowrap;
    }
    .pagination-ellipsis {
      padding: 8px 12px;
      color: #000;
      font-size: 14px;
    }
    .export-button { 
      background-color: #22c55e; 
      color: white; 
      font-weight: 600; 
      padding: 12px 24px; 
      border-radius: 8px; 
      border: none; 
      cursor: pointer; 
      margin: 16px 0; 
      font-size: 14px;
      transition: background-color 0.2s;
    }
    .export-button:hover { 
      background-color: #16a34a; 
    }
    .export-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    
    /* Mobile Card Layout */
    .company-cards {
      display: none;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
    }
    .company-card {
      background: #fff;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    .company-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .company-card-logo {
      width: 50px;
      height: 35px;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .company-card-logo-placeholder {
      width: 50px;
      height: 35px;
      background-color: #f7fafc;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #718096;
      flex-shrink: 0;
    }
    .company-card-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      line-height: 1.3;
      flex: 1;
    }
    .company-card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .company-card-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 14px;
      line-height: 1.4;
    }
    .company-card-label {
      color: #4a5568;
      font-weight: 500;
      min-width: 80px;
      flex-shrink: 0;
    }
    .company-card-value {
      color: #000;
      text-align: right;
      flex: 1;
      word-break: break-word;
    }
    .company-card-description {
      color: #000;
      line-height: 1.4;
      margin-top: 8px;
      font-size: 14px;
    }
    .company-card-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .company-card-expand {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }
    
    @media (max-width: 768px) {
      .company-table {
        display: none;
      }
      .company-cards {
        display: flex;
      }
      .pagination {
        gap: 4px;
      }
      .pagination-button {
        padding: 8px 10px;
      }
      .pagination-nav {
        flex: 1 1 88px;
        max-width: 120px;
      }
      .stats-column {
        grid-template-columns: 1fr !important;
        gap: 6px !important;
      }
      .filters-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .filters-card {
        padding: 12px !important;
      }
      .filters-card {
        padding: 12px !important;
      }
      .filters-heading {
        font-size: 18px !important;
        margin-bottom: 8px !important;
      }
      .filters-sub-heading {
        font-size: 14px !important;
        margin-bottom: 6px !important;
      }
      .filters-input {
        max-width: 100% !important;
      }
      .filters-button {
        max-width: 100% !important;
      }
    }
    
    @media (min-width: 769px) {
      .company-cards {
        display: none;
      }
      .company-table {
        display: table;
      }
    }
${SEARCH_MULTI_VALUE_STYLES}
`;
