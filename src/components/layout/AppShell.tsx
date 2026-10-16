import { Outlet, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../../api/client.ts'
import { useAuthToken } from '../../auth/storage.ts'
import { RealtimeBridge } from '../../realtime/bridge.tsx'
import { useNotices } from '../../ui/notices.ts'
import { Footer } from './Footer.tsx'
import { Header } from './Header.tsx'

export function AppShell() {
  const token = useAuthToken()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notices = useNotices()
  const session = useQuery({
    queryKey: ['session', token],
    queryFn: ({ signal }) => api.session(signal),
    enabled: Boolean(token),
    retry: false,
  })

  useEffect(() => {
    const onExpired = () => {
      queryClient.removeQueries({ queryKey: ['favorites'] })
      queryClient.removeQueries({ queryKey: ['profile'] })
      queryClient.removeQueries({ queryKey: ['wallets'] })
      queryClient.removeQueries({ queryKey: ['order'] })
      queryClient.removeQueries({ queryKey: ['session'] })
      const redirect = `${window.location.pathname}${window.location.search}`
      void navigate({ to: '/login', search: { redirect } })
    }
    window.addEventListener('kurio:unauthorized', onExpired)
    return () => window.removeEventListener('kurio:unauthorized', onExpired)
  }, [navigate, queryClient])

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:p-2 focus:text-ink">
        Ir para o conteúdo
      </a>
      <Header user={session.data?.user} />
      <RealtimeBridge userId={session.data?.user.id ?? null} />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <Footer />
      <div aria-live="polite" data-testid="notices" className="fixed right-4 bottom-4 z-50 grid max-w-sm gap-2">
        {notices.map((notice) => (
          <p key={notice.id} role="status" className="rounded-xl border border-line bg-panel px-4 py-3 text-sm shadow-lg">
            {notice.message}
          </p>
        ))}
      </div>
    </div>
  )
}
