import React, { useEffect, useRef, useState } from "react";
import type { ICity } from "country-state-city";
import {
  formatCityOptionLabel,
  resolveCityLocation,
  searchCities,
  type ResolvedCityLocation,
} from "../../utils/citySearch";

const DEBOUNCE_MS = 300;

export interface CitySearchInputProps {
  id: string;
  label: string;
  currentCity: string;
  setCurrentCity: (value: string) => void;
  onPickCity: (resolved: ResolvedCityLocation) => void;
  helperText?: string;
}

const CitySearchInput: React.FC<CitySearchInputProps> = ({
  id,
  label,
  currentCity,
  setCurrentCity,
  onPickCity,
  helperText,
}) => {
  const [query, setQuery] = useState(currentCity);
  const [results, setResults] = useState<ICity[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(currentCity);
  }, [currentCity]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setResults(searchCities(query, 40));
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (v !== currentCity) {
      setCurrentCity("");
    }
    setOpen(true);
  };

  const handlePickCity = (city: ICity) => {
    const resolved = resolveCityLocation(city);
    if (!resolved) return;
    setQuery(resolved.cityName);
    setCurrentCity(resolved.cityName);
    onPickCity(resolved);
    setOpen(false);
    setResults([]);
  };

  const listboxId = `${id}-listbox`;

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-medium font-inter text-kin-navy mb-2"
      >
        {label}
      </label>
      <input
        type="text"
        id={id}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
        placeholder="Type at least 2 letters, then pick a city"
        aria-label={label}
      />
      {open && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-kin-stone-300 rounded-kin-sm shadow-kin-strong max-h-60 overflow-y-auto py-1"
        >
          {results.map((city) => {
            const labelText = formatCityOptionLabel(city);
            return (
              <li
                key={`${city.name}-${city.countryCode}-${city.stateCode}`}
                role="option"
                tabIndex={0}
                aria-label={labelText}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePickCity(city)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePickCity(city);
                  }
                }}
                className="px-4 py-3 font-inter cursor-pointer hover:bg-kin-beige text-kin-navy"
              >
                {labelText}
              </li>
            );
          })}
        </ul>
      )}
      {helperText && (
        <p className="text-xs text-kin-teal font-inter mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default CitySearchInput;
