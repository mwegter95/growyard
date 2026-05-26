// API wrapper for talking to mw-backend.
// Token lives in localStorage; every request sends it as Authorization: Bearer.

const API_URL = import.meta.env.VITE_API_URL || 'https://api.michaelwegter.com'
const TOKEN_KEY = 'growyard:token'
const USER_KEY = 'growyard:user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
}

function persistSession({ token, user }) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const tok = getToken()
    if (tok) headers['Authorization'] = `Bearer ${tok}`
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json() : null
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function login(email, password) {
  const data = await request('/auth/login', { method: 'POST', body: { email, password }, auth: false })
  persistSession(data)
  return data
}

export async function register(email, password, display_name) {
  const data = await request('/auth/register', { method: 'POST', body: { email, password, display_name }, auth: false })
  persistSession(data)
  return data
}

export async function fetchMe() {
  return request('/auth/me')
}

export async function fetchYardState(year) {
  const qs = year ? `?year=${year}` : ''
  return request(`/yard/state${qs}`)
}

export async function putProgress(taskId, patch) {
  return request(`/yard/progress/${encodeURIComponent(taskId)}`, { method: 'PUT', body: patch })
}

// Fetch a plant image from the API and return a local blob URL for use in <img>.
// The backend serves each user's own copy, so photos are truly per-user.
async function fetchPlantImageBlob(path) {
  const tok = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    headers: tok ? { 'Authorization': `Bearer ${tok}` } : {},
  })
  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export function fetchPlantThumb(plantId) {
  return fetchPlantImageBlob(`/yard/plants/${encodeURIComponent(plantId)}/thumb`)
}

export function fetchPlantHero(plantId) {
  return fetchPlantImageBlob(`/yard/plants/${encodeURIComponent(plantId)}/image`)
}
