export const CORPORATE_EVENT_COLUMN_FIELD_ALIASES: Record<
  string,
  readonly string[]
> = {
  description: ["description"],
  announcement_date: ["announcement_date"],
  target: ["target_name"],
  target_hq: ["target_hq", "target_country"],
  parties: ["parties"],
  deal_type: ["deal_type"],
  funding_stage: ["funding_stage"],
  investment_amount: ["investment_amount_m", "investment_amount"],
  enterprise_value: ["enterprise_value_m", "enterprise_value"],
  advisors: ["advisors"],
  primary_sectors: ["primary_sectors"],
  secondary_sectors: ["secondary_sectors"],
};

export function getCorporateEventFieldAliasesForColumn(
  columnKey: string
): readonly string[] {
  return CORPORATE_EVENT_COLUMN_FIELD_ALIASES[columnKey] ?? [columnKey];
}
