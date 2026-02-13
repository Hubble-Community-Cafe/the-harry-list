import { useState } from 'react';
import { FileDown, Calendar, MapPin, Loader2, AlertCircle, Filter } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

export function ExportPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedLocation, setSelectedLocation] = useState<'HUBBLE' | 'METEOR'>('HUBBLE');
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/admin/export/daily-report?date=${selectedDate}&location=${selectedLocation}&confirmedOnly=${confirmedOnly}`
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
      <div>
        <h1 className="text-2xl font-title font-bold text-white">Export Reservations</h1>
        <p className="text-dark-400 mt-1">Generate PDF reports for daily reservation overviews</p>
      </div>

      {/* Export Card */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden max-w-xl">
        <div className="px-5 py-4 border-b border-dark-800 bg-hubble-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-hubble-500/20 text-hubble-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Daily Report</h3>
              <p className="text-xs text-dark-400">Export all reservations for a specific day</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Date Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
              <Calendar className="w-4 h-4" />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white
                         focus:border-hubble-500 focus:ring-1 focus:ring-hubble-500 outline-none transition-colors"
            />
          </div>

          {/* Location Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
              <MapPin className="w-4 h-4" />
              Select Location
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedLocation('HUBBLE')}
                className={`
                  relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200
                  ${selectedLocation === 'HUBBLE'
                    ? 'border-hubble-500 bg-hubble-500/10'
                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                  }
                `}
              >
                <span className="text-2xl mb-1">🦆</span>
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
                onClick={() => setSelectedLocation('METEOR')}
                className={`
                  relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200
                  ${selectedLocation === 'METEOR'
                    ? 'border-meteor-500 bg-meteor-500/10'
                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                  }
                `}
              >
                <span className="text-2xl mb-1">🐻</span>
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
            <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
              <Filter className="w-4 h-4" />
              Filter
            </label>
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={loading}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
              ${loading
                ? 'bg-dark-700 text-dark-400 cursor-not-allowed'
                : selectedLocation === 'HUBBLE'
                  ? 'bg-hubble-500 hover:bg-hubble-600 text-white'
                  : 'bg-meteor-500 hover:bg-meteor-600 text-white'
              }
            `}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                Download PDF Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 max-w-xl">
        <h3 className="text-sm font-semibold text-white mb-3">What's included in the report?</h3>
        <ul className="text-sm text-dark-300 space-y-1.5">
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

