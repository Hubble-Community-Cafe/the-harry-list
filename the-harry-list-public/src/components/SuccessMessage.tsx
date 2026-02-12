import { CheckCircle, PartyPopper, Mail, Calendar } from 'lucide-react';

interface SuccessMessageProps {
  result: {
    confirmationNumber: string;
    eventTitle: string;
    contactName: string;
    email: string;
  };
  onNewReservation: () => void;
}

export function SuccessMessage({ result, onNewReservation }: SuccessMessageProps) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="card text-center">
        {/* Success icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Reservation Submitted!
        </h2>
        <p className="text-dark-400 mb-8">
          Thank you for your reservation request. We'll be in touch soon!
        </p>

        {/* Confirmation details */}
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <PartyPopper className="w-5 h-5 text-meteor-400" />
            <span className="text-sm text-dark-400">Confirmation Number</span>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-hubble-400 to-meteor-400 bg-clip-text text-transparent mb-4 tracking-wider">
            {result.confirmationNumber}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-900/50">
              <Calendar className="w-5 h-5 text-hubble-400 mt-0.5" />
              <div>
                <div className="text-xs text-dark-500">Event</div>
                <div className="text-sm text-white">{result.eventTitle}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-900/50">
              <Mail className="w-5 h-5 text-meteor-400 mt-0.5" />
              <div>
                <div className="text-xs text-dark-500">Confirmation sent to</div>
                <div className="text-sm text-white">{result.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Important notice */}
        <div className="bg-hubble-950/50 border border-hubble-800/50 rounded-xl p-4 mb-8 text-left">
          <h3 className="text-sm font-semibold text-hubble-300 mb-2">
            ⚠️ Important Notice
          </h3>
          <p className="text-sm text-dark-400">
            This is <strong className="text-white">not a confirmation</strong>. Your reservation still awaits approval.
            Please note that we generally respond within 72 hours. Reservations made less than 72 hours
            in advance cannot always be confirmed in time.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onNewReservation}
            className="btn-primary"
          >
            Make Another Reservation
          </button>
          <a
            href="https://hubble.cafe"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-dark-700 bg-dark-800/50 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-dark-700 hover:border-dark-600"
          >
            Visit Hubble Café
          </a>
        </div>
      </div>
    </div>
  );
}

