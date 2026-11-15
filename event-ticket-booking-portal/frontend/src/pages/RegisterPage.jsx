import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../lib/authApi'
import BackButton from '../components/BackButton'
import ThemeToggle from '../components/ThemeToggle'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--intro">
        <div className="auth-panel__top">
          <Link className="brand" to="/"><span className="brand__mark">E</span><span>Eventra</span></Link>
          <ThemeToggle />
        </div>
        <BackButton fallback="/" light={false} />
        <div>
          <p className="eyebrow">Join the experience</p>
          <h1>Find your<br /><span>next thing.</span></h1>
          <p>Create your attendee account and start booking the moments worth remembering.</p>
        </div>
      </section>
      <section className="auth-panel auth-panel--form">
        <div className="auth-form-wrap">
          <p className="eyebrow">Get started</p>
          <h2>Create your account</h2>
          <p className="auth-subtitle">Join Eventra as an attendee.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="register-name">Full name</label>
            <input id="register-name" type="text" autoComplete="name" value={form.name} onChange={update('name')} required />
            <label htmlFor="register-email">Email address</label>
            <input id="register-email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
            <label htmlFor="register-phone">Phone number</label>
            <input id="register-phone" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} required />
            <label htmlFor="register-password">Password</label>
            <input id="register-password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} minLength="8" required />
            <label htmlFor="register-confirm-password">Confirm password</label>
            <input id="register-confirm-password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'} <ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  )
}

export default RegisterPage
