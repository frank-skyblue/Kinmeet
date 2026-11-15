import React from 'react';
import { LOOKING_FOR_OPTIONS } from '../../constants/profileOptions';

type ProfileLookingForFieldProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

/** "Looking For" as a row of checkbox pills; a checked pill is tinted with the primary color. */
const ProfileLookingForField: React.FC<ProfileLookingForFieldProps> = ({ selected, onChange }) => {
  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);

  return (
    <fieldset>
      <legend className="font-inter text-sm font-medium text-foreground">
        Looking For<span className="ml-1 text-kin-coral">*</span>
      </legend>
      <p className="mt-1 font-inter text-xs text-muted">Select all that apply.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LOOKING_FOR_OPTIONS.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-kin-sm border px-4 py-2.5 font-inter text-sm font-medium text-foreground transition focus-within:ring-2 focus-within:ring-ring ${
                checked ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-hover'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default ProfileLookingForField;
