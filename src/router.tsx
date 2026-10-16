import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { authStorage } from './auth/storage.ts'
import { AppShell } from './components/layout/AppShell.tsx'
import { parseCatalogSearch, parseRedirect } from './domain/search.ts'
import { LoginPage, RegisterPage } from './pages/AuthPages.tsx'
import { CartPage } from './pages/CartPage.tsx'
import { CheckoutPage } from './pages/CheckoutPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ExplorerPage, OrderPage } from './pages/OrderPage.tsx'
import { NotFoundPage, OutOfScopePage, ScenariosPage } from './pages/InfoPages.tsx'
import { NftPage } from './pages/NftPage.tsx'
import { ProfilePage, WalletsPage } from './pages/AccountPages.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response && error.response.status < 500) return false
      return failureCount < 1
    },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: parseCatalogSearch,
  component: HomePage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  component: NftPage,
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  component: CartPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: parseRedirect,
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  validateSearch: parseRedirect,
  component: RegisterPage,
})

const scenariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cenarios',
  component: ScenariosPage,
})

const scopeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fora/$topic',
  component: OutOfScopePage,
})

const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/explorar/$txRef',
  component: ExplorerPage,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pagamento',
  beforeLoad: ({ location }) => {
    if (!authStorage.getToken()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: CheckoutPage,
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedidos/$orderId',
  beforeLoad: ({ location }) => {
    if (!authStorage.getToken()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: OrderPage,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  beforeLoad: ({ location }) => {
    if (!authStorage.getToken()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: ProfilePage,
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carteiras',
  beforeLoad: ({ location }) => {
    if (!authStorage.getToken()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: WalletsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  cartRoute,
  loginRoute,
  registerRoute,
  scenariosRoute,
  scopeRoute,
  explorerRoute,
  checkoutRoute,
  orderRoute,
  profileRoute,
  walletsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
