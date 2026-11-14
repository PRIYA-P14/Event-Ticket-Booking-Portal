import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Ticket, Users } from 'lucide-react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import EventCard from './components/EventCard'
import BookingDetailsPage from './pages/BookingDetailsPage'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/authContext'
import { rolePath } from './context/routeUtils'
import { ProtectedRoute } from './components/ProtectedRoute'
import BookingPreparationPage from './pages/BookingPreparationPage'
import EventDetailsPage from './pages/EventDetailsPage'
import EventsPage from './pages/EventsPage'
import LoginPage from './pages/LoginPage'
import MyBookingsPage from './pages/MyBookingsPage'
import PendingBookingPage from './pages/PendingBookingPage'
import RegisterPage from './pages/RegisterPage'
import RolePlaceholderPage from './pages/RolePlaceholderPage'
import { getUpcomingEvents } from './lib/eventApi'
import './App.css'

function LandingPage() {
  const { isAuthenticated, user, signOut } = useAuth()
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getUpcomingEvents()
      .then((upcomingEvents) => {
        if (isMounted) setEvents(upcomingEvents)
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'We could not load upcoming events.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="portal-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Eventra home">
          <span className="brand__mark">E</span>
          <span>Eventra</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a className="site-nav__active" href="#home">Home</a>
          <Link to="/events">Events</Link>
          {isAuthenticated ? (
            <>
              {user?.role === 'ATTENDEE' && <Link to="/bookings">My Bookings</Link>}
              <Link to={rolePath(user?.role)}>Account</Link>
              <button type="button" className="nav-button" onClick={signOut}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link className="nav-cta" to="/register">Register <ArrowRight size={15} aria-hidden="true" /></Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <p className="eyebrow">Your next experience starts here</p>
            <h1>Make memories.<br /><span>Book the moment.</span></h1>
            <p className="hero-description">
              Discover the events that bring your community together. Simple booking, unforgettable experiences.
            </p>
            <a className="primary-button" href="#events">
              Explore events <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="hero-art" aria-label="A collage of event moments">
            <div className="hero-art__ring" />
            <div className="hero-art__tile hero-art__tile--large">LIVE<br /><strong>EVENTS</strong></div>
            <div className="hero-art__tile hero-art__tile--small">GOOD<br /><strong>VIBES</strong></div>
            <div className="hero-art__stamp">BE<br />THERE</div>
          </div>
        </section>

        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Don&apos;t miss out</p>
              <h2>Upcoming events</h2>
            </div>
            <Link className="text-link" to="/events">View all events <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>

          {isLoading && <div className="state-card"><div className="loader" />Loading upcoming events...</div>}
          {!isLoading && error && <div className="state-card state-card--error" role="alert">{error}</div>}
          {!isLoading && !error && events.length === 0 && (
            <div className="state-card">No upcoming events are available right now. Check back soon.</div>
          )}
          {!isLoading && !error && events.length > 0 && (
            <div className="events-grid">
              {events.map((event) => <EventCard key={event._id} event={event} />)}
            </div>
          )}
        </section>

        <section className="promise-section">
          <div><Ticket size={22} aria-hidden="true" /><strong>Easy booking</strong><span>Reserve your spot in seconds.</span></div>
          <div><Users size={22} aria-hidden="true" /><strong>Made for everyone</strong><span>Events for every kind of moment.</span></div>
          <div><CalendarDays size={22} aria-hidden="true" /><strong>Always in the know</strong><span>Find what&apos;s happening next.</span></div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="/" aria-label="Eventra home"><span className="brand__mark">E</span><span>Eventra</span></a>
        <p>Find your next unforgettable moment.</p>
        <span>© {new Date().getFullYear()} Eventra</span>
      </footer>
    </div>
  )
}

function HomePage() {
  const params = new URLSearchParams(window.location.search)
  const bookingId = params.get('bookingId')
  const accessToken = window.localStorage.getItem('accessToken')

  return bookingId
    ? <PendingBookingPage bookingId={bookingId} accessToken={accessToken} />
    : <LandingPage />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/bookings/new" element={<BookingPreparationPage />} />
          <Route element={<ProtectedRoute roles={['ATTENDEE']} />}>
            <Route path="/bookings" element={<MyBookingsPage />} />
            <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ATTENDEE']} />}>
            <Route path="/attendee" element={<RolePlaceholderPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ORGANIZER']} />}>
            <Route path="/organizer" element={<RolePlaceholderPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<RolePlaceholderPage />} />
          </Route>
          <Route path="*" element={<HomePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
