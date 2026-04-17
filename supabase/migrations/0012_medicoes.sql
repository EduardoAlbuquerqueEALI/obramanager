-- ============================================================
-- 0012_medicoes.sql — Medição mensal física (POC calculado em app)
-- ============================================================

-- ===================== TABLES =====================

CREATE TABLE medicoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  orcamento_id      UUID NOT NULL REFERENCES orcamentos(id) ON DELETE RESTRICT,
  mes_referencia    DATE NOT NULL,  -- primeiro dia do mês
  observacoes       TEXT,
  criado_por        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empreendimento_id, orcamento_id, mes_referencia)
);
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_medicoes_empreendimento ON medicoes(empreendimento_id);
CREATE INDEX idx_medicoes_mes_referencia ON medicoes(mes_referencia DESC);

CREATE TABLE etapas_medicao (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicao_id         UUID NOT NULL REFERENCES medicoes(id) ON DELETE CASCADE,
  etapa_orcamento_id UUID NOT NULL REFERENCES etapas_orcamento(id) ON DELETE CASCADE,
  percentual_fisico  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentual_fisico BETWEEN 0 AND 100),
  observacoes        TEXT,
  UNIQUE(medicao_id, etapa_orcamento_id)
);
ALTER TABLE etapas_medicao ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_etapas_medicao_medicao ON etapas_medicao(medicao_id);


-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.medicoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ===================== RLS POLICIES =====================

-- medicoes: SELECT para members com acesso ao empreendimento
CREATE POLICY "medicoes_select"
  ON medicoes FOR SELECT
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

CREATE POLICY "medicoes_all_admin"
  ON medicoes FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- etapas_medicao: via join com medição → empreendimento
CREATE POLICY "etapas_medicao_select"
  ON etapas_medicao FOR SELECT
  USING (
    medicao_id IN (
      SELECT m.id FROM public.medicoes m
      JOIN public.empreendimentos e ON e.id = m.empreendimento_id
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

CREATE POLICY "etapas_medicao_all_admin"
  ON etapas_medicao FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND medicao_id IN (
      SELECT m.id FROM public.medicoes m
      JOIN public.empreendimentos e ON e.id = m.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );
