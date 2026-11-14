import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
})

export const createBooking = async (payload, accessToken) => {
  const { data } = await api.post('/bookings', payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data.booking
}

const authConfig = (accessToken) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
})

export const getMyBookings = async (accessToken) => {
  const { data } = await api.get('/bookings/my-bookings', {
    ...authConfig(accessToken),
    params: { page: 1, limit: 100 },
  })
  return data
}

export const getBookingDetails = async (bookingId, accessToken) => {
  const { data } = await api.get(`/bookings/${bookingId}`, authConfig(accessToken))
  return data.booking
}
