import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Mail, Phone,
  Building2, CreditCard, UtensilsCrossed, MessageSquare,
  CheckCircle, XCircle, Loader2, AlertCircle, Trash2,
  Send, Edit, X
} from 'lucide-react';
import { fetchReservation, updateReservationStatus, deleteReservation, updateReservation } from '../lib/api';

interface Reservation {
  id: number;
  confirmationNumber?: string;
  contactName: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  eventTitle: string;
  description?: string;
  eventType: string;
  organizerType: string;
  expectedGuests: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  specificArea?: string;
  paymentOption: string;
  costCenter?: string;
  invoiceName?: string;
  invoiceAddress?: string;
  foodRequired?: boolean;
  dietaryPreference?: string;
  dietaryNotes?: string;
  comments?: string;
  status: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts } = useMsal();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Reservation>>({});
  const [sendEditEmail, setSendEditEmail] = useState(true);

  const userName = accounts[0]?.name || 'Staff';

  useEffect(() => {
    if (id) {
      loadReservation(parseInt(id));
    }
  }, [id]);

  const loadReservation = async (reservationId: number) => {
    try {
      const data = await fetchReservation(reservationId);
      setReservation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!reservation) return;

    setIsUpdating(true);
    try {
      await updateReservationStatus(reservation.id, newStatus, userName, sendEmail);
      setReservation({ ...reservation, status: newStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!reservation) return;

    setIsUpdating(true);
    try {
      await deleteReservation(reservation.id, sendEmail);
      navigate('/reservations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reservation');
      setIsUpdating(false);
    }
  };

  const startEditing = () => {
    if (!reservation) return;
    setEditData({
      // Contact info
      contactName: reservation.contactName,
      email: reservation.email,
      phoneNumber: reservation.phoneNumber || '',
      organizationName: reservation.organizationName || '',
      // Event details
      eventTitle: reservation.eventTitle,
      description: reservation.description || '',
      eventType: reservation.eventType,
      organizerType: reservation.organizerType,
      expectedGuests: reservation.expectedGuests,
      eventDate: reservation.eventDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      // Location
      location: reservation.location,
      specificArea: reservation.specificArea || '',
      // Payment
      paymentOption: reservation.paymentOption,
      costCenter: reservation.costCenter || '',
      invoiceName: reservation.invoiceName || '',
      invoiceAddress: reservation.invoiceAddress || '',
      // Food
      foodRequired: reservation.foodRequired || false,
      dietaryPreference: reservation.dietaryPreference || '',
      dietaryNotes: reservation.dietaryNotes || '',
      // Additional
      comments: reservation.comments || '',
    });
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    if (!reservation) return;

    setIsUpdating(true);
    try {
      const updatedReservation = await updateReservation(reservation.id, editData, sendEditEmail);
      setReservation(updatedReservation);
      setIsEditing(false);
      setEditData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reservation');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">{error || 'Reservation not found'}</p>
        <Link to="/reservations" className="btn-primary mt-4 inline-flex">
          Back to Reservations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/reservations"
            className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reservations
          </Link>
          <h1 className="text-2xl font-bold text-white">{reservation.eventTitle}</h1>
          <p className="text-dark-400">
            Confirmation: <span className="text-white font-mono">{reservation.confirmationNumber || `#${reservation.id}`}</span>
          </p>
        </div>
        <StatusBadge status={reservation.status} large />
      </div>

      {/* Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>

        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-hubble-500"
            />
            <span className="text-sm text-dark-300">
              <Send className="w-4 h-4 inline mr-1" />
              Send email notification to customer
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Edit Details Button */}
          <button
            onClick={startEditing}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-hubble-500/20 text-hubble-400 hover:bg-hubble-500/30 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Details
          </button>

          {/* Direct Email Link - opens in user's email client */}
          <a
            href={`mailto:${reservation.email}?subject=${encodeURIComponent(`Re: Your reservation "${reservation.eventTitle}" at ${reservation.location}`)}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email Customer
          </a>

          {reservation.status === 'PENDING' && (
            <>
              <button
                onClick={() => handleStatusChange('CONFIRMED')}
                disabled={isUpdating}
                className="btn-primary flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm
              </button>
              <button
                onClick={() => handleStatusChange('REJECTED')}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          )}

          {reservation.status === 'CONFIRMED' && (
            <button
              onClick={() => handleStatusChange('COMPLETED')}
              disabled={isUpdating}
              className="btn-secondary flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Mark Completed
            </button>
          )}

          {(reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
            <button
              onClick={() => handleStatusChange('CANCELLED')}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/50">
            <p className="text-red-400 mb-3">Are you sure you want to delete this reservation? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-hubble-400" />
            Contact Information
          </h2>
          <div className="space-y-4">
            <InfoRow icon={Users} label="Name" value={reservation.contactName} />
            <InfoRow icon={Mail} label="Email" value={reservation.email} />
            <InfoRow icon={Phone} label="Phone" value={reservation.phoneNumber} />
            <InfoRow icon={Building2} label="Organization" value={reservation.organizationName} />
          </div>
        </div>

        {/* Event Details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-meteor-400" />
            Event Details
          </h2>
          <div className="space-y-4">
            <InfoRow icon={Calendar} label="Date" value={new Date(reservation.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            <InfoRow icon={Clock} label="Time" value={`${reservation.startTime.slice(0, 5)} - ${reservation.endTime.slice(0, 5)}`} />
            <InfoRow icon={MapPin} label="Location" value={reservation.location} />
            <InfoRow icon={Users} label="Expected Guests" value={reservation.expectedGuests.toString()} />
            <InfoRow label="Event Type" value={reservation.eventType} />
            <InfoRow label="Organizer Type" value={reservation.organizerType} />
          </div>
        </div>

        {/* Payment Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-hubble-400" />
            Payment Information
          </h2>
          <div className="space-y-4">
            <InfoRow label="Payment Method" value={reservation.paymentOption} />
            <InfoRow label="Cost Center" value={reservation.costCenter} />
            <InfoRow label="Invoice Name" value={reservation.invoiceName} />
            <InfoRow label="Invoice Address" value={reservation.invoiceAddress} />
          </div>
        </div>

        {/* Food & Additional */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-meteor-400" />
            Additional Information
          </h2>
          <div className="space-y-4">
            <InfoRow label="Food Required" value={reservation.foodRequired ? 'Yes' : 'No'} />
            {reservation.foodRequired && (
              <>
                <InfoRow label="Dietary Preference" value={reservation.dietaryPreference} />
                <InfoRow label="Dietary Notes" value={reservation.dietaryNotes} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description & Comments */}
      {(reservation.description || reservation.comments) && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-hubble-400" />
            Notes
          </h2>
          {reservation.description && (
            <div className="mb-4">
              <div className="text-sm text-dark-400 mb-1">Description</div>
              <p className="text-white">{reservation.description}</p>
            </div>
          )}
          {reservation.comments && (
            <div>
              <div className="text-sm text-dark-400 mb-1">Additional Comments</div>
              <p className="text-white">{reservation.comments}</p>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="text-sm text-dark-500 flex gap-6">
        <span>Created: {new Date(reservation.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(reservation.updatedAt).toLocaleString()}</span>
        {reservation.confirmedBy && <span>Confirmed by: {reservation.confirmedBy}</span>}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold text-white">Edit Reservation</h2>
              <button onClick={() => setIsEditing(false)} className="text-dark-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Send email checkbox */}
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={sendEditEmail}
                  onChange={(e) => setSendEditEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-hubble-500"
                />
                <span className="text-sm text-dark-300">
                  Send email notification about changes to customer
                </span>
              </label>

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-semibold text-hubble-400 mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Contact Name</label>
                    <input
                      type="text"
                      value={editData.contactName || ''}
                      onChange={(e) => setEditData({ ...editData, contactName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Phone</label>
                    <input
                      type="tel"
                      value={editData.phoneNumber || ''}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Organization</label>
                    <input
                      type="text"
                      value={editData.organizationName || ''}
                      onChange={(e) => setEditData({ ...editData, organizationName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div>
                <h3 className="text-sm font-semibold text-meteor-400 mb-3">Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group md:col-span-2">
                    <label className="label">Event Title</label>
                    <input
                      type="text"
                      value={editData.eventTitle || ''}
                      onChange={(e) => setEditData({ ...editData, eventTitle: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Event Type</label>
                    <select
                      value={editData.eventType || ''}
                      onChange={(e) => setEditData({ ...editData, eventType: e.target.value })}
                      className="select-field"
                    >
                      <option value="BORREL">Borrel / Drinks</option>
                      <option value="LUNCH">Lunch</option>
                      <option value="ACTIVITY">Activity</option>
                      <option value="GRADUATION">Graduation / PhD Defense</option>
                      <option value="DINNER">Dinner</option>
                      <option value="PARTY">Party</option>
                      <option value="MEETING">Meeting</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Organizer Type</label>
                    <select
                      value={editData.organizerType || ''}
                      onChange={(e) => setEditData({ ...editData, organizerType: e.target.value })}
                      className="select-field"
                    >
                      <option value="ASSOCIATION">Association</option>
                      <option value="COMMITTEE">Committee</option>
                      <option value="COMPANY">Company</option>
                      <option value="PRIVATE">Private</option>
                      <option value="UNIVERSITY">University</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Expected Guests</label>
                    <input
                      type="number"
                      value={editData.expectedGuests || ''}
                      onChange={(e) => setEditData({ ...editData, expectedGuests: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Event Date</label>
                    <input
                      type="date"
                      value={editData.eventDate || ''}
                      onChange={(e) => setEditData({ ...editData, eventDate: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Start Time</label>
                    <input
                      type="time"
                      value={editData.startTime?.slice(0, 5) || ''}
                      onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">End Time</label>
                    <input
                      type="time"
                      value={editData.endTime?.slice(0, 5) || ''}
                      onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="input-field min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-sm font-semibold text-hubble-400 mb-3">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Location</label>
                    <select
                      value={editData.location || ''}
                      onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      className="select-field"
                    >
                      <option value="HUBBLE">Hubble</option>
                      <option value="METEOR">Meteor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Specific Area</label>
                    <input
                      type="text"
                      value={editData.specificArea || ''}
                      onChange={(e) => setEditData({ ...editData, specificArea: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Terrace, Main hall..."
                    />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <h3 className="text-sm font-semibold text-meteor-400 mb-3">Payment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Payment Method</label>
                    <select
                      value={editData.paymentOption || ''}
                      onChange={(e) => setEditData({ ...editData, paymentOption: e.target.value })}
                      className="select-field"
                    >
                      <option value="INDIVIDUAL">People pay individually</option>
                      <option value="ONE_PERSON">One person pays at the end</option>
                      <option value="INVOICE">Invoice (&gt;50 euros only)</option>
                      <option value="COST_CENTER">Kostenplaats</option>
                      <option value="VOUCHERS">Vouchers/Coins</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Cost Center</label>
                    <input
                      type="text"
                      value={editData.costCenter || ''}
                      onChange={(e) => setEditData({ ...editData, costCenter: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Invoice Name</label>
                    <input
                      type="text"
                      value={editData.invoiceName || ''}
                      onChange={(e) => setEditData({ ...editData, invoiceName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Invoice Address</label>
                    <input
                      type="text"
                      value={editData.invoiceAddress || ''}
                      onChange={(e) => setEditData({ ...editData, invoiceAddress: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Food & Drinks */}
              <div>
                <h3 className="text-sm font-semibold text-hubble-400 mb-3">Food & Drinks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.foodRequired || false}
                        onChange={(e) => setEditData({ ...editData, foodRequired: e.target.checked })}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-hubble-500"
                      />
                      <span className="text-sm text-white">Food Required</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="label">Dietary Preference</label>
                    <select
                      value={editData.dietaryPreference || ''}
                      onChange={(e) => setEditData({ ...editData, dietaryPreference: e.target.value })}
                      className="select-field"
                    >
                      <option value="">None</option>
                      <option value="VEGETARIAN">Vegetarian</option>
                      <option value="VEGAN">Vegan</option>
                      <option value="HALAL">Halal</option>
                      <option value="KOSHER">Kosher</option>
                      <option value="MIXED">Mixed Options</option>
                    </select>
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="label">Dietary Notes</label>
                    <input
                      type="text"
                      value={editData.dietaryNotes || ''}
                      onChange={(e) => setEditData({ ...editData, dietaryNotes: e.target.value })}
                      className="input-field"
                      placeholder="Allergies, restrictions, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Additional Comments */}
              <div>
                <h3 className="text-sm font-semibold text-meteor-400 mb-3">Additional</h3>
                <div className="form-group">
                  <label className="label">Comments</label>
                  <textarea
                    value={editData.comments || ''}
                    onChange={(e) => setEditData({ ...editData, comments: e.target.value })}
                    className="input-field min-h-[80px]"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-dark-700">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={isUpdating}
                className="btn-primary flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: typeof Users; label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-dark-500 mt-1 shrink-0" />}
      <div className={Icon ? '' : 'pl-7'}>
        <div className="text-xs text-dark-500">{label}</div>
        <div className="text-white">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const config: Record<string, { color: string; bg: string }> = {
    PENDING: { color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    CONFIRMED: { color: 'text-green-400', bg: 'bg-green-500/20' },
    REJECTED: { color: 'text-red-400', bg: 'bg-red-500/20' },
    CANCELLED: { color: 'text-dark-400', bg: 'bg-dark-500/20' },
    COMPLETED: { color: 'text-blue-400', bg: 'bg-blue-500/20' },
  };

  const { color, bg } = config[status] || config.PENDING;

  return (
    <span className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium
      ${bg} ${color}
      ${large ? 'text-sm' : 'text-xs'}
    `}>
      {status === 'PENDING' && <Clock className="w-4 h-4" />}
      {status === 'CONFIRMED' && <CheckCircle className="w-4 h-4" />}
      {status === 'REJECTED' && <XCircle className="w-4 h-4" />}
      {status === 'CANCELLED' && <XCircle className="w-4 h-4" />}
      {status === 'COMPLETED' && <CheckCircle className="w-4 h-4" />}
      {status}
    </span>
  );
}

