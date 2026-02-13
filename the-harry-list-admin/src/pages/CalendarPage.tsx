import { useState, useEffect } from 'react';
import { Calendar, Copy, Check, ExternalLink, RefreshCw, Users, Globe, Loader2, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

interface CalendarFeedInfo {
  id: string;
  name: string;
  description: string;
  url: string | null;
  hasToken: boolean;
}

interface ParameterInfo {
  name: string;
  description: string;
  example: string;
}

interface CalendarFeedsResponse {
  feeds: CalendarFeedInfo[];
  parameters: ParameterInfo[];
}

export function CalendarPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<CalendarFeedInfo[]>([]);
  const [parameters, setParameters] = useState<ParameterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeeds() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth('/api/admin/calendar/feeds');
        if (!response.ok) {
          throw new Error('Failed to load calendar feeds');
        }
        const data: CalendarFeedsResponse = await response.json();
        setFeeds(data.feeds);
        setParameters(data.parameters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendar feeds');
      } finally {
        setLoading(false);
      }
    }
    loadFeeds();
  }, []);

  const copyToClipboard = async (url: string, feedId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(feedId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getFeedIcon = (id: string) => {
    return id === 'public' ? <Globe className="w-5 h-5" /> : <Users className="w-5 h-5" />;
  };

  const getFeedColor = (id: string) => {
    return id === 'public' ? 'hubble' : 'meteor';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-white">Calendar Feeds</h1>
          <p className="text-dark-400 mt-1">Subscribe to reservation calendars from any calendar app</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-hubble-400" />
          How Calendar Syncing Works
        </h3>
        <ul className="text-sm text-dark-300 space-y-2">
          <li>• Copy the calendar URL and add it as a subscription in your calendar app</li>
          <li>• <strong>Google Calendar:</strong> Settings → Add calendar → From URL</li>
          <li>• <strong>Outlook:</strong> Add calendar → Subscribe from web</li>
          <li>• <strong>Apple Calendar:</strong> File → New Calendar Subscription</li>
          <li className="text-amber-400/80">⚠️ Google Calendar syncs every 12-24 hours. Other apps sync faster.</li>
        </ul>
      </div>

      {/* Calendar Feeds */}
      <div className="grid gap-6 md:grid-cols-2">
        {feeds.map((feed) => {
          const color = getFeedColor(feed.id);
          return (
            <div
              key={feed.id}
              className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className={`px-5 py-4 border-b border-dark-800 ${color === 'hubble' ? 'bg-hubble-500/10' : 'bg-meteor-500/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color === 'hubble' ? 'bg-hubble-500/20 text-hubble-400' : 'bg-meteor-500/20 text-meteor-400'}`}>
                    {getFeedIcon(feed.id)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{feed.name}</h3>
                    <p className="text-xs text-dark-400">{feed.description}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {feed.hasToken && feed.url ? (
                  <>
                    {/* URL Display */}
                    <div>
                      <label className="block text-xs font-medium text-dark-400 mb-1.5">
                        Subscription URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={feed.url}
                          className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300 truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(feed.url!, feed.id)}
                          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                            copiedId === feed.id
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white'
                          }`}
                        >
                          {copiedId === feed.id ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="text-sm">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2">
                      <a
                        href={feed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg text-sm transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Preview Feed
                      </a>
                      <a
                        href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.url.replace('https://', 'webcal://').replace('http://', 'webcal://'))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg text-sm transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Add to Google Calendar
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-dark-400">
                      Token not configured. Set the environment variable on the server.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* URL Parameters */}
      {parameters.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Optional URL Parameters</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {parameters.map((param) => (
              <div key={param.name} className="bg-dark-800/50 rounded-lg p-4">
                <code className="text-hubble-400 text-sm">{param.name}</code>
                <p className="text-xs text-dark-400 mt-1">{param.description}</p>
                <p className="text-xs text-dark-500 mt-2">
                  Example: <code className="text-dark-300">{param.example}</code>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

