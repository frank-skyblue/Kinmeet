import React from 'react';
import SearchableSelect from '../common/SearchableSelect';
import type { SearchableSelectOption } from '../../types';

type ProfileTagFieldProps = {
  id: string;
  label: string;
  values: string[];
  options: SearchableSelectOption[];
  onChange: (values: string[]) => void;
  placeholder: string;
  required?: boolean;
};

/** Search to add an item; chosen items show as chips with a remove button. */
const ProfileTagField: React.FC<ProfileTagFieldProps> = ({
  id,
  label,
  values,
  options,
  onChange,
  placeholder,
  required = false,
}) => {
  const labelFor = (value: string) => options.find((option) => option.value === value)?.label ?? value;

  return (
    <div>
      <SearchableSelect
        id={id}
        label={label}
        options={options.filter((option) => !values.includes(option.value))}
        value=""
        onChange={(value) => {
          if (value && !values.includes(value)) onChange([...values, value]);
        }}
        placeholder={placeholder}
        required={required}
        searchable="typeahead"
      />
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Selected ${label.replace(/\s*\(.*\)/, '')}`}>
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex items-center gap-1.5 rounded-kin-sm border border-border bg-surface-muted py-1 pl-3 pr-1.5 font-inter text-sm text-foreground"
            >
              {labelFor(value)}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`Remove ${labelFor(value)}`}
              >
                <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProfileTagField;
