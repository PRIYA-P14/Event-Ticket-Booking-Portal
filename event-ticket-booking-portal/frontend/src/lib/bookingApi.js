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
