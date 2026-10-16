import { Link } from '@tanstack/react-router'
import { Menu, Search, ShoppingBag } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client.ts'
import { useAuthToken } from '../../auth/storage.ts'
import type { PublicUser } from '../../domain/types.ts'
import { Button } from '../ui/Button.tsx'
import { Drawer } from '../ui/Overlay.tsx'
import { defaultCatalogSearch } from '../../domain/search.ts'

export function Header({ user }: { user?: PublicUser }) {
  const token = useAuthToken()
  const cart = useQuery({
    queryKey: ['cart', token ?? 'guest'],
    queryFn: ({ signal }) => api.cart('ethereum', signal),
  })
  const count = cart.data?.items?.length ?? 0

  const nav = (
    <nav className="grid gap-3 md:flex md:items-center md:gap-6" aria-label="Principal">
      <Link to="/" search={defaultCatalogSearch} className="text-sm text-cream hover:text-accent">Início</Link>
      <a href="/#catalogo" className="text-sm text-cream hover:text-accent">Mercado</a>
      <Link to="/fora/$topic" params={{ topic: 'criadores' }} className="text-sm text-cream hover:text-accent">Criadores</Link>
      <Link to="/fora/$topic" params={{ topic: 'aprenda' }} className="text-sm text-cream hover:text-accent">Aprenda</Link>
    </nav>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl min-w-0 items-center gap-3 px-4">
        <div className="lg:hidden">
          <Drawer trigger={<Button variant="ghost" size="sm" aria-label="Abrir menu"><Menu size={18} /></Button>} title="Navegação">
            {nav}
          </Drawer>
        </div>
        <Link to="/" search={defaultCatalogSearch} className="font-display text-xl tracking-[0.22em]">KURIO</Link>
        <div className="hidden min-w-0 lg:block">{nav}</div>
        <div className="ml-auto flex items-center gap-2">
          <a href="/#catalogo" aria-label="Buscar no catálogo" className="rounded-full p-2 text-cream">
            <Search size={18} />
          </a>
          <Link to="/carrinho" className="relative rounded-full p-2" aria-label={`Carrinho com ${count} itens`}>
            <ShoppingBag size={18} />
            <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-accent px-1 text-center text-xs text-ink">{count}</span>
          </Link>
          {user ? (
            <Link to="/perfil" className="text-sm">{user.displayName}</Link>
          ) : (
            <Button asChild size="sm"><Link to="/login" search={{ redirect: '' }}>Entrar</Link></Button>
          )}
        </div>
      </div>
    </header>
  )
}
