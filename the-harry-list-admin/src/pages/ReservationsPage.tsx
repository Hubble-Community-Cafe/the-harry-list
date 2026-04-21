import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Calendar, Users, MapPin,
  CheckCircle, XCircle, Clock, Loader2, AlertCircle,
  ChevronRight, UtensilsCrossed
} from 'lucide-react';
import { fetchReservations, updateCateringArranged } from '../lib/api';
import type { Reservation } from '../types/reservation';
import { HelpGuide } from '../components/HelpGuide';
import { reservationsGuide } from '../lib/guideContent';

const statusOptions = ['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
const locationOptions = ['ALL', 'HUBBLE', 'METEOR'];

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ReservationsPage() {
  const [searchParams] = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [showPast, setShowPast] = useState(false);

  const todayStr = toLocalDateString(new Date());

  const loadReservations = async () => {
    try {
      const data = await fetchReservations();
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.confirmationNumber && r.confirmationNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.id.toString().includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesLocation = locationFilter === 'ALL' || r.location === locationFilter;
    const matchesDateRange = showPast || r.eventDate >= todayStr;

    return matchesSearch && matchesStatus && matchesLocation && matchesDateRange;
  });

  const sortedReservations = [...filteredReservations].sort((a, b) => {
    const dateDiff = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  // Group by eventDate
  const groupedByDay = sortedReservations.reduce<{ date: string; items: Reservation[] }[]>((acc, r) => {
    const last = acc[acc.length - 1];
    if (last && last.date === r.eventDate) {
      last.items.push(r);
    } else {
      acc.push({ date: r.eventDate, items: [r] });
    }
    return acc;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-white">Reservations</h1>
          <p className="text-dark-400 font-light">Manage all reservation requests</p>
        </div>
        <HelpGuide title="Reservations Guide" sections={reservationsGuide} />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
              placeholder="Search by name, email, confirmation number, or event..."
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-field pl-10 pr-8 min-w-[150px]"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Status' : status}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="select-field pl-10 pr-8 min-w-[150px]"
            >
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location === 'ALL' ? 'All Locations' : location}
                </option>
              ))}
            </select>
          </div>

          {/* Show past toggle */}
          <label className="flex items-center gap-2 text-sm text-dark-400 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-hubble-500 focus:ring-hubble-500"
            />
            Show past
          </label>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-dark-400">
        Showing {sortedReservations.length} of {reservations.length} reservations
      </div>

      {/* Reservations List */}
      <div className="space-y-6">
        {groupedByDay.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No reservations found</h3>
            <p className="text-dark-400">Try adjusting your filters</p>
          </div>
        ) : (
          groupedByDay.map(({ date, items }) => (
            <div key={date}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-hubble-400" />
                  <span className="text-sm font-semibold text-hubble-400">
                    {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex-1 h-px bg-dark-800" />
                <span className="text-xs text-dark-500">{items.length} reservation{items.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Reservations for this day */}
              <div className="space-y-3">
                {items.map((reservation) => (
                  <Link
                    key={reservation.id}
                    to={`/reservations/${reservation.id}`}
                    className="card block hover:border-hubble-500/50 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h3 className="font-medium text-white truncate">{reservation.eventTitle}</h3>
                              {hasCatering(reservation.specialActivities) && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newValue = !reservation.cateringArranged;
                                    try {
                                      const updated = await updateCateringArranged(reservation.id, newValue);
                                      setReservations(prev => prev.map(r => r.id === reservation.id ? { ...r, cateringArranged: updated.cateringArranged } : r));
                                    } catch (error) {
                                      console.error('Failed to update catering status:', error);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                    reservation.cateringArranged
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                  }`}
                                  title={reservation.cateringArranged ? 'Catering arranged ✓ (click to undo)' : 'Catering requested (click to mark as arranged)'}
                                >
                                  <UtensilsCrossed className="w-3 h-3" />
                                  {reservation.cateringArranged ? 'Catering arranged' : 'Catering'}
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-dark-400 truncate">
                              {reservation.confirmationNumber && (
                                <span className="font-mono text-hubble-400">{reservation.confirmationNumber}</span>
                              )}
                              {reservation.confirmationNumber && ' • '}
                              {reservation.contactName} • {reservation.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <LocationBadge location={reservation.location} />
                        <div className="flex items-center gap-2 text-dark-400">
                          <Clock className="w-4 h-4" />
                          <span>{reservation.startTime.slice(0, 5)}–{reservation.endTime.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-dark-400">
                          <Users className="w-4 h-4" />
                          <span>{reservation.expectedGuests}</span>
                        </div>
                        <StatusBadge status={reservation.status} />
                        <ChevronRight className="w-5 h-5 text-dark-600" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const CATERING_ACTIVITIES = ['EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM'];

function hasCatering(activities?: string[]): boolean {
  return !!activities?.some(a => CATERING_ACTIVITIES.includes(a));
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: typeof CheckCircle }> = {
    PENDING: { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
    CONFIRMED: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
    REJECTED: { color: 'bg-red-500/20 text-red-400', icon: XCircle },
    CANCELLED: { color: 'bg-dark-500/20 text-dark-400', icon: XCircle },
    COMPLETED: { color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  };

  const { color, icon: Icon } = config[status] || config.PENDING;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function LocationBadge({ location }: { location: string }) {
  const isHubble = location === 'HUBBLE';

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
      ${isHubble 
        ? 'bg-hubble-500/20 text-hubble-400 border border-hubble-500/30' 
        : 'bg-meteor-500/20 text-meteor-400 border border-meteor-500/30'
      }
    `}>
      <span className={`w-2 h-2 rounded-full ${isHubble ? 'bg-hubble-400' : 'bg-meteor-400'}`} />
      {location}
    </span>
  );
}

