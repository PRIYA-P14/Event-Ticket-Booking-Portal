import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'

function RolePlaceholderPage() {
  const { user, signOut } = useAuth()

  return (
    <main className="placeholder-page">
      <div className="placeholder-card">
        <span className="brand__mark">E</span>
        <p className="eyebrow">{user.role} portal</p>
        <h1>Welcome, {user.name}.</h1>
        <p>Your role-specific experience is coming next. You are securely signed in.</p>
        <div className="placeholder-actions">
          <Link className="primary-button" to="/">Browse events</Link>
          <button type="button" className="secondary-button" onClick={signOut}>Log out</button>
        </div>
      </div>
    </main>
  )
}

export default RolePlaceholderPage
