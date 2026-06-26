import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyPolicy } from './PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders nothing when closed', () => {
    render(<PrivacyPolicy open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('privacy-policy')).not.toBeInTheDocument();
  });

  it('renders the policy when open', () => {
    render(<PrivacyPolicy open onClose={vi.fn()} />);
    expect(screen.getByTestId('privacy-policy')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Privacy Policy' })).toBeInTheDocument();
  });

  it('exposes the contact address as clickable mailto links', () => {
    render(<PrivacyPolicy open onClose={vi.fn()} />);
    const mailLinks = screen.getAllByRole('link', { name: 'privacy@hubble.cafe' });
    expect(mailLinks.length).toBeGreaterThan(0);
    mailLinks.forEach(link => expect(link).toHaveAttribute('href', 'mailto:privacy@hubble.cafe'));
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    render(<PrivacyPolicy open onClose={onClose} />);
    fireEvent.click(screen.getByTestId('privacy-policy-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<PrivacyPolicy open onClose={onClose} />);
    fireEvent.click(screen.getByTestId('privacy-policy-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the dialog body is clicked', () => {
    const onClose = vi.fn();
    render(<PrivacyPolicy open onClose={onClose} />);
    fireEvent.click(screen.getByTestId('privacy-policy'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<PrivacyPolicy open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
