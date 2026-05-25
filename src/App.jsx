import { useEffect, useState } from 'react'
import { clearSession, fetchMe, getStoredUser, getToken } from './api.js'
import AuthScreen from './AuthScreen.jsx'
import YardApp from './YardApp.jsx'

export default function App() {
  const [user, setUser] = useState(getStoredUser())
  const [checking, setChecking] = useState(!!getToken())

  // If we have a stored token, validate it once on load so a stale token doesn't
  // strand the user on a half-loaded yard screen.
  useEffect(() => {
    if (!getToken()) { setChecking(false); return }
    fetchMe()
      .then(d => setUser(d.user))
      .catch(() => { clearSession(); setUser(null) })
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0E6', color: '#5C6E58', fontFamily: "'Fraunces', serif" }}>
        Loading…
      </div>
    )
  }

  if (!user) return <AuthScreen onAuthed={u => setUser(u)} />
  return <YardApp user={user} onLogout={() => { clearSession(); setUser(null) }} />
}
