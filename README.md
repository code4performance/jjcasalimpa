# JJ Casa Limpa — catálogo com pedidos pelo WhatsApp

Site simples para a **JJ Casa Limpa**:

- **Loja** (`index.html`, endereço `/`): o cliente vê os produtos, preços e promoções, busca e filtra por categoria, monta o carrinho e **envia o pedido pelo WhatsApp** da loja. Feito primeiro para celular.
- **Área administrativa** (`admin/index.html`, endereço `/admin/` — link separado, não aparece na loja): com login, a equipe cadastra produtos (título, descrição, categoria, preço e até 5 fotos), cria promoções (com datas opcionais), oculta/exclui produtos e configura o número de WhatsApp, a mensagem de boas-vindas e os dados do rodapé. Feita primeiro para computador, mas funciona no celular.

Tudo funciona **de graça**:

| Parte | Serviço | Plano gratuito |
|---|---|---|
| Site (as páginas) | **Netlify** | 100 GB de tráfego/mês |
| Produtos, fotos e login | **Supabase** | 500 MB de banco, 1 GB de fotos |

Não há servidor próprio nem etapa de "build": são arquivos HTML, CSS e JavaScript comuns.

---

## Publicação passo a passo (cerca de 30 minutos)

### 1. Criar o banco no Supabase

1. Crie uma conta em <https://supabase.com> e clique em **New project**. Escolha um nome (ex.: `jj-casa-limpa`), crie uma senha forte para o banco e a região **South America (São Paulo)**.
2. Quando o projeto estiver pronto, abra **SQL Editor → New query**, cole **todo** o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria as tabelas, as regras de segurança, o espaço das fotos e 4 produtos de exemplo.
3. Em **Authentication → Sign In / Providers** (ou **Authentication → Settings**), **desative "Allow new users to sign up"**. Assim ninguém consegue criar conta sozinho.
4. Em **Authentication → Users → Add user → Create new user**, crie o usuário do administrador (e-mail e senha) e marque **Auto Confirm User**.
5. Volte ao **SQL Editor** e rode (trocando pelo e-mail criado):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com'
   on conflict do nothing;
   ```

   Repita os passos 4 e 5 para cada pessoa que puder administrar o site.

### 2. Ligar o site ao Supabase

1. No Supabase, abra **Project Settings → API** (ou o botão **Connect**) e copie:
   - **Project URL** (ex.: `https://abcd1234.supabase.co`)
   - a chave **anon** / **publishable**
2. Abra o arquivo [`js/config.js`](js/config.js) em qualquer editor de texto e cole os dois valores:

   ```js
   export const SUPABASE_URL = 'https://abcd1234.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```

   > A chave *anon* pode ficar pública — quem protege os dados são as regras de segurança criadas pelo `schema.sql`. **Nunca** use a chave `service_role` aqui.

### 3. Publicar no Netlify

**Opção A — arrastar a pasta (mais simples):**

1. Crie uma conta em <https://app.netlify.com>.
2. Acesse <https://app.netlify.com/drop> e **arraste a pasta do projeto** para a página.
3. Em **Site configuration → Change site name**, escolha o endereço, por exemplo `jjcasalimpa` → `https://jjcasalimpa.netlify.app`.
4. Para atualizar o site depois, abra **Deploys** e arraste a pasta de novo.

**Opção B — pelo GitHub (atualiza sozinho a cada alteração):** envie a pasta para um repositório no GitHub e, no Netlify, use **Add new site → Import an existing project**. Não é preciso configurar comando de build (o `netlify.toml` já cuida disso).

### 4. Últimos ajustes

1. No Supabase, em **Authentication → URL Configuration**, coloque o endereço do site em **Site URL** (ex.: `https://jjcasalimpa.netlify.app`) e adicione `https://jjcasalimpa.netlify.app/admin/` em **Redirect URLs**. Isso faz o link de "Esqueci minha senha" funcionar.
2. Se o endereço do site for diferente de `jjcasalimpa.netlify.app`, troque-o nas linhas `og:url` e `og:image` do `index.html` (é a imagem que aparece quando o link é compartilhado no WhatsApp).
3. Entre em `https://SEU-SITE/admin/`, vá em **Configurações** e informe o **WhatsApp que recebe os pedidos**, a mensagem de boas-vindas, o contato e o horário.
4. Cadastre os produtos e apague os 4 de exemplo (ou rode no SQL Editor: `delete from public.products where id::text like '00000000-0000-4000-8000-%';`).

Pronto! Compartilhe o endereço do site com os clientes.

---

## Como funciona o pedido

1. O cliente adiciona produtos ao carrinho (ele fica salvo no navegador).
2. Informa nome, entrega ou retirada, endereço (se for entrega), forma de pagamento e observações.
3. Ao tocar em **Enviar pedido pelo WhatsApp**, o WhatsApp abre com a mensagem pronta; o cliente só precisa tocar em enviar. Exemplo:

   ```
   Olá, JJ Casa Limpa! Gostaria de fazer um pedido:

   2x Detergente Neutro 500ml — R$ 3,49 = R$ 6,98
   1x Água Sanitária 2L (promoção) — R$ 7,90 = R$ 7,90

   *Total: R$ 14,88*

   Nome: Maria
   Recebimento: Entrega
   Endereço: Rua das Flores, 123
   Pagamento: Pix
   ```

Os pedidos **não ficam gravados no site** — o histórico fica nas conversas do WhatsApp. Confira os preços na conversa antes de confirmar a venda.

## Promoções

No formulário do produto, preencha **Preço promocional** (menor que o preço normal). As datas de **Início** e **Término** são opcionais e valem o dia inteiro (horário de Brasília). O painel mostra se a promoção está **Agendada**, **Em promoção** ou **Expirada**. Produtos com promoção vigente aparecem na seção **Promoções** do site com o selo de desconto.

---

## Outras opções de hospedagem gratuita

O site funciona sem nenhuma mudança em qualquer hospedagem de arquivos estáticos:

- **Cloudflare Pages** (<https://pages.cloudflare.com>): tráfego ilimitado. Crie um projeto com **Upload assets** e envie a pasta.
- **GitHub Pages**: envie a pasta para um repositório e ative **Settings → Pages** (branch `main`, pasta raiz). O endereço fica `https://usuario.github.io/repositorio/`.

Em qualquer caso, lembre de ajustar a **Site URL / Redirect URLs** no Supabase (passo 4.1).

**Domínio próprio** (ex.: `jjcasalimpa.com.br`): registre no <https://registro.br> (cerca de R$ 40/ano) e siga **Domain management → Add a domain** no Netlify.

## Limites do plano gratuito e cuidados

- **Supabase pausa projetos gratuitos sem nenhum acesso por cerca de 7 dias.** Com visitas regulares ao site isso não acontece. Se acontecer, entre no painel do Supabase e clique em **Restore project** — nada é perdido.
  - Opcional: se o projeto estiver no GitHub, o arquivo `.github/workflows/keepalive.yml` faz uma leitura toda segunda-feira. Cadastre `SUPABASE_URL` e `SUPABASE_ANON_KEY` em **Settings → Secrets and variables → Actions** e rode uma vez em **Actions → Manter Supabase ativo → Run workflow** para testar.
- As fotos são reduzidas no próprio navegador (máx. 1200 px, formato WebP) antes do envio: cada foto ocupa em média 50–200 KB, então 1 GB comporta milhares de fotos.
- Perdeu a senha? Use **Esqueci minha senha** no login. Se perdeu o acesso ao e-mail, crie outro usuário no Supabase e adicione-o em `admins` (passos 1.4 e 1.5).

---

## Para desenvolvedores

```
index.html                 loja
admin/index.html           área administrativa (admin.html só redireciona para admin/)
css/styles.css             identidade visual e catálogo (mobile first)
css/admin.css              layout do painel (desktop first)
js/config.js               URL e chave do Supabase
js/catalog.js, js/cart.js  catálogo, carrinho e checkout
js/admin.js                painel administrativo
js/ui.js                   ícones, mensagens e diálogos
js/lib/*.js                regras puras (preço, promoção, validação, mensagem do WhatsApp, imagens)
supabase/schema.sql        tabelas, RLS, Storage e dados de exemplo
tests/*.test.js            testes das regras puras
```

- Rodar localmente: sirva a pasta com qualquer servidor estático, por exemplo `npx serve .` ou `python -m http.server`, e abra `http://localhost:3000` / `:8000`. (Abrir o `index.html` direto do disco não funciona por causa dos módulos JavaScript.)
- Testes (Node 18+): `npm test`.
- Paleta: azul `#0891B2` e verde `#16A34A` são as cores do logo; botões e textos usam os tons mais escuros `#0E7490` e `#15803D` para garantir contraste AA.
