import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
})

const authConfig = (accessToken) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
})

export const getBooking = async (bookingId, accessToken) => {
  const { data } = await api.get(`/bookings/${bookingId}`, authConfig(accessToken))
  return data.booking
}

export const createPaymentOrder = async (bookingId, accessToken) => {
  const { data } = await api.post(
    '/payments/create-order',
    { bookingId },
    authConfig(accessToken),
  )
  return data.checkout
}

export const verifyPayment = async (payment, accessToken) => {
  const { data } = await api.post('/payments/verify', payment, authConfig(accessToken))
  return data
}

export const getPaymentStatus = async (bookingId, accessToken) => {
  const { data } = await api.get(`/payments/${bookingId}`, authConfig(accessToken))
  return data.payment
}
