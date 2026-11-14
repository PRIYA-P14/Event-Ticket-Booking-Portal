import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, MapPin, Ticket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { getMyBookings } from '../lib/bookingApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

const filters = [
  ['ALL', 'All bookings'],
  ['UPCOMING', 'Upcoming'],
  ['PAST', 'Past bookings'],
  ['PENDING_PAYMENT', 'Pending payment'],
  ['BOOKED', 'Confirmed'],
  ['CANCELLED', 'Cancelled'],
]

const isPast = (booking) => new Date(booking.eventId?.startAt) <= new Date()

function matchesFilter(booking, filter) {
  if (filter === 'UPCOMING') return !isPast(booking)
  if (filter === 'PAST') return isPast(booking)
  return filter === 'ALL' || booking.status === filter
}

function BookingCard({ booking }) {
  const event = booking.eventId

  return (
    <article className="history-card">
      <div className="history-card__top">
        <span className={`status-pill status-pill--${booking.status.toLowerCase()}`}>{booking.status.replaceAll('_', ' ')}</span>
        <span className="history-card__reference">{booking.bookingReference}</span>
      </div>
      <h2>{event?.title || 'Event unavailable'}</h2>
      <div className="history-card__facts">
        <span><CalendarDays size={16} />{event?.startAt ? formatDate(event.startAt) : 'Date unavailable'}</span>
        {event?.startAt && <span><Clock3 size={16} />{formatTime(event.startAt)}</span>}
        <span><MapPin size={16} />{event?.venueId?.name || 'Venue unavailable'}</span>
      </div>
      <div className="history-card__bottom">
        <span><Users size={16} />{booking.quantity} ticket{booking.quantity === 1 ? '' : 's'}</span>
        <strong>{formatCurrency(booking.totalPrice)}</strong>
        <Link className="text-link" to={`/bookings/${booking._id}`}>View details <ArrowRight size={15} /></Link>
      </div>
    </article>
  )
}

function MyBookingsPage() {
  const { accessToken } = useAuth()
  const [bookings, setBookings] = useState([])
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    getMyBookings(accessToken)
      .then((response) => {
        if (isMounted) setBookings(response.bookings || [])
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'We could not load your bookings.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accessToken])

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => matchesFilter(booking, activeFilter)),
    [activeFilter, bookings],
  )

  return (
    <div className="portal-shell">
      <header className="site-header events-header">
        <Link className="brand" to="/" aria-label="Eventra home"><span className="brand__mark">E</span><span>Eventra</span></Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/events">Events</Link>
          <span className="site-nav__active">My Bookings</span>
        </nav>
      </header>
      <main className="history-page">
        <div className="history-page__intro">
          <div>
            <p className="eyebrow">Your Eventra journey</p>
            <h1>My bookings</h1>
            <p>Keep track of every event you have reserved.</p>
          </div>
          <Ticket size={44} strokeWidth={1} aria-hidden="true" />
        </div>
        <div className="booking-filters" role="tablist" aria-label="Booking filters">
          {filters.map(([value, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === value}
              className={activeFilter === value ? 'booking-filter booking-filter--active' : 'booking-filter'}
              key={value}
              onClick={() => setActiveFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {isLoading && <div className="state-card"><div className="loader" />Loading your bookings...</div>}
        {!isLoading && error && <div className="state-card state-card--error" role="alert">{error}</div>}
        {!isLoading && !error && visibleBookings.length === 0 && (
          <div className="state-card">
            {bookings.length === 0 ? 'You have no bookings yet.' : 'No bookings match this filter.'}
            <Link className="text-link history-empty-link" to="/events">Explore events <ArrowRight size={15} /></Link>
          </div>
        )}
        {!isLoading && !error && visibleBookings.length > 0 && (
          <div className="history-grid">
            {visibleBookings.map((booking) => <BookingCard key={booking._id} booking={booking} />)}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyBookingsPage
