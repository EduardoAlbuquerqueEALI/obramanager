---
title: "Guia de Treinamento — Membro"
role: "Membro"
project: "Obra Manager"
language: "pt-BR"
---

# Obra Manager — Guia de Treinamento
## Perfil: Membro

> O Membro é o perfil operacional do Obra Manager. Engenheiros, mestres de obra e encarregados usam este perfil para executar checklists de unidades, reportar problemas, solicitar compras de materiais e acompanhar o andamento da obra nos empreendimentos e areas aos quais tem acesso.

---

## Módulo: Visao Geral

Acesso direto: obramanager.dynamus.cc/app
Login: obramanager.dynamus.cc/login

### Entender o painel do Membro

**Objetivo:** Conhecer a interface do perfil Membro e como navegar no sistema.

**Pré-requisitos:**
- Convite aceito e login realizado

**Passo a passo:**

1. **Faça login com seu email e senha**
   Apos o login, você será redirecionado automáticamente para o painel /app.
   > Dica: Se você esqueceu a senha, clique em "Esqueci minha senha" na tela de login. Um email de redefinição será enviado.

2. **Explore o painel principal**
   Você vera os empreendimentos e areas aos quais tem acesso. Apenas os empreendimentos e areas atribuidos pelo administrador estarão visiveis.

3. **Selecione um empreendimento para comecar a trabalhar**
   Clique no empreendimento desejado para ver suas torres, unidades e checklists.

**Resultado esperado:**
Você ve apenas os empreendimentos e areas que o administrador atribuiu ao seu perfil. Se não aparecer nenhum, entre em contato com o administrador.

---

## Módulo: Checklists de Unidades

Acesso direto: obramanager.dynamus.cc/app (selecione o empreendimento e a unidade)

### Executar checklist de uma unidade

**Objetivo:** Verificar e marcar como concluidos os itens de servico de uma unidade.

**Pré-requisitos:**
- Empreendimento com unidades e areas de servico configuradas
- Acesso ao empreendimento e area atribuido pelo administrador

**Passo a passo:**

1. **Selecione o empreendimento no painel**
   As torres e unidades seráo exibidas.

2. **Clique na unidade que deseja verificar**
   O checklist da unidade será exibido, organizado por area de servico (ex: Alvenaria, Eletrica, Hidraulica).

3. **Para cada item do checklist, marque como concluido**
   Clique no item para marca-lo. O status da unidade será atualizado automáticamente.
   > Dica: Os itens do checklist vem dos templates configurados pelo administrador nas areas de servico. Se algum item estiver faltando, informe o administrador.

4. **Repita para todos os itens de cada area**
   O progresso geral da unidade será calculado automáticamente.

**Resultado esperado:**
Itens marcados como concluidos ficam verdes. O percentual de conclusao da unidade e atualizado no dashboard do administrador.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Checklist vazio | Os itens sao gerados automáticamente na primeira vez que você acessa a unidade. Se ainda assim estiver vazio, as areas podem não estar configuradas — avise o administrador |
| Não consigo ver a unidade | Verifique se você tem acesso ao empreendimento e a area correspondente |

---

## Módulo: Reportar Problemas

Acesso direto: obramanager.dynamus.cc/app (dentro da página da unidade)

### Reportar um problema em uma unidade

**Objetivo:** Registrar um problema encontrado durante a execucao do servico para que o administrador tome providências.

**Pré-requisitos:**
- Estar na página de uma unidade

**Passo a passo:**

1. **Na página da unidade, clique em "Reportar Problema"**
   O formulário de reporte será aberto.

2. **Descreva o problema encontrado**
   Seja especifico: informe a area de servico, a localização dentro da unidade é o tipo de problema.
   > Dica: Quanto mais detalhado o relato, mais rapido o administrador consegue resolver. Inclua observacoes sobre gravidade e urgencia.

3. **Clique em "Enviar"**

**Resultado esperado:**
O problema e registrado e visivel para o administrador. Ele aparecerá no painel com o status da unidade atualizado para "issue" (problema).

---

## Módulo: Solicitacoes de Compra

Acesso direto: obramanager.dynamus.cc/app

### Solicitar compra de material

**Objetivo:** Enviar uma solicitação de compra de material para aprovacao do administrador.

**Pré-requisitos:**
- Necessidade de material identificada durante a obra

**Passo a passo:**

1. **No painel do membro, acesse a opcao de "Solicitar Compra"**
   O formulário de solicitação será aberto.

2. **Preencha os dados da solicitação:**
   - Material necessario (descrição detalhada)
   - Quantidade
   - Urgencia ou prazo desejado
   - Observacoes adicionais

3. **Clique em "Enviar Solicitação"**
   A solicitação será enviada para o Kanban de Compras do administrador com status "Pendente".
   > Dica: Acompanhe o andamento da sua solicitação. O administrador movimentara ela pelo fluxo: Pendente -> Em Cotacao -> Aprovada -> Comprada -> Entregue.

**Resultado esperado:**
Solicitação aparece no Kanban de Compras do administrador. Você será notificado sobre mudancas de status.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Solicitação rejeitada | Verifique o motivo com o administrador — pode ser necessario ajustar quantidade ou justificativa |
| Material não chegou | Acompanhe o status no Kanban — se estiver parado em "Comprada" há muito tempo, informe o administrador |

---

## Módulo: Conta e Seguranca

Recuperação de senha: obramanager.dynamus.cc/reset-password

### Alterár sua senha

**Objetivo:** Redefinir sua senha de acesso ao sistema.

**Passo a passo:**

1. **Na tela de login, clique em "Esqueci minha senha"**
   Você será redirecionado para a página de recuperação.

2. **Informe seu email cadastrado**
   Um email com link de redefinição será enviado.

3. **Abra o email e clique no link de redefinição**
   Você será redirecionado para a página de nova senha.

4. **Digite a nova senha e confirme**
   Clique em "Salvar" para atualizar.

**Resultado esperado:**
Senha atualizada. Você pode fazer login com a nova senha imediatamente.

**Problemas comuns:**
| Problema | Solução |
|----------|---------|
| Email não recebido | Verifique caixa de spam. Se persistir, peca ao administrador para resetar sua senha |
| Link expirado | Solicite um novo link na página de recuperação |
