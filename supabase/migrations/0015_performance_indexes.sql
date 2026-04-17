-- ============================================================
-- 0015_performance_indexes.sql — Índices de performance + integridade
-- Baseado em auditoria: queries recorrentes sem suporte de índice.
-- ============================================================

-- ESTOQUE --------------------------------------------------------------------

-- Movimentos filtrados por almoxarifado (origem/destino) são comuns em
-- "quais saídas saíram desse almoxarifado" e no delete cascade de almoxarifado.
CREATE INDEX IF NOT EXISTS idx_movimentos_estoque_alm_origem
  ON movimentos_estoque(almoxarifado_origem_id)
  WHERE almoxarifado_origem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimentos_estoque_alm_destino
  ON movimentos_estoque(almoxarifado_destino_id)
  WHERE almoxarifado_destino_id IS NOT NULL;


-- TREINAMENTOS ---------------------------------------------------------------

-- Matriz: pra cada funcionario, buscar treinamento mais recente por tipo.
-- Index composto + DESC acelera window func / DISTINCT ON.
CREATE INDEX IF NOT EXISTS idx_treinamentos_funcionario_vencimento
  ON treinamentos(funcionario_id, data_vencimento DESC);

-- Relatórios "quem tá vencido / vencendo" filtram por data_vencimento.
CREATE INDEX IF NOT EXISTS idx_treinamentos_vencimento_desc
  ON treinamentos(data_vencimento DESC)
  WHERE data_vencimento IS NOT NULL;


-- ORÇAMENTO ------------------------------------------------------------------

-- Lista do orçamento ativo por empreendimento (status != 'substituido') é a
-- query mais comum do módulo.
CREATE INDEX IF NOT EXISTS idx_orcamentos_emp_status
  ON orcamentos(empreendimento_id, status)
  WHERE status <> 'substituido';


-- MEDIÇÕES -------------------------------------------------------------------

-- Detalhe da medição busca movimentos_estoque WHERE etapa_orcamento_id IN (...).
-- Já há idx_mov_etapa_orcamento (criado em 0011), mas reforço ordem por data
-- para cortes temporais eficientes.
CREATE INDEX IF NOT EXISTS idx_movimentos_etapa_data
  ON movimentos_estoque(etapa_orcamento_id, created_at DESC)
  WHERE etapa_orcamento_id IS NOT NULL;


-- PORTAL CLIENTE -------------------------------------------------------------

-- Cada requisição ao portal público valida token. Token é UNIQUE com índice,
-- mas reforço ordem por revogado para o caminho mais comum (token válido).
CREATE INDEX IF NOT EXISTS idx_acessos_cliente_token_ativo
  ON acessos_cliente(token)
  WHERE revogado = false;

-- Chamados abertos por empreendimento — inbox do admin filtra por status.
CREATE INDEX IF NOT EXISTS idx_chamados_emp_status
  ON chamados_assistencia(empreendimento_id, status, created_at DESC);


-- FUNCIONÁRIOS ---------------------------------------------------------------

-- Matriz filtra ativos ordenados por nome; index composto ajuda.
CREATE INDEX IF NOT EXISTS idx_funcionarios_ativo_nome
  ON funcionarios(org_id, ativo, nome_completo);
