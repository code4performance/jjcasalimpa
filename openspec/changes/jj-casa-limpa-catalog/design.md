## Context

Repositório vazio; não há código nem specs existentes. Motivação e escopo em proposal.md; comportamento em `specs/`. Restrições que moldam a solução:

- **Muito simples**: quem vai manter é uma pequena empresa, sem equipe de TI. Nada de build, framework ou servidor próprio.
- **Hospedagem gratuita**: sem custo mensal.
- **Dados dinâmicos**: o admin precisa cadastrar produtos e fotos pelo navegador e ver o resultado no ar sem republicar o site (decisão do usuário: Supabase + Netlify).

## Goals / Non-Goals

**Goals:**
- Site estático puro (HTML + CSS + JavaScript ES modules) que roda abrindo os arquivos em qualquer hospedagem estática.
- Toda a lógica de negócio sensível (quem pode escrever) garantida no servidor (Supabase RLS), não só na interface.
- Lógica pura (preço vigente, formatação de moeda, mensagem do WhatsApp, validações) isolada em módulos testáveis com `node --test`, sem dependências.
- Guia de publicação que um leigo consiga seguir em ~30 minutos.

**Non-Goals:**
- Pagamento online, cálculo de frete, controle de estoque, histórico de pedidos, múltiplos administradores com permissões diferentes, múltiplos idiomas, SEO avançado/páginas por produto.
- Envio automático da mensagem pelo WhatsApp (API Business): o cliente sempre confirma o envio no próprio app.

## Decisions

### 1. Stack: HTML/CSS/JS puro + `supabase-js` via CDN
Duas páginas: `index.html` (catálogo + carrinho) e `admin.html` (login + painel). JavaScript em ES modules nativos; `supabase-js` v2 importado de `cdn.jsdelivr.net` (versão fixada). Fonte **Nunito** via Google Fonts.
- *Alternativas*: React/Vite (exige build e Node para publicar — contra a simplicidade); site gerado a partir de JSON no repositório (admin teria de fazer commit — impraticável para o cliente).

### 2. Estrutura de arquivos
```
index.html            admin.html
assets/  logo.svg, logo-mark.svg (símbolo), favicon.svg, og-image.png, placeholder.svg
css/     styles.css   (tokens de cor/tipografia em :root, compartilhado; mobile first)
         admin.css    (layout do painel; desktop first)
js/      config.js    (SUPABASE_URL, SUPABASE_ANON_KEY)
         supabase.js  (cria o client)
         catalog.js   (página do cliente)   cart.js (carrinho + checkout)
         admin.js     (painel)
         lib/ money.js, pricing.js, whatsapp.js, validation.js, text.js, image.js
supabase/schema.sql   (tabelas, RLS, bucket, políticas)
tests/   *.test.js    (node --test sobre js/lib)
netlify.toml  package.json (só "type":"module" e script "test")  README.md
```

### 3. Modelo de dados (Supabase Postgres)
- `products`: `id uuid pk`, `title text` (1–80), `description text` (≤1000), `category text`, `price_cents int > 0`, `promo_price_cents int null` (check `> 0 and < price_cents`), `promo_start date null`, `promo_end date null` (check `promo_end >= promo_start`), `active bool default true`, `sort_order int default 0`, `images text[] default '{}'` (caminhos no Storage; índice 0 = foto principal; máx. 5 via check), `created_at`, `updated_at` (trigger).
- `settings`: linha única (`id = 1`): `whatsapp_number text` (check regex `^55\d{10,11}$`), `welcome_message text`, `contact_info text`, `business_hours text`.
- `admins`: `user_id uuid pk references auth.users`.
- Valores em **centavos inteiros** para evitar erros de ponto flutuante; conversão só na borda (entrada/formatação).
- Fotos como array na própria linha em vez de tabela separada: no máximo 5, sempre lidas junto com o produto; reordenar = regravar o array.

### 4. Segurança: RLS + Auth sem cadastro público
- Auth por e-mail/senha; **"Allow new users to sign up" desativado** no painel do Supabase; o admin é criado manualmente no painel e inserido em `admins`.
- Função `is_admin()` (`security definer`) = `exists(select 1 from admins where user_id = auth.uid())`.
- `products`: `select` público apenas `where active = true`; admin lê tudo; `insert/update/delete` só `is_admin()`.
- `settings`: `select` público; `update` só `is_admin()`.
- Storage bucket `product-images` **público para leitura**; `insert/update/delete` só `is_admin()`. Caminho `{product_id}/{uuid}.webp`.
- A chave `anon` fica exposta em `config.js` — isso é esperado no Supabase; a proteção vem das políticas RLS.
- Recuperação de senha pelo fluxo nativo do Supabase (`resetPasswordForEmail` com redirect para `admin.html`).

### 5. Regra de promoção vigente (`lib/pricing.js`)
`isPromoActive(p, hoje)` = `promo_price_cents != null && promo_price_cents < price_cents && (!promo_start || hoje >= promo_start) && (!promo_end || hoje <= promo_end)`, com `hoje` = data corrente no fuso **America/Sao_Paulo** (via `Intl.DateTimeFormat`), datas inclusivas. `currentPrice(p)` e `discountPercent(p)` (arredondado) derivam disso. A mesma função é usada no catálogo, no carrinho, na mensagem do WhatsApp e no status do painel (Agendada/Em promoção/Expirada) — fonte única da regra.
- *Alternativa*: calcular no banco (view). Rejeitada: duplicaria a regra e o cálculo no cliente é suficiente, já que o preço final é confirmado na conversa.

### 6. Carrinho e checkout (`cart.js`)
- `localStorage`: `jjcl_cart` = `[{id, qty}]` (apenas id e quantidade; preço sempre recalculado a partir dos produtos carregados) e `jjcl_customer` = dados do formulário. Leitura/escrita envolvidas em try/catch (modo anônimo).
- Ao carregar, itens cujo id não está entre os produtos ativos são removidos com aviso.
- Carrinho em painel lateral (drawer) com o formulário de checkout embaixo.

### 7. Mensagem do WhatsApp (`lib/whatsapp.js`)
Função pura `buildOrderMessage(items, customer, storeName)` → texto; URL = `https://wa.me/{numero}?text={encodeURIComponent(texto)}`, aberta com `window.open(url, '_blank')` (fallback `location.href`). Formato:
```
Olá, JJ Casa Limpa! Gostaria de fazer um pedido:

2x Detergente Neutro 500ml — R$ 3,49 = R$ 6,98
1x Água Sanitária 2L (promoção) — R$ 7,90 = R$ 7,90

*Total: R$ 14,88*

Nome: Maria
Recebimento: Entrega
Endereço: Rua ..., 123
Pagamento: Pix
Observações: ...
```
Negrito com `*` do WhatsApp; sem emojis (evita problemas de codificação em aparelhos antigos).

### 8. Upload de imagens (`lib/image.js`)
Redimensionamento no navegador com `createImageBitmap` + `<canvas>` para no máximo 1200px e exportação **WebP qualidade 0,8** (fallback JPEG se o navegador não suportar WebP em `toBlob`). Reduz fotos de celular de ~4 MB para ~150 KB, mantendo o Storage gratuito (1 GB) folgado. Validação de tipo por MIME (`image/jpeg|png|webp`) antes do processamento. Ao excluir produto ou foto, remove também o objeto do Storage.

### 9. Identidade visual
- Logo em SVG desenhado à mão no código: casa estilizada com uma gota d'água e brilhos, texto "JJ Casa Limpa" em Nunito ExtraBold; versão só-símbolo para favicon e placeholder de produto.
- Tokens em `:root`: primária azul-água `#0891B2`, primária escura `#0E7490`, destaque verde `#16A34A`, promo `#DC2626`, texto azul-marinho `#0F2A3D`, fundo `#F4FBFD`, superfície `#FFFFFF`. Contraste verificado (AA) para texto sobre fundo e texto branco sobre botões.
- `og-image.png` (1200×630) gerada a partir do logo para pré-visualização de links.

### 9.1 CSS mobile first
A maioria dos clientes chega pelo celular a partir de links compartilhados no WhatsApp, então o CSS base descreve o layout de celular e telas maiores são acrescentadas só com `@media (min-width: …)`:
- **Base (< 600px)**: grade de 2 colunas; carrinho e detalhes do produto em tela cheia; barra fixa inferior do carrinho (visível só com itens), com `padding-bottom` no `<main>` e o botão flutuante do WhatsApp deslocado acima dela; `env(safe-area-inset-bottom)` para iPhones com barra de gestos.
- **≥ 600px**: grade de 3 colunas.
- **≥ 1024px**: grade de 4 colunas, contêiner `max-width: 1200px`; carrinho vira painel lateral de ~420px à direita e a barra fixa inferior some (o ícone do cabeçalho basta); modal de detalhes centralizado (~720px, galeria ao lado do texto); estados `:hover` aplicados apenas em `@media (hover: hover)` para não "grudarem" no toque.
- **Admin é a exceção: desktop first.** A equipe da loja cadastra produtos principalmente no computador, então `css/admin.css` (carregado só em `admin.html`, depois de `styles.css`) descreve o layout de desktop na base e adapta para baixo com `@media (max-width: …)`: base = tabela + formulário em janela centralizada com 2 colunas (dados à esquerda, fotos/promoção à direita); `max-width: 1023px` = formulário em tela cheia, 1 coluna, tabela sem coluna de categoria; `max-width: 767px` = lista em cartões empilhados. Componentes compartilhados (botões, campos, cores) continuam vindo de `styles.css`, então o uso no celular (toque de 44px, teclados adequados, fonte 16px) é preservado.
- **Formulários**: `font-size: 16px` nos campos (evita zoom automático do iOS); `inputmode="decimal"` em preços, `inputmode="numeric"` em quantidades, `type="tel"` no WhatsApp; `accept="image/*"` no upload para oferecer câmera e galeria.
- **Imagens**: `loading="lazy"`, `decoding="async"` e `aspect-ratio: 1` com `object-fit: cover` nos cards para evitar saltos de layout em conexões móveis lentas.
- **Acessibilidade de teclado**: `:focus-visible` com contorno na cor primária, Esc fecha drawer/modal, foco retido dentro do diálogo aberto e devolvido ao elemento de origem ao fechar.
- Unidades em `rem`, espaçamentos e tamanhos como tokens em `:root`, e `clamp()` para títulos — um único arquivo `styles.css` compartilhado pelas duas páginas.
- *Alternativa*: framework CSS (Tailwind/Bootstrap). Rejeitada para manter o projeto sem build e sem dependências; o volume de CSS é pequeno.

### 10. Hospedagem: Netlify (gratuito)
- Publicação por **arrastar a pasta** em app.netlify.com/drop ou conectando um repositório GitHub (deploy automático a cada commit). Endereço gratuito `jjcasalimpa.netlify.app`; domínio próprio `.com.br` opcional (~R$ 40/ano no Registro.br).
- `netlify.toml` com cabeçalhos de cache e segurança básicos (sem build command).
- *Alternativas documentadas no README*: **Cloudflare Pages** (banda ilimitada) e **GitHub Pages** — ambos funcionam sem mudança de código, pois o site é estático.
- Supabase plano gratuito: 500 MB de banco, 1 GB de arquivos, 5 GB de tráfego/mês — muito acima do necessário para um catálogo de dezenas/centenas de produtos.

### 11. Testes
`node --test` sobre `js/lib/*` (moeda, parsing de preço "3,49"/"3.49", regra de promoção com datas de borda, validação de telefone, busca sem acento, montagem e codificação da mensagem). As páginas são verificadas manualmente seguindo um roteiro no README (checklist de cenários das specs).

## Risks / Trade-offs

- [Supabase pausa projetos gratuitos após ~7 dias sem nenhuma requisição] → Um catálogo com visitas regulares não pausa; como garantia, workflow opcional do GitHub Actions faz uma leitura semanal; README explica como reativar pelo painel caso ocorra.
- [Chave anon pública permite a qualquer um ler produtos ativos pela API] → Aceitável: são dados públicos por natureza; escrita bloqueada por RLS.
- [Preço no pedido pode ser adulterado pelo cliente editando a mensagem] → Aceitável: o pedido é confirmado manualmente na conversa; o admin confere os preços.
- [Dependência de CDN para `supabase-js`] → Versão fixada; se desejado, o arquivo pode ser copiado para `js/vendor/` sem mudança de arquitetura.
- [`localStorage` indisponível (navegação anônima)] → Carrinho funciona na sessão em memória; apenas a persistência é perdida.
- [Admin perder a senha e o e-mail] → Admin extra pode ser criado pelo painel do Supabase; documentado no README.

## Migration Plan

Projeto novo, sem migração. Implantação:
1. Criar projeto no Supabase, rodar `supabase/schema.sql` no SQL Editor, desativar cadastro público, criar o usuário admin e inseri-lo em `admins`.
2. Preencher `js/config.js` com URL e chave anon.
3. Publicar a pasta no Netlify; configurar a URL do site em Supabase → Auth → URL Configuration (para o link de recuperação de senha).
4. Entrar em `/admin.html`, configurar o número de WhatsApp e cadastrar os produtos.

Rollback: republicar a versão anterior pelo histórico de deploys do Netlify (um clique).

## Open Questions

- Número de WhatsApp, horário de atendimento e contatos reais da loja — configurados pelo admin após a publicação.
- Lista inicial de categorias e produtos — cadastrada pelo admin; o schema pode trazer 3–4 produtos de exemplo que podem ser apagados.
