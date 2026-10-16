import type { CatalogSearch, SortId } from './types.ts'
import { SORTS } from './types.ts'

const SORT_IDS = new Set<string>(SORTS.map((item) => item.id))

export const defaultCatalogSearch: CatalogSearch = {
  q: '',
  category: '',
  network: '',
  min: '',
  max: '',
  sort: 'recent',
  page: 1,
}

export function parseCatalogSearch(search: {
  q?: unknown
  category?: unknown
  network?: unknown
  min?: unknown
  max?: unknown
  sort?: unknown
  page?: unknown
}): CatalogSearch {
  const page = Number(search.page)
  const sort = typeof search.sort === 'string' && SORT_IDS.has(search.sort) ? (search.sort as SortId) : 'recent'
  return {
    q: typeof search.q === 'string' ? search.q : '',
    category: typeof search.category === 'string' ? search.category : '',
    network: typeof search.network === 'string' ? search.network : '',
    min: typeof search.min === 'string' ? search.min : '',
    max: typeof search.max === 'string' ? search.max : '',
    sort,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export function parseRedirect(search: Record<string, unknown>) {
  const redirect = typeof search.redirect === 'string' ? search.redirect : ''
  return { redirect: redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '' }
}
