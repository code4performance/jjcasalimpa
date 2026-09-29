## Why

A JJ Casa Limpa vende produtos de limpeza e hoje não tem uma vitrine online. Um site simples com catálogo, carrinho e envio do pedido direto para o WhatsApp permite que clientes vejam produtos, preços e promoções e façam pedidos sem intermediários, enquanto a empresa mantém o catálogo atualizado sozinha, sem custo de hospedagem.

## What Changes

- Criação da identidade visual da marca: logo em SVG, favicon, paleta de cores e tipografia aplicadas a todo o site.
- Catálogo **mobile first**: projetado primeiro para celular (a maioria dos clientes chega por links de WhatsApp), funcionando bem também em tablet e desktop.
- Área administrativa **desktop first**: pensada para o computador, onde a equipe cadastra os produtos, mas utilizável também no celular.
- Nova **área do cliente** (página pública): catálogo de produtos com foto, título, descrição e preço; destaque para produtos em promoção (preço "de/por" e selo de desconto); busca e filtro por categoria.
- Novo **carrinho de pedidos**: o cliente adiciona produtos e quantidades, informa nome, forma de entrega/retirada, endereço, pagamento e observações, e o pedido é enviado como mensagem formatada para o WhatsApp da empresa.
- Nova **área administrativa** protegida por login: cadastrar, editar, ativar/desativar e excluir produtos (título, descrição, preço, categoria, fotos), definir promoções (preço promocional com período opcional) e configurar o número de WhatsApp e dados da loja.
- Site estático (HTML/CSS/JavaScript, sem etapa de build) pronto para hospedagem gratuita no **Netlify**, com dados, fotos e login no plano gratuito do **Supabase**. Alternativas de hospedagem documentadas: GitHub Pages e Cloudflare Pages.
- Guia de publicação (README) em português, passo a passo para leigos.

## Capabilities

### New Capabilities
- `brand-identity`: logo, favicon, paleta de cores, tipografia, aparência consistente e layout mobile first que se adapta a tablet e desktop.
- `product-catalog`: exibição pública dos produtos ativos, promoções, busca e filtro por categoria.
- `whatsapp-ordering`: carrinho, formulário de dados do cliente e envio do pedido formatado para o WhatsApp da loja.
- `admin-panel`: login do administrador, cadastro/edição de produtos com fotos, gestão de promoções e configurações da loja.

### Modified Capabilities
<!-- Nenhuma: projeto novo, sem specs existentes. -->

## Impact

- Projeto novo (repositório vazio): cria páginas `index.html` e `admin.html`, estilos, scripts, logo e script SQL do banco.
- Dependências externas: Supabase (banco Postgres, Storage para fotos, Auth para o admin) no plano gratuito; biblioteca `supabase-js` carregada via CDN; Google Fonts.
- Hospedagem: Netlify (plano gratuito). Sem servidor próprio e sem custos recorrentes.
- Pedidos não são armazenados no sistema: o registro fica na conversa do WhatsApp.
