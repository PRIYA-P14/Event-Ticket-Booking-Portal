import { useEffect, useState } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { rolePath } from '../context/routeUtils'
import BackButton from '../components/BackButton'
import ThemeToggle from '../components/ThemeToggle'

function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, signIn, user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate(rolePath(user.role), { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Enter your email and password to continue.')
      return
    }

    setIsSubmitting(true)
    try {
      const user = await signIn(form)
      navigate(rolePath(user.role), { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--intro">
        <div className="auth-panel__top">
          <Link className="brand" to="/"><span className="brand__mark">E</span><span>Eventra</span></Link>
          <ThemeToggle />
        </div>
        <BackButton fallback="/" light={false} />
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Your next<br /><span>moment awaits.</span></h1>
          <p>Sign in to discover events, manage bookings, and keep every plan in one place.</p>
        </div>
      </section>
      <section className="auth-panel auth-panel--form">
        <div className="auth-form-wrap">
          <p className="eyebrow">Account access</p>
          <h2>Sign in to Eventra</h2>
          <p className="auth-subtitle">Use your registered email to continue.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'} <ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">New to Eventra? <Link to="/register">Create an account</Link></p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
