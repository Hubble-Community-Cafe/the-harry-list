import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../components/Modal';

function Harness({ onClose = vi.fn(), closeOnBackdrop = false }: { onClose?: () => void; closeOnBackdrop?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Modal
          labelledBy="title"
          describedBy="body"
          closeOnBackdrop={closeOnBackdrop}
          backdropTestId="backdrop"
          onClose={() => { onClose(); setOpen(false); }}
          className="panel"
        >
          <h2 id="title">Edit thing</h2>
          <p id="body">Change the thing.</p>
          <button>First</button>
          <button>Last</button>
        </Modal>
      )}
    </>
  );
}

describe('Modal', () => {
  it('is a modal dialog named by its heading and described by its text', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit thing' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Change the thing.');
  });

  it('moves focus in, keeps Tab inside and returns focus to the opener on Escape', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    expect(first).toHaveFocus();
    // Shift+Tab on the first item wraps to the last, Tab on the last wraps to the first.
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('focuses the requested element first', () => {
    function WithInitial() {
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <Modal labelledBy="t" onClose={vi.fn()} initialFocusRef={ref} className="panel">
          <h2 id="t">Question</h2>
          <button>No</button>
          <button ref={ref}>Yes</button>
        </Modal>
      );
    }
    render(<WithInitial />);
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveFocus();
  });

  it('only the top dialog answers Escape when two are open', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Modal labelledBy="a" onClose={outer} className="panel"><h2 id="a">Outer</h2><button>x</button></Modal>
        <Modal labelledBy="b" onClose={inner} role="alertdialog" className="panel"><h2 id="b">Inner</h2><button>y</button></Modal>
      </>,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Inner' })).toBeInTheDocument();
  });

  it('closes on a backdrop click only when asked to, never on a click inside', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByTestId('backdrop'));
    expect(onClose).not.toHaveBeenCalled();
    unmount();

    render(<Harness onClose={onClose} closeOnBackdrop />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
