import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Mail, Phone,
  Building2, CreditCard, UtensilsCrossed, MessageSquare,
  CheckCircle, XCircle, Loader2, AlertCircle, Trash2,
  Send, Edit, X, FileText, Paperclip, History, RotateCcw,
  Home, Sun
} from 'lucide-react';
import {
  fetchReservation, updateReservationStatus, deleteReservation, updateReservation,
  updateCateringArranged, fetchEmailAttachments, fetchCateringEmailPreview, sendCateringEmail,
  fetchReservationAuditLog
} from '../lib/api';
import type { Reservation, EmailAttachment } from '../types/reservation';
import type { AuditLogEntry } from '../types/audit';
import { usePermissions } from '../lib/usePermissions';
import { HelpGuide } from '../components/HelpGuide';
import { reservationDetailGuide } from '../lib/guideContent';

// Pre-filled (editable) default shown when rejecting a reservation. Staff can edit or clear it.
const DEFAULT_REJECTION_MESSAGE =
  'Unfortunately we cannot host you since we do not have any places left at this time';

/**
 * Optional free-text message added to the notification email for a reservation action.
 * Only rendered when an email will actually be sent.
 */
function EmailMessageField({
  value,
  onChange,
  show,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <div className="mt-3">
      <label className="block text-sm text-dark-300 mb-1">
        Add a message to the email <span className="text-dark-500">(optional)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field min-h-[80px] w-full"
        placeholder="e.g. We read your special request and will keep a shaded spot for you."
      />
    </div>
  );
}

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts } = useMsal();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  // Optional free-text message added to the status-change email (pre-filled for rejections).
  const [actionMessage, setActionMessage] = useState('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Reservation>>({});
  const [sendEditEmail, setSendEditEmail] = useState(false);
  // Optional free-text message added to the "reservation updated" email.
  const [editMessage, setEditMessage] = useState('');

  // Catering email state
  const [showCateringEmail, setShowCateringEmail] = useState(false);
  const [cateringAttachments, setCateringAttachments] = useState<EmailAttachment[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<number[]>([]);
  const [cateringSubject, setCateringSubject] = useState('');
  const [cateringBody, setCateringBody] = useState('');
  const [cateringReplyTo, setCateringReplyTo] = useState('');
  const [loadingCateringPreview, setLoadingCateringPreview] = useState(false);
  const [sendingCateringEmail, setSendingCateringEmail] = useState(false);
  const [cateringEmailStatus, setCateringEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { canUpdateReservations } = usePermissions();
  const userName = accounts[0]?.name || 'Staff';

  // Loading the audit history must never break the page — failures fall back to empty.
  const loadAuditLog = useCallback(() => {
    if (!id) return;
    setLoadingAudit(true);
    fetchReservationAuditLog(parseInt(id))
      .then(setAuditLog)
      .catch(() => setAuditLog([]))
      .finally(() => setLoadingAudit(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchReservation(parseInt(id))
      .then(data => setReservation(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load reservation'))
      .finally(() => setIsLoading(false));
    // Initial audit load — state is only set inside async callbacks (loadingAudit
    // already starts true), so we don't call setState synchronously in the effect body.
    fetchReservationAuditLog(parseInt(id))
      .then(setAuditLog)
      .catch(() => setAuditLog([]))
      .finally(() => setLoadingAudit(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!reservation) return;

    setIsUpdating(true);
    try {
      await updateReservationStatus(
        reservation.id, newStatus, userName, sendEmail, sendEmail ? actionMessage : undefined);
      setReservation({ ...reservation, status: newStatus });
      loadAuditLog();
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
      expectedGuests: reservation.expectedGuests,
      eventDate: reservation.eventDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      specialActivities: reservation.specialActivities || [],
      longReservationReason: reservation.longReservationReason || '',
      // Location
      location: reservation.location,
      seatingArea: reservation.seatingArea || 'INSIDE',
      // Payment
      paymentOption: reservation.paymentOption,
      costCenter: reservation.costCenter || '',
      invoiceName: reservation.invoiceName || '',
      invoiceAddress: reservation.invoiceAddress || '',
      invoiceType: reservation.invoiceType || '',
      invoiceRemarks: reservation.invoiceRemarks || '',
      // Catering
      cateringDietaryNotes: reservation.cateringDietaryNotes || '',
      // Additional
      comments: reservation.comments || '',
      internalNotes: reservation.internalNotes || '',
    });
    setEditMessage('');
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    if (!reservation) return;

    setIsUpdating(true);
    try {
      const updatedReservation = await updateReservation(
        reservation.id, editData, sendEditEmail, sendEditEmail ? editMessage : undefined);
      setReservation(updatedReservation);
      setIsEditing(false);
      setEditData({});
      loadAuditLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reservation');
    } finally {
      setIsUpdating(false);
    }
  };

  const hasCateringActivity = reservation?.specialActivities?.some(a =>
    ['EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM'].includes(a)
  );

  const openCateringEmailDialog = async () => {
    if (!reservation) return;
    setShowCateringEmail(true);
    setLoadingCateringPreview(true);
    setCateringEmailStatus(null);
    setSelectedAttachmentIds([]);
    setCateringReplyTo('');

    try {
      const [preview, attachments] = await Promise.all([
        fetchCateringEmailPreview(reservation.id),
        fetchEmailAttachments(),
      ]);
      setCateringSubject(preview.subject);
      setCateringBody(preview.body);
      if (preview.defaultReplyTo) setCateringReplyTo(preview.defaultReplyTo);
      const activeAttachments = attachments.filter(a => a.active);
      setCateringAttachments(activeAttachments);
      setSelectedAttachmentIds(activeAttachments.map(a => a.id));
    } catch (err) {
      setCateringEmailStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load preview' });
    } finally {
      setLoadingCateringPreview(false);
    }
  };

  const handleSendCateringEmail = async () => {
    if (!reservation) return;
    setSendingCateringEmail(true);
    setCateringEmailStatus(null);

    try {
      await sendCateringEmail(reservation.id, {
        attachmentIds: selectedAttachmentIds,
        subject: cateringSubject,
        body: cateringBody,
        replyTo: cateringReplyTo || undefined,
      });
      setCateringEmailStatus({ type: 'success', message: 'Catering email sent successfully!' });
    } catch (err) {
      setCateringEmailStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send email' });
    } finally {
      setSendingCateringEmail(false);
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
          <h1 className="text-2xl font-title font-bold text-white">{reservation.eventTitle}</h1>
          <p className="text-dark-400 font-light">
            Confirmation: <span className="text-white font-mono">{reservation.confirmationNumber || `#${reservation.id}`}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpGuide title="Reservation Detail Guide" sections={reservationDetailGuide} />
          <StatusBadge status={reservation.status} large />
        </div>
      </div>

      {/* Actions */}
      {canUpdateReservations && (
      <div className="card">
        <h2 className="text-lg font-title font-semibold text-white mb-4">Actions</h2>

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
            data-testid="edit-reservation"
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-hubble-500/20 text-hubble-400 hover:bg-hubble-500/30 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Details
          </button>

          {hasCateringActivity && reservation.status !== 'REJECTED' && (
            <button
              onClick={openCateringEmailDialog}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Send Catering Options
            </button>
          )}

          {reservation.status === 'PENDING' && (
            <>
              <button
                onClick={() => { setActionMessage(''); setShowConfirmDialog(true); }}
                data-testid="confirm-reservation"
                disabled={isUpdating}
                className="btn-primary flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm
              </button>
              <button
                onClick={() => { setActionMessage(DEFAULT_REJECTION_MESSAGE); setShowRejectDialog(true); }}
                data-testid="reject-reservation"
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
              onClick={() => { setActionMessage(''); setShowCompleteDialog(true); }}
              disabled={isUpdating}
              className="btn-secondary flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Mark Completed
            </button>
          )}

          {reservation.status === 'CONFIRMED' && (
            <button
              onClick={() => { setActionMessage(''); setShowCancelDialog(true); }}
              data-testid="cancel-reservation"
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors ml-auto"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}

          {/* A rejected event is often only rejected because the date or location needs to
              change. Reopening it puts it back to PENDING so staff can edit the existing
              details instead of asking the customer to submit everything again. */}
          {reservation.status === 'REJECTED' && (
            <button
              onClick={() => { setActionMessage(''); setSendEmail(false); setShowReopenDialog(true); }}
              data-testid="reopen-reservation"
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Move back to Pending
            </button>
          )}

          {(reservation.status === 'CANCELLED' || reservation.status === 'REJECTED') && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              data-testid="remove-reservation"
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/50">
            <p className="text-red-400 mb-3">Are you sure you want to delete this reservation? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                data-testid="delete-dialog-submit"
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

        {/* Confirm Reservation Dialog */}
        {showConfirmDialog && (
          <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/50">
            <p className="text-green-400 mb-3">Are you sure you want to confirm this reservation? {sendEmail && 'A confirmation email will be sent to the customer.'}</p>
            <EmailMessageField value={actionMessage} onChange={setActionMessage} show={sendEmail} />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  handleStatusChange('CONFIRMED');
                  setShowConfirmDialog(false);
                }}
                data-testid="confirm-dialog-submit"
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Yes, Confirm Reservation
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reject Reservation Dialog */}
        {showRejectDialog && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/50">
            <p className="text-red-400 mb-3">Are you sure you want to reject this reservation? {sendEmail && 'A rejection email will be sent to the customer.'}</p>
            <EmailMessageField value={actionMessage} onChange={setActionMessage} show={sendEmail} />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  handleStatusChange('REJECTED');
                  setShowRejectDialog(false);
                }}
                data-testid="reject-dialog-submit"
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Yes, Reject Reservation
              </button>
              <button
                onClick={() => setShowRejectDialog(false)}
                className="px-4 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Complete Reservation Dialog */}
        {showCompleteDialog && (
          <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/50">
            <p className="text-blue-400 mb-3">Are you sure you want to mark this reservation as completed?</p>
            <EmailMessageField value={actionMessage} onChange={setActionMessage} show={sendEmail} />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  handleStatusChange('COMPLETED');
                  setShowCompleteDialog(false);
                }}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Yes, Mark Completed
              </button>
              <button
                onClick={() => setShowCompleteDialog(false)}
                className="px-4 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cancel Reservation Dialog */}
        {showCancelDialog && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/50">
            <p className="text-amber-400 mb-3">Are you sure you want to cancel this reservation? {sendEmail && 'A cancellation email will be sent to the customer.'}</p>
            <EmailMessageField value={actionMessage} onChange={setActionMessage} show={sendEmail} />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  handleStatusChange('CANCELLED');
                  setShowCancelDialog(false);
                }}
                data-testid="cancel-dialog-submit"
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Yes, Cancel Reservation
              </button>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Reopen (Reject -> Pending) Dialog */}
        {showReopenDialog && (
          <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/50">
            <p className="text-yellow-400 mb-3">
              Move this rejected reservation back to <strong>Pending</strong>? You'll be able to
              edit the date, location and other details, then confirm or reject it again.
              {sendEmail && ' A status-update email will be sent to the customer.'}
            </p>
            <EmailMessageField value={actionMessage} onChange={setActionMessage} show={sendEmail} />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  handleStatusChange('PENDING');
                  setShowReopenDialog(false);
                }}
                data-testid="reopen-dialog-submit"
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Yes, Move to Pending
              </button>
              <button
                onClick={() => setShowReopenDialog(false)}
                className="px-4 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="card">
          <h2 className="text-lg font-title font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-hubble-400" />
            Contact Information
          </h2>
          <div className="space-y-4">
            <InfoRow icon={Users} label="Name" value={reservation.contactName} />
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-dark-500 mt-1 shrink-0" />
              <div>
                <div className="text-xs text-dark-500">Email</div>
                <a
                  href={`mailto:${reservation.email}?subject=${encodeURIComponent(`Re: Your reservation "${reservation.eventTitle}"`)}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {reservation.email}
                </a>
              </div>
            </div>
            <InfoRow icon={Phone} label="Phone" value={reservation.phoneNumber} />
            <InfoRow icon={Building2} label="Organization" value={reservation.organizationName} />
          </div>
        </div>

        {/* Event Details */}
        <div className="card">
          <h2 className="text-lg font-title font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-meteor-400" />
            Event Details
          </h2>
          <div className="space-y-4">
            <InfoRow icon={Calendar} label="Date" value={new Date(reservation.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            <InfoRow icon={Clock} label="Time" value={`${reservation.startTime.slice(0, 5)} - ${reservation.endTime.slice(0, 5)}`} />
            <InfoRow icon={MapPin} label="Location" value={reservation.location} />
            {/* Inside/outside is set on booking and editable, but was previously only visible
                in edit mode — surface it here so staff can see it at a glance. */}
            {(reservation.seatingArea === 'INSIDE' || reservation.seatingArea === 'OUTSIDE') && (
              <div className="flex items-start gap-3">
                <div className="pl-7">
                  <div className="text-xs text-dark-500">Seating Area</div>
                  <div className="mt-1">
                    <SeatingAreaBadge area={reservation.seatingArea} />
                  </div>
                </div>
              </div>
            )}
            <InfoRow icon={Users} label="Expected Guests" value={reservation.expectedGuests.toString()} />
            <div className="flex items-start gap-3">
              <div className="pl-7">
                <div className="text-xs text-dark-500">Special Activities</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {reservation.specialActivities && reservation.specialActivities.length > 0
                    ? reservation.specialActivities.map((activity) => (
                        <span key={activity} className="px-2 py-0.5 rounded-full bg-hubble-500/20 text-hubble-400 text-xs">
                          {activity.replace(/_/g, ' ')}
                        </span>
                      ))
                    : <span className="text-dark-400 text-sm">None</span>
                  }
                </div>
              </div>
            </div>
            {reservation.longReservationReason && (
              <InfoRow label="Long Reservation Reason" value={reservation.longReservationReason} />
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div className="card">
          <h2 className="text-lg font-title font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-hubble-400" />
            Payment Information
          </h2>
          <div className="space-y-4">
            <InfoRow label="Payment Method" value={reservation.paymentOption} />
            <InfoRow label="Cost Center" value={reservation.costCenter} />
            <InfoRow label="Invoice Name" value={reservation.invoiceName} />
            <InfoRow label="Invoice Address" value={reservation.invoiceAddress} />
            <InfoRow label="Invoice Type" value={reservation.invoiceType} />
            <InfoRow label="Invoice Remarks" value={reservation.invoiceRemarks} />
          </div>
        </div>

        {/* Additional Information */}
        <div className="card">
          <h2 className="text-lg font-title font-semibold text-white mb-4 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-meteor-400" />
            Additional Information
          </h2>
          <div className="space-y-4">
            {reservation.cateringDietaryNotes && (
              <InfoRow label="Catering Dietary Notes" value={reservation.cateringDietaryNotes} />
            )}
            {reservation.specialActivities?.some(a => ['EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM'].includes(a)) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-400">Catering Arranged</span>
                {canUpdateReservations ? (
                <button
                  type="button"
                  onClick={async () => {
                    const newValue = !reservation.cateringArranged;
                    try {
                      const updated = await updateCateringArranged(reservation.id, newValue);
                      setReservation({ ...reservation, cateringArranged: updated.cateringArranged });
                      loadAuditLog();
                    } catch (error) { console.error('Failed to update catering status:', error); }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    reservation.cateringArranged
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                  }`}
                >
                  <UtensilsCrossed className="w-3 h-3" />
                  {reservation.cateringArranged ? 'Arranged ✓ (click to undo)' : 'Not arranged yet (click to mark done)'}
                </button>
                ) : (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    reservation.cateringArranged
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                  <UtensilsCrossed className="w-3 h-3" />
                  {reservation.cateringArranged ? 'Arranged ✓' : 'Not arranged yet'}
                </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description & Comments */}
      {(reservation.description || reservation.comments || reservation.internalNotes) && (
        <div className="card">
          <h2 className="text-lg font-title font-semibold text-white mb-4 flex items-center gap-2">
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
            <div className="mb-4">
              <div className="text-sm text-dark-400 mb-1">Additional Comments</div>
              <p className="text-white">{reservation.comments}</p>
            </div>
          )}
          {reservation.internalNotes && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-yellow-400 mb-1">Internal Notes (staff only)</div>
              <p className="text-sm text-white whitespace-pre-wrap">{reservation.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Change History */}
      <div className="card">
        <h2 className="text-lg font-title font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-hubble-400" />
          Change History
        </h2>
        {loadingAudit ? (
          <div className="flex items-center gap-2 text-dark-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
          </div>
        ) : auditLog.length === 0 ? (
          <p className="text-sm text-dark-400">No changes recorded yet.</p>
        ) : (
          <ol className="space-y-4">
            {auditLog.map((entry) => (
              <li key={entry.id} className="border-l-2 border-dark-700 pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-hubble-400" />
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <AuditActionBadge action={entry.action} />
                  <time className="text-xs text-dark-500">{new Date(entry.createdAt).toLocaleString()}</time>
                </div>
                <div className="text-sm text-dark-300 mt-1">
                  <span className="text-white">{entry.actorName || entry.actorEmail || 'system'}</span>
                  {entry.summary && <span className="text-dark-400"> — {entry.summary}</span>}
                </div>
                {entry.changes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-xs text-dark-400">
                        <code className="text-dark-300">{change.field}</code>:{' '}
                        <span className="line-through text-red-400/70">{change.oldValue ?? '—'}</span>
                        {' → '}
                        <span className="text-green-400/80">{change.newValue ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Metadata */}
      <div className="text-sm text-dark-500 flex gap-6">
        {reservation.createdAt && <span>Created: {new Date(reservation.createdAt).toLocaleString()}</span>}
        {reservation.updatedAt && <span>Updated: {new Date(reservation.updatedAt).toLocaleString()}</span>}
        {reservation.confirmedBy && <span>Confirmed by: {reservation.confirmedBy}</span>}
      </div>

      {/* Catering Email Modal */}
      {showCateringEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-title font-semibold text-white flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                Send Catering Options
              </h2>
              <button onClick={() => setShowCateringEmail(false)} className="text-dark-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingCateringPreview ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Status message */}
                {cateringEmailStatus && (
                  <div className={`p-3 rounded-lg border ${
                    cateringEmailStatus.type === 'success'
                      ? 'bg-green-500/10 border-green-500/50 text-green-400'
                      : 'bg-red-500/10 border-red-500/50 text-red-400'
                  }`}>
                    {cateringEmailStatus.message}
                  </div>
                )}

                {/* Recipient info */}
                <div className="text-sm text-dark-400">
                  Sending to: <span className="text-white">{reservation.email}</span>
                </div>

                {/* Reply-to */}
                <div className="form-group">
                  <label className="label">Reply-To Email (optional)</label>
                  <input
                    type="email"
                    value={cateringReplyTo}
                    onChange={(e) => setCateringReplyTo(e.target.value)}
                    placeholder="e.g. events@hubble.cafe"
                    className="input-field"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="label flex items-center gap-2 mb-2">
                    <Paperclip className="w-4 h-4" />
                    PDF Attachments
                  </label>
                  {cateringAttachments.length === 0 ? (
                    <p className="text-sm text-dark-500">No active attachments available. Upload PDFs in Email Templates &gt; PDF Attachments.</p>
                  ) : (
                    <div className="space-y-2">
                      {cateringAttachments.map((att) => (
                        <label key={att.id} className="flex items-center gap-3 p-2 rounded-lg bg-dark-800 hover:bg-dark-750 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAttachmentIds.includes(att.id)}
                            onChange={(e) => {
                              setSelectedAttachmentIds(
                                e.target.checked
                                  ? [...selectedAttachmentIds, att.id]
                                  : selectedAttachmentIds.filter(id => id !== att.id)
                              );
                            }}
                            className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-hubble-500"
                          />
                          <FileText className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-white">{att.name}</span>
                          <span className="text-xs text-dark-500">({att.filename})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="form-group">
                  <label className="label">Subject</label>
                  <input
                    type="text"
                    value={cateringSubject}
                    onChange={(e) => setCateringSubject(e.target.value)}
                    className="input-field"
                  />
                </div>

                {/* Body */}
                <div className="form-group">
                  <label className="label">Email Body (HTML)</label>
                  <textarea
                    value={cateringBody}
                    onChange={(e) => setCateringBody(e.target.value)}
                    className="input-field min-h-[200px] font-mono text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 p-6 border-t border-dark-700">
              <button
                onClick={() => setShowCateringEmail(false)}
                className="px-4 py-2 rounded-xl border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCateringEmail}
                disabled={sendingCateringEmail || loadingCateringPreview}
                className="btn-primary flex items-center gap-2"
              >
                {sendingCateringEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-title font-semibold text-white">Edit Reservation</h2>
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

              <EmailMessageField value={editMessage} onChange={setEditMessage} show={sendEditEmail} />

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
                  <div className="form-group md:col-span-2">
                    <label className="label">Special Activities</label>
                    <div className="flex flex-wrap gap-2">
                      {['GRADUATION', 'EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM', 'PRIVATE_EVENT'].map((activity) => {
                        const labels: Record<string, string> = {
                          GRADUATION: 'Graduation / PhD Defense',
                          EAT_A_LA_CARTE: 'Eat a la Carte',
                          EAT_CATERING: 'Eat Catering',
                          CATERING_CORONA_ROOM: 'Catering Corona Room',
                          PRIVATE_EVENT: 'Private Event',
                        };
                        const selected = (editData.specialActivities || []).includes(activity);
                        return (
                          <button
                            key={activity}
                            type="button"
                            onClick={() => {
                              const current = editData.specialActivities || [];
                              setEditData({
                                ...editData,
                                specialActivities: selected
                                  ? current.filter((a: string) => a !== activity)
                                  : [...current, activity],
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              selected
                                ? 'bg-hubble-500/20 text-hubble-400 border border-hubble-500/50'
                                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-600'
                            }`}
                          >
                            {labels[activity]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">Expected Guests</label>
                    <input
                      type="number"
                      data-testid="edit-guests"
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
                      <option value="">No Preference</option>
                      <option value="HUBBLE">Hubble</option>
                      <option value="METEOR">Meteor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Seating Area</label>
                    <select
                      value={editData.seatingArea || ''}
                      onChange={(e) => setEditData({ ...editData, seatingArea: e.target.value })}
                      className="select-field"
                    >
                      <option value="INSIDE">Inside</option>
                      <option value="OUTSIDE">Outside</option>
                    </select>
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
                    </select>
                  </div>
                  {editData.paymentOption === 'INVOICE' && (
                    <>
                      <div className="form-group">
                        <label className="label">Invoice Type</label>
                        <select
                          value={editData.invoiceType || ''}
                          onChange={(e) => setEditData({ ...editData, invoiceType: e.target.value })}
                          className="select-field"
                        >
                          <option value="">Select type...</option>
                          <option value="TUE">TU/e</option>
                          <option value="FONTYS">Fontys</option>
                          <option value="EXTERNAL">External</option>
                        </select>
                      </div>
                      {(editData.invoiceType === 'TUE' || editData.invoiceType === 'FONTYS') && (
                        <div className="form-group">
                          <label className="label">Kostenplaats</label>
                          <input
                            type="text"
                            value={editData.costCenter || ''}
                            onChange={(e) => setEditData({ ...editData, costCenter: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      )}
                      {editData.invoiceType === 'EXTERNAL' && (
                        <>
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
                          <div className="form-group md:col-span-2">
                            <label className="label">Invoice Remarks</label>
                            <textarea
                              value={editData.invoiceRemarks || ''}
                              onChange={(e) => setEditData({ ...editData, invoiceRemarks: e.target.value })}
                              className="input-field min-h-[60px]"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Catering & Other */}
              <div>
                <h3 className="text-sm font-semibold text-hubble-400 mb-3">Catering & Other</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group md:col-span-2">
                    <label className="label">Catering Dietary Notes</label>
                    <textarea
                      value={editData.cateringDietaryNotes || ''}
                      onChange={(e) => setEditData({ ...editData, cateringDietaryNotes: e.target.value })}
                      className="input-field min-h-[60px]"
                      placeholder="Allergies, dietary requirements for catering..."
                    />
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="label">Long Reservation Reason</label>
                    <textarea
                      value={editData.longReservationReason || ''}
                      onChange={(e) => setEditData({ ...editData, longReservationReason: e.target.value })}
                      className="input-field min-h-[60px]"
                      placeholder="Reason for reservation longer than 3 hours..."
                    />
                  </div>
                </div>
              </div>

              {/* Additional Comments */}
              <div>
                <h3 className="text-sm font-semibold text-meteor-400 mb-3">Additional</h3>
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="label">Comments</label>
                    <textarea
                      value={editData.comments || ''}
                      onChange={(e) => setEditData({ ...editData, comments: e.target.value })}
                      className="input-field min-h-[80px]"
                      placeholder="Any additional notes..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Internal Notes <span className="text-yellow-400 text-xs">(staff only, not sent to customer)</span></label>
                    <textarea
                      value={editData.internalNotes || ''}
                      onChange={(e) => setEditData({ ...editData, internalNotes: e.target.value })}
                      className="input-field min-h-[80px]"
                      placeholder="Internal notes, e.g. catering arrangements, special requests handled..."
                    />
                  </div>
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
                data-testid="edit-save"
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

// Surfaces the inside/outside seating area as a colored badge so staff can see it at a
// glance, without having to open the editor.
function SeatingAreaBadge({ area }: { area: string }) {
  const isInside = area === 'INSIDE';
  const Icon = isInside ? Home : Sun;
  return (
    <span
      data-testid="seating-area-badge"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
        isInside
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      }`}
    >
      <Icon className="w-3 h-3" />
      {isInside ? 'Inside' : 'Outside'}
    </span>
  );
}

function AuditActionBadge({ action }: { action: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    CREATE: { label: 'Created', color: 'text-green-400', bg: 'bg-green-500/20' },
    UPDATE: { label: 'Updated', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    DELETE: { label: 'Deleted', color: 'text-red-400', bg: 'bg-red-500/20' },
    STATUS_CHANGE: { label: 'Status changed', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    NOTES_UPDATED: { label: 'Notes updated', color: 'text-hubble-400', bg: 'bg-hubble-500/20' },
    CATERING_ARRANGED: { label: 'Catering', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    EMAIL_SENT: { label: 'Email sent', color: 'text-meteor-400', bg: 'bg-meteor-500/20' },
  };
  const { label, color, bg } = config[action] || { label: action, color: 'text-dark-300', bg: 'bg-dark-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>{label}</span>;
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
    <span
      data-testid="reservation-status"
      className={`
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

