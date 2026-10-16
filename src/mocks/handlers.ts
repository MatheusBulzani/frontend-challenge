import { delay, http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NetworkId, OrderStatus } from '../domain/types.ts'
import { broadcast, registerEmitter } from './hub.ts'
import { MockError } from './store.ts'
import {
  addCartItem,
  addFavorite,
  applyCoupon,
  bumpNft,
  changePassword,
  connectWallet,
  createOrder,
  createQuote,
  disconnectWallet,
  getCart,
  getNft,
  getOrder,
  getProfile,
  getScenario,
  listFavorites,
  listHighlights,
  listNfts,
  listWallets,
  loginAccount,
  logoutAccount,
  markSlowResponse,
  mergeGuestCart,
  nftEvent,
  orderEvent,
  readSession,
  registerAccount,
  removeCartItem,
  removeCoupon,
  removeFavorite,
  resetDatabase,
  resolveOrder,
  saveWallet,
  updateCartItem,
  updateProfile,
} from './store.ts'

let outOfOrder = 0

async function networkGate(request: Request) {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/dev')) return null
  const scenario = getScenario()
  if (scenario === 'offline') return HttpResponse.error()
  if (scenario === 'http-500') {
    return HttpResponse.json({ code: 'TRANSIENT', message: 'Falha temporária no serviço.' }, { status: 500 })
  }
  if (scenario === 'slow') await delay(1400)
  if (scenario === 'out-of-order' && url.pathname.startsWith('/api/nfts')) {
    outOfOrder += 1
    await delay(outOfOrder % 2 === 0 ? 80 : 900)
  }
  return null
}

function jsonError(error: MockError) {
  return HttpResponse.json(
    { code: error.code, message: error.message, details: error.details },
    { status: error.status },
  )
}

async function actor(request: Request, options?: { required?: boolean; mutation?: boolean }) {
  const blocked = await networkGate(request)
  if (blocked) return { blocked, user: null }
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
  if (token && getScenario() === 'session-expired') {
    throw new MockError(401, 'SESSION_EXPIRED', 'Sua sessão expirou.')
  }
  if (options?.mutation && token && getScenario() === 'unauthorized') {
    throw new MockError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.')
  }
  let user = null
  if (token) user = readSession(token).user
  else if (options?.required) throw new MockError(401, 'SESSION_INVALID', 'Faça login para continuar.')
  return { blocked: null, user, token }
}

function ownerId(userId: string | null, request: Request) {
  if (userId) return userId
  return `guest:${request.headers.get('x-guest-id') || 'anonymous'}`
}

function schedule(orderId: string) {
  const scenario = getScenario()
  if (scenario === 'order-hold') return
  const status: Exclude<OrderStatus, 'pending'> = scenario === 'payment-rejected' ? 'rejected' : 'confirmed'
  window.setTimeout(() => {
    const updated = resolveOrder(orderId, status)
    if (updated) broadcast('order.updated', orderEvent(updated))
  }, 700)
}

async function readBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T
}

function onSocket(connection: Parameters<typeof toSocketIo>[0]) {
  const io = toSocketIo(connection)
  const unregister = registerEmitter((event, payload) => {
    io.client.emit(event, payload)
  })
  connection.client.addEventListener('close', () => unregister())
}

const realtimeSocket = ws.link('*/realtime')

export const handlers = [
  realtimeSocket.addEventListener('connection', onSocket),

  http.get('/api/nfts', async ({ request }) => {
    try {
      const blocked = await networkGate(request)
      if (blocked) return blocked
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? '1')
      return HttpResponse.json(
        listNfts({
          q: url.searchParams.get('q') ?? '',
          category: url.searchParams.get('category') ?? '',
          network: url.searchParams.get('network') ?? '',
          min: url.searchParams.get('min') ?? '',
          max: url.searchParams.get('max') ?? '',
          sort: url.searchParams.get('sort') ?? 'recent',
          page: Number.isFinite(page) ? page : 1,
          pageSize: 6,
        }),
      )
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.get('/api/highlights', async ({ request }) => {
    const blocked = await networkGate(request)
    if (blocked) return blocked
    return HttpResponse.json({ items: listHighlights() })
  }),

  http.get('/api/nfts/:id', async ({ request, params }) => {
    try {
      const blocked = await networkGate(request)
      if (blocked) return blocked
      return HttpResponse.json(getNft(String(params.id)))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/auth/register', async ({ request }) => {
    try {
      const blocked = await networkGate(request)
      if (blocked) return blocked
      const body = await readBody<{ name: string; displayName: string; email: string; password: string }>(request)
      return HttpResponse.json(await registerAccount(body), { status: 201 })
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/auth/login', async ({ request }) => {
    try {
      const blocked = await networkGate(request)
      if (blocked) return blocked
      const body = await readBody<{ email: string; password: string }>(request)
      return HttpResponse.json(await loginAccount(body))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.get('/api/session', async ({ request }) => {
    try {
      const result = await actor(request, { required: true })
      if (result.blocked) return result.blocked
      return HttpResponse.json({ user: result.user })
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    try {
      const result = await actor(request)
      if (result.blocked) return result.blocked
      return HttpResponse.json(logoutAccount(result.token ?? null))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.get('/api/favorites', async ({ request }) => {
    try {
      const result = await actor(request, { required: true })
      if (result.blocked) return result.blocked
      return HttpResponse.json(listFavorites(result.user!.id))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/favorites', async ({ request }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      const body = await readBody<{ nftId: string }>(request)
      return HttpResponse.json(addFavorite(result.user!.id, body.nftId), { status: 201 })
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      return HttpResponse.json(removeFavorite(result.user!.id, String(params.nftId)))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.get('/api/cart', async ({ request }) => {
    try {
      const result = await actor(request)
      if (result.blocked) return result.blocked
      const url = new URL(request.url)
      const network = (url.searchParams.get('network') || 'ethereum') as NetworkId
      return HttpResponse.json(getCart(ownerId(result.user?.id ?? null, request), network))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/cart/items', async ({ request }) => {
    try {
      const result = await actor(request)
      if (result.blocked) return result.blocked
      const body = await readBody<{ nftId: string; editionId: string; quantity: number }>(request)
      return HttpResponse.json(addCartItem(ownerId(result.user?.id ?? null, request), body), { status: 201 })
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.patch('/api/cart/items/:itemId', async ({ request, params }) => {
    try {
      const result = await actor(request)
      if (result.blocked) return result.blocked
      const body = await readBody<{ quantity: number }>(request)
      return HttpResponse.json(updateCartItem(ownerId(result.user?.id ?? null, request), String(params.itemId), body.quantity))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.delete('/api/cart/items/:itemId', async ({ request, params }) => {
    try {
      const result = await actor(request)
      if (result.blocked) return result.blocked
      return HttpResponse.json(removeCartItem(ownerId(result.user?.id ?? null, request), String(params.itemId)))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    try {
      const result = await actor(request)
      if (result.blocked) return result.blocked
      const body = await readBody<{ code: string }>(request)
      return HttpResponse.json(applyCoupon(ownerId(result.user?.id ?? null, request), body.code))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    try {
      const result = await actor(request)
      if (result.blocked) return result.blocked
      return HttpResponse.json(removeCoupon(ownerId(result.user?.id ?? null, request)))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/cart/merge', async ({ request }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      const body = await readBody<{ guestId: string }>(request)
      return HttpResponse.json(mergeGuestCart(result.user!.id, body.guestId))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/quotes', async ({ request }) => {
    try {
      const result = await actor(request, { required: true })
      if (result.blocked) return result.blocked
      const body = await readBody<{ network: NetworkId }>(request)
      try {
        return HttpResponse.json(createQuote(result.user!.id, result.user!.id, body.network), { status: 201 })
      } catch (error) {
        if (error instanceof MockError && error.code === 'QUOTE_STALE') {
          const cart = getCart(result.user!.id)
          const first = cart.items[0]
          if (first) broadcast('nft.updated', nftEvent(getNft(first.nftId)))
        }
        throw error
      }
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/orders', async ({ request }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      const key = request.headers.get('idempotency-key')
      if (!key) throw new MockError(400, 'IDEMPOTENCY_REQUIRED', 'Informe a chave de idempotência.')
      const body = await readBody<{ quoteId: string; walletId: string; network: NetworkId }>(request)
      const session = readSession(result.token ?? null)
      const order = createOrder({
        user: { ...session.user, passwordHash: '' },
        quoteId: body.quoteId,
        walletId: body.walletId,
        network: body.network,
        idempotencyKey: key,
      })
      schedule(order.id)
      if (getScenario() === 'order-timeout' && markSlowResponse(order.id)) await delay(12_000)
      const fresh = getOrder(session.user.id, order.id)
      return HttpResponse.json(fresh, { status: 201 })
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.get('/api/orders/:orderId', async ({ request, params }) => {
    try {
      const result = await actor(request, { required: true })
      if (result.blocked) return result.blocked
      return HttpResponse.json(getOrder(result.user!.id, String(params.orderId)))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.get('/api/profile', async ({ request }) => {
    try {
      const result = await actor(request, { required: true })
      if (result.blocked) return result.blocked
      const session = readSession(result.token ?? null)
      return HttpResponse.json(getProfile({ ...session.user, passwordHash: '' }))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.patch('/api/profile', async ({ request }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      const body = await readBody<{ name: string; displayName: string; email: string; avatarDataUrl?: string | null }>(request)
      return HttpResponse.json(updateProfile(result.user!.id, body))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/profile/password', async ({ request }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      const body = await readBody<{ currentPassword: string; nextPassword: string }>(request)
      return HttpResponse.json(await changePassword(result.user!.id, body))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.get('/api/wallets', async ({ request }) => {
    try {
      const result = await actor(request, { required: true })
      if (result.blocked) return result.blocked
      return HttpResponse.json({ items: listWallets(result.user!.id) })
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/wallets', async ({ request }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      const body = await readBody<{ role: 'primary' | 'secondary'; label: string; address: string; network: NetworkId }>(request)
      return HttpResponse.json(saveWallet(result.user!.id, body), { status: 201 })
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.patch('/api/wallets/:walletId', async ({ request, params }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      const body = await readBody<{ role: 'primary' | 'secondary'; label: string; address: string; network: NetworkId }>(request)
      return HttpResponse.json(saveWallet(result.user!.id, { ...body, id: String(params.walletId) }))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/wallets/:walletId/connect', async ({ request, params }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      return HttpResponse.json(connectWallet(result.user!.id, String(params.walletId)))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/wallets/:walletId/disconnect', async ({ request, params }) => {
    try {
      const result = await actor(request, { required: true, mutation: true })
      if (result.blocked) return result.blocked
      return HttpResponse.json(disconnectWallet(result.user!.id, String(params.walletId)))
    } catch (error) {
      if (error instanceof MockError) return jsonError(error)
      throw error
    }
  }),

  http.post('/api/dev/reset', () => {
    resetDatabase()
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/dev/bump', async ({ request }) => {
    const body = await readBody<{ nftId?: string }>(request).catch(() => ({ nftId: undefined }))
    const nft = bumpNft(body.nftId || 'nft_emerald', '0.25')
    broadcast('nft.updated', nftEvent(nft))
    return HttpResponse.json(nftEvent(nft))
  }),

  http.post('/api/dev/resolve', async ({ request }) => {
    const body = await readBody<{ orderId: string; status: 'confirmed' | 'rejected' }>(request)
    const order = resolveOrder(body.orderId, body.status)
    if (!order) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Pedido não encontrado.' }, { status: 404 })
    broadcast('order.updated', orderEvent(order))
    return HttpResponse.json(order)
  }),

  http.post('/api/dev/emit', async ({ request }) => {
    const body = await readBody<{ event: string; payload: unknown }>(request)
    broadcast(body.event, body.payload)
    return HttpResponse.json({ ok: true })
  }),
]
