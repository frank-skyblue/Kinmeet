import React, { useState, useRef, useEffect } from "react";
import type { SearchableSelectOption } from "../../types";

type SearchableSelectProps = {
  id: string;
  label: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  /**
   * Search mode: false = no filter, true = visible search input, 'typeahead' = type to filter (prefix match, no search box)
   */
  searchable?: boolean | "typeahead";
  /** When true, hides the visible label (e.g. when used in a group with a parent label) */
  hideLabel?: boolean;
  /** Optional content shown before the selected value (e.g. a country flag) */
  leadingContent?: React.ReactNode;
};

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  required = false,
  helperText,
  searchable = false,
  hideLabel = false,
  leadingContent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const isTypeahead = searchable === "typeahead";
  const isSearchInput = searchable === true;

  const filteredOptions = options.filter((option) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return option.label.toLowerCase().startsWith(q);
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setSearchQuery("");
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) setSearchQuery("");
    setIsOpen(!isOpen);
  };

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isTypeahead) {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSearchQuery((q) => q + e.key);
        if (!isOpen) setIsOpen(true);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        const newQuery = searchQuery.slice(0, -1);
        setSearchQuery(newQuery);
        if (!newQuery) setIsOpen(false);
        return;
      }
      if (e.key === "Enter") {
        if (isOpen && filteredOptions.length > 0) {
          e.preventDefault();
          handleSelect(filteredOptions[0]);
        } else if (!isOpen) {
          e.preventDefault();
          handleToggle();
        }
        return;
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        setIsOpen(false);
        return;
      }
    }

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
      if ((isTypeahead || isSearchInput) && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        handleToggle();
      }
      return;
    }

    if (e.key === "Escape") {
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const displayValue =
    isTypeahead && searchQuery
      ? searchQuery
      : (options.find((o) => o.value === value)?.label ?? value);

  const showLeadingContent = Boolean(leadingContent && value && !(isTypeahead && searchQuery));

  return (
    <div ref={containerRef} className="relative">
      {!hideLabel && (
        <label
          htmlFor={id}
          className="block text-sm font-medium font-inter text-kin-navy mb-2"
        >
          {label}
          {required && <span className="text-kin-coral ml-1">*</span>}
        </label>
      )}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={value ? `${id}-option-${value}` : undefined}
        tabIndex={0}
        id={id}
        onKeyDown={handleKeyDown}
        onClick={handleToggle}
        className={`w-full px-4 py-3 border rounded-kin-sm font-inter outline-none transition flex items-center justify-between min-h-[48px] ${
          disabled
            ? "bg-kin-stone-100 cursor-not-allowed border-kin-stone-300 text-kin-stone-500"
            : "border-kin-stone-300 focus:ring-2 focus:ring-kin-coral focus:border-transparent cursor-pointer hover:border-kin-coral-300"
        }`}
        aria-label={hideLabel ? (label || placeholder) : label}
      >
        <span
          className={`flex items-center gap-2 min-w-0 ${value ? "text-kin-navy" : "text-kin-stone-500"}`}
        >
          {showLeadingContent ? leadingContent : null}
          <span className="truncate">{displayValue || placeholder}</span>
        </span>
        <svg
          className={`w-5 h-5 text-kin-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {isOpen && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-kin-stone-300 rounded-kin-sm shadow-kin-strong max-h-60 overflow-hidden"
        >
          {isSearchInput && (
            <div className="p-2 border-b border-kin-stone-200">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-kin-stone-300 rounded-kin-sm font-inter focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none"
                placeholder="Type to search..."
                aria-label={`Search ${label}`}
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-kin-stone-500 font-inter">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  id={`${id}-option-${option.value}`}
                  role="option"
                  aria-selected={value === option.value}
                  tabIndex={0}
                  onClick={() => handleSelect(option)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(option);
                    }
                  }}
                  className={`px-4 py-3 font-inter cursor-pointer transition ${
                    value === option.value
                      ? "bg-kin-coral-100 text-kin-coral-700"
                      : "hover:bg-kin-beige text-kin-navy"
                  }`}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-xs text-kin-teal font-inter mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default SearchableSelect;
