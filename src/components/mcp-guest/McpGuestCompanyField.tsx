"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  searchMcpGuestCompanies,
  type McpGuestCompanyOption,
} from "@/lib/mcpGuestRequest";

interface McpGuestCompanyFieldProps {
  companyName: string;
  companyId: number | null;
  onChange: (companyName: string, companyId: number | null) => void;
  disabled?: boolean;
}

export default function McpGuestCompanyField({
  companyName,
  companyId,
  onChange,
  disabled = false,
}: McpGuestCompanyFieldProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<McpGuestCompanyOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = companyName.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(() => {
      void searchMcpGuestCompanies(trimmed).then((companies) => {
        if (cancelled) return;
        setResults(companies);
        setIsSearching(false);
        setIsOpen(companies.length > 0);
        setHighlightedIndex(-1);
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [companyName]);

  const handleInputChange = (value: string) => {
    onChange(value, null);
    setIsOpen(true);
  };

  const handleSelect = (company: McpGuestCompanyOption) => {
    onChange(company.name, company.id);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          event.preventDefault();
          handleSelect(results[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const showDropdown = isOpen && companyName.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <input
        id="company"
        name="company"
        type="text"
        value={companyName}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Search or enter your company"
        required
        autoComplete="organization"
        disabled={disabled}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />

      {companyId != null && companyId > 0 && (
        <p className="mt-1 text-xs text-gray-500">Matched company selected.</p>
      )}

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="overflow-y-auto absolute z-20 mt-1 w-full max-h-56 bg-white rounded-lg border border-gray-200 shadow-lg"
        >
          {isSearching ? (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No matches found. You can submit with your company name.
            </div>
          ) : (
            results.map((company, index) => (
              <button
                key={company.id}
                type="button"
                role="option"
                aria-selected={companyId === company.id}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(company)}
                className={`block px-4 py-3 w-full text-sm text-left ${
                  index === highlightedIndex || companyId === company.id
                    ? "bg-blue-50 text-blue-900"
                    : "text-gray-900 hover:bg-gray-50"
                }`}
              >
                {company.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
