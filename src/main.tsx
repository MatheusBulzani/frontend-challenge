import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

async function boot() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('./mocks/browser.ts')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    })
  }
  // socket.io reads globalThis.WebSocket when its module loads. MSW patches
  // that constructor inside worker.start, so the app graph must load after.
  const { App } = await import('./router.tsx')
  window.__KURIO_READY__ = true
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
