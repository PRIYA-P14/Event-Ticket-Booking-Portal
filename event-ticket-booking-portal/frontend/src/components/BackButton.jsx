import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { rolePath } from '../context/routeUtils'

function BackButton({ fallback, light = true }) {
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const { isAuthenticated, user } = useAuth()

  const fallbackPath = fallback || (isAuthenticated ? rolePath(user?.role) : '/')
  const handleBack = () => {
    if (navigationType !== 'POP' && window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(fallbackPath, { replace: true })
  }

  return (
    <button
      type="button"
      className={`back-link back-button${light ? ' back-link--light' : ''}`}
      onClick={handleBack}
      aria-label={`Back from ${location.pathname}`}
    >
      <ArrowLeft size={16} aria-hidden="true" /> Back
    </button>
  )
}

export default BackButton
