import { useEffect, useMemo, useState } from 'react'
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from '../lib/authApi'
import { AuthContext } from './authContext'

const ACCESS_TOKEN_KEY = 'accessToken'
const USER_KEY = 'currentUser'

const clearStoredAuth = () => {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

const getStoredUser = () => {
  const storedUser = window.localStorage.getItem(USER_KEY)
  if (!storedUser) return null

  try {
    return JSON.parse(storedUser)
  } catch {
    window.localStorage.removeItem(USER_KEY)
    return null
  }
}

function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => window.localStorage.getItem(ACCESS_TOKEN_KEY))
  const [user, setUser] = useState(getStoredUser)
  const [isLoading, setIsLoading] = useState(Boolean(accessToken))

  useEffect(() => {
    if (!accessToken) {
      return undefined
    }

    let isMounted = true
    getCurrentUser(accessToken)
      .then((currentUser) => {
        if (!isMounted) return
        setUser(currentUser)
        window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      })
      .catch(() => {
        if (!isMounted) return
        clearStoredAuth()
        setAccessToken(null)
        setUser(null)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accessToken])

  const value = useMemo(() => ({
    accessToken,
    user,
    isLoading,
    isAuthenticated: Boolean(accessToken && user),
    async signIn(credentials) {
      const response = await loginRequest(credentials)
      const currentUser = await getCurrentUser(response.accessToken)
      window.localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
      window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      setAccessToken(response.accessToken)
      setUser(currentUser)
      return currentUser
    },
    async signOut() {
      if (accessToken) {
        try {
          await logoutRequest(accessToken)
        } finally {
          clearStoredAuth()
          setAccessToken(null)
          setUser(null)
        }
      } else {
        clearStoredAuth()
        setUser(null)
      }
    },
  }), [accessToken, isLoading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }
