import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
})

export const getUpcomingEvents = async () => {
  const { data } = await api.get('/events', { params: { page: 1, limit: 6 } })
  return data.events
}

export const getEvents = async (params = {}) => {
  const { data } = await api.get('/events', { params })
  return data
}

export const getEvent = async (eventId) => {
  const { data } = await api.get(`/events/${eventId}`)
  return data.event
}
