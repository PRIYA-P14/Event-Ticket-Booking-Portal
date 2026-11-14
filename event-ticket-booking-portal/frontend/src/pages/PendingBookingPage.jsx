import { useEffect, useState } from 'react'
import { toast, Toaster } from 'react-hot-toast'
import PaymentButton from '../components/PaymentButton'
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
        <main className="payment-page"><p>Loading booking...</p></main>
      </>
    )
  }

  if (!hasRequiredContext || error) {
    return (
      <>
        <Toaster />
        <main className="payment-page">
          <section className="payment-card payment-error" role="alert">
            <h1>Unable to load payment</h1>
            <p>{error || 'A booking and authenticated attendee session are required.'}</p>
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
          <p className="eyebrow">Pending booking</p>
          <h1>Complete your booking</h1>
          <dl className="booking-summary">
            <div>
              <dt>Booking reference</dt>
              <dd>{booking.bookingReference}</dd>
            </div>
            <div>
              <dt>Event</dt>
              <dd>{event?.title || 'Event unavailable'}</dd>
            </div>
            <div>
              <dt>Tickets</dt>
              <dd>{booking.quantity}</dd>
            </div>
            <div>
              <dt>Total amount</dt>
              <dd>₹{Number(booking.totalPrice).toFixed(2)}</dd>
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
