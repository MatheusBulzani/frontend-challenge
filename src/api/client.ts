import axios, { isAxiosError } from 'axios'
import { authStorage } from '../auth/storage.ts'
import type { ApiErrorBody, CatalogSearch, NetworkId, WalletRole } from '../domain/types.ts'

export const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  else config.headers['X-Guest-Id'] = authStorage.getGuestId()
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const code = (error.response.data as ApiErrorBody | undefined)?.code
      if (code !== 'INVALID_CREDENTIALS' && authStorage.getToken()) {
        authStorage.setToken(null)
        window.dispatchEvent(new CustomEvent('kurio:unauthorized'))
      }
    }
    return Promise.reject(error)
  },
)

export function readApiError(error: unknown): ApiErrorBody {
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: 'A resposta demorou demais.' }
    }
    const data = error.response?.data
    if (data && typeof data === 'object' && 'message' in data) return data as ApiErrorBody
    if (!error.response) return { code: 'OFFLINE', message: 'Sem conexão com o serviço.' }
  }
  return { code: 'UNKNOWN', message: 'A ação não foi concluída.' }
}

export function isTimeout(error: unknown) {
  return isAxiosError(error) && error.code === 'ECONNABORTED'
}

function catalogParams(search: CatalogSearch) {
  return {
    q: search.q || undefined,
    category: search.category || undefined,
    network: search.network || undefined,
    min: search.min || undefined,
    max: search.max || undefined,
    sort: search.sort,
    page: search.page,
  }
}

export const api = {
  listNfts: (search: CatalogSearch, signal?: AbortSignal) =>
    http.get('/nfts', { params: catalogParams(search), signal }).then((response) => response.data),
  highlights: (signal?: AbortSignal) => http.get('/highlights', { signal }).then((response) => response.data),
  nft: (id: string, signal?: AbortSignal) => http.get(`/nfts/${id}`, { signal }).then((response) => response.data),
  login: (email: string, password: string) => http.post('/auth/login', { email, password }).then((response) => response.data),
  register: (body: { name: string; displayName: string; email: string; password: string }) =>
    http.post('/auth/register', body).then((response) => response.data),
  session: (signal?: AbortSignal) => http.get('/session', { signal }).then((response) => response.data),
  logout: () => http.post('/auth/logout').then((response) => response.data),
  favorites: (signal?: AbortSignal) => http.get('/favorites', { signal }).then((response) => response.data),
  addFavorite: (nftId: string) => http.post('/favorites', { nftId }).then((response) => response.data),
  removeFavorite: (nftId: string) => http.delete(`/favorites/${nftId}`).then((response) => response.data),
  cart: (network: NetworkId = 'ethereum', signal?: AbortSignal) =>
    http.get('/cart', { params: { network }, signal }).then((response) => response.data),
  addItem: (body: { nftId: string; editionId: string; quantity: number }) =>
    http.post('/cart/items', body).then((response) => response.data),
  updateItem: (itemId: string, quantity: number) =>
    http.patch(`/cart/items/${itemId}`, { quantity }).then((response) => response.data),
  removeItem: (itemId: string) => http.delete(`/cart/items/${itemId}`).then((response) => response.data),
  applyCoupon: (code: string) => http.post('/cart/coupon', { code }).then((response) => response.data),
  removeCoupon: () => http.delete('/cart/coupon').then((response) => response.data),
  mergeCart: (guestId: string) => http.post('/cart/merge', { guestId }).then((response) => response.data),
  quote: (network: NetworkId) => http.post('/quotes', { network }).then((response) => response.data),
  createOrder: (body: { quoteId: string; walletId: string; network: NetworkId }, key: string, timeout = 8000) =>
    http.post('/orders', body, { headers: { 'Idempotency-Key': key }, timeout }).then((response) => response.data),
  order: (orderId: string, signal?: AbortSignal) => http.get(`/orders/${orderId}`, { signal }).then((response) => response.data),
  profile: (signal?: AbortSignal) => http.get('/profile', { signal }).then((response) => response.data),
  updateProfile: (body: { name: string; displayName: string; email: string; avatarDataUrl?: string | null }) =>
    http.patch('/profile', body).then((response) => response.data),
  changePassword: (body: { currentPassword: string; nextPassword: string }) =>
    http.post('/profile/password', body).then((response) => response.data),
  wallets: (signal?: AbortSignal) => http.get('/wallets', { signal }).then((response) => response.data),
  createWallet: (body: { role: WalletRole; label: string; address: string; network: NetworkId }) =>
    http.post('/wallets', body).then((response) => response.data),
  updateWallet: (id: string, body: { role: WalletRole; label: string; address: string; network: NetworkId }) =>
    http.patch(`/wallets/${id}`, body).then((response) => response.data),
  connectWallet: (id: string) => http.post(`/wallets/${id}/connect`).then((response) => response.data),
  disconnectWallet: (id: string) => http.post(`/wallets/${id}/disconnect`).then((response) => response.data),
  bumpPrice: (nftId?: string) => http.post('/dev/bump', { nftId }).then((response) => response.data),
  resolveOrder: (orderId: string, status: 'confirmed' | 'rejected') =>
    http.post('/dev/resolve', { orderId, status }).then((response) => response.data),
  emit: (event: string, payload: unknown) => http.post('/dev/emit', { event, payload }).then((response) => response.data),
}
