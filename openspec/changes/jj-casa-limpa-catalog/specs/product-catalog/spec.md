## Purpose

Vitrine pública da JJ Casa Limpa: permite que qualquer visitante, sem login, veja os produtos de limpeza ativos com fotos, descrição, preço e promoções vigentes, e encontre produtos por busca ou categoria.

## ADDED Requirements

### Requirement: Listagem de produtos ativos
O catálogo SHALL exibir, sem exigir login, todos os produtos marcados como ativos, cada um com foto principal, título, descrição resumida, categoria e preço em reais (formato "R$ 12,90"). Produtos inativos MUST NOT aparecer para o cliente.

#### Scenario: Visitante abre o site
- **WHEN** um visitante abre a página inicial
- **THEN** vê a grade de produtos ativos com foto, título, preço e botão "Adicionar"

#### Scenario: Produto inativo
- **WHEN** o administrador desativa um produto
- **THEN** o produto deixa de aparecer no catálogo na próxima vez que a página for carregada

#### Scenario: Produto sem foto
- **WHEN** um produto ativo não possui foto cadastrada
- **THEN** o catálogo exibe uma imagem padrão com o símbolo da marca no lugar da foto

#### Scenario: Catálogo vazio ou indisponível
- **WHEN** não há produtos ativos ou os dados não puderam ser carregados
- **THEN** o catálogo exibe uma mensagem amigável ("Nenhum produto disponível" ou "Não foi possível carregar os produtos, tente novamente") com botão para tentar de novo

### Requirement: Detalhes do produto
O catálogo SHALL permitir ver os detalhes completos de um produto: todas as fotos, descrição completa, preço e promoção, com opção de escolher a quantidade e adicionar ao carrinho.

#### Scenario: Abrir detalhes
- **WHEN** o cliente toca no card de um produto
- **THEN** abre uma visualização com a galeria de fotos, a descrição completa, o preço e o seletor de quantidade

### Requirement: Exibição de promoções
Um produto SHALL ser considerado em promoção quando tiver preço promocional menor que o preço normal e a data atual estiver dentro do período da promoção (início e fim opcionais). Produtos em promoção MUST exibir o preço original riscado, o preço promocional em destaque e um selo com o percentual de desconto arredondado.

#### Scenario: Promoção vigente
- **WHEN** um produto tem preço R$ 20,00, preço promocional R$ 15,00 e nenhuma data de término
- **THEN** o card mostra "de R$ 20,00" riscado, "por R$ 15,00" e o selo "-25%"

#### Scenario: Promoção expirada
- **WHEN** a data de término da promoção já passou
- **THEN** o produto é exibido apenas com o preço normal e sem selo

#### Scenario: Promoção agendada
- **WHEN** a data de início da promoção ainda não chegou
- **THEN** o produto é exibido apenas com o preço normal

#### Scenario: Seção de promoções
- **WHEN** existe ao menos um produto com promoção vigente
- **THEN** o catálogo exibe uma seção "Promoções" em destaque antes da lista geral; se não houver nenhuma, a seção não aparece

### Requirement: Busca e filtro por categoria
O catálogo SHALL oferecer busca por texto (título e descrição, sem diferenciar maiúsculas e acentos) e filtro por categoria, com as categorias derivadas dos produtos ativos.

#### Scenario: Busca por texto
- **WHEN** o cliente digita "agua sanitaria"
- **THEN** o catálogo mostra apenas os produtos cujo título ou descrição contém "Água Sanitária"

#### Scenario: Filtro por categoria
- **WHEN** o cliente seleciona a categoria "Cozinha"
- **THEN** apenas produtos ativos dessa categoria são exibidos, e a opção "Todos" restaura a lista completa

#### Scenario: Sem resultados
- **WHEN** a busca ou o filtro não encontra produtos
- **THEN** o catálogo exibe "Nenhum produto encontrado" e um botão para limpar os filtros
