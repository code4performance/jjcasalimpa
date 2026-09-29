## Purpose

Define a identidade visual da JJ Casa Limpa (logo, cores, tipografia) e garante que todas as páginas do site a apliquem de forma consistente e legível em celulares e computadores.

## ADDED Requirements

### Requirement: Logo da marca
O site SHALL exibir um logo vetorial da JJ Casa Limpa, composto por um símbolo (casa com elemento de limpeza, como gota ou brilho) e o nome "JJ Casa Limpa", no cabeçalho de todas as páginas.

#### Scenario: Logo no cabeçalho
- **WHEN** qualquer página do site (cliente ou admin) é aberta
- **THEN** o logo da JJ Casa Limpa aparece no cabeçalho e permanece nítido em qualquer tamanho de tela

#### Scenario: Logo leva ao catálogo
- **WHEN** o cliente clica no logo na página do catálogo
- **THEN** a página volta ao topo do catálogo com os filtros limpos

### Requirement: Favicon e metadados
O site SHALL ter favicon derivado do símbolo do logo e título de página contendo "JJ Casa Limpa", além de metadados de compartilhamento (título, descrição e imagem) para pré-visualização de links.

#### Scenario: Aba do navegador
- **WHEN** o site é aberto em um navegador
- **THEN** a aba mostra o favicon da marca e um título contendo "JJ Casa Limpa"

#### Scenario: Link compartilhado
- **WHEN** o endereço do site é colado em uma conversa do WhatsApp
- **THEN** a pré-visualização exibe o nome da loja, uma descrição curta e a imagem da marca

### Requirement: Paleta e tipografia consistentes
O site SHALL usar uma paleta única definida centralmente (azul-água como cor primária, verde-limpeza como cor de destaque, tons de branco/cinza claro de fundo e azul-marinho para texto) e uma única família tipográfica arredondada, com contraste de texto que atenda WCAG AA.

#### Scenario: Consistência entre páginas
- **WHEN** o catálogo e a área administrativa são comparados
- **THEN** ambos usam as mesmas cores, fonte e estilo de botões

#### Scenario: Contraste legível
- **WHEN** qualquer texto é exibido sobre seu fundo
- **THEN** a razão de contraste é de no mínimo 4,5:1 para texto normal

### Requirement: Layout mobile first no catálogo e desktop first no admin
O catálogo (área do cliente) SHALL ser projetado primeiro para celular. A área administrativa SHALL ser projetada primeiro para computador (uso principal da equipe da loja), adaptando-se para telas menores. Todas as páginas MUST funcionar sem rolagem horizontal em telas a partir de 360px de largura. Em telas maiores, o layout SHALL aproveitar o espaço disponível (mais colunas, painéis laterais) e MUST suportar uso com mouse e teclado. Elementos tocáveis MUST ter no mínimo 44×44px, e campos de formulário MUST abrir o teclado adequado no celular (numérico para preços e quantidades, telefone para WhatsApp) sem causar zoom automático da página.

#### Scenario: Celular
- **WHEN** o catálogo é aberto em um celular de 360px a 599px de largura
- **THEN** os produtos aparecem em 2 colunas, todos os botões são tocáveis com o polegar e não há rolagem horizontal

#### Scenario: Barra do carrinho no celular
- **WHEN** o cliente tem itens no carrinho e navega pelo catálogo em um celular
- **THEN** uma barra fixa no rodapé da tela mostra a quantidade de itens, o total e o botão "Ver carrinho", sem cobrir o botão flutuante do WhatsApp nem o conteúdo final da página

#### Scenario: Carrinho e detalhes no celular
- **WHEN** o cliente abre o carrinho ou os detalhes de um produto em um celular
- **THEN** o conteúdo ocupa a tela inteira, com botão de fechar visível no topo

#### Scenario: Tablet
- **WHEN** o catálogo é aberto em uma tela de 600px a 1023px de largura
- **THEN** os produtos aparecem em 3 colunas

#### Scenario: Desktop
- **WHEN** o catálogo é aberto em uma tela de 1024px ou mais
- **THEN** os produtos aparecem em 4 colunas, o conteúdo fica centralizado com largura máxima de cerca de 1200px, o carrinho abre como painel lateral sem esconder o catálogo e os detalhes do produto abrem em janela centralizada

#### Scenario: Mouse e teclado no desktop
- **WHEN** o cliente usa mouse e teclado no desktop
- **THEN** cards e botões reagem ao passar o mouse, todos os controles são alcançáveis com Tab com foco visível e janelas/painéis fecham com a tecla Esc

#### Scenario: Teclado adequado no celular
- **WHEN** o cliente ou o administrador toca em um campo de preço, quantidade ou WhatsApp no celular
- **THEN** abre o teclado numérico ou de telefone correspondente e a página não dá zoom

#### Scenario: Área administrativa no celular
- **WHEN** o administrador abre o painel em uma tela com menos de 768px de largura
- **THEN** a lista de produtos aparece como cartões empilhados e o formulário de produto em uma única coluna, permitindo cadastrar um produto com fotos da câmera sem rolagem horizontal

#### Scenario: Área administrativa no desktop
- **WHEN** o administrador abre o painel em uma tela de 1024px ou mais
- **THEN** a lista de produtos aparece como tabela com colunas (foto, título, categoria, preço, promoção, ativo), o formulário de produto abre em janela centralizada com duas colunas e o conteúdo aproveita a largura da tela

#### Scenario: Área administrativa em tablet
- **WHEN** o administrador abre o painel em uma tela de 768px a 1023px
- **THEN** a lista continua em tabela (sem a coluna de categoria) e o formulário de produto ocupa a tela inteira em uma coluna
