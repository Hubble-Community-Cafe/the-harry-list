import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { Link } from 'react-router-dom';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { renderInDataRouter } from './renderInDataRouter';

/** A page with one text field; it counts as unsaved once the field differs from its start value. */
function EditorPage({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('start');
  const { confirmDiscard, unsavedChangesDialog } = useUnsavedChanges(value !== 'start');
  return (
    <div>
      <input aria-label="Field" value={value} onChange={(e) => setValue(e.target.value)} />
      <Link to="/elsewhere">Leave page</Link>
      <button onClick={() => confirmDiscard(onClose)}>Close editor</button>
      {unsavedChangesDialog}
    </div>
  );
}

const renderEditor = (onClose = vi.fn()) => ({ onClose, ...renderInDataRouter(<EditorPage onClose={onClose} />) });
const edit = () => fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'changed' } });
const dispatchBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('useUnsavedChanges', () => {
  it('lets the user leave freely while nothing has changed', async () => {
    renderEditor();
    fireEvent.click(screen.getByText('Leave page'));
    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes, and stays on "Keep editing"', async () => {
    renderEditor();
    edit();

    fireEvent.click(screen.getByText('Leave page'));
    expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Keep editing'));
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Field')).toHaveValue('changed');
    expect(screen.queryByTestId('other-page')).not.toBeInTheDocument();
  });

  it('leaves on "Discard changes"', async () => {
    renderEditor();
    edit();

    fireEvent.click(screen.getByText('Leave page'));
    fireEvent.click(await screen.findByText('Discard changes'));

    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
  });

  it('asks the browser to warn before closing the tab only while there are changes', () => {
    renderEditor();
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    edit();
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  it('runs an in-page action at once without changes, and only after "Discard changes" with them', () => {
    const { onClose } = renderEditor();
    fireEvent.click(screen.getByText('Close editor'));
    expect(onClose).toHaveBeenCalledTimes(1);

    edit();
    fireEvent.click(screen.getByText('Close editor'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Discard changes'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
