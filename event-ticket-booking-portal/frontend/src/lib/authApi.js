import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
})

const authConfig = (accessToken) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
})

export const register = async (payload) => {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export const login = async (payload) => {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export const getCurrentUser = async (accessToken) => {
  const { data } = await api.get('/auth/me', authConfig(accessToken))
  return data.user
}

export const logout = async (accessToken) => {
  const { data } = await api.post('/auth/logout', {}, authConfig(accessToken))
  return data
}
