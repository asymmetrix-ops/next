"use client";

import {
  CE_DEAL_TYPE_OPTIONS,
  CE_FUNDING_STAGE_GROUPS,
  isAllOptionsSelected,
} from "@/lib/ceEmailAlertFilters";

function CheckboxList({
  options,
  selected,
  onChange,
  idPrefix,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  idPrefix: string;
}) {
  const allSelected = isAllOptionsSelected(selected, options);

  const toggleAll = () => {
    onChange(allSelected ? [] : [...options]);
  };

  const toggleOne = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  return (
    <div className="mt-1 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-52 overflow-y-auto">
      {options.length > 1 && (
        <div className="flex items-center justify-end mb-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-xs text-blue-600 font-medium">
              {allSelected ? "Deselect all" : "Select all"}
            </span>
          </label>
        </div>
      )}
      <ul className="space-y-1">
        {options.map((option) => (
          <li key={option}>
            <label
              htmlFor={`${idPrefix}-${option}`}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <input
                id={`${idPrefix}-${option}`}
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOne(option)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-800">{option}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CeEmailTypeFiltersPanelProps {
  dealTypes: string[];
  fundingStages: string[];
  onDealTypesChange: (next: string[]) => void;
  onFundingStagesChange: (next: string[]) => void;
}

export function CeEmailTypeFiltersPanel({
  dealTypes,
  fundingStages,
  onDealTypesChange,
  onFundingStagesChange,
}: CeEmailTypeFiltersPanelProps) {
  const allDealTypesSelected = isAllOptionsSelected(dealTypes, CE_DEAL_TYPE_OPTIONS);
  const allFundingStagesSelected = isAllOptionsSelected(
    fundingStages,
    CE_FUNDING_STAGE_GROUPS.flatMap((group) => group.values)
  );

  const toggleAllFundingStages = () => {
    const allValues = CE_FUNDING_STAGE_GROUPS.flatMap((group) => group.values);
    onFundingStagesChange(allFundingStagesSelected ? [] : [...allValues]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Deal Type
          </label>
          <p className="text-xs text-gray-500">
            {allDealTypesSelected ? "All selected" : `${dealTypes.length} selected`}
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          Leave all selected to receive every deal type.
        </p>
        <CheckboxList
          idPrefix="ce-deal-type"
          options={CE_DEAL_TYPE_OPTIONS}
          selected={dealTypes}
          onChange={onDealTypesChange}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Funding Stage
          </label>
          <p className="text-xs text-gray-500">
            {allFundingStagesSelected
              ? "All selected"
              : `${fundingStages.length} selected`}
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          Leave all selected to receive every funding stage.
        </p>
        <div className="mt-1 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-52 overflow-y-auto">
          <div className="flex items-center justify-end mb-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allFundingStagesSelected}
                onChange={toggleAllFundingStages}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-xs text-blue-600 font-medium">
                {allFundingStagesSelected ? "Deselect all" : "Select all"}
              </span>
            </label>
          </div>
          <div className="space-y-3">
            {CE_FUNDING_STAGE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.values.map((value) => (
                    <li key={value}>
                      <label
                        htmlFor={`ce-funding-stage-${value}`}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          id={`ce-funding-stage-${value}`}
                          type="checkbox"
                          checked={fundingStages.includes(value)}
                          onChange={() =>
                            onFundingStagesChange(
                              fundingStages.includes(value)
                                ? fundingStages.filter((item) => item !== value)
                                : [...fundingStages, value]
                            )
                          }
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-800">{value}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
