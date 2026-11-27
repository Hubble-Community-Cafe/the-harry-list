import { useState } from 'react';
import { FileDown, Calendar, MapPin, Loader2, AlertCircle, Filter } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { HelpGuide } from '../components/HelpGuide';
import { exportGuide } from '../lib/guideContent';

export function ExportPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedLocation, setSelectedLocation] = useState<'HUBBLE' | 'METEOR'>('HUBBLE');
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [cateringOnly, setCateringOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/admin/export/daily-report?date=${selectedDate}&location=${selectedLocation}&confirmedOnly=${confirmedOnly}&cateringOnly=${cateringOnly}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reservations-${selectedLocation.toLowerCase()}-${selectedDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-white tracking-tight">Export reservations</h1>
          <p className="text-dark-400 mt-1">Generate PDF reports for daily reservation overviews</p>
        </div>
        <HelpGuide title="Export guide" sections={exportGuide} />
      </div>

      {/* Export Card */}
      <div className="card !p-0 overflow-hidden max-w-xl">
        <div className="px-5 py-4 border-b border-dark-800 bg-hubble-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-hubble-500/20 text-hubble-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Daily report</h3>
              <p className="text-xs text-dark-400">Export all reservations for a specific day</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Date Selection */}
          <div>
            <label htmlFor="export-date" className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
              <Calendar className="w-4 h-4" />
              Select date
            </label>
            <input
              type="date"
              id="export-date"
              data-testid="export-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Location Selection */}
          <div>
            <p id="export-location-label" className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
              <MapPin className="w-4 h-4" />
              Select location
            </p>
            <div role="group" aria-labelledby="export-location-label" className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={selectedLocation === 'HUBBLE'}
                onClick={() => setSelectedLocation('HUBBLE')}
                className={`
                  relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200
                  ${selectedLocation === 'HUBBLE'
                    ? 'border-hubble-500 bg-hubble-500/10'
                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                  }
                `}
              >
                <span aria-hidden="true" className="text-2xl mb-1">🦆</span>
                <span className="text-sm font-medium text-white">Hubble</span>
                {selectedLocation === 'HUBBLE' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-hubble-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                type="button"
                aria-pressed={selectedLocation === 'METEOR'}
                onClick={() => setSelectedLocation('METEOR')}
                className={`
                  relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200
                  ${selectedLocation === 'METEOR'
                    ? 'border-meteor-500 bg-meteor-500/10'
                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                  }
                `}
              >
                <span aria-hidden="true" className="text-2xl mb-1">🐻</span>
                <span className="text-sm font-medium text-white">Meteor</span>
                {selectedLocation === 'METEOR' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-meteor-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Filter Option */}
          <div>
            <p id="export-filter-label" className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
              <Filter className="w-4 h-4" />
              Filter
            </p>
            <div role="group" aria-labelledby="export-filter-label" className="space-y-3">
              <label className="flex items-center gap-3 p-4 bg-dark-800/50 border border-dark-700 rounded-xl cursor-pointer hover:border-dark-600 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedOnly}
                  onChange={(e) => setConfirmedOnly(e.target.checked)}
                  className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-hubble-500 focus:ring-hubble-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm font-medium text-white">Confirmed reservations only</span>
                  <p className="text-xs text-dark-400">Exclude pending, rejected, and cancelled reservations</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 bg-dark-800/50 border border-dark-700 rounded-xl cursor-pointer hover:border-dark-600 transition-colors">
                <input
                  type="checkbox"
                  data-testid="export-catering-only"
                  checked={cateringOnly}
                  onChange={(e) => setCateringOnly(e.target.checked)}
                  className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-hubble-500 focus:ring-hubble-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm font-medium text-white">Catering reservations only</span>
                  <p className="text-xs text-dark-400">Only include reservations with catering (eat a la carte, eat catering, or Catering Corona Room)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 border rounded-lg text-sm notice-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            data-testid="export-submit"
            disabled={loading}
            // The café's own colour: teal for Hubble, green for Meteor.
            className={`${selectedLocation === 'HUBBLE' ? 'btn-primary' : 'btn-secondary'} w-full gap-2`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                Download PDF report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 max-w-xl">
        <h3 className="text-sm font-semibold text-white mb-3">What's included in the report?</h3>
        <ul className="text-sm text-dark-300 space-y-1.5">
          <li>• A leading appointments page when calendar appointments fall on the selected date</li>
          <li>• All reservations for the selected date and location</li>
          <li>• Contact details (name, email, phone, organization)</li>
          <li>• Event details (title, time, guests, type)</li>
          <li>• Payment and logistics information</li>
          <li>• Food requirements and dietary notes</li>
          <li>• Comments and internal notes</li>
        </ul>
      </div>
    </div>
  );
}

