export type ListExportMode = "all_columns" | "visible_columns";

/** Hard cap on rows exported when scope is "full_list" (i.e. not a user selection). */
export const EXPORT_ALL_ENTITIES_CAP = 100;

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
