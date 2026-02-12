import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Clock, Users, CheckCircle, XCircle,
  AlertCircle, Loader2, TrendingUp
} from 'lucide-react';
import { fetchReservations } from '../lib/api';

interface Reservation {
  id: number;
  eventTitle: string;
  contactName: string;
  eventDate: string;
  location: string;
  status: string;
  expectedGuests: number;
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  rejected: number;
  upcoming: number;
}

export function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const stats: Stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'PENDING').length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    rejected: reservations.filter(r => r.status === 'REJECTED').length,
    upcoming: reservations.filter(r => {
      const eventDate = new Date(r.eventDate);
      const now = new Date();
      return eventDate >= now && r.status === 'CONFIRMED';
    }).length,
  };

  const recentReservations = [...reservations]
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .slice(0, 5);

  const pendingReservations = reservations.filter(r => r.status === 'PENDING').slice(0, 5);

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
        <h1 className="text-2xl font-title font-bold text-white">Dashboard</h1>
        <p className="text-dark-400 font-light">Overview of reservation activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-hubble-500/20">
              <Calendar className="w-5 h-5 text-hubble-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-dark-400">Total</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.pending}</div>
              <div className="text-sm text-dark-400">Pending</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.confirmed}</div>
              <div className="text-sm text-dark-400">Confirmed</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-meteor-500/20">
              <TrendingUp className="w-5 h-5 text-meteor-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.upcoming}</div>
              <div className="text-sm text-dark-400">Upcoming</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Reservations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Pending Approval</h2>
            <Link to="/reservations?status=PENDING" className="text-sm text-hubble-400 hover:text-hubble-300">
              View all
            </Link>
          </div>

          {pendingReservations.length === 0 ? (
            <p className="text-dark-400 text-center py-8">No pending reservations</p>
          ) : (
            <div className="space-y-3">
              {pendingReservations.map((reservation) => (
                <Link
                  key={reservation.id}
                  to={`/reservations/${reservation.id}`}
                  className="block p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">{reservation.eventTitle}</div>
                      <div className="text-sm text-dark-400">{reservation.contactName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">
                        {new Date(reservation.eventDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-dark-400">
                        <Users className="w-3 h-3" />
                        {reservation.expectedGuests}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reservations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Reservations</h2>
            <Link to="/reservations" className="text-sm text-hubble-400 hover:text-hubble-300">
              View all
            </Link>
          </div>

          {recentReservations.length === 0 ? (
            <p className="text-dark-400 text-center py-8">No reservations yet</p>
          ) : (
            <div className="space-y-3">
              {recentReservations.map((reservation) => (
                <Link
                  key={reservation.id}
                  to={`/reservations/${reservation.id}`}
                  className="block p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">{reservation.eventTitle}</div>
                      <div className="text-sm text-dark-400">{reservation.location}</div>
                    </div>
                    <StatusBadge status={reservation.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
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

