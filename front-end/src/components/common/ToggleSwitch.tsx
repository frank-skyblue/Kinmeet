import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name, e.g. the setting's label. */
  label: string;
  /** Id of the element describing the setting. */
  describedBy?: string;
  disabled?: boolean;
}

/** An on/off switch: coral when on, grey when off. */
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label, describedBy, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    aria-describedby={describedBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
      checked ? 'bg-primary' : 'bg-secondary-hover'
    }`}
  >
    <span
      aria-hidden
      className={`inline-block h-5 w-5 rounded-full bg-white shadow-kin-soft transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export default ToggleSwitch;
