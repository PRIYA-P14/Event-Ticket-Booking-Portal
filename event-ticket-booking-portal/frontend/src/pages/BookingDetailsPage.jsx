import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, Clock3, MapPin, Ticket, Users, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import BackButton from '../components/BackButton'
import { cancelBooking, getBookingDetails } from '../lib/bookingApi'
import { getPaymentStatus } from '../lib/paymentApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

const cancellableStatuses = ['BOOKED', 'PENDING_PAYMENT']

function CancellationDialog({ booking, payment, isSubmitting, error, onCancel, onConfirm }) {
  const isPaid = booking.status === 'BOOKED' || payment?.paymentStatus === 'SUCCESS'

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="cancellation-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
        <button type="button" className="dialog-close" onClick={onCancel} aria-label="Close cancellation dialog" disabled={isSubmitting}>
          <X size={20} />
        </button>
        <div className="cancellation-dialog__icon"><AlertTriangle size={25} /></div>
        <p className="eyebrow">Please confirm</p>
        <h2 id="cancel-dialog-title">Cancel this booking?</h2>
        <p className="cancellation-dialog__lead">
          You are cancelling your reservation for <strong>{booking.eventId?.title || 'this event'}</strong>.
        </p>
        <dl className="cancellation-dialog__summary">
          <div><dt>Tickets</dt><dd>{booking.quantity}</dd></div>
          <div><dt>Total amount</dt><dd>{formatCurrency(booking.totalPrice)}</dd></div>
        </dl>
        <p className="cancellation-dialog__notice">
          {isPaid
            ? 'This is a demo payment. No real money was collected, so no refund is required.'
            : 'This pending-payment booking has not been paid. No refund is required, and your reserved seats will be released.'}
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="cancellation-dialog__actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={isSubmitting}>Keep booking</button>
          <button type="button" className="cancel-button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Cancelling...' : 'Confirm cancellation'}
          </button>
        </div>
      </section>
    </div>
  )
}

function BookingDetailsPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [booking, setBooking] = useState(null)
  const [payment, setPayment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [cancellationMessage, setCancellationMessage] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancellationError, setCancellationError] = useState('')

  const loadBookingDetails = useCallback(async (isMounted = () => true) => {
    const loadedBooking = await getBookingDetails(bookingId, accessToken)
    if (!isMounted()) return
    setBooking(loadedBooking)

    const paymentResult = await getPaymentStatus(bookingId, accessToken).catch((requestError) => {
      if (requestError.response?.status !== 404) setPaymentError(requestError.response?.data?.message || 'Unable to load payment status.')
      return null
    })
    if (isMounted() && paymentResult) setPayment(paymentResult)

  }, [accessToken, bookingId])

  useEffect(() => {
    let isMounted = true
    Promise.resolve()
      .then(() => loadBookingDetails(() => isMounted))
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'We could not load this booking.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [loadBookingDetails])

  const handleCancellation = async () => {
    if (isCancelling) return

    setCancellationError('')
    setIsCancelling(true)
    try {
      const result = await cancelBooking(bookingId, accessToken)
      setCancellationMessage(result.message || 'Your booking was cancelled successfully.')
      setIsDialogOpen(false)
      setIsLoading(true)
      setPaymentError('')
      await loadBookingDetails()
    } catch (requestError) {
      setCancellationError(requestError.response?.data?.message || 'Unable to cancel this booking. Please try again.')
    } finally {
      setIsCancelling(false)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <main className="booking-details-page"><div className="state-card"><div className="loader" />Loading booking details...</div></main>
  }

  if (error || !booking) {
    return (
      <main className="booking-details-page">
        <section className="state-card state-card--error" role="alert">
          <h1>Booking unavailable</h1>
          <p>{error || 'This booking could not be found.'}</p>
          <BackButton fallback="/bookings" />
        </section>
      </main>
    )
  }

  const event = booking.eventId
  const canPay = booking.status === 'PENDING_PAYMENT'
  const isEventStarted = Boolean(event?.startAt && new Date(event.startAt) <= new Date())
  const canCancel = cancellableStatuses.includes(booking.status)

  return (
    <main className="booking-details-page">
      <BackButton fallback="/bookings" />
      {cancellationMessage && <div className="cancellation-success" role="status">{cancellationMessage}</div>}
      <section className="booking-details-card">
        <div className="booking-details-card__header">
          <div>
            <p className="eyebrow">Booking details</p>
            <h1>{booking.bookingReference}</h1>
          </div>
          <span className={`status-pill status-pill--${booking.status.toLowerCase()}`}>{booking.status.replaceAll('_', ' ')}</span>
        </div>
        <div className="booking-details-card__event">
          <div className="booking-details-card__icon"><Ticket size={34} aria-hidden="true" /></div>
          <div>
            <h2>{event?.title || 'Event unavailable'}</h2>
            <div className="booking-details__facts">
              <span><CalendarDays size={17} />{event?.startAt ? formatDate(event.startAt) : 'Date unavailable'}</span>
              {event?.startAt && <span><Clock3 size={17} />{formatTime(event.startAt)}</span>}
              <span><MapPin size={17} />{event?.venueId?.name || 'Venue unavailable'}</span>
              {event?.venueId?.address && <span>{event.venueId.address}</span>}
            </div>
          </div>
        </div>
        <div className="booking-details__grid">
          <div><span>Tickets</span><strong>{booking.quantity}</strong><Users size={17} /></div>
          <div><span>Total amount</span><strong>{formatCurrency(booking.totalPrice)}</strong></div>
          <div><span>Booking date</span><strong>{formatDate(booking.createdAt)}</strong></div>
          <div><span>Payment status</span><strong>{payment?.status || 'Not started'}</strong></div>
        </div>
        {paymentError && <p className="booking-details__warning" role="alert">{paymentError}</p>}
        {canPay && (
          <div className="booking-details__payment">
            <p>Your seats are reserved pending payment.</p>
            <button type="button" className="primary-button" onClick={() => navigate(`/?bookingId=${booking._id}`)}>
              Proceed to payment <ArrowRight size={17} />
            </button>
          </div>
        )}
        {canCancel && (
          <div className="booking-details__cancel">
            <div>
              <strong>{isEventStarted ? 'Cancellation is closed' : 'Need to cancel?'}</strong>
              <span>{isEventStarted ? 'This event has already started.' : 'Demo payments do not require refunds.'}</span>
            </div>
            <button type="button" className="cancel-button" disabled={isEventStarted || isCancelling} onClick={() => setIsDialogOpen(true)}>
              Cancel ticket
            </button>
          </div>
        )}
      </section>
      {isDialogOpen && (
        <CancellationDialog
          booking={booking}
          payment={payment}
          isSubmitting={isCancelling}
          error={cancellationError}
          onCancel={() => {
            if (!isCancelling) {
              setCancellationError('')
              setIsDialogOpen(false)
            }
          }}
          onConfirm={handleCancellation}
        />
      )}
    </main>
  )
}

export default BookingDetailsPage
