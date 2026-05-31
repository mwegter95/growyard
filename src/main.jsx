import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

/* ── Embed-mode height broadcaster ──────────────────────────────────────────
 * When Growyard is iframed (e.g. inside michaelwegter.com/apps/growyard),
 * iOS Safari refuses to scroll the iframe smoothly past its visible bounds —
 * users have to stop, pause, then scroll again to reach content near the
 * bottom. Workaround: tell the parent page our actual document height via
 * postMessage so it can size the iframe to fit the content. With no internal
 * iframe scroll, the parent's normal page scroll handles everything and the
 * bug disappears.
 *
 * Only fires when window.parent !== window (i.e. we ARE embedded). The parent
 * (michaelwegter.com AppFrame) listens for any '<app>:height' message.
 */
if (typeof window !== 'undefined' && window.parent !== window) {
  const postHeight = () => {
    const h = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0
    )
    window.parent.postMessage({ type: 'growyard:height', height: h }, '*')
  }
  // Fire often during load (fonts, async data) and any time the DOM resizes.
  const ro = new ResizeObserver(postHeight)
  window.addEventListener('load', postHeight)
  window.addEventListener('resize', postHeight)
  // Wait for the body to exist (StrictMode mounts after this script tag runs).
  queueMicrotask(() => {
    if (document.body) ro.observe(document.body)
    postHeight()
  })
  // Belt-and-suspenders: a slow tick catches DOM changes ResizeObserver misses
  // (e.g. images loading async, modals opening).
  setInterval(postHeight, 1000)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
