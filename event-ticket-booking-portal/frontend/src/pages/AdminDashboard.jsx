import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Edit3, Plus, Search, Shield, Ticket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { deactivateAdminEvent, getAdminEvents, saveAdminEvent } from '../lib/eventApi'
import {
  createOrganizer, getAdminBookings, getAdminDashboard, getCategories, getOrganizers, getVenues,
  saveCategory, saveVenue, setCategoryStatus, setOrganizerStatus, setVenueStatus,
} from '../lib/adminApi'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

const emptyOrganizer = { name: '', email: '', phone: '', password: '' }
const emptyVenue = { name: '', address: '', capacity: '' }
const emptyCategory = { name: '', description: '' }
const emptyEvent = { title: '', description: '', organizerId: '', venueId: '', categoryId: '', startAt: '', seatLimit: '', ticketPrice: '' }

const errorMessage = (error, fallback) => error.response?.data?.message || fallback

function AdminDashboard() {
  const { accessToken, user } = useAuth()
  const [stats, setStats] = useState(null)
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [organizerSearch, setOrganizerSearch] = useState('')
  const [bookingFilters, setBookingFilters] = useState({ search: '', status: '', eventId: '', from: '', to: '', page: 1 })

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

  const runAction = async (action, successMessage) => {
    setError('')
    setNotice('')
    try {
      await action()
      await refresh()
      setNotice(successMessage)
    } catch (requestError) {
      setError(errorMessage(requestError, 'The requested action could not be completed.'))
    }
  }

  const submitOrganizer = async (event) => {
    event.preventDefault()
    await runAction(() => createOrganizer(accessToken, organizerForm), 'Organizer created successfully.')
    setOrganizerForm(emptyOrganizer)
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
    await runAction(() => saveAdminEvent(accessToken, eventForm._id, {
      ...eventForm,
      seatLimit: Number(eventForm.seatLimit),
      ticketPrice: Number(eventForm.ticketPrice),
    }), eventForm._id ? 'Event updated.' : 'Event created.')
    setEventForm(emptyEvent)
  }

  const loadBookings = async (nextFilters = bookingFilters) => {
    try {
      setBookings(await getAdminBookings(accessToken, { ...nextFilters, limit: 10, page: nextFilters.page || 1, search: nextFilters.search || undefined, status: nextFilters.status || undefined, eventId: nextFilters.eventId || undefined }))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load bookings.'))
    }
  }

  if (isLoading) return <main className="admin-page"><div className="state-card"><div className="loader" />Loading admin dashboard...</div></main>
  if (error && !stats) return <main className="admin-page"><div className="state-card state-card--error" role="alert">{error}</div></main>

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div><p className="eyebrow">Admin control center</p><h1>Welcome, {user?.name}.</h1><p>Manage Eventra operations, resources, events, and bookings.</p></div>
        <Link className="secondary-button" to="/events">View public events <ArrowRight size={16} /></Link>
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
      </section>

      <nav className="admin-section-nav" aria-label="Admin management"><a href="#organizers">Organizers</a><a href="#venues">Venues</a><a href="#categories">Categories</a><a href="#events">Events</a><a href="#bookings">Bookings</a></nav>

      <section id="organizers" className="admin-section">
        <div className="admin-section__heading"><div><p className="eyebrow">Accounts</p><h2>Manage organizers</h2></div><label className="admin-search"><Search size={16} /><input placeholder="Search name or email" value={organizerSearch} onChange={(event) => setOrganizerSearch(event.target.value)} /></label></div>
        <form className="admin-form admin-form--four" onSubmit={submitOrganizer}><input required placeholder="Full name" value={organizerForm.name} onChange={(event) => setOrganizerForm({ ...organizerForm, name: event.target.value })} /><input required type="email" placeholder="Email" value={organizerForm.email} onChange={(event) => setOrganizerForm({ ...organizerForm, email: event.target.value })} /><input required placeholder="Phone" value={organizerForm.phone} onChange={(event) => setOrganizerForm({ ...organizerForm, phone: event.target.value })} /><input required type="password" placeholder="Initial password" value={organizerForm.password} onChange={(event) => setOrganizerForm({ ...organizerForm, password: event.target.value })} /><button className="primary-button" type="submit"><Plus size={16} /> Add organizer</button></form>
        <div className="admin-list">{organizers.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(organizerSearch.toLowerCase())).map((organizer) => <div className="admin-list__row" key={organizer.id}><div><strong>{organizer.name}</strong><span>{organizer.email} · {organizer.phone}</span></div><button className="secondary-button" type="button" onClick={() => { if (window.confirm(`${organizer.isActive ? 'Deactivate' : 'Activate'} ${organizer.name}?`)) runAction(() => setOrganizerStatus(accessToken, organizer.id, !organizer.isActive), 'Organizer status updated.') }}>{organizer.isActive ? 'Deactivate' : 'Activate'}</button></div>)}</div>
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
        <div className="admin-list">{events.map((item) => <div className="admin-list__row" key={item._id}><div><strong>{item.title}</strong><span>{formatDate(item.startAt)} at {formatTime(item.startAt)} · {item.categoryId?.name || 'No category'} · {item.seatsLeft} seats available</span></div><div className="admin-row-actions"><button className="icon-button" type="button" onClick={() => setEventForm({ ...item, organizerId: item.organizerId?._id || item.organizerId, venueId: item.venueId?._id || item.venueId, categoryId: item.categoryId?._id || item.categoryId, startAt: new Date(item.startAt).toISOString().slice(0, 16) })}><Edit3 size={16} /></button>{item.isActive && <button className="secondary-button" type="button" onClick={() => { if (window.confirm(`Deactivate ${item.title}?`)) runAction(() => deactivateAdminEvent(accessToken, item._id), 'Event deactivated.') }}>Deactivate</button>}</div></div>)}</div>
      </section>

      <section id="bookings" className="admin-section">
        <div className="admin-section__heading"><div><p className="eyebrow">Operations</p><h2>Manage bookings</h2></div></div>
        <form className="admin-form admin-form--filters" onSubmit={(event) => { event.preventDefault(); const next = { ...bookingFilters, page: 1 }; setBookingFilters(next); loadBookings(next) }}><label className="admin-search"><Search size={16} /><input placeholder="Booking reference" value={bookingFilters.search} onChange={(event) => setBookingFilters({ ...bookingFilters, search: event.target.value })} /></label><select value={bookingFilters.status} onChange={(event) => setBookingFilters({ ...bookingFilters, status: event.target.value, page: 1 })}><option value="">All statuses</option><option value="BOOKED">Booked</option><option value="PENDING_PAYMENT">Pending payment</option><option value="CANCELLED">Cancelled</option></select><select value={bookingFilters.eventId} onChange={(event) => setBookingFilters({ ...bookingFilters, eventId: event.target.value, page: 1 })}><option value="">All events</option>{events.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select><label className="admin-date-filter">From <input type="date" value={bookingFilters.from} onChange={(event) => setBookingFilters({ ...bookingFilters, from: event.target.value, page: 1 })} /></label><label className="admin-date-filter">To <input type="date" value={bookingFilters.to} onChange={(event) => setBookingFilters({ ...bookingFilters, to: event.target.value, page: 1 })} /></label><button className="primary-button" type="submit">Filter</button></form>
        {bookings.bookings.length === 0 ? <div className="state-card">No bookings found.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reference</th><th>Attendee</th><th>Event</th><th>Tickets</th><th>Total</th><th>Date</th><th>Status</th><th>Payment</th></tr></thead><tbody>{bookings.bookings.map((item) => <tr key={item._id}><td>{item.bookingReference}</td><td><strong>{item.attendee.name}</strong><span>{item.attendee.email}</span></td><td>{item.event.title}</td><td>{item.quantity}</td><td>{formatCurrency(item.totalPrice)}</td><td>{formatDate(item.createdAt)}</td><td>{item.status.replaceAll('_', ' ')}</td><td>{item.paymentStatus || 'Not started'}</td></tr>)}</tbody></table></div>}
        {bookings.pagination.pages > 1 && <div className="pagination-controls"><button className="secondary-button" type="button" disabled={bookings.pagination.page === 1} onClick={() => { const next = { ...bookingFilters, page: bookings.pagination.page - 1 }; setBookingFilters(next); loadBookings(next) }}>Previous</button><span>Page {bookings.pagination.page} of {bookings.pagination.pages}</span><button className="secondary-button" type="button" disabled={bookings.pagination.page === bookings.pagination.pages} onClick={() => { const next = { ...bookingFilters, page: bookings.pagination.page + 1 }; setBookingFilters(next); loadBookings(next) }}>Next</button></div>}
      </section>
    </main>
  )
}

export default AdminDashboard
