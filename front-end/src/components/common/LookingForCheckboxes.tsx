import React from 'react';
import { LOOKING_FOR_OPTIONS } from '../../constants/profileOptions';

interface LookingForCheckboxesProps {
    selected: string[];
    onChange: (updated: string[]) => void;
}

const LookingForCheckboxes: React.FC<LookingForCheckboxesProps> = ({ selected, onChange }) => {
    const handleToggle = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter((item) => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium font-inter text-foreground mb-2">
                Looking For * (Select all that apply)
            </label>
            <div className="space-y-2">
                {LOOKING_FOR_OPTIONS.map((option) => (
                    <label
                        key={option}
                        className="flex items-center p-3 border border-border rounded-kin-sm cursor-pointer hover:bg-surface-muted hover:border-kin-coral transition"
                        tabIndex={0}
                        aria-label={`Select ${option}`}
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={() => handleToggle(option)}
                            className="w-5 h-5 text-kin-coral rounded focus:ring-ring"
                        />
                        <span className="ml-3 text-foreground font-inter">{option}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default LookingForCheckboxes;
