-- ============================================================
-- 0011_estoque.sql — Almoxarifados + Itens + Movimentações
-- ============================================================

-- ===================== TABLES =====================

-- Almoxarifados (central ou por obra)
CREATE TABLE almoxarifados (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  empreendimento_id   UUID REFERENCES empreendimentos(id) ON DELETE CASCADE,  -- NULL = almoxarifado central
  nome                TEXT NOT NULL,
  ativo               BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, nome)
);
ALTER TABLE almoxarifados ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_almoxarifados_org_id ON almoxarifados(org_id);
CREATE INDEX idx_almoxarifados_empreendimento ON almoxarifados(empreendimento_id) WHERE empreendimento_id IS NOT NULL;

-- Itens de Estoque (catálogo por org)
CREATE TABLE itens_estoque (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  codigo          TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  unidade         TEXT NOT NULL DEFAULT 'un',
  estoque_minimo  NUMERIC(12,4) DEFAULT 0 CHECK (estoque_minimo >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, codigo)
);
ALTER TABLE itens_estoque ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_itens_estoque_org_id ON itens_estoque(org_id);

-- Movimentações (append-only)
CREATE TABLE movimentos_estoque (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id                 UUID NOT NULL REFERENCES itens_estoque(id) ON DELETE RESTRICT,
  tipo                    TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'ajuste')),
  quantidade              NUMERIC(12,4) NOT NULL CHECK (quantidade > 0),
  almoxarifado_origem_id  UUID REFERENCES almoxarifados(id) ON DELETE SET NULL,
  almoxarifado_destino_id UUID REFERENCES almoxarifados(id) ON DELETE SET NULL,
  referencia_tipo         TEXT,   -- 'recebimento' | 'apropriacao' | 'manual'
  referencia_id           UUID,
  etapa_orcamento_id      UUID REFERENCES etapas_orcamento(id) ON DELETE SET NULL,  -- apropriação
  observacoes             TEXT,
  criado_por              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_movimento_locais CHECK (
    (tipo = 'entrada'        AND almoxarifado_destino_id IS NOT NULL) OR
    (tipo = 'saida'          AND almoxarifado_origem_id  IS NOT NULL) OR
    (tipo = 'transferencia'  AND almoxarifado_origem_id  IS NOT NULL AND almoxarifado_destino_id IS NOT NULL) OR
    (tipo = 'ajuste')
  )
);
ALTER TABLE movimentos_estoque ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mov_org_id             ON movimentos_estoque(org_id);
CREATE INDEX idx_mov_item_id            ON movimentos_estoque(item_id);
CREATE INDEX idx_mov_tipo               ON movimentos_estoque(tipo);
CREATE INDEX idx_mov_etapa_orcamento    ON movimentos_estoque(etapa_orcamento_id) WHERE etapa_orcamento_id IS NOT NULL;
CREATE INDEX idx_mov_created_at         ON movimentos_estoque(created_at DESC);


-- ===================== VIEW: SALDOS =====================

CREATE OR REPLACE VIEW saldos_estoque AS
SELECT
  ie.org_id,
  ie.id               AS item_id,
  ie.codigo           AS item_codigo,
  ie.descricao        AS item_descricao,
  ie.unidade,
  ie.estoque_minimo,
  a.id                AS almoxarifado_id,
  a.nome              AS almoxarifado_nome,
  a.empreendimento_id AS almoxarifado_empreendimento_id,
  COALESCE(SUM(CASE WHEN m.almoxarifado_destino_id = a.id THEN m.quantidade ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.almoxarifado_origem_id  = a.id THEN m.quantidade ELSE 0 END), 0) AS saldo
FROM itens_estoque ie
CROSS JOIN almoxarifados a
LEFT JOIN movimentos_estoque m ON m.item_id = ie.id
WHERE ie.org_id = a.org_id
GROUP BY ie.org_id, ie.id, ie.codigo, ie.descricao, ie.unidade, ie.estoque_minimo,
         a.id, a.nome, a.empreendimento_id;


-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.almoxarifados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.itens_estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ===================== RLS POLICIES =====================

-- almoxarifados
CREATE POLICY "almoxarifados_select"
  ON almoxarifados FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "almoxarifados_all_admin"
  ON almoxarifados FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- itens_estoque
CREATE POLICY "itens_estoque_select"
  ON itens_estoque FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "itens_estoque_all_admin"
  ON itens_estoque FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- movimentos_estoque: SELECT + INSERT para members da org (append-only)
CREATE POLICY "movimentos_estoque_select"
  ON movimentos_estoque FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "movimentos_estoque_insert"
  ON movimentos_estoque FOR INSERT
  WITH CHECK (org_id = public.get_user_org(auth.uid()));

-- Sem policy de update/delete: movimentos são imutáveis
