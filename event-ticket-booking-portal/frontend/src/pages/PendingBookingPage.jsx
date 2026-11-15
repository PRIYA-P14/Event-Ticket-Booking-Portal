import { useEffect, useState } from 'react'
import { CalendarDays, Ticket, Users } from 'lucide-react'
import { toast, Toaster } from 'react-hot-toast'
import PaymentButton from '../components/PaymentButton'
import BackButton from '../components/BackButton'
import { getBooking } from '../lib/paymentApi'

function PendingBookingPage({ bookingId, accessToken }) {
  const hasRequiredContext = Boolean(bookingId && accessToken)
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(hasRequiredContext)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    if (!hasRequiredContext) {
      return () => {
        isMounted = false
      }
    }

    getBooking(bookingId, accessToken)
      .then((loadedBooking) => {
        if (isMounted) setBooking(loadedBooking)
      })
      .catch((requestError) => {
        if (!isMounted) return
        const message =
          requestError.response?.data?.message || 'Unable to load this booking.'
        setError(message)
        toast.error(message)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, bookingId, hasRequiredContext])

  if (isLoading) {
    return (
      <>
        <Toaster />
        <main className="payment-page">
          <div className="payment-loading"><div className="loader" />Loading booking...</div>
        </main>
      </>
    )
  }

  if (!hasRequiredContext || error) {
    return (
      <>
        <Toaster />
        <main className="payment-page">
          <section className="payment-card payment-error" role="alert">
            <BackButton fallback="/bookings" />
            <div className="payment-card__icon payment-card__icon--error">!</div>
            <h1>Unable to load payment</h1>
            <p>{error || 'A booking and authenticated attendee session are required.'}</p>
            <BackButton fallback="/bookings" />
          </section>
        </main>
      </>
    )
  }

  const event = booking.eventId
  const isPending = booking.status === 'PENDING_PAYMENT'

  return (
    <>
      <Toaster />
      <main className="payment-page">
        <section className="payment-card">
          <BackButton fallback="/bookings" />
          <div className="payment-card__heading">
            <div>
              <p className="eyebrow">{isPending ? 'Pending booking' : 'Booking confirmed'}</p>
              <h1>{isPending ? 'Complete your booking' : 'Payment confirmed'}</h1>
            </div>
            <div className={`payment-card__icon ${isPending ? '' : 'payment-card__icon--success'}`}>
              <Ticket size={26} aria-hidden="true" />
            </div>
          </div>
          <p className="payment-card__lead">
            {isPending ? 'Your seats are reserved. Complete the demo payment to confirm your tickets.' : 'Your tickets are confirmed. No actual money was collected.'}
          </p>
          <dl className="booking-summary">
            <div>
              <dt>Booking reference</dt>
              <dd className="booking-reference">{booking.bookingReference}</dd>
            </div>
            <div>
              <dt>Event</dt>
              <dd><span className="payment-detail"><CalendarDays size={16} />{event?.title || 'Event unavailable'}</span></dd>
            </div>
            <div>
              <dt>Tickets</dt>
              <dd><span className="payment-detail"><Users size={16} />{booking.quantity}</span></dd>
            </div>
            <div>
              <dt>Total amount</dt>
              <dd className="payment-total">₹{Number(booking.totalPrice).toFixed(2)}</dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd><span className={`payment-status ${isPending ? 'payment-status--pending' : 'payment-status--success'}`}><span className="payment-status__dot" />{isPending ? 'PENDING PAYMENT' : 'SUCCESS'}</span></dd>
            </div>
          </dl>

          {isPending ? (
            <PaymentButton
              booking={booking}
              accessToken={accessToken}
              onPaymentConfirmed={(result) => {
                setBooking((currentBooking) => ({
                  ...currentBooking,
                  status: result.booking.status,
                }))
              }}
            />
            
          ) : (
            <p className="payment-success" role="status">
              Payment confirmed. Booking reference: {booking.bookingReference}
            </p>
          )}
        </section>
      </main>
    </>
  )
}

export default PendingBookingPage
