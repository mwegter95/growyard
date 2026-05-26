import { useState } from 'react'
import { Leaf } from 'lucide-react'
import { login, register } from './api.js'

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = mode === 'login'
        ? await login(email.trim().toLowerCase(), password)
        : await register(email.trim().toLowerCase(), password, displayName.trim())
      onAuthed(data.user)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.brand}>
          <Leaf size={22} color="#4F6F44" strokeWidth={1.5} />
          <span style={s.brandText}>Growyard</span>
        </div>
        <h1 style={s.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p style={s.subtitle}>
          {mode === 'login'
            ? 'Sign in to see your plants, tasks, and notes.'
            : "We'll seed your account with a starter set of plants and a year-round task calendar."}
        </p>

        <form onSubmit={onSubmit} style={s.form}>
          {mode === 'register' && (
            <label style={s.label}>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                style={s.input}
              />
            </label>
          )}
          <label style={s.label}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input}
            />
          </label>
          <label style={s.label}>
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={s.input}
            />
          </label>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={busy} style={{ ...s.submit, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setError(null); setMode(mode === 'login' ? 'register' : 'login') }}
          style={s.toggleMode}
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

const s = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F4F0E6',
    backgroundImage: `radial-gradient(circle at 15% 5%, rgba(79, 111, 68, 0.06) 0%, transparent 40%),
                      radial-gradient(circle at 85% 95%, rgba(139, 90, 60, 0.05) 0%, transparent 40%)`,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: '28px 26px 22px',
    boxShadow: '0 12px 40px rgba(44, 58, 42, 0.08)',
    border: '1px solid rgba(92, 110, 88, 0.12)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 },
  brandText: {
    fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 18,
    letterSpacing: '-0.01em', color: '#2C3A2A',
  },
  title: {
    fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: 26,
    margin: 0, color: '#2C3A2A', letterSpacing: '-0.02em', lineHeight: 1.15,
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#7a7567',
    lineHeight: 1.5, marginTop: 8, marginBottom: 20,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: {
    display: 'flex', flexDirection: 'column', gap: 6,
    fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5C6E58',
  },
  input: {
    padding: '10px 12px', border: '1px solid rgba(92, 110, 88, 0.22)',
    borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 14,
    color: '#2C3A2A', backgroundColor: '#fff', outline: 'none',
    textTransform: 'none', letterSpacing: 'normal', fontWeight: 400,
  },
  error: {
    color: '#B0413E', fontSize: 12, fontFamily: "'Inter', sans-serif",
    backgroundColor: 'rgba(176, 65, 62, 0.08)', padding: '8px 10px',
    borderRadius: 8, border: '1px solid rgba(176, 65, 62, 0.18)',
  },
  submit: {
    marginTop: 4, padding: '11px 16px', border: 'none', borderRadius: 10,
    backgroundColor: '#2C3A2A', color: '#F4F0E6',
    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  toggleMode: {
    marginTop: 14, padding: '8px 0', border: 'none', background: 'transparent',
    color: '#4F6F44', fontFamily: "'Inter', sans-serif", fontSize: 12,
    fontWeight: 500, cursor: 'pointer', width: '100%',
  },
}
