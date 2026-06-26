import { useEffect, useRef } from 'react';
import { X, ShieldCheck } from 'lucide-react';

/*
 * Privacy policy shown to guests before they submit personal data.
 *
 * Keep the wording in sync with what the backend actually does: data collected, the
 * retention period (DATA_RETENTION_DAYS), and the processors involved (Microsoft 365,
 * Sentry, hosting). Have material changes reviewed for legal compliance.
 */

interface PrivacyPolicyProps {
  open: boolean;
  onClose: () => void;
}

const LAST_UPDATED = '2026-06-25';

export function PrivacyPolicy({ open, onClose }: PrivacyPolicyProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and move focus to the dialog when it opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-testid="privacy-policy-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
        data-testid="privacy-policy"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-dark-700 bg-dark-900 p-6 md:p-8 shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close privacy policy"
          data-testid="privacy-policy-close"
          className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-hubble-500/20">
            <ShieldCheck className="w-5 h-5 text-hubble-400" />
          </div>
          <h2 id="privacy-policy-title" className="text-xl font-title font-semibold text-white">
            Privacy Policy
          </h2>
        </div>

        <div className="space-y-5 text-sm text-dark-300 leading-relaxed">
          <p className="text-dark-400">Last updated: {LAST_UPDATED}</p>

          <section>
            <h3 className="text-white font-medium mb-1">Who is responsible for your data</h3>
            <p>
              This reservation form is operated by Stichting Bar Potential ("we"), the foundation behind Hubble &amp; Meteor Community Cafés. For any privacy question or request you can reach us at{' '}
              <a href="mailto:privacy@hubble.cafe" className="underline text-hubble-400 hover:text-hubble-300 transition-colors">privacy@hubble.cafe</a>.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">What we collect</h3>
            <p>When you submit a reservation request we process the details you enter, including:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Your name, email address, and (optionally) phone number and organisation</li>
              <li>Your event details: title, description, date, time, number of guests, and location</li>
              <li>Payment preference and, for invoices, billing details you provide</li>
              <li>Any dietary notes or comments you add (please avoid sharing health details you would rather not disclose)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">Why we use it and our legal basis</h3>
            <p>
              We use this information solely to handle your reservation request, contact you about it, and prepare for your event. The legal basis is taking steps at your request prior to, and performing, an agreement with you (GDPR Art. 6(1)(b)), and our legitimate interest in running the cafés (Art. 6(1)(f)). We do not use your data for marketing or sell it.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">Who can see it</h3>
            <p>
              Your request is visible to café staff. We rely on a small number of service providers that process data on our behalf: Microsoft 365 (to send and receive the confirmation email) and our error-monitoring provider (Sentry) to keep the site reliable. Hosting is provided by sentry.io (operated by Functional Software, Inc.). The reservation form itself uses no tracking cookies and no third-party advertising.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">How long we keep it</h3>
            <p>
              We keep reservation data in our database for up to 457 days after your event, after which it is automatically deleted. Some information also lives in emails; together with the community café web forms, these are deleted after 2 years. We may keep data longer where we must to meet a legal obligation (for example invoicing records).
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">Your rights</h3>
            <p>
              You have the right to access, correct, or delete your data, to object to or restrict its processing, and to data portability. To exercise any of these, contact us at{' '}
              <a href="mailto:privacy@hubble.cafe" className="underline text-hubble-400 hover:text-hubble-300 transition-colors">privacy@hubble.cafe</a>. You also have the right to lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens, autoriteitpersoonsgegevens.nl).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
