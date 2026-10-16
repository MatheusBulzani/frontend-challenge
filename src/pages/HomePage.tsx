import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client.ts";
import { useFavorites, useFavoriteToggle } from "../api/favorites.ts";
import { NftPortrait } from "../components/nft/NftPortrait.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Drawer } from "../components/ui/Overlay.tsx";
import { Input, Select } from "../components/ui/Field.tsx";
import { Skeleton } from "../components/ui/Skeleton.tsx";
import {
  NETWORKS,
  SORTS,
  type CatalogSearch,
  type NftListResponse,
  type NftSummary,
} from "../domain/types.ts";
import { parseCatalogSearch } from "../domain/search.ts";
import { PageMeta } from "../ui/PageMeta.tsx";

export function HomePage() {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const catalog = useQuery({
    queryKey: ["nfts", search],
    queryFn: ({ signal }) =>
      api.listNfts(search, signal) as Promise<NftListResponse>,
  });
  const highlights = useQuery({
    queryKey: ["highlights"],
    queryFn: ({ signal }) =>
      api.highlights(signal) as Promise<{ items: NftSummary[] }>,
  });

  function update(patch: Partial<CatalogSearch>, resetPage = true) {
    void navigate({
      search: (current) => ({
        ...parseCatalogSearch(current),
        ...patch,
        page: resetPage ? 1 : (patch.page ?? parseCatalogSearch(current).page),
      }),
    });
  }

  return (
    <div className="grid gap-12">
      <PageMeta
        title="Kurio — Marketplace de NFTs"
        description="Descubra NFTs selecionados de criadores do mundo todo e colecione arte digital verificada."
      />
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm tracking-wide text-accent uppercase">
            Bem-vindo à Kurio
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
            <span className="md:hidden">SEJA DONO DA CULTURA DIGITAL</span>
            <span className="hidden md:inline">
              SEJA DONO DO FUTURO DA ARTE DIGITAL
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Descubra NFTs selecionados de criadores do mundo todo e colecione
            arte digital verificada.
          </p>
          <Button asChild className="mt-6">
            <a href="#catalogo">Explorar coleções</a>
          </Button>
        </div>
        <NftPortrait
          seed="nft_emerald"
          label="Emerald Ape #042"
          className="mx-auto h-80 w-72 rounded-3xl"
        />
      </section>

      <section id="catalogo" className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="hidden lg:block">
          <Filters search={search} data={catalog.data} onChange={update} />
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl">Todos os NFTs</h2>
            <div className="ml-auto flex gap-2">
              <div className="lg:hidden">
                <Drawer
                  trigger={
                    <Button variant="ghost" size="sm">
                      Filtros
                    </Button>
                  }
                  title="Filtros"
                >
                  <Filters
                    search={search}
                    data={catalog.data}
                    onChange={update}
                  />
                </Drawer>
              </div>
              <Select
                aria-label="Ordenação"
                value={search.sort}
                onChange={(event) =>
                  update({ sort: event.target.value as CatalogSearch["sort"] })
                }
              >
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <SearchBox
            key={search.q}
            value={search.q}
            onSearch={(q) => update({ q })}
          />
          {catalog.isPending ? <CatalogSkeleton /> : null}
          {catalog.isError ? (
            <ErrorBox
              message="O catálogo não carregou."
              onRetry={() => void catalog.refetch()}
            />
          ) : null}
          {catalog.data && catalog.data.items.length === 0 ? (
            <p className="rounded-2xl border border-line p-8 text-muted">
              Nenhum NFT encontrado para esta busca.
            </p>
          ) : null}
          {catalog.isFetching && !catalog.isPending ? (
            <p className="mb-3 text-sm text-muted" role="status">
              Atualizando catálogo…
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.data?.items.map((item) => (
              <NftCard key={item.id} item={item} />
            ))}
          </div>
          <Pagination
            page={search.page}
            totalPages={catalog.data?.totalPages ?? 0}
            onPage={(page) => update({ page }, false)}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl">NFT EM DESTAQUE</h2>
        <p className="text-sm text-accent">OFERTA LIMITADA</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {highlights.data?.items.map((item) => (
            <NftCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Promo
          title="Colecione edições escassas diretamente dos criadores antes da revelação pública."
          kicker="Edições de lançamento"
          category="Arte digital"
        />
        <Promo
          title="Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."
          kicker="Arte digital selecionada"
          category="Generativa"
        />
      </section>

      <section>
        <h2 className="font-display text-3xl">Diário da Cunhagem</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {POSTS.map((post) => (
            <li key={post.title}>
              <Link
                to="/fora/$topic"
                params={{ topic: "aprenda" }}
                className="block h-full rounded-3xl bg-panel p-5"
              >
                <p className="text-sm text-muted">{post.meta}</p>
                <h3 className="mt-2 font-display text-xl">{post.title}</h3>
                <p className="mt-2 text-sm text-muted">{post.text}</p>
                <span className="mt-3 inline-block text-sm text-accent">
                  Ler mais →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 rounded-3xl bg-panel p-6 md:grid-cols-2 lg:grid-cols-4">
        <article>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent font-semibold text-ink">
            W
          </span>
          <h2 className="mt-4 font-display text-2xl">Segurança da carteira</h2>
          <p className="mt-2 text-sm text-muted">
            Proteja sua carteira e colecione arte digital verificada com
            confiança.
          </p>
        </article>
        <article>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent font-semibold text-ink">
            C
          </span>
          <h2 className="mt-4 font-display text-2xl">Criadores em destaque</h2>
          <p className="mt-2 text-sm text-muted">
            Conheça artistas, estúdios e comunidades que moldam a cultura
            digital na rede.
          </p>
        </article>
        <article>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent font-semibold text-ink">
            D
          </span>
          <h2 className="mt-4 font-display text-2xl">Alertas de lançamentos</h2>
          <p className="mt-2 text-sm text-muted">
            Receba calendários de cunhagem, novidades de listas de acesso e
            análises do mercado.
          </p>
        </article>
        <form
          className="grid min-w-0 content-start gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const status = document.getElementById("home-newsletter-status");
            if (status)
              status.textContent =
                "Os alertas de lançamento não fazem parte desta entrega.";
          }}
        >
          <h2 className="font-display text-2xl">
            Antecipe-se ao próximo lançamento
          </h2>
          <div className="flex min-w-0 gap-2">
            <label htmlFor="home-newsletter" className="sr-only">
              E-mail para alertas
            </label>
            <input
              id="home-newsletter"
              type="email"
              placeholder="digite seu e-mail..."
              className="min-w-0 flex-1 rounded-full border border-line bg-ink px-4 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink"
            >
              Enviar
            </button>
          </div>
          <p className="text-sm text-muted">
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
          <p
            id="home-newsletter-status"
            role="status"
            className="text-sm text-muted"
          />
        </form>
      </section>
    </div>
  );
}

const POSTS = [
  {
    meta: "12 de setembro | Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    text: "Aprenda a colecionar, negociar e verificar ativos digitais.",
  },
  {
    meta: "13 de setembro | Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    text: "Conheça criadores que moldam a cultura digital.",
  },
  {
    meta: "15 de setembro | Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    text: "Entenda raridade, procedência, direitos autorais e utilidade.",
  },
  {
    meta: "15 de setembro | Leitura de 2 min",
    title: "Como proteger sua carteira",
    text: "Proteja sua carteira, seus ativos e sua identidade.",
  },
];

function SearchBox({
  value,
  onSearch,
}: {
  value: string;
  onSearch: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <form
      className="mb-4 flex gap-2"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft);
      }}
    >
      <label htmlFor="busca" className="sr-only">
        Buscar NFTs
      </label>
      <Input
        id="busca"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Buscar por nome ou coleção"
      />
      <Button type="submit" variant="ghost">
        Buscar
      </Button>
    </form>
  );
}

function Filters({
  search,
  data,
  onChange,
}: {
  search: CatalogSearch;
  data?: NftListResponse;
  onChange: (patch: Partial<CatalogSearch>) => void;
}) {
  const [min, setMin] = useState(search.min);
  const [max, setMax] = useState(search.max);
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onChange({ min, max });
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold">Categoria</legend>
        <button
          type="button"
          className="mt-2 block text-sm text-muted"
          onClick={() => onChange({ category: "" })}
        >
          Todas
        </button>
        <ul className="mt-2 grid gap-1">
          {data?.facets.categories.map((facet) => (
            <li key={facet.name}>
              <button
                type="button"
                aria-pressed={search.category === facet.name}
                className="flex min-h-11 w-full items-center justify-between text-left text-sm"
                onClick={() => onChange({ category: facet.name })}
              >
                <span>{facet.name}</span>
                <span className="text-muted">({facet.count})</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Faixa de preço</legend>
        <label htmlFor="preco-min" className="text-xs text-muted">
          Mínimo em ETH
        </label>
        <Input
          id="preco-min"
          inputMode="decimal"
          value={min}
          onChange={(event) => setMin(event.target.value)}
        />
        <label htmlFor="preco-max" className="text-xs text-muted">
          Máximo em ETH
        </label>
        <Input
          id="preco-max"
          inputMode="decimal"
          value={max}
          onChange={(event) => setMax(event.target.value)}
        />
        <Button type="submit" size="sm">
          Aplicar
        </Button>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Rede</legend>
        <ul className="mt-2 grid gap-1">
          {NETWORKS.map((network) => {
            const count =
              data?.facets.networks.find((item) => item.id === network.id)
                ?.count ?? 0;
            return (
              <li key={network.id}>
                <button
                  type="button"
                  aria-pressed={search.network === network.id}
                  className="flex min-h-11 w-full items-center justify-between text-sm"
                  onClick={() =>
                    onChange({
                      network: search.network === network.id ? "" : network.id,
                    })
                  }
                >
                  <span>{network.label}</span>
                  <span className="text-muted">({count})</span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </form>
  );
}

function NftCard({ item }: { item: NftSummary }) {
  const favorites = useFavorites();
  const toggle = useFavoriteToggle();
  const active = favorites.data?.nftIds.includes(item.id) ?? false;
  return (
    <article className="overflow-hidden rounded-3xl bg-panel">
      <Link to="/nfts/$nftId" params={{ nftId: item.id }} className="block">
        <NftPortrait
          seed={item.imageSeed}
          label={item.name}
          className="aspect-[4/5] w-full"
        />
        <div className="p-4">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-muted">{item.creatorName}</p>
          <p className="mt-2 text-accent">{item.priceEth} ETH</p>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <button
          type="button"
          aria-pressed={active}
          className="inline-flex items-center gap-2 text-sm"
          onClick={() => toggle.mutate({ nftId: item.id, active })}
        >
          <Heart size={16} fill={active ? "currentColor" : "none"} />
          {active ? "Favorito" : "Favoritar"}
        </button>
      </div>
    </article>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-6 flex justify-end gap-2">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (number) => (
          <button
            key={number}
            type="button"
            aria-current={number === page ? "page" : undefined}
            className="h-11 w-11 rounded-full border border-line"
            onClick={() => onPage(number)}
          >
            {number}
          </button>
        ),
      )}
    </nav>
  );
}

function CatalogSkeleton() {
  return (
    <div
      data-testid="catalog-skeleton"
      className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-80" />
      ))}
    </div>
  );
}

function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="mb-4 rounded-2xl border border-danger p-4">
      <p>{message}</p>
      <Button className="mt-3" variant="ghost" onClick={onRetry}>
        Buscar outra vez
      </Button>
    </div>
  );
}

function Promo({
  title,
  kicker,
  category,
}: {
  title: string;
  kicker: string;
  category: string;
}) {
  return (
    <Link
      to="/"
      search={(current) =>
        parseCatalogSearch({ ...current, category, page: 1 })
      }
      className="block rounded-2xl border border-line bg-panel-2 p-6"
    >
      <p className="text-sm text-accent">{kicker}</p>
      <h3 className="mt-2 font-display text-2xl">{title}</h3>
      <span className="mt-4 inline-block text-sm text-accent">Explorar</span>
    </Link>
  );
}
