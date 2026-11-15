import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
})

const config = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const request = async (method, path, token, data, params) => {
  const response = await api.request({ method, url: path, data, params, ...config(token) })
  return response.data
}

export const getAdminDashboard = (token) => request('get', '/admin/dashboard', token)
export const getOrganizers = (token, search) => request('get', '/admin/organizers', token, undefined, search ? { search } : undefined)
export const createOrganizer = (token, data) => request('post', '/admin/organizers', token, data)
export const setOrganizerStatus = (token, id, isActive) => request('patch', `/admin/organizers/${id}/status`, token, { isActive })
export const getVenues = (token) => request('get', '/admin/venues', token)
export const saveVenue = (token, id, data) => request(id ? 'put' : 'post', id ? `/admin/venues/${id}` : '/admin/venues', token, data)
export const setVenueStatus = (token, id, isActive) => request('patch', `/admin/venues/${id}/status`, token, { isActive })
export const getCategories = (token) => request('get', '/admin/categories', token)
export const saveCategory = (token, id, data) => request(id ? 'put' : 'post', id ? `/admin/categories/${id}` : '/admin/categories', token, data)
export const setCategoryStatus = (token, id, isActive) => request('patch', `/admin/categories/${id}/status`, token, { isActive })
export const getAdminBookings = (token, params) => request('get', '/admin/bookings', token, undefined, params)
