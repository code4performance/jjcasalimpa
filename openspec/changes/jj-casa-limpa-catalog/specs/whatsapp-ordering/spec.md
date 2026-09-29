## Purpose

Permite que o cliente monte um pedido no site (carrinho) e o envie, como mensagem de texto formatada, para o WhatsApp da JJ Casa Limpa, onde a venda é confirmada e combinada.

## ADDED Requirements

### Requirement: Carrinho de pedido
O site SHALL manter um carrinho onde o cliente adiciona produtos, altera quantidades (mínimo 1) e remove itens, exibindo o preço unitário vigente (promocional quando aplicável), o subtotal de cada item e o total do pedido. O carrinho MUST ser preservado no mesmo navegador ao recarregar a página.

#### Scenario: Adicionar produto
- **WHEN** o cliente toca em "Adicionar" em um produto
- **THEN** o produto entra no carrinho com quantidade 1 (ou soma 1 se já estiver lá) e o contador do carrinho no cabeçalho é atualizado

#### Scenario: Alterar quantidade
- **WHEN** o cliente aumenta a quantidade de um item de 1 para 3
- **THEN** o subtotal do item e o total do pedido são recalculados imediatamente

#### Scenario: Remover item
- **WHEN** o cliente remove um item
- **THEN** o item sai do carrinho e o total é recalculado; com o carrinho vazio, aparece "Seu carrinho está vazio" e o envio fica indisponível

#### Scenario: Recarregar página
- **WHEN** o cliente recarrega a página com itens no carrinho
- **THEN** os itens e quantidades continuam no carrinho

#### Scenario: Produto indisponível no carrinho
- **WHEN** um item salvo no carrinho foi desativado ou excluído pelo administrador
- **THEN** o item é removido do carrinho ao carregar a página e o cliente vê um aviso de que ele não está mais disponível

#### Scenario: Preço atualizado
- **WHEN** o preço ou promoção de um item no carrinho mudou desde que foi adicionado
- **THEN** o carrinho usa o preço vigente atual no subtotal e no total

### Requirement: Dados do cliente para o pedido
Antes do envio, o site SHALL solicitar nome (obrigatório), forma de recebimento ("Entrega" ou "Retirada", obrigatória), endereço (obrigatório somente para entrega), forma de pagamento (Pix, Dinheiro ou Cartão, obrigatória) e observações (opcional). Os dados preenchidos MUST ser lembrados no mesmo navegador para o próximo pedido.

#### Scenario: Campos obrigatórios
- **WHEN** o cliente tenta enviar sem informar o nome
- **THEN** o envio é bloqueado e o campo é destacado com a mensagem "Informe seu nome"

#### Scenario: Entrega exige endereço
- **WHEN** o cliente escolhe "Entrega" e deixa o endereço vazio
- **THEN** o envio é bloqueado até o endereço ser preenchido

#### Scenario: Retirada dispensa endereço
- **WHEN** o cliente escolhe "Retirada"
- **THEN** o campo de endereço fica oculto e não é exigido

### Requirement: Envio do pedido para o WhatsApp
Ao confirmar, o site SHALL abrir o WhatsApp (aplicativo no celular ou WhatsApp Web no computador) em conversa com o número configurado pela loja, com uma mensagem pré-preenchida contendo: saudação identificando a JJ Casa Limpa, lista de itens (quantidade, título, preço unitário e subtotal, indicando itens em promoção), total do pedido, nome, forma de recebimento, endereço (se entrega), forma de pagamento e observações. O envio final da mensagem MUST ser feito pelo próprio cliente no WhatsApp.

#### Scenario: Envio bem-sucedido
- **WHEN** o cliente com 2 itens no carrinho e dados válidos toca em "Enviar pedido pelo WhatsApp"
- **THEN** o WhatsApp abre na conversa com o número da loja e a mensagem contém os 2 itens, o total e os dados do cliente, com valores no formato "R$ 0,00"

#### Scenario: Caracteres especiais
- **WHEN** as observações contêm acentos, quebras de linha ou símbolos como "&" e "#"
- **THEN** a mensagem aparece no WhatsApp exatamente como digitada

#### Scenario: Após o envio
- **WHEN** o WhatsApp é aberto com o pedido
- **THEN** o site pergunta se o cliente deseja esvaziar o carrinho, mantendo os itens caso ele responda que não

#### Scenario: Loja sem número configurado
- **WHEN** o número de WhatsApp da loja não está configurado
- **THEN** o botão de envio fica indisponível e é exibida a mensagem "Pedidos temporariamente indisponíveis"

### Requirement: Botão de contato direto
O site SHALL exibir um botão flutuante de WhatsApp que abre conversa com a loja sem pedido, para dúvidas.

#### Scenario: Dúvida rápida
- **WHEN** o cliente toca no botão flutuante do WhatsApp
- **THEN** o WhatsApp abre na conversa com a loja com a mensagem "Olá, JJ Casa Limpa! Tenho uma dúvida."
