-- ============================================================
-- 0009_orcamentos.sql — Orçamento de Obra (versionado)
-- Hierarquia: empreendimento → orçamento (vN) → etapas → itens
-- ============================================================

-- ===================== ENUMS =====================

CREATE TYPE orcamento_status AS ENUM ('rascunho', 'ativo', 'congelado', 'substituido');


-- ===================== TABLES =====================

CREATE TABLE orcamentos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id     UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  versao                INTEGER NOT NULL DEFAULT 1,
  parent_id             UUID REFERENCES orcamentos(id) ON DELETE SET NULL,
  nome                  TEXT NOT NULL DEFAULT 'Orçamento Principal',
  status                orcamento_status NOT NULL DEFAULT 'rascunho',
  bdi_percent           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (bdi_percent >= 0),
  contingencia_percent  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (contingencia_percent >= 0),
  congelado_em          TIMESTAMPTZ,
  total_congelado       NUMERIC(14,2),
  observacoes           TEXT,
  criado_por            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empreendimento_id, versao)
);
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

CREATE TABLE etapas_orcamento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id    UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(orcamento_id, nome)
);
ALTER TABLE etapas_orcamento ENABLE ROW LEVEL SECURITY;

CREATE TABLE itens_orcamento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id        UUID NOT NULL REFERENCES etapas_orcamento(id) ON DELETE CASCADE,
  descricao       TEXT NOT NULL,
  unidade         TEXT NOT NULL DEFAULT 'un',
  quantidade      NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  preco_unitario  NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (preco_unitario >= 0),
  codigo_sinapi   TEXT,
  observacoes     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE itens_orcamento ENABLE ROW LEVEL SECURITY;


-- ===================== INDEXES =====================

CREATE INDEX idx_orcamentos_empreendimento_id ON orcamentos(empreendimento_id);
CREATE INDEX idx_orcamentos_status            ON orcamentos(status);
CREATE INDEX idx_etapas_orcamento_orcamento   ON etapas_orcamento(orcamento_id);
CREATE INDEX idx_itens_orcamento_etapa        ON itens_orcamento(etapa_id);
CREATE INDEX idx_itens_orcamento_sinapi       ON itens_orcamento(codigo_sinapi) WHERE codigo_sinapi IS NOT NULL;


-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.etapas_orcamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.itens_orcamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ===================== RLS POLICIES =====================

-- orcamentos: select para qualquer usuário da org (admin + members do empreendimento)
CREATE POLICY "orcamentos_select"
  ON orcamentos FOR SELECT
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

-- orcamentos: ALL só admin
CREATE POLICY "orcamentos_all_admin"
  ON orcamentos FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- etapas_orcamento: select para acessíveis
CREATE POLICY "etapas_orcamento_select"
  ON etapas_orcamento FOR SELECT
  USING (
    orcamento_id IN (
      SELECT o.id FROM public.orcamentos o
      JOIN public.empreendimentos e ON e.id = o.empreendimento_id
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

CREATE POLICY "etapas_orcamento_all_admin"
  ON etapas_orcamento FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND orcamento_id IN (
      SELECT o.id FROM public.orcamentos o
      JOIN public.empreendimentos e ON e.id = o.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );

-- itens_orcamento: select para acessíveis
CREATE POLICY "itens_orcamento_select"
  ON itens_orcamento FOR SELECT
  USING (
    etapa_id IN (
      SELECT et.id FROM public.etapas_orcamento et
      JOIN public.orcamentos o ON o.id = et.orcamento_id
      JOIN public.empreendimentos e ON e.id = o.empreendimento_id
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

CREATE POLICY "itens_orcamento_all_admin"
  ON itens_orcamento FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND etapa_id IN (
      SELECT et.id FROM public.etapas_orcamento et
      JOIN public.orcamentos o ON o.id = et.orcamento_id
      JOIN public.empreendimentos e ON e.id = o.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );
