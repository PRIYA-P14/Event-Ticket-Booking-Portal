import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { getOrganizerAttendees } from '../lib/organizerApi'
import { formatDate } from '../lib/eventFormatters'

function AttendeeListPage() {
  const { eventId } = useParams()
  const { accessToken } = useAuth()
  const [result, setResult] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('BOOKED')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    Promise.resolve()
      .then(() => {
        if (isMounted) {
          setIsLoading(true)
          setError('')
        }
        return getOrganizerAttendees(eventId, accessToken, { page, limit: 20, status, search: search || undefined })
      })
      .then((data) => {
        if (isMounted) setResult(data)
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'Unable to load attendees.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [accessToken, eventId, page, search, status])

  const submitSearch = (event) => {
    event.preventDefault()
    setPage(1)
  }

  return (
    <main className="organizer-page">
      <Link className="back-link back-link--light" to="/organizer"><ArrowLeft size={16} /> Back to dashboard</Link>
      <header className="organizer-page__header organizer-page__header--compact">
        <div>
          <p className="eyebrow">Attendee management</p>
          <h1>{result?.event?.title || 'Event attendees'}</h1>
          <p>Review attendee bookings for this assigned event.</p>
        </div>
      </header>

      <form className="attendee-filters" onSubmit={submitSearch}>
        <label className="search-field"><Search size={17} /><span className="sr-only">Search attendees</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or booking reference" /></label>
        <label className="filter-field"><span>Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="BOOKED">Confirmed</option><option value="PENDING_PAYMENT">Pending payment</option><option value="CANCELLED">Cancelled</option><option value="PAYMENT_FAILED">Payment failed</option><option value="EXPIRED">Expired</option></select></label>
        <button className="primary-button" type="submit">Search</button>
      </form>

      {isLoading && <div className="state-card"><div className="loader" />Loading attendees...</div>}
      {!isLoading && error && <div className="state-card state-card--error" role="alert">{error}</div>}
      {!isLoading && !error && result?.attendees.length === 0 && <div className="state-card">No attendees match this filter.</div>}
      {!isLoading && !error && result?.attendees.length > 0 && (
        <div className="attendee-table-wrap">
          <table className="attendee-table">
            <thead><tr><th>Attendee</th><th>Booking reference</th><th>Tickets</th><th>Booking date</th><th>Status</th></tr></thead>
            <tbody>{result.attendees.map((attendee) => <tr key={attendee._id}><td><strong>{attendee.attendee.name}</strong><span>{attendee.attendee.email}</span></td><td>{attendee.bookingReference}</td><td>{attendee.quantity}</td><td>{formatDate(attendee.createdAt)}</td><td><span className={`status-pill status-pill--${attendee.status.toLowerCase()}`}>{attendee.status.replaceAll('_', ' ')}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {!isLoading && result?.pagination?.pages > 1 && (
        <div className="pagination-controls"><button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /> Previous</button><span>Page {page} of {result.pagination.pages}</span><button type="button" className="secondary-button" disabled={page === result.pagination.pages} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={16} /></button></div>
      )}
    </main>
  )
}

export default AttendeeListPage
