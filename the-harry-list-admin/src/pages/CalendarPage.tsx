import { useState, useEffect } from 'react';
import { Calendar, Copy, Check, ExternalLink, RefreshCw, Loader2, AlertCircle, Lock, Unlock } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

interface CalendarFeedInfo {
  id: string;
  name: string;
  description: string;
  url: string | null;
  hasToken: boolean;
  location: string;
  isStaff: boolean;
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

  // Group feeds by location
  const hubbleFeeds = feeds.filter(f => f.location === 'HUBBLE');
  const meteorFeeds = feeds.filter(f => f.location === 'METEOR');

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

  const renderFeedCard = (feed: CalendarFeedInfo) => {
    const isHubble = feed.location === 'HUBBLE';

    return (
      <div
        key={feed.id}
        className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className={`px-4 py-3 border-b border-dark-800 flex items-center justify-between ${isHubble ? 'bg-hubble-500/10' : 'bg-meteor-500/10'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isHubble ? 'bg-hubble-500/20 text-hubble-400' : 'bg-meteor-500/20 text-meteor-400'}`}>
              {feed.isStaff ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="font-medium text-white text-sm">{feed.isStaff ? 'Staff' : 'Public'}</h4>
              <p className="text-xs text-dark-400">{feed.isStaff ? 'With contact details' : 'No contact details'}</p>
            </div>
          </div>
          {feed.hasToken && feed.url && (
            <button
              onClick={() => copyToClipboard(feed.url!, feed.id)}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                copiedId === feed.id
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white'
              }`}
            >
              {copiedId === feed.id ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy URL
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {feed.hasToken && feed.url ? (
            <div className="space-y-3">
              {/* URL Display */}
              <input
                type="text"
                readOnly
                value={feed.url}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-xs text-dark-400 truncate"
              />

              {/* Quick Actions */}
              <div className="flex gap-2">
                <a
                  href={feed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview
                </a>
                <a
                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.url.replace('https://', 'webcal://').replace('http://', 'webcal://'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg text-xs transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Add to Google
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-dark-500">Token not configured</p>
            </div>
          )}
        </div>
      </div>
    );
  };

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
          How to Subscribe
        </h3>
        <ul className="text-sm text-dark-300 space-y-2">
          <li>• <strong>Google Calendar:</strong> Settings → Add calendar → From URL → Paste the URL</li>
          <li>• <strong>Outlook:</strong> Add calendar → Subscribe from web → Paste the URL</li>
          <li>• <strong>Apple Calendar:</strong> File → New Calendar Subscription → Paste the URL</li>
          <li className="text-amber-400/80">⚠️ Google Calendar syncs every 12-24 hours. Apple/Outlook sync faster.</li>
        </ul>
      </div>

      {/* Hubble Feeds */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-hubble-500/20 flex items-center justify-center">
            <span className="text-xl">🦆</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Hubble</h2>
            <p className="text-xs text-dark-400">Calendar feeds for Hubble Community Café</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {hubbleFeeds.map(renderFeedCard)}
        </div>
      </div>

      {/* Meteor Feeds */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-meteor-500/20 flex items-center justify-center">
            <span className="text-xl">🐻</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Meteor</h2>
            <p className="text-xs text-dark-400">Calendar feeds for Meteor Community Café</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {meteorFeeds.map(renderFeedCard)}
        </div>
      </div>

      {/* Optional Parameters */}
      {parameters.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Additional URL Parameters</h3>
          <p className="text-sm text-dark-400 mb-4">You can append these parameters to customize the feed further:</p>
          <div className="grid gap-4 md:grid-cols-2">
            {parameters.map((param) => (
              <div key={param.name} className="bg-dark-800/50 rounded-lg p-4">
                <code className="text-hubble-400 text-sm">{param.name}</code>
                <p className="text-xs text-dark-400 mt-1">{param.description}</p>
                <p className="text-xs text-dark-500 mt-2">
                  Append: <code className="text-dark-300">{param.example}</code>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

