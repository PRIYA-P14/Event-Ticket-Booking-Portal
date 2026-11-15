import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
})

const normalizeDate = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return ''
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

export const getUpcomingEvents = async () => {
  const { data } = await api.get('/events', { params: { page: 1, limit: 6 } })
  return data.events
}

export const getEvents = async (params = {}) => {
  const query = {}
  if (typeof params.title === 'string' && params.title.trim()) query.title = params.title.trim()
  if (typeof params.categoryId === 'string' && /^[a-f\d]{24}$/i.test(params.categoryId)) {
    query.categoryId = params.categoryId
  }
  const date = normalizeDate(params.date)
  if (date) query.date = date
  if (params.page !== undefined) query.page = params.page
  if (params.limit !== undefined) query.limit = params.limit
  const { data } = await api.get('/events', { params: query })
  return data
}

export const getEvent = async (eventId) => {
  const { data } = await api.get(`/events/${eventId}`)
  return data.event
}

export const getAdminEvents = async (accessToken) => {
  const { data } = await api.get('/events/admin', { headers: { Authorization: `Bearer ${accessToken}` } })
  return data.events
}

export const saveAdminEvent = async (accessToken, eventId, event) => {
  const path = eventId ? `/events/${eventId}` : '/events'
  const { data } = await api.request({
    method: eventId ? 'put' : 'post',
    url: path,
    data: event,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data.event
}

export const deactivateAdminEvent = async (accessToken, eventId) => {
  const { data } = await api.patch(`/events/${eventId}/deactivate`, {}, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data.event
}
