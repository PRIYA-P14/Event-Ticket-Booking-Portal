import { CalendarDays, Clock3, MapPin, Ticket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDate, formatTime } from '../lib/eventFormatters'

function EventCard({ event }) {
  const category = event.categoryId?.name || 'Event'
  const venue = event.venueId?.name || 'Venue to be announced'

  return (
    <article className="event-card">
      <div className="event-card__accent" />
      <div className="event-card__content">
        <div className="event-card__date">
          <CalendarDays size={16} aria-hidden="true" />
          <span>{formatDate(event.startAt)}</span>
        </div>
        <div className="event-card__category">{category}</div>
        <h3>{event.title}</h3>
        <div className="event-card__meta">
          <span><Clock3 size={15} aria-hidden="true" />{formatTime(event.startAt)}</span>
          <span><MapPin size={15} aria-hidden="true" />{venue}</span>
          <span><Users size={15} aria-hidden="true" />{event.seatsLeft} seats left</span>
        </div>
        <div className="event-card__footer">
          <span className="event-card__price">{formatCurrency(event.ticketPrice)} <small>per ticket</small></span>
          <Link className="text-link" to={`/events/${event._id}`}>
            View event <Ticket size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default EventCard
