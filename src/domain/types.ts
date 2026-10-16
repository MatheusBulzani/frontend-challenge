export const NETWORKS = [
  { id: 'ethereum', label: 'Ethereum', feeEth: '0.021' },
  { id: 'polygon', label: 'Polygon', feeEth: '0.004' },
  { id: 'solana', label: 'Solana', feeEth: '0.002' },
] as const

export type NetworkId = (typeof NETWORKS)[number]['id']

export const CATEGORIES = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
  'Jogos',
  'Assinaturas',
  'Utilidade',
] as const

export type Category = (typeof CATEGORIES)[number]

export const SORTS = [
  { id: 'recent', label: 'Listados recentemente' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
  { id: 'name', label: 'Nome' },
] as const

export type SortId = (typeof SORTS)[number]['id']

export type CatalogSearch = {
  q: string
  category: string
  network: string
  min: string
  max: string
  sort: SortId
  page: number
}

export type Edition = {
  id: string
  name: string
  priceEth: string
  available: number
  total: number
}

export type Nft = {
  id: string
  name: string
  collection: string
  category: Category
  network: NetworkId
  description: string
  creator: { name: string; seed: string }
  editions: Edition[]
  featured: boolean
  likes: number
  version: number
  createdAt: number
  imageSeed: string
}

export type User = {
  id: string
  name: string
  displayName: string
  email: string
  passwordHash: string
  avatarDataUrl: string | null
  avatarSeed: string
}

export type Session = {
  token: string
  userId: string
  expiresAt: number
}

export type WalletRole = 'primary' | 'secondary'

export type Wallet = {
  id: string
  userId: string
  role: WalletRole
  label: string
  address: string
  network: NetworkId
  connected: boolean
}

export type CartItem = {
  id: string
  nftId: string
  editionId: string
  quantity: number
}

export type Cart = {
  ownerId: string
  items: CartItem[]
  coupon: string | null
}

export type CartLine = {
  id: string
  nftId: string
  nftName: string
  editionId: string
  editionName: string
  quantity: number
  available: number
  unitPriceEth: string
  lineTotalEth: string
  version: number
  imageSeed: string
}

export type PriceSummary = {
  subtotalEth: string
  discountEth: string
  feeEth: string
  totalEth: string
  network: NetworkId
  coupon: string | null
}

export type Quote = {
  id: string
  ownerId: string
  userId: string | null
  fingerprint: string
  versions: Record<string, number>
  lines: CartLine[]
  summary: PriceSummary
  createdAt: number
  consumedBy: string | null
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export type Order = {
  id: string
  userId: string
  status: OrderStatus
  idempotencyKey: string
  fingerprint: string
  quoteId: string
  snapshot: PriceSummary & { lines: CartLine[] }
  txRef: string
  walletId: string
  walletAddress: string
  version: number
  stockApplied: boolean
  slowResponseConsumed: boolean
  createdAt: number
}

export type IdempotencyRecord = {
  key: string
  fingerprint: string
  orderId: string
}

export type Favorite = {
  userId: string
  nftId: string
}

export type Database = {
  users: User[]
  sessions: Session[]
  nfts: Nft[]
  favorites: Favorite[]
  carts: Cart[]
  quotes: Quote[]
  orders: Order[]
  wallets: Wallet[]
  idempotency: IdempotencyRecord[]
}

export type ApiErrorBody = {
  code: string
  message: string
  details?: Record<string, string>
}

export type NftSummary = {
  id: string
  name: string
  collection: string
  category: Category
  network: NetworkId
  priceEth: string
  available: number
  featured: boolean
  likes: number
  version: number
  imageSeed: string
  creatorName: string
}

export type NftListResponse = {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: {
    categories: { name: string; count: number }[]
    networks: { id: NetworkId; count: number }[]
  }
}

export type PublicUser = {
  id: string
  name: string
  displayName: string
  email: string
  avatarDataUrl: string | null
  avatarSeed: string
}
