## 1. Estrutura do projeto

- [x] 1.1 Criar a estrutura de pastas e arquivos (`index.html`, `admin.html`, `assets/`, `css/`, `js/`, `js/lib/`, `supabase/`, `tests/`) conforme design.md §2 e verificar que todos existem
- [x] 1.2 Criar `package.json` mínimo (`"type": "module"`, script `"test": "node --test \"tests/**/*.test.js\""` — o Node 22+ não aceita pasta como argumento) sem dependências e verificar que `npm test` roda (0 testes, sem erro)
- [x] 1.3 Criar `js/config.js` com placeholders de `SUPABASE_URL`/`SUPABASE_ANON_KEY` e `js/supabase.js` importando `supabase-js` v2 fixado via jsDelivr; verificar abrindo uma página de teste que o client é criado sem erro no console

## 2. Identidade visual

- [x] 2.1 Desenhar `assets/logo.svg` (símbolo casa + gota + brilhos e texto "JJ Casa Limpa") e `assets/logo-mark.svg` (só símbolo); verificar visualmente em 32px e 300px de largura
- [x] 2.2 Criar `assets/favicon.svg` e `assets/placeholder.svg` a partir do símbolo; verificar favicon na aba do navegador
- [x] 2.3 Gerar `assets/og-image.png` 1200×630 com logo e slogan; verificar dimensões do arquivo
- [x] 2.4 Criar `css/styles.css` mobile first conforme design §9.1: tokens em `:root` (cores, fonte Nunito, espaçamentos, raios, sombras), reset, estilos base para celular e ajustes apenas com `min-width` em 600px e 1024px (cabeçalho, botões, cards, formulários com fonte 16px, drawer/modal em tela cheia → painel lateral/janela centralizada, barra fixa do carrinho, toasts, grade 2→3→4 colunas, `:hover` só em `(hover: hover)`, `:focus-visible`); verificar contraste AA com um verificador de contraste e, nas DevTools, ausência de rolagem horizontal em 360px, 768px e 1280px

## 3. Banco de dados e segurança (Supabase)

- [x] 3.1 Escrever `supabase/schema.sql` com tabelas `products`, `settings` (linha única id=1), `admins`, checks (título, preços, promoção, datas, máx. 5 imagens, regex do WhatsApp) e trigger de `updated_at`; verificar executando no SQL Editor de um projeto de teste sem erros
- [x] 3.2 Adicionar ao schema a função `is_admin()` e políticas RLS (leitura pública só de produtos ativos e settings; escrita só admin); verificar via API com a chave anon que `insert`/`update`/`delete` são recusados e que produtos inativos não retornam
- [ ] 3.3 Adicionar ao schema o bucket público `product-images` e políticas de Storage (leitura pública, escrita só admin); verificar que upload anônimo é recusado e que a URL pública de uma imagem abre no navegador
- [x] 3.4 Adicionar ao schema 3–4 produtos de exemplo (um com promoção) marcados para fácil remoção; verificar que aparecem na consulta anônima

## 4. Lógica pura e testes (`js/lib`)

- [x] 4.1 Implementar `money.js` (formatar centavos como "R$ 1.234,56"; converter "3,49"/"3.49"/"R$ 3,49" em centavos, rejeitando inválidos) e verificar com `tests/money.test.js`
- [x] 4.2 Implementar `pricing.js` (`todayInSaoPaulo`, `isPromoActive`, `promoStatus` Agendada/Em promoção/Expirada/Sem promoção, `currentPrice`, `discountPercent`) e verificar com `tests/pricing.test.js` cobrindo datas de borda inclusivas e promo ≥ preço
- [x] 4.3 Implementar `text.js` (normalização sem acento/maiúsculas para busca) e `validation.js` (produto, promoção, telefone → `55` + DDD + número, dados do cliente) e verificar com testes cobrindo os cenários de validação das specs
- [x] 4.4 Implementar `whatsapp.js` (`buildOrderMessage`, `buildOrderUrl`, `buildContactUrl`) no formato do design §7 e verificar com testes de conteúdo e codificação (acentos, quebras de linha, `&`, `#`)
- [x] 4.5 Implementar `image.js` (validação de MIME, redimensionamento para ≤1200px, WebP 0,8 com fallback JPEG); verificar manualmente no navegador que uma foto de celular grande resulta em arquivo < 400 KB com o maior lado ≤ 1200px

## 5. Área do cliente (catálogo)

- [x] 5.1 Montar `index.html`: cabeçalho com logo e ícone do carrinho com contador, mensagem de boas-vindas, busca, chips de categoria, seção "Promoções", grade de produtos, rodapé com contato/horário, botão flutuante do WhatsApp, metatags (título, descrição, Open Graph, favicon); verificar HTML válido e o layout de cada faixa (2 colunas em 360px, 3 em 768px, 4 em 1280px com largura máxima ~1200px)
- [x] 5.2 Implementar em `catalog.js` o carregamento de produtos ativos e settings, renderização dos cards (foto principal ou placeholder, preço/promoção com "de/por" e selo -X%), estados de carregando/vazio/erro com "Tentar novamente"; verificar os cenários de listagem e promoções da spec `product-catalog`
- [x] 5.3 Implementar busca sem acento e filtro por categoria (com "Todos" e "Limpar filtros"), e clique no logo limpando filtros; verificar os cenários de busca/filtro da spec
- [x] 5.4 Implementar o modal de detalhes com galeria de fotos (deslizar no celular), descrição completa, seletor de quantidade e "Adicionar", em tela cheia no celular e janela centralizada no desktop, fechando com Esc e devolvendo o foco; verificar abrindo um produto com várias fotos em 360px e 1280px
- [x] 5.5 Implementar a barra fixa inferior do carrinho no celular (itens, total, "Ver carrinho"; oculta sem itens e a partir de 1024px), com o botão flutuante do WhatsApp posicionado acima dela e respeito à área segura do iPhone; verificar em 360px que nenhum conteúdo do fim da página fica coberto

## 6. Carrinho e pedido pelo WhatsApp

- [x] 6.1 Implementar em `cart.js` o carrinho em `localStorage` (adicionar, alterar quantidade, remover, contador, totais com preço vigente, limpeza de itens indisponíveis com aviso, fallback em memória); verificar os cenários de carrinho da spec `whatsapp-ordering`, incluindo recarregar a página
- [x] 6.2 Implementar o drawer (tela cheia no celular, painel lateral de ~420px no desktop, Esc fecha) com formulário de checkout (nome, Entrega/Retirada, endereço condicional, pagamento, observações), validação com mensagens nos campos e memorização dos dados do cliente; verificar os cenários de campos obrigatórios
- [x] 6.3 Implementar o envio: abrir o link `wa.me` com a mensagem, depois perguntar em diálogo na própria página se deseja esvaziar o carrinho; bloquear envio com "Pedidos temporariamente indisponíveis" sem número configurado; verificar no celular e no computador que a mensagem chega exatamente como esperada
- [x] 6.4 Ligar o botão flutuante de WhatsApp à mensagem de dúvida; verificar que abre a conversa com o texto correto

## 7. Área administrativa

- [x] 7.1 Montar `admin.html` com tela de login (e-mail, senha, "Esqueci minha senha") e painel (lista de produtos, busca, botão "Novo produto", aba "Configurações", "Sair"); criar `css/admin.css` desktop first (base desktop; ajustes com `max-width` 1023px e 767px); verificar que sem sessão só o login é exibido e que login e painel funcionam sem rolagem horizontal em 1280px, 800px e 360px
- [x] 7.2 Implementar em `admin.js` login/logout/sessão persistente, mensagem "E-mail ou senha inválidos", recuperação de senha e tela de nova senha ao voltar pelo link; verificar os cenários de acesso da spec `admin-panel`
- [x] 7.3 Implementar a lista de produtos (ativos e inativos, miniatura, preço, status da promoção, alternar ativo, busca por título, ordenação por `sort_order`) como tabela no desktop/tablet e cartões abaixo de 768px; verificar nas três larguras e que desativar some do catálogo público
- [x] 7.4 Implementar o formulário de produto (janela com 2 colunas no desktop, tela cheia com 1 coluna abaixo de 1024px; `inputmode="decimal"` nos preços; criar/editar, validações, sugestões de categoria, ordem de exibição) e a exclusão com confirmação em diálogo da página, removendo também as fotos do Storage; verificar os cenários de cadastro, edição e exclusão
- [x] 7.5 Implementar a gestão de fotos no formulário (upload com redimensionamento e progresso, até 5, definir principal, reordenar, remover, erro com "Tentar novamente" sem perder o formulário); verificar os cenários de fotos pela câmera/galeria do celular
- [x] 7.6 Implementar os campos de promoção (preço promocional, início, fim, "Remover promoção") com validações e selo de status; verificar os cenários de promoção, incluindo datas futuras e passadas
- [x] 7.7 Implementar a aba Configurações (WhatsApp com máscara e normalização para `55…`, boas-vindas, contato, horário); verificar que o campo abre o teclado de telefone no celular e que o catálogo passa a usar o novo número e o novo rodapé

## 8. Publicação e documentação

- [x] 8.1 Publicar o site estático (decisão posterior: GitHub Pages em vez de Netlify, pois o Supabase gratuito não serve HTML; `netlify.toml` mantido como alternativa) e verificar que loja (`/`) e admin (`/admin/`) carregam no endereço público
- [ ] 8.2 Criar `.github/workflows/keepalive.yml` opcional (leitura semanal ao Supabase com a chave anon via secrets) e verificar a sintaxe executando-o manualmente (`workflow_dispatch`)
- [ ] 8.3 Escrever `README.md` em português: visão geral, passo a passo do Supabase (schema, desativar cadastro, criar admin, URL de redirect), `config.js`, publicação no Netlify (arrastar pasta ou GitHub), alternativas Cloudflare Pages/GitHub Pages, domínio próprio, limites do plano gratuito, como reativar projeto pausado e como rodar os testes; verificar seguindo o guia do zero em um projeto Supabase novo
- [ ] 8.4 Executar o roteiro completo de verificação (todos os cenários das 4 specs) no site publicado, em celulares reais (Android/Chrome e iPhone/Safari) e no desktop (Chrome e outro navegador, navegando também só com teclado), e rodar `npm test` com todos os testes passando
