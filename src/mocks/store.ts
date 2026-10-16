import { authStorage } from '../auth/storage.ts'
import { addEth, compareEth } from '../domain/eth.ts'
import { summarize } from '../domain/pricing.ts'
import { isScenario, type ScenarioId } from '../domain/scenarios.ts'
import { createSeed } from '../domain/seed.ts'
import type {
  Cart,
  CartLine,
  Database,
  NetworkId,
  Nft,
  Order,
  OrderStatus,
  PublicUser,
  Quote,
  User,
  Wallet,
  WalletRole,
} from '../domain/types.ts'
import { fieldErrors, validateEmail, validateName, validatePassword, validateWalletAddress } from '../domain/validators.ts'

const DB_KEY = 'kurio.db'
const SCENARIO_KEY = 'kurio.scenario'
const BOOT_KEY = 'kurio.boot'

export class MockError extends Error {
  status: number
  code: string
  details?: Record<string, string>

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.name = 'MockError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let db: Database = createSeed()

function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function consumeBoot() {
  const raw = localStorage.getItem(BOOT_KEY)
  if (!raw) return
  localStorage.removeItem(BOOT_KEY)
  try {
    const boot = JSON.parse(raw) as { reset?: boolean; scenario?: string }
    if (boot.scenario && isScenario(boot.scenario)) localStorage.setItem(SCENARIO_KEY, boot.scenario)
    if (boot.reset) {
      localStorage.removeItem(DB_KEY)
      localStorage.removeItem('kurio.token')
      localStorage.removeItem('kurio.pendingOrder')
      localStorage.removeItem('kurio.idempotency')
      authStorage.setToken(null)
      authStorage.clearGuest()
    }
  } catch {
    localStorage.removeItem(DB_KEY)
  }
}

function load() {
  consumeBoot()
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    db = createSeed()
    persist()
    return
  }
  try {
    db = JSON.parse(raw) as Database
  } catch {
    db = createSeed()
    persist()
  }
}

load()

export function getScenario(): ScenarioId {
  const value = localStorage.getItem(SCENARIO_KEY)
  return isScenario(value) ? value : 'default'
}

export function resetDatabase() {
  db = createSeed()
  persist()
  authStorage.setToken(null)
  authStorage.clearGuest()
  localStorage.removeItem('kurio.pendingOrder')
  localStorage.removeItem('kurio.idempotency')
  localStorage.setItem(SCENARIO_KEY, 'default')
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    avatarDataUrl: user.avatarDataUrl,
    avatarSeed: user.avatarSeed,
  }
}

function requireUser(token: string | null): User {
  if (!token) throw new MockError(401, 'SESSION_INVALID', 'Faça login para continuar.')
  const session = db.sessions.find((item) => item.token === token)
  if (!session || session.expiresAt <= Date.now()) {
    throw new MockError(401, 'SESSION_EXPIRED', 'Sua sessão expirou.')
  }
  const user = db.users.find((item) => item.id === session.userId)
  if (!user) throw new MockError(401, 'SESSION_INVALID', 'Sessão inválida.')
  return user
}

export function readSession(token: string | null) {
  const user = requireUser(token)
  return { user: publicUser(user) }
}

export async function registerAccount(input: { name: string; displayName: string; email: string; password: string }) {
  if (getScenario() === 'register-conflict') {
    throw new MockError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
  }
  const details = fieldErrors([
    ['name', validateName(input.name, 'O nome')],
    ['displayName', validateName(input.displayName, 'O nome de exibição')],
    ['email', validateEmail(input.email)],
    ['password', validatePassword(input.password)],
  ])
  if (details) throw new MockError(422, 'VALIDATION', 'Revise os campos do cadastro.', details)
  const email = input.email.trim().toLowerCase()
  if (db.users.some((user) => user.email === email)) {
    throw new MockError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
  }
  const user: User = {
    id: `user_${crypto.randomUUID()}`,
    name: input.name.trim(),
    displayName: input.displayName.trim(),
    email,
    passwordHash: await sha256(input.password),
    avatarDataUrl: null,
    avatarSeed: `user-${email}`,
  }
  db.users.push(user)
  persist()
  return loginAccount({ email, password: input.password })
}

export async function loginAccount(input: { email: string; password: string }) {
  const details = fieldErrors([
    ['email', validateEmail(input.email)],
    ['password', input.password ? null : 'Informe a senha.'],
  ])
  if (details) throw new MockError(422, 'VALIDATION', 'Revise o login.', details)
  const email = input.email.trim().toLowerCase()
  const user = db.users.find((item) => item.email === email)
  const hash = await sha256(input.password)
  if (!user || user.passwordHash !== hash) {
    throw new MockError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', {
      email: 'E-mail ou senha incorretos.',
    })
  }
  const token = crypto.randomUUID()
  db.sessions = db.sessions.filter((session) => session.userId !== user.id)
  db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 8 })
  persist()
  return { token, user: publicUser(user) }
}

export function logoutAccount(token: string | null) {
  if (!token) return { ok: true }
  db.sessions = db.sessions.filter((session) => session.token !== token)
  persist()
  return { ok: true }
}

function primaryPrice(nft: Nft) {
  return nft.editions[0]?.priceEth ?? '0.00'
}

function availableOf(nft: Nft) {
  return nft.editions.reduce((total, edition) => total + edition.available, 0)
}

export function toSummary(nft: Nft) {
  return {
    id: nft.id,
    name: nft.name,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    priceEth: primaryPrice(nft),
    available: availableOf(nft),
    featured: nft.featured,
    likes: nft.likes,
    version: nft.version,
    imageSeed: nft.imageSeed,
    creatorName: nft.creator.name,
  }
}

function matches(
  nft: Nft,
  filters: { q?: string; category?: string; network?: string; min?: string; max?: string },
  ignore?: 'category' | 'network',
) {
  const query = filters.q?.trim().toLowerCase() ?? ''
  if (query && !`${nft.name} ${nft.collection} ${nft.creator.name}`.toLowerCase().includes(query)) return false
  if (ignore !== 'category' && filters.category && nft.category !== filters.category) return false
  if (ignore !== 'network' && filters.network && nft.network !== filters.network) return false
  const price = primaryPrice(nft)
  if (filters.min && compareEth(price, filters.min) < 0) return false
  if (filters.max && compareEth(price, filters.max) > 0) return false
  return true
}

export function listNfts(filters: {
  q?: string
  category?: string
  network?: string
  min?: string
  max?: string
  sort?: string
  page?: number
  pageSize?: number
}) {
  if (getScenario() === 'empty') {
    return {
      items: [],
      page: 1,
      pageSize: filters.pageSize ?? 6,
      total: 0,
      totalPages: 0,
      facets: { categories: [], networks: [] },
    }
  }
  const catalog = db.nfts.filter((nft) => nft.id !== 'nft_sold')
  const filtered = catalog.filter((nft) => matches(nft, filters))
  const sorted = [...filtered].sort((left, right) => {
    if (filters.sort === 'price-asc') return compareEth(primaryPrice(left), primaryPrice(right))
    if (filters.sort === 'price-desc') return compareEth(primaryPrice(right), primaryPrice(left))
    if (filters.sort === 'name') return left.name.localeCompare(right.name, 'pt-BR')
    return right.createdAt - left.createdAt
  })
  const pageSize = filters.pageSize ?? 6
  const page = Math.max(1, filters.page ?? 1)
  const start = (page - 1) * pageSize
  const categories = [...new Set(catalog.map((nft) => nft.category))].map((name) => ({
    name,
    count: catalog.filter((nft) => nft.category === name && matches(nft, filters, 'category')).length,
  }))
  const networks = (['ethereum', 'polygon', 'solana'] as const).map((id) => ({
    id,
    count: catalog.filter((nft) => nft.network === id && matches(nft, filters, 'network')).length,
  }))
  return {
    items: sorted.slice(start, start + pageSize).map(toSummary),
    page,
    pageSize,
    total: sorted.length,
    totalPages: Math.ceil(sorted.length / pageSize),
    facets: { categories, networks },
  }
}

export function getNft(id: string) {
  const nft = db.nfts.find((item) => item.id === id)
  if (!nft) throw new MockError(404, 'NOT_FOUND', 'NFT não encontrado.')
  return nft
}

export function listHighlights() {
  return db.nfts.filter((nft) => nft.featured).map(toSummary)
}

function findEdition(nftId: string, editionId: string) {
  const nft = db.nfts.find((item) => item.id === nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  if (!nft || !edition) throw new MockError(404, 'NOT_FOUND', 'Edição não encontrada.')
  return { nft, edition }
}

function cartFor(ownerId: string): Cart {
  const existing = db.carts.find((cart) => cart.ownerId === ownerId)
  if (existing) return existing
  const created: Cart = { ownerId, items: [], coupon: null }
  db.carts.push(created)
  return created
}

function lineFrom(item: Cart['items'][number]): CartLine {
  const { nft, edition } = findEdition(item.nftId, item.editionId)
  return {
    id: item.id,
    nftId: nft.id,
    nftName: nft.name,
    editionId: edition.id,
    editionName: edition.name,
    quantity: item.quantity,
    available: edition.available,
    unitPriceEth: edition.priceEth,
    lineTotalEth: summarize([{ unitPriceEth: edition.priceEth, quantity: item.quantity }], null, 'ethereum').subtotalEth,
    version: nft.version,
    imageSeed: nft.imageSeed,
  }
}

export function getCart(ownerId: string, network: NetworkId = 'ethereum') {
  const cart = cartFor(ownerId)
  const lines = cart.items.map(lineFrom)
  return {
    items: lines,
    coupon: cart.coupon,
    summary: summarize(lines, cart.coupon, network),
  }
}

export function addCartItem(ownerId: string, input: { nftId: string; editionId: string; quantity: number }) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new MockError(422, 'VALIDATION', 'A quantidade precisa ser um inteiro positivo.', {
      quantity: 'Informe uma quantidade inteira.',
    })
  }
  const { edition } = findEdition(input.nftId, input.editionId)
  if (edition.available < 1) {
    throw new MockError(409, 'EDITION_SOLD_OUT', 'Esta edição está esgotada.', { editionId: 'Edição esgotada.' })
  }
  const cart = cartFor(ownerId)
  const current = cart.items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
  const nextQuantity = (current?.quantity ?? 0) + input.quantity
  if (nextQuantity > edition.available) {
    throw new MockError(422, 'QUANTITY_LIMIT', 'Quantidade acima da disponibilidade.', {
      quantity: `Máximo disponível: ${edition.available}.`,
    })
  }
  if (current) current.quantity = nextQuantity
  else {
    cart.items.push({
      id: `item_${input.nftId}_${input.editionId}`,
      nftId: input.nftId,
      editionId: input.editionId,
      quantity: input.quantity,
    })
  }
  persist()
  return getCart(ownerId)
}

export function updateCartItem(ownerId: string, itemId: string, quantity: number) {
  const cart = cartFor(ownerId)
  const item = cart.items.find((entry) => entry.id === itemId)
  if (!item) throw new MockError(404, 'NOT_FOUND', 'Item não está no carrinho.')
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new MockError(422, 'VALIDATION', 'A quantidade precisa ser um inteiro positivo.', {
      quantity: 'Informe uma quantidade inteira.',
    })
  }
  const { edition } = findEdition(item.nftId, item.editionId)
  if (quantity > edition.available) {
    throw new MockError(422, 'QUANTITY_LIMIT', 'Quantidade acima da disponibilidade.', {
      quantity: `Máximo disponível: ${edition.available}.`,
    })
  }
  item.quantity = quantity
  persist()
  return getCart(ownerId)
}

export function removeCartItem(ownerId: string, itemId: string) {
  const cart = cartFor(ownerId)
  cart.items = cart.items.filter((item) => item.id !== itemId)
  persist()
  return getCart(ownerId)
}

export function applyCoupon(ownerId: string, code: string) {
  const scenario = getScenario()
  const normalized = code.trim().toUpperCase()
  if (!normalized) {
    throw new MockError(422, 'COUPON_INVALID', 'Informe um cupom.', { coupon: 'Informe um cupom.' })
  }
  if (scenario === 'expired-coupon' || normalized === 'EXPIROU') {
    throw new MockError(422, 'COUPON_EXPIRED', 'Este cupom expirou.', { coupon: 'Este cupom expirou.' })
  }
  if (scenario === 'invalid-coupon' || normalized !== 'LANCAMENTO10') {
    throw new MockError(422, 'COUPON_INVALID', 'Cupom não encontrado.', { coupon: 'Cupom não encontrado.' })
  }
  cartFor(ownerId).coupon = normalized
  persist()
  return getCart(ownerId)
}

export function removeCoupon(ownerId: string) {
  cartFor(ownerId).coupon = null
  persist()
  return getCart(ownerId)
}

export function mergeGuestCart(userId: string, guestId: string) {
  const guest = db.carts.find((cart) => cart.ownerId === `guest:${guestId}`)
  if (!guest) return getCart(userId)
  const userCart = cartFor(userId)
  for (const item of guest.items) {
    const edition = findEdition(item.nftId, item.editionId).edition
    const current = userCart.items.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId)
    const desired = (current?.quantity ?? 0) + item.quantity
    const quantity = Math.min(desired, edition.available)
    if (quantity < 1) continue
    if (current) current.quantity = quantity
    else userCart.items.push({ ...item, quantity })
  }
  if (!userCart.coupon && guest.coupon) userCart.coupon = guest.coupon
  guest.items = []
  guest.coupon = null
  persist()
  return getCart(userId)
}

function quoteFingerprint(ownerId: string, network: NetworkId) {
  const cart = getCart(ownerId, network)
  return JSON.stringify({
    lines: cart.items.map((line) => [line.nftId, line.editionId, line.quantity, line.unitPriceEth, line.version]),
    coupon: cart.coupon,
    network,
  })
}

export function createQuote(ownerId: string, userId: string | null, network: NetworkId) {
  const cart = cartFor(ownerId)
  if (cart.items.length === 0) throw new MockError(422, 'CART_EMPTY', 'O carrinho está vazio.')
  if (getScenario() === 'price-changed') {
    const first = cart.items[0]
    if (first) {
      const nft = db.nfts.find((item) => item.id === first.nftId)
      if (nft && nft.version === 1) {
        bumpNft(nft.id, '0.40')
        throw new MockError(409, 'QUOTE_STALE', 'O preço mudou. Atualize a cotação antes de confirmar.')
      }
    }
  }
  for (const item of cart.items) {
    const { edition } = findEdition(item.nftId, item.editionId)
    if (item.quantity > edition.available) {
      throw new MockError(409, 'EDITION_UNAVAILABLE', 'A disponibilidade mudou.', {
        quantity: 'Ajuste a quantidade antes de continuar.',
      })
    }
  }
  const view = getCart(ownerId, network)
  const quote: Quote = {
    id: `quote_${crypto.randomUUID()}`,
    ownerId,
    userId,
    fingerprint: quoteFingerprint(ownerId, network),
    versions: Object.fromEntries(view.items.map((line) => [line.nftId, line.version])),
    lines: view.items,
    summary: view.summary,
    createdAt: Date.now(),
    consumedBy: null,
  }
  db.quotes.push(quote)
  persist()
  return quote
}

export function bumpNft(nftId: string, increaseEth = '0.25') {
  const nft = db.nfts.find((item) => item.id === nftId)
  if (!nft) throw new MockError(404, 'NOT_FOUND', 'NFT não encontrado.')
  const edition = nft.editions[0]
  if (!edition) throw new MockError(404, 'NOT_FOUND', 'Edição não encontrada.')
  edition.priceEth = addEth(edition.priceEth, increaseEth)
  nft.version += 1
  persist()
  return nft
}

export function createOrder(input: {
  user: User
  quoteId: string
  walletId: string
  network: NetworkId
  idempotencyKey: string
}) {
  const fingerprint = JSON.stringify({
    userId: input.user.id,
    quoteId: input.quoteId,
    walletId: input.walletId,
    network: input.network,
  })
  const previous = db.idempotency.find((record) => record.key === input.idempotencyKey)
  if (previous) {
    if (previous.fingerprint !== fingerprint) {
      throw new MockError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave já foi usada com outro pedido.')
    }
    const existing = db.orders.find((order) => order.id === previous.orderId)
    if (!existing) throw new MockError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    return existing
  }
  const quote = db.quotes.find((item) => item.id === input.quoteId && item.userId === input.user.id)
  if (!quote) throw new MockError(404, 'NOT_FOUND', 'Cotação não encontrada. Revise o pedido.')
  if (quote.consumedBy) throw new MockError(409, 'QUOTE_USED', 'Esta cotação já foi usada.')
  if (quote.fingerprint !== quoteFingerprint(input.user.id, input.network)) {
    throw new MockError(409, 'QUOTE_STALE', 'A cotação está desatualizada. Confirme os novos valores.')
  }
  const wallet = db.wallets.find((item) => item.id === input.walletId && item.userId === input.user.id)
  if (!wallet) throw new MockError(422, 'VALIDATION', 'Selecione uma carteira.', { walletId: 'Selecione uma carteira.' })
  if (!wallet.connected) {
    throw new MockError(422, 'WALLET_DISCONNECTED', 'Conecte a carteira antes de confirmar.', {
      walletId: 'A carteira não está conectada.',
    })
  }
  if (getScenario() === 'sold-out') {
    const first = quote.lines[0]
    if (first) {
      const found = findEdition(first.nftId, first.editionId)
      found.edition.available = 0
      found.nft.version += 1
      persist()
    }
    throw new MockError(409, 'EDITION_SOLD_OUT', 'Uma edição esgotou durante a compra.')
  }
  const order: Order = {
    id: `ord_${crypto.randomUUID()}`,
    userId: input.user.id,
    status: 'pending',
    idempotencyKey: input.idempotencyKey,
    fingerprint,
    quoteId: quote.id,
    snapshot: { ...quote.summary, lines: quote.lines },
    txRef: `0x${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`,
    walletId: wallet.id,
    walletAddress: wallet.address,
    version: 1,
    stockApplied: false,
    slowResponseConsumed: false,
    createdAt: Date.now(),
  }
  quote.consumedBy = input.idempotencyKey
  db.orders.push(order)
  db.idempotency.push({ key: input.idempotencyKey, fingerprint, orderId: order.id })
  persist()
  return order
}

export function resolveOrder(orderId: string, status: Exclude<OrderStatus, 'pending'>) {
  const order = db.orders.find((item) => item.id === orderId)
  if (!order || order.status !== 'pending') return order ?? null
  order.status = status
  order.version += 1
  if (status === 'confirmed' && !order.stockApplied) {
    for (const line of order.snapshot.lines) {
      const { edition } = findEdition(line.nftId, line.editionId)
      edition.available = Math.max(0, edition.available - line.quantity)
      const nft = db.nfts.find((item) => item.id === line.nftId)
      if (nft) nft.version += 1
    }
    const cart = cartFor(order.userId)
    for (const line of order.snapshot.lines) {
      const item = cart.items.find((entry) => entry.nftId === line.nftId && entry.editionId === line.editionId)
      if (!item) continue
      item.quantity -= line.quantity
      if (item.quantity <= 0) cart.items = cart.items.filter((entry) => entry.id !== item.id)
    }
    order.stockApplied = true
  }
  persist()
  return order
}

export function getOrder(userId: string, orderId: string) {
  const order = db.orders.find((item) => item.id === orderId && item.userId === userId)
  if (!order) throw new MockError(404, 'NOT_FOUND', 'Pedido não encontrado.')
  return order
}

export function markSlowResponse(orderId: string) {
  const order = db.orders.find((item) => item.id === orderId)
  if (!order) return false
  if (order.slowResponseConsumed) return false
  order.slowResponseConsumed = true
  persist()
  return true
}

export function listFavorites(userId: string) {
  const ids = db.favorites.filter((favorite) => favorite.userId === userId).map((favorite) => favorite.nftId)
  return { nftIds: ids }
}

export function addFavorite(userId: string, nftId: string) {
  getNft(nftId)
  if (!db.favorites.some((favorite) => favorite.userId === userId && favorite.nftId === nftId)) {
    db.favorites.push({ userId, nftId })
    persist()
  }
  return listFavorites(userId)
}

export function removeFavorite(userId: string, nftId: string) {
  db.favorites = db.favorites.filter((favorite) => !(favorite.userId === userId && favorite.nftId === nftId))
  persist()
  return listFavorites(userId)
}

export function getProfile(user: User) {
  return publicUser(user)
}

export function updateProfile(userId: string, input: { name: string; displayName: string; email: string; avatarDataUrl?: string | null }) {
  const user = db.users.find((item) => item.id === userId)
  if (!user) throw new MockError(404, 'NOT_FOUND', 'Perfil não encontrado.')
  const details = fieldErrors([
    ['name', validateName(input.name, 'O nome')],
    ['displayName', validateName(input.displayName, 'O nome de exibição')],
    ['email', validateEmail(input.email)],
  ])
  if (details) throw new MockError(422, 'VALIDATION', 'Revise o perfil.', details)
  const email = input.email.trim().toLowerCase()
  if (db.users.some((item) => item.email === email && item.id !== user.id)) {
    throw new MockError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
  }
  if (input.avatarDataUrl && input.avatarDataUrl.length > 80_000) {
    throw new MockError(422, 'VALIDATION', 'A imagem do avatar é grande demais.', { avatar: 'Use uma imagem menor.' })
  }
  user.name = input.name.trim()
  user.displayName = input.displayName.trim()
  user.email = email
  if (input.avatarDataUrl !== undefined) user.avatarDataUrl = input.avatarDataUrl
  persist()
  return publicUser(user)
}

export async function changePassword(userId: string, input: { currentPassword: string; nextPassword: string }) {
  const user = db.users.find((item) => item.id === userId)
  if (!user) throw new MockError(404, 'NOT_FOUND', 'Perfil não encontrado.')
  const nextError = validatePassword(input.nextPassword)
  const currentHash = await sha256(input.currentPassword)
  const details = fieldErrors([
    ['currentPassword', currentHash === user.passwordHash ? null : 'Senha atual incorreta.'],
    ['nextPassword', nextError],
  ])
  if (details) throw new MockError(422, 'VALIDATION', 'Revise a senha.', details)
  user.passwordHash = await sha256(input.nextPassword)
  persist()
  return { ok: true }
}

export function listWallets(userId: string) {
  return db.wallets.filter((wallet) => wallet.userId === userId)
}

export function saveWallet(userId: string, input: { id?: string; role: WalletRole; label: string; address: string; network: NetworkId }) {
  const details = fieldErrors([
    ['label', validateName(input.label, 'O nome da carteira')],
    ['address', validateWalletAddress(input.address.trim(), input.network)],
    ['role', input.role === 'primary' || input.role === 'secondary' ? null : 'Escolha principal ou secundária.'],
  ])
  if (details) throw new MockError(422, 'VALIDATION', 'Revise a carteira.', details)
  if (input.id) {
    const wallet = db.wallets.find((item) => item.id === input.id && item.userId === userId)
    if (!wallet) throw new MockError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    wallet.role = input.role
    wallet.label = input.label.trim()
    wallet.address = input.address.trim()
    wallet.network = input.network
    demote(userId, wallet)
    persist()
    return wallet
  }
  const wallet: Wallet = {
    id: `wal_${crypto.randomUUID()}`,
    userId,
    role: input.role,
    label: input.label.trim(),
    address: input.address.trim(),
    network: input.network,
    connected: false,
  }
  db.wallets.push(wallet)
  demote(userId, wallet)
  persist()
  return wallet
}

function demote(userId: string, wallet: Wallet) {
  for (const other of db.wallets) {
    if (other.userId === userId && other.id !== wallet.id && other.role === wallet.role) {
      other.role = wallet.role === 'primary' ? 'secondary' : 'primary'
    }
  }
}

export function connectWallet(userId: string, walletId: string) {
  if (getScenario() === 'wallet-rejected') {
    throw new MockError(422, 'WALLET_REJECTED', 'A conexão da carteira foi recusada.', {
      walletId: 'A conexão foi recusada.',
    })
  }
  const wallet = db.wallets.find((item) => item.id === walletId && item.userId === userId)
  if (!wallet) throw new MockError(404, 'NOT_FOUND', 'Carteira não encontrada.')
  wallet.connected = true
  persist()
  return wallet
}

export function disconnectWallet(userId: string, walletId: string) {
  const wallet = db.wallets.find((item) => item.id === walletId && item.userId === userId)
  if (!wallet) throw new MockError(404, 'NOT_FOUND', 'Carteira não encontrada.')
  wallet.connected = false
  persist()
  return wallet
}

export function orderEvent(order: Order) {
  return {
    eventId: `${order.id}:v${order.version}`,
    resource: 'order' as const,
    resourceId: order.id,
    version: order.version,
    userId: order.userId,
    status: order.status,
  }
}

export function nftEvent(nft: Nft) {
  const edition = nft.editions[0]
  return {
    eventId: `${nft.id}:v${nft.version}`,
    resource: 'nft' as const,
    resourceId: nft.id,
    version: nft.version,
    priceEth: edition?.priceEth ?? '0.00',
    available: edition?.available ?? 0,
    editionId: edition?.id ?? '',
  }
}
