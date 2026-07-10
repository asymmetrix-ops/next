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
      border-collapse: collapse;
      table-layout: auto;
    }
    .company-table-scroll {
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
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
    .company-table-select-cell {
      position: sticky;
      left: 0;
      z-index: 3;
      background: #fff;
      box-shadow: 1px 0 0 #e2e8f0;
    }
    .company-table thead .company-table-select-cell {
      z-index: 6;
    }
    .company-table td.company-table-sticky-frozen,
    .company-table td.company-table-sticky-logo {
      background: #fff;
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
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      min-width: 120px;
    }
    .company-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 4;
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
    .company-table-sticky-logo {
      min-width: 88px;
      max-width: 88px;
      width: 88px;
      text-align: left;
      vertical-align: top;
    }
    .company-table td.company-table-sticky-logo .company-logo-cell {
      width: 60px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .company-table td.company-table-sticky-logo .company-logo-placeholder {
      width: 60px;
      height: 40px;
      background-color: #f7fafc;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #718096;
    }
    .company-table th.company-table-col-follow,
    .company-table td.company-table-col-follow {
      text-align: left;
      min-width: 120px;
      max-width: 140px;
    }
    .company-table th.company-table-col-follow {
      z-index: 4;
      background: #f9fafb;
    }
    .company-table td.company-table-col-follow {
      position: relative;
      z-index: 0;
    }
    .company-follow-cell {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      text-align: left;
      position: relative;
      z-index: 0;
    }
    .company-table-row-selected {
      background: #EFF6FF;
    }
    .company-table tr.company-table-row-selected > td.company-table-sticky-frozen,
    .company-table tr.company-table-row-selected > td.company-table-sticky-logo,
    .company-table tr.company-table-row-selected > td.company-table-select-cell {
      background: #EFF6FF;
    }
    .company-table thead th.company-table-sticky-frozen,
    .company-table thead th.company-table-sticky-logo {
      z-index: 7;
      background: #f9fafb;
    }
    .company-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
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
      -webkit-line-clamp: 3;
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
`;
