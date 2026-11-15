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

export const simulatePaymentSuccess = async (bookingId, accessToken) => {
  const { data } = await api.post(
    '/payments/simulate-success',
    { bookingId },
    authConfig(accessToken),
  )
  return data
}

export const getPaymentStatus = async (bookingId, accessToken) => {
  const { data } = await api.get(`/payments/${bookingId}`, authConfig(accessToken))
  return data.payment
}

export const getRefundStatus = async (bookingId, accessToken) => {
  const { data } = await api.get(`/payments/refund/${bookingId}`, authConfig(accessToken))
  return data.refund
}
