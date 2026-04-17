---
title: "Guia de Treinamento — Administrador"
role: "Administrador"
project: "Obra Manager"
language: "pt-BR"
---

# Obra Manager — Guia de Treinamento
## Perfil: Administrador

> O Administrador tem acesso completo ao Obra Manager. Ele configura empreendimentos, gerencia equipes, controla estoque e financeiro, acompanha medições e supervisiona toda a operação da obra.

---

## Módulo: Dashboard

Acesso direto: obramanager.dynamus.cc/admin

### Interpretar o painel de indicadores

**Objetivo:** Entender os KPIs exibidos no Dashboard para acompanhar o progresso geral das obras.

**Pré-requisitos:**
- Pelo menos um empreendimento cadastrado com unidades

**Passo a passo:**

1. **Acesse o Dashboard clicando em "Dashboard" no menu laterál**
   O painel de indicadores será exibido com cards de KPI e graficos.

2. **Analise os cards de KPI no topo:**
   - Total de Unidades — quantidade total de unidades em todos os empreendimentos
   - % Concluido — percentual medio de conclusao das obras
   - Em Andamento — unidades com status "em_andamento"
   - Entregues — unidades com status "entregue"

3. **Consulte o grafico de progresso (DashboardChart)**
   O grafico mostra a evolucao do avanco fisico ao longo do tempo.
   > Dica: Use o Dashboard como primeira tela do dia para ter uma visão rapida do status geral.

**Resultado esperado:**
Você tem uma visão consolidada de todos os empreendimentos com metricas atualizadas em tempo real.

---

## Módulo: Empreendimentos

Acesso direto: obramanager.dynamus.cc/admin/empreendimentos

### Criar um novo empreendimento

**Objetivo:** Cadastrar um novo empreendimento para iniciar o acompanhamento da obra.

**Pré-requisitos:**
- Dados do empreendimento (nome, endereço, cidade, estado)

**Passo a passo:**

1. **Acesse "Empreendimentos" no menu laterál**
   A listagem em cards será exibida com indicadores de progresso.

2. **Clique em "Novo Empreendimento"**
   Um diálogo com formulário será aberto.

3. **Faça upload da imagem de capa (opcional)**
   Formatos aceitos: JPG, PNG. A imagem aparece no card na listagem.

4. **Preencha os campos do formulário:**
   - Nome (obrigatório, max 100 caracteres)
   - Cidade (ex: Joao Pessoa)
   - Estado (max 2 caracteres, ex: PB)
   - Endereço (max 200 caracteres — Rua, número, bairro)
   - Status: Planejamento, Em Andamento, Concluido ou Pausado

5. **Clique em "Salvar"**

**Resultado esperado:**
O empreendimento aparece na listagem em card com o status selecionado.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Erro ao salvar | Campo Nome é obrigatório — preencha antes de salvar |
| Imagem não carrega | Verifique formato (JPG/PNG) e tamanho do arquivo |

---

### Editar um empreendimento

**Objetivo:** Atualizar dados ou status de um empreendimento existente.

**Pré-requisitos:**
- Empreendimento já cadastrado

**Passo a passo:**

1. **Acesse "Empreendimentos" no menu laterál e clique no card desejado**
   A página de detalhes será exibida.

2. **Clique em "Editar"**
   O diálogo abrira com os dados atuais preenchidos.

3. **Altere os campos desejados e clique em "Salvar"**

**Resultado esperado:**
Alterácoes refletidas imediatamente na página de detalhes e na listagem.

---

### Gerenciar torres e unidades

**Objetivo:** Cadastrar torres e unidades dentro de um empreendimento para acompanhamento individual.

**Pré-requisitos:**
- Empreendimento cadastrado

**Passo a passo:**

1. **Acesse a página de detalhes do empreendimento**
   Menu laterál -> Empreendimentos -> clique no card.

2. **Na seção de Torres, clique em "Nova Torre"**
   Informe o nome da torre (ex: Bloco A, Torre 1).

3. **Dentro da torre, clique em "Criar Unidades"**
   Você pode criar unidades individualmente ou em lote (bulk).
   > Dica: Na criação em lote, informe o intervalo (ex: 101 a 116) para criar todas as unidades de uma vez.

4. **Cada unidade recebera automáticamente um checklist baseado nas areas de servico do empreendimento**

**Resultado esperado:**
Torres e unidades aparecem organizadas na página do empreendimento. Cada unidade tem seu checklist proprio.

---

### Atribuir areas de servico a um empreendimento

**Objetivo:** Definir quais areas de servico se aplicam a este empreendimento.

**Pré-requisitos:**
- Empreendimento e areas de servico cadastrados

**Passo a passo:**

1. **Acesse a página de detalhes do empreendimento**

2. **Acesse a aba ou seção "Areas"**
   A lista de areas disponiveis será exibida.

3. **Selecione as areas que se aplicam (ex: Alvenaria, Eletrica, Pintura)**

4. **Salve as atribuições**

**Resultado esperado:**
As areas ficam vinculadas ao empreendimento e os checklists das unidades sao gerados com base nelas.

---

## Módulo: Areas de Servico

Acesso direto: obramanager.dynamus.cc/admin/areas

### Criar uma area de servico

**Objetivo:** Cadastrar uma nova area de servico no catalogo global para uso em empreendimentos.

**Pré-requisitos:**
- Acesso de administrador

**Passo a passo:**

1. **Acesse "Areas de Servico" no menu laterál**
   A listagem de areas em cards será exibida.

2. **Clique em "Nova Area"**
   O diálogo de cadastro será aberto.

3. **Preencha os campos:**
   - Nome (obrigatório, max 100 caracteres — ex: Alvenaria Estrutural)
   - Icone (obrigatório — selecione um icone representativo)
   - Cor (obrigatório — selecione no formato hexadecimal #RRGGBB)
   - Descrição (opcional, max 300 caracteres)

4. **Clique em "Salvar"**

**Resultado esperado:**
A area aparece na listagem com o icone e cor selecionados, pronta para ser atribuida a empreendimentos.

---

### Configurar template de checklist

**Objetivo:** Definir os itens de verificação padrão para uma area de servico.

**Pré-requisitos:**
- Area de servico cadastrada

**Passo a passo:**

1. **Acesse "Areas de Servico" no menu laterál e clique na area desejada**
   A página de detalhes da area será exibida.

2. **Na seção "Template de Checklist", clique em "Novo Item"**
   O formulário de item será aberto.

3. **Preencha:**
   - Titulo do item (obrigatório, max 200 caracteres — ex: "Prumo das paredes verificado")
   - Obrigatorio? (sim/nao)

4. **Repita para cada item de verificação**
   > Dica: Estes itens seráo replicados automáticamente para todas as unidades quando a area for atribuida a um empreendimento.

**Resultado esperado:**
O template fica definido. Ao atribuir esta area a um empreendimento, os checklists das unidades já virão com esses itens.

---

## Módulo: Usuarios

Acesso direto: obramanager.dynamus.cc/admin/usuarios

### Convidar um novo usuario

**Objetivo:** Adicionar um membro da equipe ao sistema.

**Pré-requisitos:**
- Email do novo usuario

**Passo a passo:**

1. **Acesse "Usuarios" no menu laterál**
   A tabela exibe: Nome, Email, Perfil (badge Admin ou Membro).

2. **Clique em "Convidar Usuario"**

3. **Preencha email, nome completo e selecione o perfil:**
   - Admin — acesso total ao painel /admin
   - Membro — acesso operacional ao painel /app
   > Dica: O perfil pode ser alterádo depois em "Editar permissoes".

4. **Selecione empreendimentos e areas de atuacao**

5. **Clique em "Enviar Convite"**
   Email de convite enviado automáticamente.

**Resultado esperado:**
Usuario aparece na tabela com status pendente até aceitar o convite.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Email já cadastrado | Edite as permissoes do usuario existente |
| Convite não recebido | Verifique caixa de spam ou reenvie |

---

### Editar permissoes de um usuario

**Objetivo:** Alterár perfil, empreendimentos ou areas de um usuario.

**Passo a passo:**

1. **Na tabela de usuarios, clique no menu de acoes (tres pontos)**

2. **Selecione "Editar permissoes"**

3. **Altere perfil (Admin/Membro), empreendimentos ou areas e clique "Salvar"**

**Resultado esperado:**
Badge de perfil atualizado imediatamente na tabela.

---

### Remover ou resetar senha de usuario

**Objetivo:** Remover acesso ou resetar a senha de um usuario.

**Passo a passo:**

1. **Na tabela de usuarios, clique no menu de acoes (tres pontos)**

2. **Selecione a opcao desejada:**
   - "Resetar senha" — envia email de redefinição
   - "Remover usuario" — remove acesso (acao destrutiva, em vermelho)
   > Dica: Remover um usuario é irreversível. Se o usuario for temporariamente afastado, considere alterár suas permissoes em vez de remover.

**Resultado esperado:**
Senha resetada (usuario recebe email) ou usuario removido da tabela.

---

## Módulo: Kanban Compras

Acesso direto: obramanager.dynamus.cc/admin/kanban-compras

### Gerenciar solicitações de compra

**Objetivo:** Acompanhar e movimentar solicitações de compra pelo fluxo de aprovacao.

**Pré-requisitos:**
- Solicitacoes de compra criadas por membros da equipe

**Passo a passo:**

1. **Acesse "Kanban Compras" no menu laterál**
   O quadro Kanban será exibido com as colunas de status.

2. **As colunas representam os status do fluxo:**
   - Pendente — solicitação recebida, aguardando acao
   - Em Cotacao — buscando precos com fornecedores
   - Aprovada — cotação aprovada, aguardando compra
   - Comprada — pedido realizado
   - Entregue — material recebido na obra
   - Rejeitada — solicitação recusada

3. **Arraste os cards entre colunas para atualizar o status**
   Ou clique no card para abrir os detalhes e alterár manualmente.
   > Dica: Membros da equipe enviam solicitações pelo painel /app. Elas aparecem automáticamente na coluna "Pendente".

**Resultado esperado:**
Cada solicitação avanca pelo fluxo visual até ser entregue ou rejeitada.

---

## Módulo: Kanban Tarefas

Acesso direto: obramanager.dynamus.cc/admin/kanban-tarefas

### Gerenciar tarefas da obra

**Objetivo:** Organizar e acompanhar tarefas da equipe em formato Kanban.

**Pré-requisitos:**
- Empreendimento com equipe atribuida

**Passo a passo:**

1. **Acesse "Kanban Tarefas" no menu laterál**
   O quadro de tarefas será exibido.

2. **Crie novas tarefas clicando em "Nova Tarefa"**
   Preencha titulo, descrição, responsável e prazo.

3. **Arraste tarefas entre colunas para atualizar o status**

4. **Clique em uma tarefa para ver detalhes ou editar**

**Resultado esperado:**
Visao completa das tarefas da obra com progresso visual por status.

---

## Módulo: Orçamentos

Acesso direto: obramanager.dynamus.cc/admin/orçamentos

### Criar um orçamento para um empreendimento

**Objetivo:** Elaborar o orçamento detalhado de uma obra com etapas e itens.

**Pré-requisitos:**
- Empreendimento cadastrado

**Passo a passo:**

1. **Acesse "Orçamentos" no menu laterál**
   A lista de orçamentos por empreendimento será exibida.

2. **Selecione o empreendimento ou clique em "Novo Orçamento"**
   Você será redirecionado para /admin/orçamentos/[empreendimentoId].

3. **Preencha os dados basicos do orçamento**
   O sistema cria automáticamente uma versao (v1).
   > Dica: Cada edição gera uma nova revisão. O histórico de revisões fica em /admin/orçamentos/[id]/revisões.

4. **Adicione etapas ao orçamento**
   Clique em "Adicionar Etapa" — ex: Fundacao, Estrutura, Acabamento.

5. **Para cada etapa, adicione itens com valores**
   Cada item tem descrição, quantidade, unidade e valor unitario.

6. **Configure BDI e contingencia se aplicavel**
   Os percentuais sao aplicados sobre o total do orçamento.

7. **Clique em "Salvar"**

**Resultado esperado:**
Orçamento salvo com total calculado automáticamente (soma dos itens + BDI + contingencia). Disponível para consulta e revisões futuras.

---

## Módulo: Fornecedores

Acesso direto: obramanager.dynamus.cc/admin/fornecedores

### Cadastrar um fornecedor

**Objetivo:** Adicionar fornecedor ao cadastro para cotações e ordens de compra.

**Pré-requisitos:**
- Dados do fornecedor

**Passo a passo:**

1. **Acesse "Fornecedores" no menu laterál**

2. **Clique em "Novo Fornecedor"**

3. **Preencha os campos:**
   - Nome (obrigatório, min 2, max 100 caracteres)
   - CNPJ (opcional, max 20 caracteres)
   - Nome do contato (opcional, max 100)
   - Telefone do contato (opcional, max 30)
   - Email do contato (opcional — formato email válido)
   - Observacoes (opcional, max 500 caracteres)
   - Ativo (marcado por padrão)

4. **Clique em "Salvar"**

**Resultado esperado:**
Fornecedor aparece na listagem em card com dados de contato visiveis.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Erro de validacao no email | Formato deve ser válido (nome@empresa.com) |
| Não consegue excluir | Fornecedor tem ordens de compra vinculadas — desative em vez de excluir |

---

## Módulo: Estoque

Acesso direto: obramanager.dynamus.cc/admin/estoque

### Cadastrar item de estoque

**Objetivo:** Adicionar material ao catalogo de itens.

**Passo a passo:**

1. **Acesse "Estoque" no menu laterál -> aba "Itens"**

2. **Clique em "Novo item"**

3. **Preencha:**
   - Código (obrigatório, max 30 — ex: CIM001)
   - Descrição (obrigatório, max 200 — ex: Cimento Portland CP-II)
   - Unidade (opcional — un, kg, m, m2, m3)
   - Estoque mínimo (opcional, min 0, incremento 0.01)
   > Dica: Use códigos padronizados para facilitar buscas (CIM001, ARE001, TIJ001).

4. **Clique em "Salvar"**

**Resultado esperado:**
Item aparece na lista com código, descrição e unidade.

---

### Cadastrar almoxarifado

**Objetivo:** Criar local de armazenamento para controle de estoque.

**Passo a passo:**

1. **Acesse "Estoque" -> aba "Almoxarifados"**

2. **Clique em "Novo Almoxarifado"**

3. **Preencha nome e localização (ex: Almoxarifado Central - Bloco A)**

4. **Clique em "Salvar"**

**Resultado esperado:**
Almoxarifado disponível para movimentacoes de estoque.

---

### Registrar movimentacao de estoque

**Objetivo:** Registrar entrada, saida, transferencia ou ajuste de materiais.

**Passo a passo:**

1. **Acesse "Estoque" -> aba "Movimentos"**

2. **Clique em "Nova Movimentacao"**

3. **Selecione o tipo:**
   - Entrada — material recebido
   - Saida — material consumido na obra
   - Transferencia — entre almoxarifados (informar origem e destino)
   - Ajuste — correcao de inventario

4. **Selecione almoxarifado, item e quantidade**

5. **Clique em "Salvar"**

**Resultado esperado:**
Movimento registrado no histórico. Saldos atualizados automáticamente na aba "Saldos".

---

## Módulo: Medicoes

Acesso direto: obramanager.dynamus.cc/admin/medições

### Criar nova medição

**Objetivo:** Registrar avanco fisico da obra em um período, detalhado por etapa.

**Pré-requisitos:**
- Empreendimento com areas de servico atribuidas

**Passo a passo:**

1. **Acesse "Medicoes" no menu laterál**

2. **Clique em "Nova Medição"**
   Redirecionamento para /admin/medições/nova.

3. **Selecione empreendimento e período de referencia**

4. **Preencha o percentual fisico de cada etapa (0% a 100%)**
   > Dica: O sistema calcula automáticamente a media ponderada do avanco geral.

5. **Clique em "Salvar"**
   Uma atualização e publicada automáticamente no portal do cliente: "Medição de [mes] -- [X]% de avanco".

**Resultado esperado:**
Medição na listagem com percentual medio. Atualização automática no portal do cliente.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Percentual mostra 0% | Preencha todas as etapas antes de salvar |
| Atualização não aparece no portal | Publicacao e automática — aguarde e atualize a página |

---

## Módulo: Compradores e Portal do Cliente

Acesso direto: obramanager.dynamus.cc/admin/compradores

### Gerar acesso para um comprador

**Objetivo:** Criar um link de acesso para o comprador de uma unidade acompanhar a obra.

**Pré-requisitos:**
- Unidade cadastrada dentro de um empreendimento

**Passo a passo:**

1. **Acesse "Compradores" no menu laterál**
   A lista de acessos gerados será exibida.

2. **Clique em "Gerar Acesso"**
   O formulário de geracao será aberto.

3. **Selecione o empreendimento e a unidade**
   Preencha os dados do comprador.

4. **Clique em "Gerar"**
   Um token de acesso será criado.
   > Dica: O comprador acessa o portal pelo link gerado. Ele pode ver atualizações da obra, fotos e status da sua unidade.

5. **Para compartilhar via QR Code, clique em "QR Code"**
   O QR code pode ser impresso e entregue ao comprador.

**Resultado esperado:**
Acesso criado com token único. Comprador pode acessar o portal com o link ou QR code.

---

### Revogar acesso de um comprador

**Objetivo:** Desativar o acesso de um comprador ao portal.

**Passo a passo:**

1. **Na lista de compradores, localize o acesso desejado**

2. **Clique em "Revogar"**
   O token será invalidado.

**Resultado esperado:**
Comprador perde acesso ao portal imediatamente.

---

## Módulo: Atualizações

Acesso direto: obramanager.dynamus.cc/admin/atualizações

### Publicar atualização da obra

**Objetivo:** Informar compradores sobre o andamento da obra via portal do cliente.

**Passo a passo:**

1. **Acesse "Atualizações" no menu laterál**
   O histórico de atualizações será exibido com timestamps.

2. **Clique em "Nova Atualização"**

3. **Selecione o empreendimento e preencha o conteudo**
   Descreva o avanco da obra, marcos alcancados ou informações relevantes.
   > Dica: Medicoes geram atualizações automáticas. Use este modulo para informações complementares (fotos, avisos, marcos).

4. **Clique em "Publicar"**

**Resultado esperado:**
Atualização visivel no portal do cliente para todos os compradores do empreendimento.

---

## Módulo: Chamados

Acesso direto: obramanager.dynamus.cc/admin/chamados

### Responder a um chamado de suporte

**Objetivo:** Atender solicitações ou reclamações enviadas por compradores.

**Pré-requisitos:**
- Chamados criados por compradores via portal

**Passo a passo:**

1. **Acesse "Chamados" no menu laterál**
   A lista de chamados será exibida com filtros por status.

2. **Clique no chamado que deseja atender**
   A página de detalhes será exibida em /admin/chamados/[id], mostrando o histórico da conversa.

3. **Leia o relato do comprador e responda no campo de resposta**
   Digite sua resposta e clique em "Enviar".

4. **Atualize o status do chamado conforme necessario**
   Marque como resolvido quando o problema for solucionado.

**Resultado esperado:**
Resposta visivel para o comprador no portal. Status do chamado atualizado na listagem.

---

## Módulo: FVS — Verificação de Servico

Acesso direto: obramanager.dynamus.cc/admin/fvs

### Criar uma FVS

**Objetivo:** Iniciar uma verificação formal de servico para garantir qualidade da obra.

**Pré-requisitos:**
- Empreendimento com areas de servico e templates de checklist configurados

**Passo a passo:**

1. **Acesse "FVS" no menu laterál**
   A lista de verificações será exibida com indicadores de status.

2. **Clique em "Nova FVS"**

3. **Selecione o empreendimento, a unidade e a area de servico**
   O sistema gera automáticamente os itens de checklist baseados no template da area.

4. **Clique em "Criar"**

**Resultado esperado:**
FVS criada com todos os itens do template. Aparece na listagem com status pendente.

---

### Executar verificação de uma FVS

**Objetivo:** Verificar cada item do checklist de uma FVS em campo.

**Passo a passo:**

1. **Na lista de FVS, clique na verificação desejada**
   A página de detalhes em /admin/fvs/[id] exibirá o checklist completo.

2. **Para cada item, marque o status de verificação:**
   Aprovado ou Reprovado.
   > Dica: Itens reprovados devem ser corrigidos e reverificados antes de concluir a FVS.

3. **Quando todos os itens estiverem verificados, clique em "Concluir FVS"**

**Resultado esperado:**
FVS marcada como concluida. Itens reprovados ficam registrados para acompanhamento.

---

## Módulo: Funcionarios

Acesso direto: obramanager.dynamus.cc/admin/funcionarios

### Cadastrar um funcionario

**Objetivo:** Adicionar funcionario da obra para controle de treinamentos e certificados.

**Passo a passo:**

1. **Acesse "Funcionarios" no menu laterál**

2. **Clique em "Novo Funcionario"**

3. **Preencha:**
   - Nome completo (obrigatório, min 2, max 100)
   - CPF (opcional, max 20)
   - Função (opcional — ex: Pedreiro, Eletricista, Encarregado)
   - Foto URL (opcional)
   - Ativo (marcado por padrão)

4. **Clique em "Salvar"**

**Resultado esperado:**
Funcionario na listagem com nome, função e status.

---

## Módulo: Treinamentos e NRs

Acesso direto: obramanager.dynamus.cc/admin/treinamentos

### Criar tipo de treinamento

**Objetivo:** Cadastrar uma NR ou treinamento obrigatório no catalogo.

**Passo a passo:**

1. **Acesse "Treinamentos" no menu laterál**

2. **Acesse a aba "Tipos" ou "Gerenciar Tipos"**

3. **Clique em "Novo Tipo"**

4. **Preencha:**
   - Código (obrigatório, max 20 — ex: NR-35)
   - Nome (obrigatório, min 2, max 100 — ex: Trabalho em Altura)
   - Descrição (opcional, max 300)
   - Validade em meses (obrigatório, max 120)
   - Ativo (marcado por padrão)
   > Dica: A validade define quando o sistema alertara sobre vencimento.

5. **Clique em "Salvar"**

**Resultado esperado:**
Tipo disponível para atribuição a funcionarios.

---

### Registrar treinamento de funcionario

**Objetivo:** Vincular certificado de treinamento a um funcionario.

**Pré-requisitos:**
- Funcionario e tipo de treinamento cadastrados

**Passo a passo:**

1. **Acesse "Treinamentos" no menu laterál**

2. **Clique em "Novo Treinamento"**

3. **Selecione o funcionario é o tipo de treinamento**

4. **Preencha a data de realizacao (obrigatório)**
   Data de vencimento calculada automáticamente pela validade do tipo.
   > Dica: Informe manualmente se a validade for diferente do padrão.

5. **Campos opcionais:**
   - Instrutor (max 100)
   - Carga horaria (em horas)
   - URL do certificado (link para documento digitalizado)
   - Observacoes (max 500)

6. **Clique em "Salvar"**

**Resultado esperado:**
Treinamento vinculado ao funcionario com data de vencimento visivel. Sistema alerta próximo ao vencimento.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Data de vencimento errada | Verifique validade do tipo ou informe manualmente |
| Funcionario não aparece | Confirme que esta com status Ativo |
