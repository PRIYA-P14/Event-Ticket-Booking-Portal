import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
})

const authConfig = (accessToken) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
})

export const getOrganizerDashboard = async (accessToken) => {
  const { data } = await api.get('/organizer/dashboard', authConfig(accessToken))
  return data
}

export const getOrganizerAttendees = async (eventId, accessToken, params = {}) => {
  const { data } = await api.get(`/organizer/events/${eventId}/attendees`, {
    ...authConfig(accessToken),
    params,
  })
  return data
}
