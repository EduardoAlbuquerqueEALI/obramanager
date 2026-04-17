-- ============================================================
-- 0010_suprimentos.sql — Fornecedores + Cotações + OCs + Recebimentos
-- ESTENDE solicitacoes_compra existente (não duplica).
-- ============================================================

-- ===================== ENUMS =====================

CREATE TYPE ordem_compra_status AS ENUM ('emitida', 'parcial', 'recebida', 'cancelada');


-- ===================== TABLES =====================

-- Fornecedores (por org)
CREATE TABLE fornecedores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  cnpj            TEXT,
  contato_nome    TEXT,
  contato_telefone TEXT,
  contato_email   TEXT,
  observacoes     TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX ux_fornecedores_org_cnpj ON fornecedores(org_id, cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_fornecedores_org_id ON fornecedores(org_id);

-- Estender solicitacoes_compra: vincular a etapa do orçamento + campos OC
ALTER TABLE solicitacoes_compra
  ADD COLUMN etapa_orcamento_id UUID REFERENCES etapas_orcamento(id) ON DELETE SET NULL,
  ADD COLUMN valor_total NUMERIC(14,2);

CREATE INDEX idx_sc_etapa_orcamento ON solicitacoes_compra(etapa_orcamento_id) WHERE etapa_orcamento_id IS NOT NULL;

-- Cotações (1 solicitacao pode ter N cotações, 1 por fornecedor)
CREATE TABLE cotacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id    UUID NOT NULL REFERENCES solicitacoes_compra(id) ON DELETE CASCADE,
  fornecedor_id     UUID NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  valor_total       NUMERIC(14,2),
  prazo_dias        INTEGER,
  condicoes_pagamento TEXT,
  validade          DATE,
  vencedora         BOOLEAN NOT NULL DEFAULT false,
  observacoes       TEXT,
  itens             JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{item_id, preco_unitario, observacoes}]
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solicitacao_id, fornecedor_id)
);
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cotacoes_solicitacao ON cotacoes(solicitacao_id);
CREATE INDEX idx_cotacoes_fornecedor  ON cotacoes(fornecedor_id);
CREATE INDEX idx_cotacoes_vencedora   ON cotacoes(solicitacao_id) WHERE vencedora = true;

-- Ordens de Compra (derivadas da cotação vencedora)
CREATE TABLE ordens_compra (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id        UUID NOT NULL REFERENCES cotacoes(id) ON DELETE RESTRICT,
  empreendimento_id UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  fornecedor_id     UUID NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  codigo            TEXT NOT NULL,
  status            ordem_compra_status NOT NULL DEFAULT 'emitida',
  total             NUMERIC(14,2) NOT NULL,
  emitida_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  emitida_por       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empreendimento_id, codigo)
);
ALTER TABLE ordens_compra ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ordens_compra_empreendimento ON ordens_compra(empreendimento_id);
CREATE INDEX idx_ordens_compra_fornecedor     ON ordens_compra(fornecedor_id);
CREATE INDEX idx_ordens_compra_status         ON ordens_compra(status);

-- Recebimentos (uma OC pode ter múltiplos recebimentos parciais)
CREATE TABLE recebimentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_compra_id   UUID NOT NULL REFERENCES ordens_compra(id) ON DELETE CASCADE,
  nf_numero         TEXT,
  recebido_em       DATE NOT NULL DEFAULT CURRENT_DATE,
  recebido_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conforme          BOOLEAN NOT NULL DEFAULT true,
  nao_conformidade_obs TEXT,
  observacoes       TEXT,
  itens             JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{descricao, qtd_recebida, inventory_item_id?}]
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_recebimentos_ordem_compra ON recebimentos(ordem_compra_id);


-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ordens_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ===================== RLS POLICIES =====================

-- fornecedores: por org
CREATE POLICY "fornecedores_select"
  ON fornecedores FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "fornecedores_all_admin"
  ON fornecedores FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- cotacoes: via join com solicitacao → empreendimento
CREATE POLICY "cotacoes_select"
  ON cotacoes FOR SELECT
  USING (
    solicitacao_id IN (
      SELECT sc.id FROM public.solicitacoes_compra sc
      JOIN public.empreendimentos e ON e.id = sc.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
      AND (
        public.is_admin(auth.uid())
        OR e.id IN (
          SELECT empreendimento_id FROM public.user_empreendimentos
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "cotacoes_all_admin"
  ON cotacoes FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND solicitacao_id IN (
      SELECT sc.id FROM public.solicitacoes_compra sc
      JOIN public.empreendimentos e ON e.id = sc.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );

-- ordens_compra: via empreendimento
CREATE POLICY "ordens_compra_select"
  ON ordens_compra FOR SELECT
  USING (
    empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
      AND (
        public.is_admin(auth.uid())
        OR id IN (
          SELECT empreendimento_id FROM public.user_empreendimentos
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "ordens_compra_all_admin"
  ON ordens_compra FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- recebimentos: via ordens_compra → empreendimento
CREATE POLICY "recebimentos_select"
  ON recebimentos FOR SELECT
  USING (
    ordem_compra_id IN (
      SELECT oc.id FROM public.ordens_compra oc
      JOIN public.empreendimentos e ON e.id = oc.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
      AND (
        public.is_admin(auth.uid())
        OR e.id IN (
          SELECT empreendimento_id FROM public.user_empreendimentos
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "recebimentos_all_admin"
  ON recebimentos FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND ordem_compra_id IN (
      SELECT oc.id FROM public.ordens_compra oc
      JOIN public.empreendimentos e ON e.id = oc.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );
