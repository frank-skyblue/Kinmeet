import React, { useEffect, useId, useRef, useState } from 'react';

export type ActionMenuItem = {
  /** Rendered label. Callers compute transient text themselves (e.g. "Blocking…"). */
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
};

export type ActionMenuProps = {
  /** Accessible name for the trigger, e.g. `More actions for ${firstName}`. */
  label: string;
  items: ActionMenuItem[];
  /** `sm` suits dense card grids; `md` is the default elsewhere. */
  size?: 'sm' | 'md';
  /** Applied to the positioning wrapper — use for layout fixes like `self-start`. */
  className?: string;
};

const TRIGGER_SIZE: Record<'sm' | 'md', string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
};

const MENU_WIDTH: Record<'sm' | 'md', string> = {
  sm: 'min-w-36',
  md: 'min-w-44',
};

const ITEM_VARIANT: Record<'default' | 'destructive', string> = {
  default: 'text-kin-navy hover:bg-kin-beige focus-visible:bg-kin-beige',
  destructive: 'text-kin-coral-700 hover:bg-kin-coral-50 focus-visible:bg-kin-coral-50',
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  label,
  items,
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const triggerId = `action-menu-trigger-${reactId}`;
  const menuId = `action-menu-${reactId}`;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      const node = containerRef.current;
      if (node && !node.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (item: ActionMenuItem) => {
    setIsOpen(false);
    item.onSelect();
  };

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`.trim()}>
      <button
        type="button"
        id={triggerId}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex ${TRIGGER_SIZE[size]} items-center justify-center rounded-kin-sm text-kin-navy transition hover:bg-kin-stone-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral`}
      >
        <span className="sr-only">Open menu</span>
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {isOpen ? (
        <ul
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className={`absolute right-0 top-full z-20 mt-1 ${MENU_WIDTH[size]} rounded-kin-sm border border-kin-stone-200 bg-white py-1 shadow-kin-strong`}
        >
          {items.map((item) => (
            <li key={item.label} role="presentation">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => handleSelect(item)}
                className={`w-full px-4 py-2.5 text-left text-sm font-inter cursor-pointer transition focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                  ITEM_VARIANT[item.variant ?? 'default']
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default ActionMenu;
