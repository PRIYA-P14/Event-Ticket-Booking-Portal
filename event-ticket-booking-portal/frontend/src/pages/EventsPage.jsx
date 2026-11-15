import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import SiteNavigation from '../components/SiteNavigation'
import BackButton from '../components/BackButton'
import { getEvents } from '../lib/eventApi'

const PAGE_SIZE = 9

function EventsPage() {
  const [events, setEvents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ title: '', categoryId: '', date: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getEvents({ ...filters, page: pagination.page, limit: PAGE_SIZE })
      .then((response) => {
        if (!isMounted) return
        setEvents(response.events || [])
        setPagination((current) => ({ ...current, ...(response.pagination || {}) }))
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'We could not load events.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [filters, pagination.page])

  const categories = useMemo(() => {
    const categoryMap = new Map()
    events.forEach((event) => {
      if (event.categoryId?._id && event.categoryId.name) {
        categoryMap.set(event.categoryId._id, event.categoryId.name)
      }
    })
    return [...categoryMap.entries()]
  }, [events])

  const updateFilter = (key, value) => {
    setIsLoading(true)
    setError('')
    setPagination((current) => ({ ...current, page: 1 }))
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const changePage = (page) => {
    setIsLoading(true)
    setError('')
    setPagination((current) => ({ ...current, page }))
  }

  return (
    <div className="portal-shell">
      <header className="site-header events-header">
        <Link className="brand" to="/" aria-label="Eventra home">
          <span className="brand__mark">E</span><span>Eventra</span>
        </Link>
        <SiteNavigation active="events" />
      </header>

      <main className="events-page">
        <BackButton />
        <div className="events-page__intro">
          <div>
            <p className="eyebrow">Find your next moment</p>
            <h1>All events</h1>
            <p>Explore what&apos;s happening next in your community.</p>
          </div>
          <SlidersHorizontal size={42} strokeWidth={1} aria-hidden="true" />
        </div>

        <section className="event-filters" aria-label="Event filters">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search events</span>
            <input
              type="search"
              placeholder="Search by event title"
              value={filters.title}
              onChange={(event) => updateFilter('title', event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select value={filters.categoryId} onChange={(event) => updateFilter('categoryId', event.target.value)}>
              <option value="">All categories</option>
              {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by date</span>
            <input type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} />
          </label>
        </section>

        {isLoading && <div className="state-card"><div className="loader" />Loading events...</div>}
        {!isLoading && error && <div className="state-card state-card--error" role="alert">{error}</div>}
        {!isLoading && !error && events.length === 0 && (
          <div className="state-card">No upcoming events match your filters.</div>
        )}
        {!isLoading && !error && events.length > 0 && (
          <>
            <div className="events-grid">
              {events.map((event) => <EventCard key={event._id} event={event} />)}
            </div>
            {pagination.pages > 1 && (
              <div className="pagination" aria-label="Event pagination">
                <button
                  type="button"
                  className="pagination__button"
                  disabled={pagination.page <= 1}
                  onClick={() => changePage(pagination.page - 1)}
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button
                  type="button"
                  className="pagination__button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => changePage(pagination.page + 1)}
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default EventsPage
