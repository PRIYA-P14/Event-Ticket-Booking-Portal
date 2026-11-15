import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { rolePath } from '../context/routeUtils'
import ThemeToggle from './ThemeToggle'

function SiteNavigation({ active }) {
  const { accessToken, isAuthenticated, isLoading, user, signOut } = useAuth()
  const isRestoringSession = isLoading && Boolean(accessToken)
  const showAuthenticatedNavigation = isAuthenticated || isRestoringSession

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {active === 'home' ? <a className="site-nav__active" href="#home">Home</a> : <Link to="/">Home</Link>}
      {active === 'events' ? <span className="site-nav__active">Events</span> : <Link to="/events">Events</Link>}
      {showAuthenticatedNavigation ? (
        <>
          {user?.role === 'ATTENDEE' && <Link to="/bookings">My Bookings</Link>}
          {user?.role && <Link to={rolePath(user.role)}>Account</Link>}
          {!isRestoringSession && <button type="button" className="nav-button" onClick={signOut}>Log out</button>}
          <ThemeToggle />
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link className="nav-cta" to="/register">Register <ArrowRight size={15} aria-hidden="true" /></Link>
          <ThemeToggle />
        </>
      )}
    </nav>
  )
}

export default SiteNavigation
