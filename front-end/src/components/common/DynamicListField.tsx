import React from 'react';
import SearchableSelect from './SearchableSelect';
import type { SearchableSelectOption } from '../../types';

interface DynamicListFieldProps {
    label: string;
    items: string[];
    options: SearchableSelectOption[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, value: string) => void;
    idPrefix: string;
    required?: boolean;
    addLabel?: string;
    placeholder?: string;
}

const DynamicListField: React.FC<DynamicListFieldProps> = ({
    label,
    items,
    options,
    onAdd,
    onRemove,
    onChange,
    idPrefix,
    required = false,
    addLabel = '+ Add',
    placeholder = 'Select...',
}) => {
    return (
        <div>
            <label className="block text-sm font-medium font-inter text-kin-navy mb-2">
                {label}{required && ' *'}
            </label>
            {items.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2 items-end">
                    <div className="flex-1">
                        <SearchableSelect
                            id={`${idPrefix}-${index}`}
                            label={label.replace(/\s*\*$/, '').replace(/\(.*\)/, '').trim()}
                            options={options.filter(
                                (opt) =>
                                    opt.value === item ||
                                    !items.some((existing, i) => i !== index && existing === opt.value),
                            )}
                            value={item}
                            onChange={(value) => onChange(index, value)}
                            placeholder={placeholder}
                            required={required && index === 0}
                            hideLabel
                            searchable="typeahead"
                        />
                    </div>
                    {items.length > 1 && (
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="px-4 py-3 bg-kin-coral-100 text-kin-coral-700 rounded-kin-sm font-inter font-medium hover:bg-kin-coral-200 transition shrink-0"
                            aria-label={`Remove ${idPrefix}`}
                        >
                            Remove
                        </button>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={onAdd}
                className="text-kin-teal font-semibold font-inter hover:text-kin-teal-600 transition"
            >
                {addLabel}
            </button>
        </div>
    );
};

export default DynamicListField;
