import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  Clock, Users, UtensilsCrossed, MapPin, Calendar, Filter
} from 'lucide-react';
import { fetchReservations, updateCateringArranged } from '../lib/api';
import type { Reservation } from '../types/reservation';
import { HelpGuide } from '../components/HelpGuide';
import { weekOverviewGuide } from '../lib/guideContent';

const CATERING_ACTIVITIES = ['EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM'];

function hasCatering(activities?: string[]): boolean {
  return !!activities?.some(a => CATERING_ACTIVITIES.includes(a));
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'border-l-yellow-400',
  CONFIRMED: 'border-l-green-400',
  REJECTED: 'border-l-red-400',
  CANCELLED: 'border-l-dark-500',
  COMPLETED: 'border-l-blue-400',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  CONFIRMED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-dark-500/20 text-dark-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
};

export function WeekOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Determine the Monday of the current week from URL or today
  const weekParam = searchParams.get('week');
  const monday = weekParam ? getMonday(new Date(weekParam + 'T00:00:00')) : getMonday(new Date());

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekDateStrings = weekDates.map(toLocalDateString);

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

  const navigateWeek = (offset: number) => {
    const newMonday = addDays(monday, offset * 7);
    setSearchParams({ week: toLocalDateString(newMonday) });
  };

  const goToToday = () => {
    setSearchParams({});
  };

  // Filter reservations for this week
  const weekReservations = reservations.filter((r) => {
    const inWeek = weekDateStrings.includes(r.eventDate);
    const matchesLocation = locationFilter === 'ALL' || r.location === locationFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return inWeek && matchesLocation && matchesStatus;
  });

  // Group by date
  const byDate: Record<string, Reservation[]> = {};
  for (const dateStr of weekDateStrings) {
    byDate[dateStr] = [];
  }
  for (const r of weekReservations) {
    byDate[r.eventDate]?.push(r);
  }
  // Sort each day by start time
  for (const dateStr of weekDateStrings) {
    byDate[dateStr].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Week summary stats
  const pendingCount = weekReservations.filter(r => r.status === 'PENDING').length;
  const confirmedCount = weekReservations.filter(r => r.status === 'CONFIRMED').length;
  const cateringNeeded = weekReservations.filter(r => hasCatering(r.specialActivities) && !r.cateringArranged && r.status !== 'REJECTED' && r.status !== 'CANCELLED').length;
  const totalGuests = weekReservations.filter(r => r.status !== 'REJECTED' && r.status !== 'CANCELLED').reduce((sum, r) => sum + r.expectedGuests, 0);

  const todayStr = toLocalDateString(new Date());

  // Format week range for header
  const sunday = weekDates[6];
  const weekRangeLabel = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()} – ${sunday.getDate()} ${sunday.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
    : `${monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-title font-bold text-white">Week Overview</h1>
            <p className="text-dark-400 font-light">Quick overview of the week's reservations</p>
          </div>
          <HelpGuide title="Week Overview Guide" sections={weekOverviewGuide} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-field pl-9 pr-8 text-sm min-w-[140px]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="select-field pl-9 pr-8 text-sm min-w-[140px]"
            >
              <option value="ALL">All Locations</option>
              <option value="HUBBLE">Hubble</option>
              <option value="METEOR">Meteor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-hubble-400" />
            <span className="text-lg font-semibold text-white">{weekRangeLabel}</span>
            <button
              onClick={goToToday}
              className="text-xs px-2 py-1 rounded bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card !p-4">
          <div className="text-2xl font-bold text-white">{weekReservations.length}</div>
          <div className="text-xs text-dark-400">Total</div>
        </div>
        <div className="card !p-4">
          <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
          <div className="text-xs text-dark-400">Pending</div>
        </div>
        <div className="card !p-4">
          <div className="text-2xl font-bold text-green-400">{confirmedCount}</div>
          <div className="text-xs text-dark-400">Confirmed</div>
        </div>
        <div className="card !p-4">
          <div className={`text-2xl font-bold ${cateringNeeded > 0 ? 'text-orange-400' : 'text-dark-500'}`}>{cateringNeeded}</div>
          <div className="text-xs text-dark-400">Catering to arrange</div>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDates.map((date, dayIndex) => {
          const dateStr = weekDateStrings[dayIndex];
          const dayReservations = byDate[dateStr];
          const isToday = dateStr === todayStr;
          const isWeekend = dayIndex >= 5;

          return (
            <div
              key={dateStr}
              className={`rounded-xl border min-h-[200px] flex flex-col ${
                isToday
                  ? 'border-hubble-500/50 bg-hubble-500/5'
                  : isWeekend
                    ? 'border-dark-800/50 bg-dark-900/50'
                    : 'border-dark-800 bg-dark-900'
              }`}
            >
              {/* Day header */}
              <div className={`px-3 py-2 border-b ${isToday ? 'border-hubble-500/30' : 'border-dark-800'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isToday ? 'text-hubble-400' : 'text-dark-500'}`}>
                    {DAY_LABELS[dayIndex]}
                  </span>
                  {dayReservations.length > 0 && (
                    <span className="text-xs text-dark-500">{dayReservations.length}</span>
                  )}
                </div>
                <div className={`text-lg font-semibold ${isToday ? 'text-hubble-400' : 'text-white'}`}>
                  {date.getDate()}
                </div>
              </div>

              {/* Reservations */}
              <div className="flex-1 p-2 space-y-2 overflow-auto">
                {dayReservations.length === 0 ? (
                  <div className="text-xs text-dark-600 text-center py-4">No reservations</div>
                ) : (
                  dayReservations.map((reservation) => (
                    <WeekReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onCateringToggle={async (id, newValue) => {
                        try {
                          const updated = await updateCateringArranged(id, newValue);
                          setReservations(prev => prev.map(r => r.id === id ? { ...r, cateringArranged: updated.cateringArranged } : r));
                        } catch (error) {
                          console.error('Failed to update catering status:', error);
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total guests for the week */}
      {totalGuests > 0 && (
        <div className="text-sm text-dark-400 text-right">
          <Users className="w-4 h-4 inline mr-1" />
          {totalGuests} expected guests this week
        </div>
      )}
    </div>
  );
}

function WeekReservationCard({
  reservation,
  onCateringToggle,
}: {
  reservation: Reservation;
  onCateringToggle: (id: number, newValue: boolean) => Promise<void>;
}) {
  const needsCatering = hasCatering(reservation.specialActivities);
  const isHubble = reservation.location === 'HUBBLE';

  return (
    <Link
      to={`/reservations/${reservation.id}`}
      className={`block rounded-lg bg-dark-800/80 hover:bg-dark-800 border-l-2 p-2 transition-colors ${STATUS_COLORS[reservation.status] || 'border-l-dark-600'}`}
    >
      {/* Status badge */}
      <div className="mb-1">
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${STATUS_BADGE[reservation.status] || 'bg-dark-600/30 text-dark-400'}`}>
          {reservation.status}
        </span>
      </div>

      {/* Title */}
      <div className="mb-1">
        <span className="text-xs font-medium text-white truncate leading-snug block">{reservation.eventTitle}</span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 text-[11px] text-dark-400 mb-1">
        <Clock className="w-3 h-3" />
        <span>{reservation.startTime.slice(0, 5)}–{reservation.endTime.slice(0, 5)}</span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Location */}
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          isHubble
            ? 'bg-hubble-500/20 text-hubble-400'
            : 'bg-meteor-500/20 text-meteor-400'
        }`}>
          {reservation.location}
        </span>

        {/* Guest count */}
        <span className="text-[11px] text-dark-500 flex items-center gap-0.5">
          <Users className="w-3 h-3" />
          {reservation.expectedGuests}
        </span>

        {/* Catering badge */}
        {needsCatering && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCateringToggle(reservation.id, !reservation.cateringArranged);
            }}
            className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${
              reservation.cateringArranged
                ? 'bg-green-500/20 text-green-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}
            title={reservation.cateringArranged ? 'Catering arranged (click to undo)' : 'Catering needed (click to mark arranged)'}
          >
            <UtensilsCrossed className="w-3 h-3" />
            {reservation.cateringArranged ? 'OK' : '!'}
          </button>
        )}
      </div>
    </Link>
  );
}
