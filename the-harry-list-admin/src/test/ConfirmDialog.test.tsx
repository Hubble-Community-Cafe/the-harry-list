import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/ConfirmDialog';

const renderDialog = (props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Delete appointment"
      message="This cannot be undone."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
};

describe('ConfirmDialog', () => {
  it('is an alert dialog named by its title and described by its message', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog', { name: 'Delete appointment' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('starts on the safe answer, and the icon close button has a name', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('cancels on Escape, but not while the action is running', () => {
    const first = renderDialog();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(first.onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while loading', () => {
    const { onCancel } = renderDialog({ loading: true });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
