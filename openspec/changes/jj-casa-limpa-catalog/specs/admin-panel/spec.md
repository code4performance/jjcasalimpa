## Purpose

Área restrita para a equipe da JJ Casa Limpa manter o catálogo pelo navegador: cadastrar e editar produtos com fotos, definir promoções e configurar os dados de contato da loja, sem mexer em código.

## ADDED Requirements

### Requirement: Acesso restrito por login
A área administrativa SHALL exigir login com e-mail e senha de uma conta de administrador previamente criada. O cadastro público de novas contas MUST NOT existir, e qualquer alteração de produtos, fotos ou configurações MUST ser recusada pelo servidor para quem não estiver autenticado como administrador, mesmo que a requisição não passe pela interface.

#### Scenario: Login válido
- **WHEN** o administrador informa e-mail e senha corretos
- **THEN** acessa o painel com a lista de produtos e permanece logado ao reabrir o navegador até clicar em "Sair"

#### Scenario: Login inválido
- **WHEN** e-mail ou senha estão incorretos
- **THEN** o acesso é negado com a mensagem "E-mail ou senha inválidos"

#### Scenario: Acesso sem login
- **WHEN** alguém abre a página administrativa sem estar logado
- **THEN** vê apenas o formulário de login

#### Scenario: Escrita não autorizada
- **WHEN** um visitante não autenticado tenta criar, alterar ou excluir um produto ou foto diretamente pela API de dados
- **THEN** a operação é recusada e nenhum dado é alterado

#### Scenario: Recuperar senha
- **WHEN** o administrador clica em "Esqueci minha senha" e informa seu e-mail
- **THEN** recebe por e-mail um link para definir uma nova senha

### Requirement: Cadastro e edição de produtos
O administrador SHALL poder criar e editar produtos com os campos: título (obrigatório, até 80 caracteres), descrição (opcional, até 1000 caracteres), categoria (texto com sugestões das categorias existentes), preço (obrigatório, maior que zero, em reais com centavos), ativo (sim/não, padrão sim) e ordem de exibição. O painel MUST listar todos os produtos, ativos e inativos, com busca por título.

#### Scenario: Criar produto
- **WHEN** o administrador preenche título "Detergente Neutro 500ml", preço "3,49", categoria "Cozinha" e salva
- **THEN** o produto é criado, aparece na lista do painel e no catálogo público como R$ 3,49

#### Scenario: Validação
- **WHEN** o administrador tenta salvar sem título ou com preço zero, negativo ou inválido
- **THEN** o salvamento é bloqueado e o campo com problema é indicado

#### Scenario: Editar produto
- **WHEN** o administrador altera o preço de um produto e salva
- **THEN** o novo preço aparece no catálogo público na próxima vez que a página for carregada

#### Scenario: Ativar e desativar
- **WHEN** o administrador desativa um produto na lista
- **THEN** o produto continua no painel marcado como inativo e some do catálogo público

#### Scenario: Excluir produto
- **WHEN** o administrador exclui um produto e confirma a exclusão
- **THEN** o produto e suas fotos são removidos definitivamente; sem confirmação, nada é excluído

### Requirement: Fotos do produto
O administrador SHALL poder enviar até 5 fotos por produto (JPEG, PNG ou WebP, a partir da câmera ou galeria do celular), escolher a foto principal, reordenar e remover fotos. Fotos MUST ser reduzidas no navegador antes do envio para no máximo 1200px no maior lado, e arquivos que não sejam imagem MUST ser recusados.

#### Scenario: Enviar foto
- **WHEN** o administrador seleciona uma foto de 4000px tirada no celular
- **THEN** a foto é reduzida, enviada, exibida como miniatura no formulário e usada no catálogo

#### Scenario: Foto principal
- **WHEN** o administrador marca a segunda foto como principal
- **THEN** essa foto passa a ser a imagem do card do produto no catálogo

#### Scenario: Limite de fotos
- **WHEN** o produto já tem 5 fotos
- **THEN** o envio de novas fotos fica indisponível até alguma ser removida

#### Scenario: Arquivo inválido
- **WHEN** o administrador seleciona um arquivo PDF
- **THEN** o arquivo é recusado com a mensagem "Envie apenas imagens (JPG, PNG ou WebP)"

#### Scenario: Falha no envio
- **WHEN** o envio de uma foto falha por problema de conexão
- **THEN** o painel exibe um erro e permite tentar novamente, sem perder os demais dados do formulário

### Requirement: Gestão de promoções
O administrador SHALL poder definir, para cada produto, um preço promocional e, opcionalmente, datas de início e término da promoção, e remover a promoção a qualquer momento. O preço promocional MUST ser maior que zero e menor que o preço normal, e a data de término MUST NOT ser anterior à de início. O painel MUST indicar quais produtos estão com promoção vigente, agendada ou expirada.

#### Scenario: Criar promoção
- **WHEN** o administrador define preço promocional R$ 9,90 para um produto de R$ 12,90 sem datas
- **THEN** a promoção passa a valer imediatamente no catálogo e o painel marca o produto como "Em promoção"

#### Scenario: Promoção com período
- **WHEN** o administrador define promoção de 01/10 a 07/10
- **THEN** o catálogo exibe o preço promocional somente entre essas datas (inclusive), e o painel mostra "Agendada", "Em promoção" ou "Expirada" conforme a data atual

#### Scenario: Preço promocional inválido
- **WHEN** o preço promocional é maior ou igual ao preço normal
- **THEN** o salvamento é bloqueado com a mensagem "O preço promocional deve ser menor que o preço normal"

#### Scenario: Encerrar promoção
- **WHEN** o administrador remove a promoção de um produto
- **THEN** o catálogo volta a exibir apenas o preço normal

### Requirement: Configurações da loja
O administrador SHALL poder configurar o número de WhatsApp que recebe os pedidos (com DDI e DDD, apenas dígitos, validado como número brasileiro de 12 ou 13 dígitos iniciando com 55), uma mensagem de boas-vindas exibida no topo do catálogo e informações de contato/horário exibidas no rodapé.

#### Scenario: Alterar número do WhatsApp
- **WHEN** o administrador salva o número "(11) 98765-4321"
- **THEN** o número é armazenado como "5511987654321" e os próximos pedidos do catálogo são enviados para ele

#### Scenario: Número inválido
- **WHEN** o administrador informa um número com menos dígitos que o necessário
- **THEN** o salvamento é bloqueado com a mensagem "Número de WhatsApp inválido"

#### Scenario: Texto do rodapé
- **WHEN** o administrador altera o horário de atendimento
- **THEN** o novo horário aparece no rodapé do catálogo
