import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Calendar, Users, MapPin,
  CheckCircle, XCircle, Clock, Loader2, AlertCircle,
  ChevronRight
} from 'lucide-react';
import { fetchReservations } from '../lib/api';

interface Reservation {
  id: number;
  confirmationNumber?: string;
  eventTitle: string;
  contactName: string;
  email: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  expectedGuests: number;
  organizerType: string;
  eventType: string;
}

const statusOptions = ['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
const locationOptions = ['ALL', 'HUBBLE', 'METEOR'];

export function ReservationsPage() {
  const [searchParams] = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  useEffect(() => {
    loadReservations();
  }, []);

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

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.confirmationNumber && r.confirmationNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.id.toString().includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesLocation = locationFilter === 'ALL' || r.location === locationFilter;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const sortedReservations = [...filteredReservations].sort((a, b) =>
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

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
      <div>
        <h1 className="text-2xl font-bold text-white">Reservations</h1>
        <p className="text-dark-400">Manage all reservation requests</p>
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
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-dark-400">
        Showing {sortedReservations.length} of {reservations.length} reservations
      </div>

      {/* Reservations List */}
      <div className="space-y-3">
        {sortedReservations.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No reservations found</h3>
            <p className="text-dark-400">Try adjusting your filters</p>
          </div>
        ) : (
          sortedReservations.map((reservation) => (
            <Link
              key={reservation.id}
              to={`/reservations/${reservation.id}`}
              className="card block hover:border-hubble-500/50 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                      ${reservation.location === 'HUBBLE' ? 'bg-hubble-500/20' : 'bg-meteor-500/20'}
                    `}>
                      <MapPin className={`w-5 h-5 ${reservation.location === 'HUBBLE' ? 'text-hubble-400' : 'text-meteor-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-white truncate">{reservation.eventTitle}</h3>
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
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(reservation.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-400">
                    <Clock className="w-4 h-4" />
                    <span>{reservation.startTime.slice(0, 5)}</span>
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
          ))
        )}
      </div>
    </div>
  );
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

