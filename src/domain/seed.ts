import type { Category, Database, Edition, NetworkId, Nft } from './types.ts'

export const ANA_HASH = '03d3eb017adcd73ecbada1b57191da98b246cf29f430e81d6e824ae49a7eaa20'
export const BRUNO_HASH = 'aae452d15757785f356034960083a72c8c03dde19ea4a7132c1d5b2f0c71cd60'

const ROWS: Array<[string, string, Category, NetworkId, string, number, boolean]> = [
  ['nft_emerald', 'Emerald Ape #042', 'Arte digital', 'ethereum', '1.19', 4, true],
  ['nft_violet', 'Violet Nomad #314', 'Colecionáveis', 'polygon', '1.39', 6, true],
  ['nft_ivory', 'Ivory Baron #088', 'Arte 3D', 'ethereum', '1.79', 3, true],
  ['nft_golden', 'Golden Beat #207', 'Música', 'solana', '0.95', 8, false],
  ['nft_neon', 'Neon Vessel #552', 'Generativa', 'ethereum', '2.29', 2, false],
  ['nft_sage', 'Sage Nomad #009', 'Fotografia', 'polygon', '1.69', 5, false],
  ['nft_cobalt', 'Cosmic Bloom #118', 'Arte digital', 'solana', '1.29', 9, false],
  ['nft_badge', 'Golden Signal #160', 'Generativa', 'polygon', '0.39', 15, false],
  ['nft_sold', 'Closed Edition #404', 'Arte digital', 'ethereum', '3.40', 1, false],
  ['nft_iris', 'Golden Frequency #071', 'Fotografia', 'ethereum', '1.99', 4, false],
]

const CREATORS = [
  { name: 'Nova Sato', seed: 'creator-nova' },
  { name: 'Kurio Editions', seed: 'creator-kurio' },
]

function editions(id: string, priceEth: string, available: number): Edition[] {
  const launchAvailable = id === 'nft_sold' ? 0 : Math.max(1, available - 1)
  const [whole, fraction = '00'] = priceEth.split('.')
  const bumped = `${whole}.${String(Math.min(99, Number(fraction) + 15)).padStart(2, '0')}`
  return [
    { id: `${id}_original`, name: '1/50', priceEth, available, total: available + 4 },
    {
      id: `${id}_lancamento`,
      name: '1/1',
      priceEth: bumped,
      available: launchAvailable,
      total: 8,
    },
  ]
}

function createNfts(): Nft[] {
  return ROWS.map((row, index) => {
    const [id, name, category, network, price, available, featured] = row
    return {
      id,
      name,
      collection: id === 'nft_emerald' ? 'Kurio Apes' : 'Kurio Editions',
      category,
      network,
      description:
        id === 'nft_emerald'
          ? 'Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras. A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.'
          : `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'}.`,
      creator: CREATORS[index % CREATORS.length]!,
      editions: editions(id, price, available),
      featured,
      likes: 12 + index * 3,
      version: 1,
      createdAt: 1_700_000_000_000 + index * 86_400_000,
      imageSeed: id,
    }
  })
}

export function createSeed(): Database {
  return {
    users: [
      {
        id: 'user_ana',
        name: 'Ana Ribeiro',
        displayName: 'Ana',
        email: 'ana@kurio.test',
        passwordHash: ANA_HASH,
        avatarDataUrl: null,
        avatarSeed: 'user-ana',
      },
      {
        id: 'user_bruno',
        name: 'Bruno Lima',
        displayName: 'Bruno',
        email: 'bruno@kurio.test',
        passwordHash: BRUNO_HASH,
        avatarDataUrl: null,
        avatarSeed: 'user-bruno',
      },
    ],
    sessions: [],
    nfts: createNfts(),
    favorites: [{ userId: 'user_ana', nftId: 'nft_emerald' }],
    carts: [
      {
        ownerId: 'user_ana',
        coupon: null,
        items: [
          { id: 'item_nft_emerald_original', nftId: 'nft_emerald', editionId: 'nft_emerald_original', quantity: 1 },
          { id: 'item_nft_violet_original', nftId: 'nft_violet', editionId: 'nft_violet_original', quantity: 1 },
        ],
      },
    ],
    quotes: [],
    orders: [],
    wallets: [
      {
        id: 'wal_ana_primary',
        userId: 'user_ana',
        role: 'primary',
        label: 'Carteira principal',
        address: '0x12ab34cd56ef7890a1b2c3d4e5f67890a1b2c3d4',
        network: 'ethereum',
        connected: false,
      },
      {
        id: 'wal_ana_secondary',
        userId: 'user_ana',
        role: 'secondary',
        label: 'Carteira secundária',
        address: '0x98ba76dc54fe3210fedcba09876543210fedcba0',
        network: 'polygon',
        connected: false,
      },
      {
        id: 'wal_bruno_primary',
        userId: 'user_bruno',
        role: 'primary',
        label: 'Carteira principal',
        address: '4Nd1mB2kQpY3yW8uS6o8c2m1k3p4q5r6',
        network: 'solana',
        connected: false,
      },
    ],
    idempotency: [],
  }
}
