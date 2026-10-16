import { Link } from '@tanstack/react-router'
import { defaultCatalogSearch } from '../../domain/search.ts'

const profile = [
  ['Meu perfil', '/perfil'],
  ['Minha coleção', '/fora/colecao'],
  ['Atividade', '/fora/atividade'],
  ['Estúdio do criador', '/fora/criadores'],
  ['Lista de interesse', '/fora/interesse'],
] as const

const help = [
  ['Central de ajuda', 'ajuda'],
  ['Como comprar NFTs', 'compra'],
  ['Carteira e segurança', 'seguranca'],
  ['Política do mercado', 'politica'],
  ['Denunciar item', 'denuncia'],
] as const

const SOCIAL = [
  { label: 'Facebook', path: 'M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z' },
  { label: 'Instagram', path: 'M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm8 2H8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-4 2.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5zM17 7.2a.8.8 0 1 1-.8.8.8.8 0 0 1 .8-.8z' },
  { label: 'Twitter', path: 'M19 7.3a5 5 0 0 1-1.5.4 2.6 2.6 0 0 0 1.1-1.4 5.2 5.2 0 0 1-1.7.6 2.6 2.6 0 0 0-4.5 2.4A7.4 7.4 0 0 1 6 6.7a2.6 2.6 0 0 0 .8 3.5 2.6 2.6 0 0 1-1.2-.3v.1a2.6 2.6 0 0 0 2.1 2.6 2.6 2.6 0 0 1-1.2.1 2.6 2.6 0 0 0 2.4 1.8A5.3 5.3 0 0 1 5 16.5a7.4 7.4 0 0 0 11.4-6.2v-.3A5.2 5.2 0 0 0 19 7.3z' },
  { label: 'Linkedin', path: 'M6.5 9H4V20h2.5zM5.2 4A1.6 1.6 0 1 0 5.2 7.2 1.6 1.6 0 0 0 5.2 4zM20 20h-2.5v-5.6c0-1.6-.6-2.6-2-2.6a2.2 2.2 0 0 0-2 1.5 2 2 0 0 0-.1.9V20H11V9h2.4v1.5a3.4 3.4 0 0 1 3.1-1.7c2.2 0 3.5 1.4 3.5 4.5z' },
  { label: 'YouTube', path: 'M21 8.2a3 3 0 0 0-2.1-2.1C17.2 5.7 12 5.7 12 5.7s-5.2 0-6.9.4A3 3 0 0 0 3 8.2 31 31 0 0 0 2.6 12 31 31 0 0 0 3 15.8a3 3 0 0 0 2.1 2.1c1.7.4 6.9.4 6.9.4s5.2 0 6.9-.4a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8zM10.5 14.8V9.2L15.2 12z' },
] as const

const collections = [
  ['Arte digital', 'Arte digital'],
  ['Fotografia', 'Fotografia'],
  ['Música', 'Música'],
  ['Arte 3D', 'Arte 3D'],
  ['Utilidade', 'Utilidade'],
] as const

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-[#1c130e]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl tracking-[0.18em]">KURIO</p>
          <p className="mt-3 max-w-xs text-sm text-muted">Feito para colecionadores, criadores e cultura</p>
        </div>
        <p className="text-sm text-muted">contato@email.com</p>
        <p className="text-sm text-muted">+55 11 4002 8922</p>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-8 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="text-sm font-semibold">Meu perfil</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted">
            {profile.map(([label, href]) => (
              <li key={label}>
                {href === '/perfil' ? <Link to="/perfil">{label}</Link> : <Link to="/fora/$topic" params={{ topic: href.replace('/fora/', '') }}>{label}</Link>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Central de ajuda</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted">
            {help.map(([label, topic]) => (
              <li key={topic}><Link to="/fora/$topic" params={{ topic }}>{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Coleções</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted">
            {collections.map(([label, category]) => (
              <li key={label}>
                <Link to="/" search={{ ...defaultCatalogSearch, category }}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Redes sociais</h2>
          <ul className="mt-3 flex gap-3 text-sm text-muted">
            {SOCIAL.map(({ label, path }) => (
              <li key={label}>
                <Link to="/fora/$topic" params={{ topic: 'redes' }} aria-label={label} className="grid h-11 w-11 place-items-center rounded-full border border-line">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="currentColor" d={path} /></svg>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm font-semibold">Carteiras compatíveis</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-[10px] tracking-wide text-cream">
            {['METAMASK', 'WALLETCONNECT', 'COINBASE'].map((brand) => (
              <li key={brand} className="rounded-full border border-accent/70 px-2 py-1">{brand}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="px-4 pb-6 text-center text-xs text-muted">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
