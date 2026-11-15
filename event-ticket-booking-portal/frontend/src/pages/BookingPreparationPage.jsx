import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, MapPin, Minus, Plus, Ticket, Users } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import BackButton from '../components/BackButton'
import { getEvent } from '../lib/eventApi'
import { createBooking } from '../lib/bookingApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

function BookingConfirmation({ booking }) {
  const navigate = useNavigate()
  const event = booking.eventId

  return (
    <main className="booking-page">
      <BackButton fallback="/events" />
      <section className="booking-confirmation">
        <div className="booking-confirmation__mark"><Ticket size={30} aria-hidden="true" /></div>
        <p className="eyebrow">Reservation created</p>
        <h1>Your tickets are reserved.</h1>
        <p className="booking-confirmation__lead">
          Complete payment to confirm your booking. Your seats are currently held pending payment.
        </p>
        <dl className="booking-summary">
          <div><dt>Booking reference</dt><dd>{booking.bookingReference}</dd></div>
          <div><dt>Event</dt><dd>{event?.title || 'Event unavailable'}</dd></div>
          <div><dt>Tickets</dt><dd>{booking.quantity}</dd></div>
          <div><dt>Total amount</dt><dd>{formatCurrency(booking.totalPrice)}</dd></div>
          <div><dt>Status</dt><dd><span className="status-pill">{booking.status}</span></dd></div>
        </dl>
        <div className="booking-confirmation__actions">
          <button type="button" className="primary-button" onClick={() => navigate(`/?bookingId=${booking._id}`)}>
            Proceed to payment <ArrowRight size={17} aria-hidden="true" />
          </button>
          <Link className="text-link" to="/events">Browse more events</Link>
        </div>
      </section>
    </main>
  )
}

function BookingPreparationPage() {
  const [searchParams] = useSearchParams()
  const { accessToken, user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const eventId = searchParams.get('eventId')
  const [event, setEvent] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(eventId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(() => eventId ? '' : 'A valid event is required to start a booking.')

  useEffect(() => {
    let isMounted = true
    if (!eventId) {
      return () => {
        isMounted = false
      }
    }

    getEvent(eventId)
      .then((loadedEvent) => {
        if (isMounted) {
          setEvent(loadedEvent)
          setQuantity(loadedEvent.seatsLeft > 0 ? 1 : 0)
        }
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'We could not load this event.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [eventId])

  const maxQuantity = useMemo(
    () => Math.min(6, Math.max(0, Number(event?.seatsLeft) || 0)),
    [event],
  )
  const totalPrice = (Number(event?.ticketPrice) || 0) * quantity
  const isUpcoming = event ? new Date(event.startAt) > new Date() : false
  const canBook = Boolean(
    isAuthenticated &&
    user?.role === 'ATTENDEE' &&
    event?.isActive &&
    isUpcoming &&
    maxQuantity > 0 &&
    quantity >= 1,
  )

  const updateQuantity = (nextQuantity) => {
    setQuantity(Math.min(maxQuantity, Math.max(1, nextQuantity)))
  }

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    if (isSubmitting || !canBook) return

    setError('')
    setIsSubmitting(true)
    try {
      const createdBooking = await createBooking({ eventId, quantity }, accessToken)
      setBooking(createdBooking)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reserve tickets. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthLoading || isLoading) {
    return <main className="booking-page"><div className="state-card"><div className="loader" />Loading booking details...</div></main>
  }

  if (booking) return <BookingConfirmation booking={booking} />

  if (!isAuthenticated || user?.role !== 'ATTENDEE') {
    return (
      <main className="booking-page">
        <section className="booking-error state-card state-card--error">
          <h1>Attendee access required</h1>
          <p>Only authenticated attendees can reserve tickets.</p>
          <Link className="primary-button" to="/login">Sign in to continue</Link>
        </section>
      </main>
    )
  }

  if (error && !event) {
    return (
      <main className="booking-page">
        <section className="booking-error state-card state-card--error" role="alert">
          <h1>Unable to start booking</h1>
          <p>{error}</p>
          <BackButton fallback="/events" />
        </section>
      </main>
    )
  }

  return (
    <main className="booking-page">
      <BackButton fallback="/events" />
      <div className="booking-page__top">
        <p className="eyebrow">Secure reservation</p>
        <h1>Book your tickets</h1>
      </div>
      <div className="booking-layout">
        <section className="booking-event-card">
          <div className="booking-event-card__visual"><Ticket size={54} strokeWidth={1} aria-hidden="true" /></div>
          <div className="booking-event-card__body">
            <p className="eyebrow">{event.categoryId?.name || 'Event'}</p>
            <h2>{event.title}</h2>
            <div className="booking-event-card__facts">
              <span><CalendarDays size={17} />{formatDate(event.startAt)}</span>
              <span><Clock3 size={17} />{formatTime(event.startAt)}</span>
              <span><MapPin size={17} />{event.venueId?.name || 'Venue to be announced'}</span>
              {event.venueId?.address && <span className="booking-event-card__address">{event.venueId.address}</span>}
              <span><Users size={17} />{event.seatsLeft} seats available</span>
            </div>
          </div>
        </section>

        <section className="booking-checkout-card">
          <form onSubmit={handleSubmit}>
            <div className="booking-section-heading">
              <div><p className="eyebrow">Choose your seats</p><h2>Ticket quantity</h2></div>
              <span className="booking-availability">{event.seatsLeft} left</span>
            </div>
            <div className="quantity-control" aria-label="Ticket quantity">
              <button type="button" aria-label="Decrease ticket quantity" disabled={quantity <= 1} onClick={() => updateQuantity(quantity - 1)}><Minus size={18} /></button>
              <strong>{quantity}</strong>
              <button type="button" aria-label="Increase ticket quantity" disabled={quantity >= maxQuantity} onClick={() => updateQuantity(quantity + 1)}><Plus size={18} /></button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {!isUpcoming && <p className="form-error">This event has already passed.</p>}
            {!event.isActive && <p className="form-error">This event is no longer active.</p>}
            {event.seatsLeft <= 0 && <p className="form-error">This event is sold out.</p>}
            <div className="booking-summary booking-summary--checkout">
              <div><span>Event</span><strong>{event.title}</strong></div>
              <div><span>Quantity</span><strong>{quantity}</strong></div>
              <div><span>Price per ticket</span><strong>{formatCurrency(event.ticketPrice)}</strong></div>
              <div className="booking-summary__total"><span>Total amount</span><strong>{formatCurrency(totalPrice)}</strong></div>
            </div>
            <button type="submit" className="primary-button booking-submit" disabled={isSubmitting || !canBook}>
              {isSubmitting ? 'Reserving tickets...' : 'Confirm booking'} <ArrowRight size={17} aria-hidden="true" />
            </button>
            <p className="booking-note">Your seats will be reserved as pending payment. You can pay on the next step.</p>
          </form>
        </section>
      </div>
    </main>
  )
}

export default BookingPreparationPage
