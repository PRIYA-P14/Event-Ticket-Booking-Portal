import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Ticket, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/authContext'
import { getOrganizerDashboard } from '../lib/organizerApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'
import ThemeToggle from '../components/ThemeToggle'

const getEventStatus = (event) => {
  if (!event.isActive) return 'Inactive'
  if (new Date(event.startAt) <= new Date()) return 'Completed'
  if (event.seatsLeft === 0) return 'Sold out'
  return 'Upcoming'
}

function OrganizerDashboard() {
  const { accessToken, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully.')
    } catch {
      toast.success('Your session was cleared locally.')
    } finally {
      navigate('/login', { replace: true })
    }
  }

  useEffect(() => {
    let isMounted = true
    Promise.resolve()
      .then(() => getOrganizerDashboard(accessToken))
      .then((result) => {
        if (isMounted) setDashboard(result)
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'Unable to load your organizer dashboard.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [accessToken])

  if (isLoading) return <main className="organizer-page"><div className="state-card"><div className="loader" />Loading dashboard...</div></main>
  if (error) return <main className="organizer-page"><div className="state-card state-card--error" role="alert">{error}</div></main>

  const summary = dashboard.summary
  return (
    <main className="organizer-page">
      <header className="organizer-page__header">
        <Link className="brand" to="/" aria-label="Eventra home">
          <span className="brand__mark">E</span>
          <span>Eventra</span>
        </Link>
        <div className="organizer-header-actions">
          <button className="secondary-button" type="button" onClick={handleLogout}>Logout</button>
          <ThemeToggle />
        </div>
      </header>

      <div className="organizer-page__intro">
          <p className="eyebrow">Organizer dashboard</p>
          <h1>Welcome, {user?.name}.</h1>
          <p>Manage your assigned events and keep track of your attendees.</p>
      </div>

      <section className="organizer-stats" aria-label="Organizer summary">
        <div className="organizer-stat"><CalendarDays size={21} /><span>Assigned events</span><strong>{summary.totalAssignedEvents}</strong></div>
        <div className="organizer-stat"><CalendarDays size={21} /><span>Upcoming events</span><strong>{summary.upcomingEvents}</strong></div>
        <div className="organizer-stat"><Ticket size={21} /><span>Confirmed tickets</span><strong>{summary.confirmedTicketsBooked}</strong></div>
        <div className="organizer-stat"><Users size={21} /><span>Available seats</span><strong>{summary.totalAvailableSeats}</strong></div>
      </section>

      <section className="organizer-events-section" id="events">
        <div className="section-heading" id="attendees"><div><p className="eyebrow">Your events</p><h2>Assigned events</h2></div></div>
        {dashboard.events.length === 0 ? (
          <div className="state-card">No events have been assigned to you yet.</div>
        ) : (
          <div className="organizer-events-grid">
            {dashboard.events.map((event) => (
              <article className="organizer-event-card" key={event._id}>
                <div className="organizer-event-card__top">
                  <span className="event-category">{event.categoryId?.name || 'Uncategorized'}</span>
                  <span className={`event-status event-status--${getEventStatus(event).toLowerCase().replace(' ', '-')}`}>{getEventStatus(event)}</span>
                </div>
                <h3>{event.title}</h3>
                <div className="organizer-event-card__facts">
                  <span><CalendarDays size={16} />{formatDate(event.startAt)} at {formatTime(event.startAt)}</span>
                  <span>{event.venueId?.name || 'Venue unavailable'}</span>
                  <span>{formatCurrency(event.ticketPrice)} per ticket</span>
                </div>
                <div className="organizer-event-card__metrics">
                  <span><strong>{event.seatLimit}</strong> seat limit</span>
                  <span><strong>{event.ticketsBooked}</strong> reserved</span>
                  <span><strong>{event.seatsLeft}</strong> available</span>
                </div>
                <Link className="primary-button organizer-event-card__action" to={`/organizer/events/${event._id}/attendees`}>
                  View attendees <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default OrganizerDashboard
