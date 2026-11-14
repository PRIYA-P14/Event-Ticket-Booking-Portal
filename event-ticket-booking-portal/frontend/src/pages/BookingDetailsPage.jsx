import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, Ticket, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { getBookingDetails } from '../lib/bookingApi'
import { getPaymentStatus } from '../lib/paymentApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

function BookingDetailsPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [booking, setBooking] = useState(null)
  const [payment, setPayment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    getBookingDetails(bookingId, accessToken)
      .then((loadedBooking) => {
        if (!isMounted) return
        setBooking(loadedBooking)
        return getPaymentStatus(bookingId, accessToken)
          .then((loadedPayment) => {
            if (isMounted) setPayment(loadedPayment)
          })
          .catch((paymentError) => {
            if (paymentError.response?.status !== 404 && isMounted) {
              setError(paymentError.response?.data?.message || 'Unable to load payment status.')
            }
          })
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'We could not load this booking.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, bookingId])

  if (isLoading) {
    return <main className="booking-details-page"><div className="state-card"><div className="loader" />Loading booking details...</div></main>
  }

  if (error || !booking) {
    return (
      <main className="booking-details-page">
        <section className="state-card state-card--error" role="alert">
          <h1>Booking unavailable</h1>
          <p>{error || 'This booking could not be found.'}</p>
          <Link className="text-link" to="/bookings"><ArrowLeft size={16} /> Back to my bookings</Link>
        </section>
      </main>
    )
  }

  const event = booking.eventId
  const canPay = booking.status === 'PENDING_PAYMENT'

  return (
    <main className="booking-details-page">
      <Link className="back-link back-link--light" to="/bookings"><ArrowLeft size={16} /> Back to my bookings</Link>
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
        {canPay && (
          <div className="booking-details__payment">
            <p>Your seats are reserved pending payment.</p>
            <button type="button" className="primary-button" onClick={() => navigate(`/?bookingId=${booking._id}`)}>
              Proceed to payment <ArrowRight size={17} />
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export default BookingDetailsPage
