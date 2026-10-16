import { expect, test } from "@playwright/test";
import {
  confirmPurchase,
  emit,
  login,
  openApp,
  setScenario,
} from "./helpers.ts";

test("busca, filtros, ordenação, paginação e histórico", async ({ page }) => {
  await openApp(page, "/");
  await expect(
    page.getByRole("heading", { name: "SEJA DONO DO FUTURO DA ARTE DIGITAL" }),
  ).toBeVisible();

  const catalog = page.locator("#catalogo");
  await catalog.getByLabel("Buscar NFTs").fill("Emerald");
  await catalog.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/q=Emerald/);
  await expect(
    catalog.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect(
    catalog.getByRole("heading", { name: "Badge Pass #001" }),
  ).toHaveCount(0);

  await page.goto("/");
  await page.getByRole("button", { name: /^Fotografia/ }).click();
  await expect(page).toHaveURL(/category=Fotografia/);
  await expect(page).toHaveURL(/page=1/);
  await page.getByRole("button", { name: /^Ethereum/ }).click();
  await expect(page).toHaveURL(/network=ethereum/);
  await expect(
    catalog.getByRole("heading", { name: "Golden Frequency #071" }),
  ).toBeVisible();
  await expect(
    catalog.getByRole("heading", { name: "Sage Nomad #009" }),
  ).toHaveCount(0);

  await page.getByLabel("Mínimo em ETH").fill("1");
  await page.getByLabel("Máximo em ETH").fill("1.5");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/min=(1|%221%22)(&|$)/);
  await expect(page).toHaveURL(/max=(1\.5|%221\.5%22)(&|$)/);

  await page.goto("/");
  await page.getByLabel("Ordenação").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(
    catalog.getByRole("heading", { name: "Golden Signal #160" }),
  ).toBeVisible();

  const pages = page.getByRole("navigation", { name: "Paginação" });
  await pages.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    pages.getByRole("button", { name: "2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    pages.getByRole("button", { name: "1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(
    pages.getByRole("button", { name: "1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("detalhe direto, NFT inexistente e edição esgotada", async ({ page }) => {
  await openApp(page, "/nfts/nft_emerald");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect(page.getByText("1.19 ETH")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mais desta coleção" }),
  ).toBeVisible();

  await page.goto("/nfts/nao-existe");
  await expect(
    page.getByRole("heading", { name: "NFT não encontrado" }),
  ).toBeVisible();

  await page.goto("/nfts/nft_sold");
  await page.getByRole("button", { name: "1/1" }).click();
  await expect(page.getByText("Esta edição está indisponível.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar" })).toBeDisabled();

  await page.goto("/nfts/nft_emerald");
  await page.getByLabel("Quantidade").fill("99");
  await expect(page.getByText(/Máximo disponível/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar" })).toBeDisabled();

  await page.goto("/rota-que-nao-existe");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});

test("cadastro, login, expiração, logout e troca de usuário", async ({
  page,
}) => {
  await openApp(page, "/cadastro");
  const email = `novo${Date.now()}@kurio.test`;
  await page.getByLabel("Nome", { exact: true }).fill("Nova Pessoa");
  await page.getByLabel("Nome de exibição").fill("Nova");
  await page
    .getByRole("main")
    .getByLabel("E-mail", { exact: true })
    .fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha1234");
  await page.getByLabel("Confirmar senha").fill("senha1234");
  await page.getByRole("button", { name: "Criar perfil" }).click();
  await expect(
    page.getByRole("link", { name: "Nova", exact: true }),
  ).toBeVisible();

  await page.goto("/perfil");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();

  await login(page);
  await expect(page.getByRole("link", { name: "Ana" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Carrinho com 2 itens" }),
  ).toBeVisible();

  await setScenario(page, "session-expired");
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page).toHaveURL(/redirect=/);

  await setScenario(page, "default");
  await login(page, "bruno@kurio.test", "carteira123");
  await expect(page.getByRole("link", { name: "Bruno" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Carrinho com 0 itens" }),
  ).toBeVisible();
});

test("favorito otimista desfaz quando a mutation falha", async ({ page }) => {
  await openApp(page, "/login");
  await login(page);
  await setScenario(page, "unauthorized");
  await page.goto("/nfts/nft_emerald");
  const favorite = page.getByRole("button", { name: "Remover favorito" });
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await favorite.click();
  await expect(page.getByTestId("notices")).toContainText("permissão");
  await expect(
    page.getByRole("button", { name: "Remover favorito" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("carrinho, cupom, refresh e fusão do visitante", async ({ page }) => {
  await openApp(page, "/nfts/nft_ivory");
  await page.getByRole("button", { name: "Comprar" }).click();
  await expect(
    page.getByRole("heading", { name: "Carrinho de NFTs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ivory Baron #088" }),
  ).toBeVisible();
  await login(page);
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ivory Baron #088" }),
  ).toBeVisible();

  await page.getByLabel("Código promocional").fill("NAOEXISTE");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom não encontrado.")).toBeVisible();
  await page.getByLabel("Código promocional").fill("EXPIROU");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Este cupom expirou.")).toBeVisible();
  await page.getByLabel("Código promocional").fill("LANCAMENTO10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(
    page.getByRole("button", { name: "Remover LANCAMENTO10" }),
  ).toBeVisible();
  await expect(page.getByText("0.00 ETH")).toHaveCount(0);

  await page.getByLabel("Quantidade").first().fill("2");
  await expect(page.getByLabel("Quantidade").first()).toHaveValue("2");
  await page.reload();
  await expect(page.getByLabel("Quantidade").first()).toHaveValue("2");
  await page.getByRole("button", { name: "Remover" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toHaveCount(0);
});

test("compra completa até o recibo", async ({ page }) => {
  await openApp(page, "/login");
  await login(page);
  await confirmPurchase(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await expect(page.getByText(/ID da transação 0x/)).toBeVisible();
  await expect(page.getByText("Emerald Ape #042")).toBeVisible();
  await expect(page.getByText("Violet Nomad #314")).toBeVisible();
  await expect(page.getByText("2.601 ETH")).toBeVisible();
  await page.getByRole("link", { name: "Ver no Etherscan" }).click();
  await expect(
    page.getByRole("heading", { name: "Explorador simulado" }),
  ).toBeVisible();
  await page.goto("/carrinho");
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
});

test("pagamento recusado mantém o carrinho e edição esgotada não cria pedido", async ({
  page,
}) => {
  await openApp(page, "/login", "payment-rejected");
  await login(page);
  await confirmPurchase(page);
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();

  await setScenario(page, "sold-out");
  await page.goto("/pagamento");
  await expect(
    page.getByRole("main").getByRole("button", { name: "Revisar pedido" }),
  ).toBeEnabled();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Conectar carteira" })
    .click();
  await expect(page.getByText("Carteira conectada.")).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Revisar pedido" })
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Confirmar compra" })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "esgotou" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/pagamento/);
});

test("timeout recupera o mesmo pedido", async ({ page }) => {
  test.setTimeout(45_000);
  await openApp(page, "/login", "order-timeout");
  await login(page);
  await confirmPurchase(page);
  await expect(page.getByTestId("notices")).toContainText(
    "Recuperando o mesmo pedido",
  );
  await expect(
    page.getByRole("heading", {
      name: /Seus NFTs agora estão na sua carteira|Pedido pendente/,
    }),
  ).toBeVisible();
  const orderUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(orderUrl);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});

test("perfil, senha e carteiras", async ({ page }) => {
  await openApp(page, "/login");
  await login(page);
  await page.goto("/perfil");
  await page.getByLabel("Nome", { exact: true }).fill("A");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("O nome precisa ter pelo menos 2 caracteres."),
  ).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Ana Ribeiro");
  await page.getByLabel("Nome de exibição").fill("Ana Coleção");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByTestId("notices")).toContainText("Perfil atualizado.");
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Ana Coleção");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page
    .locator("#avatar")
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByRole("img", { name: "Avatar de Ana Coleção" }),
  ).toBeVisible();

  await page.getByLabel("Senha atual").fill("errada123");
  await page.getByLabel("Nova senha").fill("colecao456");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByText("Senha atual incorreta.")).toBeVisible();
  await page.getByLabel("Senha atual").fill("colecao123");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByTestId("notices")).toContainText("Senha alterada.");

  await page.goto("/carteiras");
  await page.getByLabel("Apelido da carteira").fill("Cofre");
  await page.getByLabel("Endereço").fill("abc");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText(/Endereço precisa ter 0x/)).toBeVisible();
  await page
    .getByLabel("Endereço")
    .fill("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
  await page.getByLabel("Papel").selectOption("secondary");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("heading", { name: "Cofre" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Cofre" })).toBeVisible();
});

test("preço muda no checkout e a cotação velha não confirma", async ({
  page,
}) => {
  await openApp(page, "/login", "price-changed");
  await login(page);
  await page.goto("/pagamento");
  await expect(page.getByTestId("quote-stale")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Atualizar cotação" }).click();
  await expect(page.getByTestId("quote-stale")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});

test("eventos duplicados, antigos e pedido de outro usuário", async ({
  page,
}) => {
  await openApp(page, "/nfts/nft_emerald");
  await expect(page.getByText("1.19 ETH").first()).toBeVisible();
  const payload = {
    eventId: "nft_emerald:v9",
    resourceId: "nft_emerald",
    version: 9,
    priceEth: "9.99",
    available: 2,
    editionId: "nft_emerald_original",
  };
  await emit(page, "nft.updated", payload);
  await expect(page.getByText("9.99 ETH").first()).toBeVisible();
  await emit(page, "nft.updated", payload);
  await emit(page, "nft.updated", {
    ...payload,
    eventId: "nft_emerald:v3",
    version: 3,
    priceEth: "0.01",
  });
  await expect(page.getByText("0.01 ETH")).toHaveCount(0);
  await expect(page.getByText("9.99 ETH").first()).toBeVisible();
});

test("pedido pendente sobrevive a reload e ignora evento de outro usuário", async ({
  page,
}) => {
  await openApp(page, "/login", "order-hold");
  await login(page);
  await confirmPurchase(page);
  await expect(
    page.getByRole("heading", { name: "Pedido pendente" }),
  ).toBeVisible();
  const orderUrl = page.url();
  const orderId = orderUrl.split("/").pop() ?? "";
  await emit(page, "order.updated", {
    eventId: `${orderId}:v99`,
    resourceId: orderId,
    version: 99,
    userId: "user_bruno",
    status: "rejected",
  });
  await expect(
    page.getByRole("heading", { name: "Pedido pendente" }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(orderUrl);
  await expect(
    page.getByRole("heading", { name: "Pedido pendente" }),
  ).toBeVisible();
  await page.evaluate(async (id) => {
    await fetch("/api/dev/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: id, status: "confirmed" }),
    });
  }, orderId);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});

test("teclado, foco e validação de formulário", async ({ page }) => {
  await openApp(page, "/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Informe o e-mail.")).toBeVisible();
  await expect(page.getByText("Informe a senha.")).toBeVisible();
  await page.getByRole("main").getByLabel("E-mail", { exact: true }).focus();
  await expect(
    page.getByRole("main").getByLabel("E-mail", { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("main").getByLabel("Senha", { exact: true }),
  ).toBeFocused();
});

test("skeleton lento, falha HTTP e nova tentativa", async ({ page }) => {
  await openApp(page, "/", "slow");
  await expect(page.getByTestId("catalog-skeleton")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Golden Frequency #071" }),
  ).toBeVisible();
  await expect(page.getByTestId("catalog-skeleton")).toHaveCount(0);

  await setScenario(page, "http-500");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "O catálogo não carregou.",
  );
  await setScenario(page, "default");
  await page.getByRole("button", { name: "Buscar outra vez" }).click();
  await expect(
    page.getByRole("heading", { name: "Golden Frequency #071" }),
  ).toBeVisible();
});

test("cadastro em conflito e áreas fora do escopo", async ({ page }) => {
  await openApp(page, "/cadastro", "register-conflict");
  await page.getByLabel("Nome", { exact: true }).fill("Outra Pessoa");
  await page.getByLabel("Nome de exibição").fill("Outra");
  await page
    .getByRole("main")
    .getByLabel("E-mail", { exact: true })
    .fill("livre@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha1234");
  await page.getByLabel("Confirmar senha").fill("senha1234");
  await page.getByRole("button", { name: "Criar perfil" }).click();
  await expect(page.getByText("Este e-mail já está em uso.")).toBeVisible();

  await page.goto("/fora/criadores");
  await expect(
    page.getByRole("heading", { name: "Área indisponível" }),
  ).toBeVisible();
  await expect(page.getByText("não faz parte desta entrega")).toBeVisible();
});

test("regressão visual de início, detalhe, carrinho e pagamento", async ({
  page,
}) => {
  await openApp(page, "/");
  await expect(
    page.getByRole("heading", { name: "Golden Frequency #071" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("home.png", { fullPage: true });

  await page.goto("/nfts/nft_emerald");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("detail.png", { fullPage: true });

  await login(page);
  await page.goto("/carrinho");
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();
  await expect(page.getByText("2.601 ETH")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("cart.png", { fullPage: true });

  await page.goto("/pagamento");
  await expect(
    page.getByRole("main").getByLabel("E-mail", { exact: true }),
  ).toHaveValue("ana@kurio.test");
  await expect(page.getByText("2.601 ETH")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("payment.png", { fullPage: true });
});
