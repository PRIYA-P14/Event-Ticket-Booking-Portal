import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Edit3, Plus, Search, Shield, Ticket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/authContext'
import { activateAdminEvent, deactivateAdminEvent, getAdminEvents, saveAdminEvent } from '../lib/eventApi'
import BackButton from '../components/BackButton'
import ThemeToggle from '../components/ThemeToggle'
import {
  createOrganizer, getAdminBookings, getAdminDashboard, getCategories, getOrganizers, getVenues, updateOrganizer,
  saveCategory, saveVenue, setCategoryStatus, setOrganizerStatus, setVenueStatus,
} from '../lib/adminApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

const emptyOrganizer = { name: '', email: '', phone: '', password: '' }
const emptyVenue = { name: '', address: '', capacity: '' }
const emptyCategory = { name: '', description: '' }
const emptyEvent = { title: '', description: '', organizerId: '', venueId: '', categoryId: '', startAt: '', seatLimit: '', ticketPrice: '' }
const emptyBookingFilters = { search: '', status: '', eventId: '', from: '', to: '', page: 1 }

const errorMessage = (error, fallback) => error.response?.data?.message || fallback

function AdminDashboard() {
  const { accessToken, user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [dashboardRecentBookings, setDashboardRecentBookings] = useState([])
  const [dashboardRecentEvents, setDashboardRecentEvents] = useState([])
  const [organizers, setOrganizers] = useState([])
  const [venues, setVenues] = useState([])
  const [categories, setCategories] = useState([])
  const [events, setEvents] = useState([])
  const [bookings, setBookings] = useState({ bookings: [], pagination: { pages: 0, page: 1 } })
  const [organizerForm, setOrganizerForm] = useState(emptyOrganizer)
  const [venueForm, setVenueForm] = useState(emptyVenue)
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [eventForm, setEventForm] = useState(emptyEvent)
  const [editingVenue, setEditingVenue] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [editingOrganizer, setEditingOrganizer] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [organizerSearch, setOrganizerSearch] = useState('')
  const [bookingFilters, setBookingFilters] = useState(emptyBookingFilters)
  const [isBookingsLoading, setIsBookingsLoading] = useState(false)
  const isEventManagementRoute = location.pathname === '/admin/events'
  const isManagementSection = isEventManagementRoute
    || ['#organizers', '#venues', '#categories', '#events', '#bookings'].includes(location.hash)

  const refresh = useCallback(async () => {
    const [dashboard, organizerResult, venueResult, categoryResult, eventResult, bookingResult] = await Promise.all([
      getAdminDashboard(accessToken),
      getOrganizers(accessToken),
      getVenues(accessToken),
      getCategories(accessToken),
      getAdminEvents(accessToken),
      getAdminBookings(accessToken, { limit: 10 }),
    ])
    setStats(dashboard.stats)
    setDashboardRecentBookings(dashboard.recentBookings || [])
    setDashboardRecentEvents(dashboard.recentEvents || [])
    setOrganizers(organizerResult.organizers)
    setVenues(venueResult.venues)
    setCategories(categoryResult.categories)
    setEvents(eventResult)
    setBookings(bookingResult)
  }, [accessToken])

  useEffect(() => {
    let isMounted = true
    Promise.resolve()
      .then(() => refresh())
      .catch((requestError) => {
        if (isMounted) setError(errorMessage(requestError, 'Unable to load the admin dashboard.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => { isMounted = false }
  }, [refresh])

  useEffect(() => {
    if (isEventManagementRoute) {
      document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isEventManagementRoute, isLoading])

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

  const runAction = async (action, successMessage) => {
    setError('')
    setNotice('')
    try {
      await action()
      await refresh()
      setNotice(successMessage)
      return true
    } catch (requestError) {
      setError(errorMessage(requestError, 'The requested action could not be completed.'))
      return false
    }
  }

  const submitOrganizer = async (event) => {
    event.preventDefault()
    const data = { name: organizerForm.name, email: organizerForm.email, phone: organizerForm.phone }
    if (!editingOrganizer) data.password = organizerForm.password
    const succeeded = await runAction(() => editingOrganizer
      ? updateOrganizer(accessToken, editingOrganizer, data)
      : createOrganizer(accessToken, data), editingOrganizer ? 'Organizer updated successfully.' : 'Organizer created successfully.')
    if (succeeded) {
      setOrganizerForm(emptyOrganizer)
      setEditingOrganizer('')
    }
  }

  const submitVenue = async (event) => {
    event.preventDefault()
    await runAction(() => saveVenue(accessToken, editingVenue, { ...venueForm, capacity: Number(venueForm.capacity) }), editingVenue ? 'Venue updated.' : 'Venue added.')
    setVenueForm(emptyVenue)
    setEditingVenue('')
  }

  const submitCategory = async (event) => {
    event.preventDefault()
    await runAction(() => saveCategory(accessToken, editingCategory, categoryForm), editingCategory ? 'Category updated.' : 'Category added.')
    setCategoryForm(emptyCategory)
    setEditingCategory('')
  }

  const submitEvent = async (event) => {
    event.preventDefault()
    const eventData = {
      title: eventForm.title,
      description: eventForm.description,
      organizerId: eventForm.organizerId,
      venueId: eventForm.venueId,
      categoryId: eventForm.categoryId,
      startAt: eventForm.startAt,
      seatLimit: Number(eventForm.seatLimit),
      ticketPrice: Number(eventForm.ticketPrice),
    }
    await runAction(() => saveAdminEvent(accessToken, eventForm._id, eventData), eventForm._id ? 'Event updated.' : 'Event created.')
    setEventForm(emptyEvent)
  }

  const loadBookings = async (nextFilters = bookingFilters) => {
    setIsBookingsLoading(true)
    setError('')
    try {
      const params = {
        limit: 10,
        page: nextFilters.page || 1,
        search: nextFilters.search || undefined,
        status: nextFilters.status || undefined,
        eventId: nextFilters.eventId || undefined,
        from: nextFilters.from || undefined,
        to: nextFilters.to || undefined,
      }
      setBookings(await getAdminBookings(accessToken, params))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load bookings.'))
    } finally {
      setIsBookingsLoading(false)
    }
  }

  const clearBookingFilters = () => {
    setBookingFilters(emptyBookingFilters)
    loadBookings(emptyBookingFilters)
  }

  if (isLoading) return <main className="admin-page"><div className="state-card"><div className="loader" />Loading admin dashboard...</div></main>
  if (error && !stats) return <main className="admin-page"><div className="state-card state-card--error" role="alert">{error}</div></main>

  return (
    <main className="admin-page">
      {isManagementSection && <BackButton fallback="/admin" />}
      <header className="admin-page__header">
        <div><p className="eyebrow">Admin control center</p><h1>Welcome, {user?.name}.</h1><p>Manage Eventra operations, resources, events, and bookings.</p></div>
        <div className="admin-header-actions">
          {isEventManagementRoute && <Link className="secondary-button" to="/admin">Dashboard</Link>}
          {!isEventManagementRoute && <Link className="secondary-button" to="/admin/events">Manage Events <ArrowRight size={16} /></Link>}
          <button className="secondary-button" type="button" onClick={handleLogout}>Logout</button>
          <ThemeToggle />
        </div>
      </header>
      {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
      {notice && <div className="admin-alert" role="status"><Check size={16} />{notice}</div>}

      <section className="admin-stats">
        <div><Users size={20} /><span>Attendees</span><strong>{stats.totalAttendees}</strong></div>
        <div><Shield size={20} /><span>Organizers</span><strong>{stats.totalOrganizers}</strong></div>
        <div><CalendarDays size={20} /><span>Active events</span><strong>{stats.totalActiveEvents}</strong></div>
        <div><Ticket size={20} /><span>Total bookings</span><strong>{stats.totalBookings}</strong></div>
        <div><span>Confirmed</span><strong>{stats.confirmedBookings}</strong></div>
        <div><span>Cancelled</span><strong>{stats.cancelledBookings}</strong></div>
        <div><span>Pending payment</span><strong>{stats.pendingPaymentBookings}</strong></div>
        <div><span>Successful demo payments</span><strong>{stats.successfulDemoPayments}</strong></div>
        <div><span>Demo payment amount</span><strong>{formatCurrency(stats.demoPaymentAmount)}</strong></div>
      </section>

      <section className="admin-activity-grid">
        <div className="admin-activity-card"><div className="admin-section__heading"><div><p className="eyebrow">Activity</p><h2>Recent bookings</h2></div></div>{dashboardRecentBookings?.length ? <div className="admin-list">{dashboardRecentBookings.map((booking) => <div className="admin-list__row" key={booking._id}><div><strong>{booking.bookingReference}</strong><span>{booking.eventId?.title || 'Event unavailable'} · {booking.attendeeId?.name || 'Attendee unavailable'}</span></div><span className="status-pill status-pill--booked">{booking.status.replaceAll('_', ' ')}</span></div>)}</div> : <p className="admin-muted">No bookings yet.</p>}</div>
        <div className="admin-activity-card"><div className="admin-section__heading"><div><p className="eyebrow">Activity</p><h2>Recently created events</h2></div></div>{dashboardRecentEvents?.length ? <div className="admin-list">{dashboardRecentEvents.map((event) => <div className="admin-list__row" key={event._id}><div><strong>{event.title}</strong><span>{event.organizerId?.name || 'Organizer unavailable'} · {formatDate(event.startAt)}</span></div><span>{event.isActive ? `${event.ticketsBooked}/${event.seatLimit}` : 'Inactive'}</span></div>)}</div> : <p className="admin-muted">No events yet.</p>}</div>
      </section>

      <nav className="admin-section-nav" aria-label="Admin management"><a href="#organizers">Organizers</a><a href="#venues">Venues</a><a href="#categories">Categories</a><a href="#events">Events</a><a href="#bookings">Bookings</a></nav>

      <section id="organizers" className="admin-section">
        <div className="admin-section__heading"><div><p className="eyebrow">Accounts</p><h2>Manage organizers</h2></div><label className="admin-search"><Search size={16} /><input placeholder="Search name or email" value={organizerSearch} onChange={(event) => setOrganizerSearch(event.target.value)} /></label></div>
        <form className="admin-form admin-form--four" onSubmit={submitOrganizer}><input required placeholder="Full name" value={organizerForm.name} onChange={(event) => setOrganizerForm({ ...organizerForm, name: event.target.value })} /><input required type="email" placeholder="Email" value={organizerForm.email} onChange={(event) => setOrganizerForm({ ...organizerForm, email: event.target.value })} /><input required placeholder="Phone" value={organizerForm.phone} onChange={(event) => setOrganizerForm({ ...organizerForm, phone: event.target.value })} />{!editingOrganizer && <input required type="password" placeholder="Initial password" value={organizerForm.password} onChange={(event) => setOrganizerForm({ ...organizerForm, password: event.target.value })} />}<button className="primary-button" type="submit"><Plus size={16} /> {editingOrganizer ? 'Update organizer' : 'Add organizer'}</button>{editingOrganizer && <button className="secondary-button" type="button" onClick={() => { setEditingOrganizer(''); setOrganizerForm(emptyOrganizer) }}>Cancel</button>}</form>
        <div className="admin-list">{organizers.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(organizerSearch.toLowerCase())).map((organizer) => <div className="admin-list__row" key={organizer.id}><div><strong>{organizer.name}</strong><span>{organizer.email} · {organizer.phone}</span><span className={`admin-account-status admin-account-status--${organizer.isActive ? 'active' : 'inactive'}`}>{organizer.isActive ? 'ACTIVE' : 'INACTIVE'}</span></div><div className="admin-row-actions"><button className="icon-button" type="button" aria-label={`Edit ${organizer.name}`} onClick={() => { setEditingOrganizer(organizer.id); setOrganizerForm({ name: organizer.name, email: organizer.email, phone: organizer.phone, password: '' }) }}><Edit3 size={16} /></button><button className="secondary-button" type="button" onClick={() => { if (window.confirm(`${organizer.isActive ? 'Deactivate' : 'Activate'} ${organizer.name}?`)) runAction(() => setOrganizerStatus(accessToken, organizer.id, !organizer.isActive), 'Organizer status updated.') }}>{organizer.isActive ? 'Deactivate' : 'Activate'}</button></div></div>)}</div>
      </section>

      <section id="venues" className="admin-section">
        <div className="admin-section__heading"><div><p className="eyebrow">Locations</p><h2>Manage venues</h2></div></div>
        <form className="admin-form" onSubmit={submitVenue}><input required placeholder="Venue name" value={venueForm.name} onChange={(event) => setVenueForm({ ...venueForm, name: event.target.value })} /><input required placeholder="Address" value={venueForm.address} onChange={(event) => setVenueForm({ ...venueForm, address: event.target.value })} /><input required min="1" type="number" placeholder="Capacity" value={venueForm.capacity} onChange={(event) => setVenueForm({ ...venueForm, capacity: event.target.value })} /><button className="primary-button" type="submit">{editingVenue ? 'Update venue' : 'Add venue'}</button>{editingVenue && <button className="secondary-button" type="button" onClick={() => { setEditingVenue(''); setVenueForm(emptyVenue) }}>Cancel</button>}</form>
        <div className="admin-list">{venues.map((venue) => <div className="admin-list__row" key={venue._id}><div><strong>{venue.name}</strong><span>{venue.address} · Capacity {venue.capacity}</span></div><div className="admin-row-actions"><button className="icon-button" type="button" onClick={() => { setEditingVenue(venue._id); setVenueForm({ name: venue.name, address: venue.address, capacity: venue.capacity }) }}><Edit3 size={16} /></button><button className="secondary-button" type="button" onClick={() => { if (window.confirm(`${venue.isActive ? 'Deactivate' : 'Activate'} ${venue.name}?`)) runAction(() => setVenueStatus(accessToken, venue._id, !venue.isActive), 'Venue status updated.') }}>{venue.isActive ? 'Deactivate' : 'Activate'}</button></div></div>)}</div>
      </section>

      <section id="categories" className="admin-section">
        <div className="admin-section__heading"><div><p className="eyebrow">Classification</p><h2>Manage categories</h2></div></div>
        <form className="admin-form" onSubmit={submitCategory}><input required placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /><input placeholder="Description" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /><button className="primary-button" type="submit">{editingCategory ? 'Update category' : 'Add category'}</button>{editingCategory && <button className="secondary-button" type="button" onClick={() => { setEditingCategory(''); setCategoryForm(emptyCategory) }}>Cancel</button>}</form>
        <div className="admin-list">{categories.map((category) => <div className="admin-list__row" key={category._id}><div><strong>{category.name}</strong><span>{category.description || 'No description'}</span></div><div className="admin-row-actions"><button className="icon-button" type="button" onClick={() => { setEditingCategory(category._id); setCategoryForm({ name: category.name, description: category.description || '' }) }}><Edit3 size={16} /></button><button className="secondary-button" type="button" onClick={() => { if (window.confirm(`${category.isActive ? 'Deactivate' : 'Activate'} ${category.name}?`)) runAction(() => setCategoryStatus(accessToken, category._id, !category.isActive), 'Category status updated.') }}>{category.isActive ? 'Deactivate' : 'Activate'}</button></div></div>)}</div>
      </section>

      <section id="events" className="admin-section">
        <div className="admin-section__heading"><div><p className="eyebrow">Programming</p><h2>Manage events</h2></div></div>
        <form className="admin-form admin-form--event" onSubmit={submitEvent}><input required placeholder="Event title" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} /><textarea placeholder="Description" value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} /><select required value={eventForm.organizerId} onChange={(event) => setEventForm({ ...eventForm, organizerId: event.target.value })}><option value="">Select organizer</option>{organizers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required value={eventForm.venueId} onChange={(event) => setEventForm({ ...eventForm, venueId: event.target.value })}><option value="">Select venue</option>{venues.filter((item) => item.isActive).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select required value={eventForm.categoryId} onChange={(event) => setEventForm({ ...eventForm, categoryId: event.target.value })}><option value="">Select category</option>{categories.filter((item) => item.isActive).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select><input required type="datetime-local" value={eventForm.startAt} onChange={(event) => setEventForm({ ...eventForm, startAt: event.target.value })} /><input required min="1" type="number" placeholder="Seat limit" value={eventForm.seatLimit} onChange={(event) => setEventForm({ ...eventForm, seatLimit: event.target.value })} /><input required min="0" step="0.01" type="number" placeholder="Ticket price" value={eventForm.ticketPrice} onChange={(event) => setEventForm({ ...eventForm, ticketPrice: event.target.value })} /><button className="primary-button" type="submit">{eventForm._id ? 'Update event' : 'Create event'}</button>{eventForm._id && <button className="secondary-button" type="button" onClick={() => setEventForm(emptyEvent)}>Cancel</button>}</form>
        <div className="admin-list">{events.map((item) => <div className="admin-list__row" key={item._id}><div><strong>{item.title}</strong><span>{formatDate(item.startAt)} at {formatTime(item.startAt)} · {item.categoryId?.name || 'No category'} · {item.seatsLeft} seats available</span><span className={`admin-account-status admin-account-status--${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'ACTIVE' : 'INACTIVE'}</span></div><div className="admin-row-actions"><button className="icon-button" type="button" aria-label={`Edit ${item.title}`} onClick={() => setEventForm({ ...item, organizerId: item.organizerId?._id || item.organizerId, venueId: item.venueId?._id || item.venueId, categoryId: item.categoryId?._id || item.categoryId, startAt: new Date(item.startAt).toISOString().slice(0, 16) })}><Edit3 size={16} /></button><button className="secondary-button" type="button" onClick={() => { const action = item.isActive ? 'Deactivate' : 'Activate'; if (window.confirm(`${action} ${item.title}?`)) runAction(() => item.isActive ? deactivateAdminEvent(accessToken, item._id) : activateAdminEvent(accessToken, item._id), `Event ${action.toLowerCase()}d successfully.`) }}>{item.isActive ? 'Deactivate' : 'Activate'}</button></div></div>)}</div>
      </section>

      <section id="bookings" className="admin-section">
        <div className="admin-section__heading"><div><p className="eyebrow">Operations</p><h2>Manage bookings</h2></div></div>
        <form className="admin-form admin-form--filters" onSubmit={(event) => { event.preventDefault(); const next = { ...bookingFilters, page: 1 }; setBookingFilters(next); loadBookings(next) }}><label className="admin-search"><Search size={16} /><input placeholder="Booking reference" value={bookingFilters.search} onChange={(event) => setBookingFilters({ ...bookingFilters, search: event.target.value })} /></label><select value={bookingFilters.status} onChange={(event) => setBookingFilters({ ...bookingFilters, status: event.target.value, page: 1 })}><option value="">All statuses</option><option value="BOOKED">Booked</option><option value="PENDING_PAYMENT">Pending payment</option><option value="CANCELLED">Cancelled</option></select><select value={bookingFilters.eventId} onChange={(event) => setBookingFilters({ ...bookingFilters, eventId: event.target.value, page: 1 })}><option value="">All events</option>{events.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select><label className="admin-date-filter">From <input type="date" value={bookingFilters.from} onChange={(event) => setBookingFilters({ ...bookingFilters, from: event.target.value, page: 1 })} /></label><label className="admin-date-filter">To <input type="date" value={bookingFilters.to} onChange={(event) => setBookingFilters({ ...bookingFilters, to: event.target.value, page: 1 })} /></label><button className="primary-button" type="submit" disabled={isBookingsLoading}>{isBookingsLoading ? 'Filtering...' : 'Filter'}</button><button className="secondary-button" type="button" onClick={clearBookingFilters} disabled={isBookingsLoading}>Clear Filters</button></form>
        {isBookingsLoading ? <div className="state-card"><div className="loader" />Loading bookings...</div> : bookings.bookings.length === 0 ? <div className="state-card">No bookings found.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reference</th><th>Attendee</th><th>Event</th><th>Tickets</th><th>Total</th><th>Date</th><th>Status</th><th>Payment</th></tr></thead><tbody>{bookings.bookings.map((item) => <tr key={item._id}><td>{item.bookingReference}</td><td><strong>{item.attendee.name}</strong><span>{item.attendee.email}</span></td><td>{item.event.title}</td><td>{item.quantity}</td><td>{formatCurrency(item.totalPrice)}</td><td>{formatDate(item.createdAt)}</td><td><span className={`status-pill status-pill--${item.status.toLowerCase()}`}>{item.status.replaceAll('_', ' ')}</span></td><td>{item.paymentStatus || 'Not started'}</td></tr>)}</tbody></table></div>}
        {bookings.pagination.pages > 1 && <div className="pagination-controls"><button className="secondary-button" type="button" disabled={isBookingsLoading || bookings.pagination.page === 1} onClick={() => { const next = { ...bookingFilters, page: bookings.pagination.page - 1 }; setBookingFilters(next); loadBookings(next) }}>Previous</button><span>Page {bookings.pagination.page} of {bookings.pagination.pages}</span><button className="secondary-button" type="button" disabled={isBookingsLoading || bookings.pagination.page === bookings.pagination.pages} onClick={() => { const next = { ...bookingFilters, page: bookings.pagination.page + 1 }; setBookingFilters(next); loadBookings(next) }}>Next</button></div>}
      </section>
    </main>
  )
}

export default AdminDashboard
