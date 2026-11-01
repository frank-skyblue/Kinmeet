import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionMenu from '../ActionMenu';

const openMenu = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string | RegExp = /more actions/i,
) => {
  await user.click(screen.getByRole('button', { name }));
};

describe('ActionMenu', () => {
  it('keeps the menu closed until the trigger is clicked', () => {
    render(<ActionMenu label="More actions for Ana" items={[{ label: 'Block', onSelect: vi.fn() }]} />);

    const trigger = screen.getByRole('button', { name: 'More actions for Ana' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens on click and renders every item', async () => {
    const user = userEvent.setup();
    render(
      <ActionMenu
        label="More actions for Ana"
        items={[
          { label: 'View Profile', onSelect: vi.fn() },
          { label: 'Block', onSelect: vi.fn(), variant: 'destructive' },
        ]}
      />,
    );

    await openMenu(user);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'View Profile' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Block' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions for Ana' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('calls onSelect and closes when an item is chosen', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ActionMenu label="More actions for Ana" items={[{ label: 'Block', onSelect }]} />);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Block' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on a click outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">elsewhere</button>
        <ActionMenu label="More actions for Ana" items={[{ label: 'Block', onSelect: vi.fn() }]} />
      </div>,
    );

    await openMenu(user);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="More actions for Ana" items={[{ label: 'Block', onSelect: vi.fn() }]} />);

    await openMenu(user);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('toggles shut when the trigger is clicked again', async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="More actions for Ana" items={[{ label: 'Block', onSelect: vi.fn() }]} />);

    await openMenu(user);
    await openMenu(user);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not fire onSelect for a disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ActionMenu
        label="More actions for Ana"
        items={[{ label: 'Blocking…', onSelect, disabled: true }]}
      />,
    );

    await openMenu(user);
    const item = screen.getByRole('menuitem', { name: 'Blocking…' });
    expect(item).toBeDisabled();

    await user.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('gives each instance its own ids so two menus do not collide', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ActionMenu label="More actions for Ana" items={[{ label: 'Block', onSelect: vi.fn() }]} />
        <ActionMenu label="More actions for Ben" items={[{ label: 'Block', onSelect: vi.fn() }]} />
      </div>,
    );

    await openMenu(user, 'More actions for Ana');

    // only the clicked menu opens
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'More actions for Ben' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
