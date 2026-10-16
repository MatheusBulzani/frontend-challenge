# Arquitetura

O browser chama `/api` com Axios e `/realtime` com socket.io-client. O MSW responde os dois, guarda o banco em `localStorage` (`kurio.db`) e publica o evento no mesmo ponto em que o REST grava.

## Contratos REST

Erros usam `{ code, message, details? }` e o status HTTP. `details` é um mapa de campo para mensagem.

| Método e rota                                                     | Auth                   | Sucesso                                                                                                                                                        |
| ----------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/register`                                         | não                    | 200, token e usuário. 409 se o e-mail existe ou o cenário força conflito. 422 de validação                                                                     |
| `POST /api/auth/login`                                            | não                    | 200, token e usuário. 401 `INVALID_CREDENTIALS` não derruba uma sessão já válida                                                                               |
| `GET /api/session`                                                | bearer                 | usuário público                                                                                                                                                |
| `POST /api/auth/logout`                                           | bearer                 | encerra a sessão                                                                                                                                               |
| `GET /api/nfts`                                                   | não                    | `{ items, page, pageSize, total, totalPages, facets }` com `q`, `category`, `network`, `min`, `max`, `sort`, `page`                                            |
| `GET /api/highlights`                                             | não                    | três destaques                                                                                                                                                 |
| `GET /api/nfts/:id`                                               | não                    | NFT com edições. 404 `NOT_FOUND`                                                                                                                               |
| `GET /api/favorites`                                              | bearer                 | `{ nftIds }`                                                                                                                                                   |
| `POST /api/favorites` e `DELETE /api/favorites/:nftId`            | bearer                 | lista atualizada                                                                                                                                               |
| `GET /api/cart?network=`                                          | sessão ou `X-Guest-Id` | itens, cupom e resumo                                                                                                                                          |
| `POST /api/cart/items`                                            | sessão ou visitante    | `{ nftId, editionId, quantity }`                                                                                                                               |
| `PATCH /api/cart/items/:itemId`                                   | sessão ou visitante    | `{ quantity }` inteira, limitada ao estoque                                                                                                                    |
| `DELETE /api/cart/items/:itemId`                                  | sessão ou visitante    | carrinho                                                                                                                                                       |
| `POST /api/cart/coupon` e `DELETE /api/cart/coupon`               | sessão ou visitante    | `{ code }`                                                                                                                                                     |
| `POST /api/cart/merge`                                            | bearer                 | `{ guestId }`, soma o carrinho do visitante e respeita o estoque                                                                                               |
| `POST /api/quotes`                                                | bearer                 | 201 com linhas, resumo, `fingerprint` e versões. 409 `QUOTE_STALE` quando o preço mudou                                                                        |
| `POST /api/orders`                                                | bearer                 | exige `Idempotency-Key`. 201 pendente. A mesma chave e o mesmo corpo devolvem o mesmo pedido. A mesma chave com outro corpo devolve 409 `IDEMPOTENCY_CONFLICT` |
| `GET /api/orders/:id`                                             | bearer                 | pedido, inclusive o snapshot                                                                                                                                   |
| `GET /api/profile` e `PATCH /api/profile`                         | bearer                 | nome, exibição, e-mail e avatar                                                                                                                                |
| `POST /api/profile/password`                                      | bearer                 | `{ currentPassword, nextPassword }`                                                                                                                            |
| `GET /api/wallets`, `POST /api/wallets`, `PATCH /api/wallets/:id` | bearer                 | carteira principal ou secundária                                                                                                                               |
| `POST /api/wallets/:id/connect` e `.../disconnect`                | bearer                 | simulação local de conexão                                                                                                                                     |

ETH trafega como string decimal (`"1.19"`). A conta usa inteiros na escala 10^8 em `src/domain/eth.ts`. Quantidade é inteira. A taxa é 0.021 na Ethereum, 0.004 na Polygon e 0.002 na Solana. O total exibido no checkout é o da cotação, não um cálculo paralelo da tela.

O recibo lê `order.snapshot`. Mudar o catálogo depois não altera o que já foi comprado. `txRef` é um identificador falso. `/explorar/$txRef` só o mostra.

A observação do checkout fica só no formulário. Ela não entra no pedido, porque o contrato de criação não tem esse campo.

## Eventos

Transporte: WebSocket no caminho `/realtime`, cliente `socket.io-client` 4, só com transporte `websocket`. O mock usa `@mswjs/socket.io-binding` sobre `ws.link('*/realtime')`. O MSW compara a URL sem a query do Engine.IO. O padrão `*/realtime` cobre `ws://` e `wss://`.

O `socket.io-client` guarda `globalThis.WebSocket` no momento em que o módulo é avaliado. Por isso `src/main.tsx` inicia o worker e só então importa o grafo da aplicação. Se a interface carregasse antes, o cliente falaria com um WebSocket nativo e o mock nunca veria a conexão.

| Evento          | Payload                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| `nft.updated`   | `eventId`, `resource`, `resourceId`, `version`, `priceEth`, `available`, `editionId` |
| `order.updated` | `eventId`, `resource`, `resourceId`, `version`, `userId`, `status`                   |

`eventId` é `recurso:vN`. O cliente descarta um `eventId` já visto e qualquer versão menor ou igual à última aplicada naquele recurso. `order.updated` de outro `userId` é ignorado antes de gravar versão, para um evento alheio não bloquear a versão verdadeira.

Ao conectar, o cliente invalida catálogo, carrinho e pedido. Isso cobre um evento perdido durante a queda. O pedido pendente também é relido a cada 2 s até um status terminal. Confirmado e recusado não voltam atrás.

Listeners saem no cleanup do efeito. Cada conexão de socket registra um emissor e o remove no `close`. Um socket morto não impede os outros.

## Sessão

O token fica em `kurio.token`. A sessão simulada dura 8 horas. Senha em claro não é persistida: o seed já contém o SHA-256 e o cadastro grava só o hash.

401 `SESSION_EXPIRED` ou `SESSION_INVALID`, quando já existe token, apaga o token e dispara `kurio:unauthorized`. A casca da aplicação remove favoritos, perfil, carteiras, pedido e sessão do cache e abre o login com `redirect` do caminho atual. 401 `INVALID_CREDENTIALS` não faz isso.

Logout chama a API, apaga o token e executa `queryClient.clear()`. A ponte de socket depende do id do usuário da sessão. Trocar de usuário desmonta a inscrição anterior. As chaves de query de carrinho e favoritos incluem o token, então o cache de um usuário não alimenta o outro.

Checkout, pedido, perfil e carteiras passam por `beforeLoad`. Sem token, o Router manda para o login.

## Carrinho

Visitante usa `X-Guest-Id` (`kurio.guest`). O dono no banco é `guest:<id>` ou o id do usuário. No login, `POST /api/cart/merge` soma as quantidades e corta no estoque da edição. O cupom do visitante só entra se o usuário ainda não tiver um.

A cotação guarda um fingerprint com linhas, preços, versões, cupom e rede. Confirmar com fingerprint diferente responde `QUOTE_STALE` e a tela exige nova revisão. A chave de idempotência é reaproveitada para a mesma cotação e fica em `kurio.idempotency`. Timeout de 8 s no Axios dispara um segundo POST com a mesma chave. O cenário `order-timeout` atrasa só a primeira resposta.

Confirmar remove apenas as quantidades compradas e baixa o estoque uma vez (`stockApplied`). Falha, recusa ou edição esgotada não criam essa baixa. O id do pedido pendente fica em `kurio.pendingOrder` para o checkout apontar a retomada.

## Cache e novas tentativas

TanStack Query: `staleTime` de 15 s. Retry só em status 500 ou rede, no máximo uma vez. Mutations não repetem sozinhas, para não duplicar compra. A listagem manda o `AbortSignal` do Axios, então uma busca antiga não cobre a mais nova.

Favoritar é otimista. O cache de `['favorites', token]` muda na hora e, se a mutation falha, volta ao snapshot anterior. Sem token, a ação vai para o login em vez de inventar um favorito local.

Depois de uma mutation de carrinho, perfil, carteira ou pedido, a query correspondente é invalidada. O evento `nft.updated` também escreve direto no cache de lista, detalhe e carrinho e invalida a cotação aberta.

## Decisões de UX

- Skeletons com shimmer no catálogo, no detalhe e no resumo. `prefers-reduced-motion: reduce` desliga a animação.
- Avisos de mutation e de tempo real entram numa região `aria-live="polite"`.
- Filtros no mobile abrem um drawer com foco preso pelo Radix Dialog. Escape fecha.
- Erros de campo usam `role="alert"` e `aria-describedby`. Preço e estoque não dependem só da cor: o texto diz "esgotada" ou mostra o valor novo.
- Criadores, agenda, ajuda e newsletter respondem que estão fora da entrega.

## Desvios do Figma

Os textos e nomes visíveis seguem as camadas do arquivo (wordmark KURIO, hero “SEJA DONO DO FUTURO
DA ARTE DIGITAL”, catálogo Emerald Ape #042, Violet Nomad #314, Ivory Baron #088, Sage Nomad #009, Neon Vessel #552, Golden Frequency #071, Golden Signal #160, Cosmic Bloom #118 e Golden Beat #207, além de carrinho, pagamento, confirmação, login e rodapé). As fotos originais do arquivo não saem do canvas sem token de API. Os retratos em `public/portraits` são fotos de estúdio no mesmo enquadramento, não os arquivos do Figma. As fontes da interface continuam Outfit e Fraunces. O rodapé, o diário e a faixa de segurança/criadores/alertas seguem o texto visível do frame, em português. O catálogo visível usa só os nomes lidos no arquivo. A edição esgotada fica fora da grade, no endereço direto usado pelo cenário de estoque. Links de blog, ajuda e redes levam à página de fora de escopo, para não parecerem um sucesso funcional.

A página `/cenarios` é um controle da simulação, linkado no rodapé, e não uma tela do produto.
