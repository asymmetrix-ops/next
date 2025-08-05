import React, { useState, useRef, useEffect } from "react";

interface Option {
  value: string | number;
  label: string;
}

interface SearchableMultiSelectProps<T extends string | number> {
  options: Option[];
  selectedValues: T[];
  onSelectionChange: (values: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const SearchableMultiSelect = <T extends string | number>({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options",
  disabled = false,
  style = {},
}: SearchableMultiSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedValues.includes(option.value as T)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          const newValue = filteredOptions[highlightedIndex].value as T;
          onSelectionChange([...selectedValues, newValue]);
          setIsOpen(false);
          setSearchTerm("");
          setHighlightedIndex(-1);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleOptionClick = (option: Option) => {
    const newValue = option.value as T;
    onSelectionChange([...selectedValues, newValue]);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchTerm("");
    }
  };

  const removeValue = (valueToRemove: T) => {
    onSelectionChange(
      selectedValues.filter((value) => value !== valueToRemove)
    );
  };

  const getSelectedLabels = () => {
    return selectedValues
      .map((value) => options.find((option) => option.value === value)?.label)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      <div
        style={{
          position: "relative",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={handleInputClick}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : getSelectedLabels() || ""}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!isOpen}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "14px",
            backgroundColor: disabled ? "#f7fafc" : "white",
            color: disabled ? "#a0aec0" : "#4a5568",
            cursor: disabled ? "not-allowed" : "text",
            outline: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="#4a5568"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Selected Values Tags */}
      {selectedValues.length > 0 && (
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          {selectedValues.map((value) => {
            const option = options.find((opt) => opt.value === value);
            return (
              <span
                key={value}
                style={{
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {option?.label || String(value)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(value);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1976d2",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: "12px 16px",
                color: "#a0aec0",
                fontSize: "14px",
              }}
            >
              No options found
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  fontSize: "14px",
                  backgroundColor:
                    index === highlightedIndex ? "#f7fafc" : "transparent",
                  color: "#4a5568",
                  borderBottom:
                    index < filteredOptions.length - 1
                      ? "1px solid #f7fafc"
                      : "none",
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
