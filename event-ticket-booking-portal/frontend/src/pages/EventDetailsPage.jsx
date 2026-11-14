import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Ticket, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { getEvent } from '../lib/eventApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

function EventDetailsPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth()
  const [event, setEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    getEvent(eventId)
      .then((loadedEvent) => {
        if (isMounted) setEvent(loadedEvent)
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

  const isUpcoming = event ? new Date(event.startAt) > new Date() : false
  const canBook = Boolean(event && isUpcoming && event.isActive && event.seatsLeft > 0)
  const isAttendee = isAuthenticated && user?.role === 'ATTENDEE'

  const handleBooking = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${eventId}` } })
      return
    }
    if (!isAttendee) return
    navigate(`/bookings/new?eventId=${eventId}`)
  }

  return (
    <div className="portal-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Eventra home">
          <span className="brand__mark">E</span><span>Eventra</span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link className="site-nav__active" to="/events">Events</Link>
          <Link to="/login">Login</Link>
          <Link className="nav-cta" to="/register">Register <ArrowLeft size={15} aria-hidden="true" /></Link>
        </nav>
      </header>

      <main className="event-details-page">
        <Link className="back-link back-link--light" to="/events"><ArrowLeft size={16} /> Back to all events</Link>
        {isLoading && <div className="state-card"><div className="loader" />Loading event details...</div>}
        {!isLoading && error && <div className="state-card state-card--error" role="alert">{error}</div>}
        {!isLoading && !error && event && (
          <article className="event-details-card">
            <div className="event-details-card__visual"><Ticket size={68} strokeWidth={1} aria-hidden="true" /></div>
            <div className="event-details-card__body">
              <p className="eyebrow">{event.categoryId?.name || 'Event'}</p>
              <h1>{event.title}</h1>
              {event.description && <p className="event-details__description">{event.description}</p>}
              <div className="event-details__facts">
                <span><CalendarDays size={18} />{formatDate(event.startAt)}</span>
                <span><Clock3 size={18} />{formatTime(event.startAt)}</span>
                <span><MapPin size={18} />{event.venueId?.name || 'Venue to be announced'}</span>
                <span><Users size={18} />{event.seatsLeft} of {event.seatLimit} seats available</span>
              </div>
              {event.venueId && (
                <div className="event-details__venue">
                  <strong>Venue details</strong>
                  <span>{event.venueId.name}</span>
                  {event.venueId.address && <span>{event.venueId.address}</span>}
                  {event.venueId.capacity && <span>Capacity: {event.venueId.capacity}</span>}
                </div>
              )}
              {event.organizerId?.name && <p className="event-details__organizer">Organized by {event.organizerId.name}</p>}
              <div className="event-details__footer">
                <div><small>Ticket price</small><strong>{formatCurrency(event.ticketPrice)}</strong></div>
                <button
                  type="button"
                  className="primary-button booking-action"
                  disabled={isAuthLoading || !canBook || (isAuthenticated && !isAttendee)}
                  onClick={handleBooking}
                >
                  {event.seatsLeft <= 0 ? 'Sold out' : !isUpcoming ? 'Event has passed' : isAuthLoading ? 'Checking account...' : isAuthenticated && !isAttendee ? 'Attendees only' : isAttendee ? 'Book tickets' : 'Sign in to book'}
                </button>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}

export default EventDetailsPage
