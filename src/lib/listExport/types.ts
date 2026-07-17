export type ListExportMode = "all_columns" | "visible_columns";

export type ListExportScope = "full_list" | "selected";

export interface ListExportRequest {
  mode: ListExportMode;
  scope: ListExportScope;
  selectedIds?: number[];
}

export interface ExportColumnDef {
  key: string;
  label: string;
  categoryName: string;
  type: string;
}

export interface EntityListExportConfig {
  entitySheetName: string;
  filePrefix: string;
  categories: Array<{
    name: string;
    columns: Array<{
      columnKey: string;
      label: string;
      type: string;
    }>;
  }>;
  visibleColumnKeys: string[];
  extraLeadingColumns?: ExportColumnDef[];
}
