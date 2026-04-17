-- ============================================================
-- 0016_fvs.sql — FVS (Ficha de Verificação de Serviço) Digital
-- Matriz: etapas do checklist × unidades, por andar
-- ============================================================

-- ===================== ENUMS =====================

CREATE TYPE verificacao_status AS ENUM (
  'nao_inspecionado',     -- ○ (cinza)
  'aprovado',             -- O (verde)
  'reprovado',            -- X (vermelho, requer foto + observação)
  'aprovado_reinspecao'   -- ⊕ (azul, foi reprovado e depois aprovado)
);

-- ===================== TABLES =====================

-- FVS = 1 ficha por (empreendimento × area de serviço)
CREATE TABLE verificacoes_servico (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  area_servico_id   UUID NOT NULL REFERENCES areas_servico(id) ON DELETE CASCADE,
  responsavel_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida')),
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empreendimento_id, area_servico_id)
);
ALTER TABLE verificacoes_servico ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_vs_empreendimento ON verificacoes_servico(empreendimento_id);
CREATE INDEX idx_vs_area ON verificacoes_servico(area_servico_id);
CREATE INDEX idx_vs_responsavel ON verificacoes_servico(responsavel_id) WHERE responsavel_id IS NOT NULL;

-- Cada CÉLULA da matriz: (etapa do template) × (unidade)
CREATE TABLE verificacao_unidades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verificacao_id    UUID NOT NULL REFERENCES verificacoes_servico(id) ON DELETE CASCADE,
  unidade_id        UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  template_item_id  TEXT NOT NULL,
  template_item_title TEXT NOT NULL,
  status            verificacao_status NOT NULL DEFAULT 'nao_inspecionado',
  observacao        TEXT,
  solucao           TEXT,
  foto_url          TEXT,
  inspecionado_por  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  inspecionado_em   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(verificacao_id, unidade_id, template_item_id)
);
ALTER TABLE verificacao_unidades ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_vu_verificacao ON verificacao_unidades(verificacao_id);
CREATE INDEX idx_vu_unidade ON verificacao_unidades(unidade_id);
CREATE INDEX idx_vu_status ON verificacao_unidades(status);
CREATE INDEX idx_vu_verificacao_unidade ON verificacao_unidades(verificacao_id, unidade_id);

-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.verificacoes_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.verificacao_unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===================== RLS POLICIES =====================

-- verificacoes_servico: select por org, all admin
CREATE POLICY "vs_select"
  ON verificacoes_servico FOR SELECT
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

CREATE POLICY "vs_all_admin"
  ON verificacoes_servico FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- Membros atribuídos (responsavel_id = self) podem UPDATE
CREATE POLICY "vs_update_responsavel"
  ON verificacoes_servico FOR UPDATE
  USING (responsavel_id = auth.uid());

-- verificacao_unidades: select por org, insert/update admin + responsável
CREATE POLICY "vu_select"
  ON verificacao_unidades FOR SELECT
  USING (
    verificacao_id IN (
      SELECT vs.id FROM public.verificacoes_servico vs
      JOIN public.empreendimentos e ON e.id = vs.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "vu_all_admin"
  ON verificacao_unidades FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND verificacao_id IN (
      SELECT vs.id FROM public.verificacoes_servico vs
      JOIN public.empreendimentos e ON e.id = vs.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );

-- Executor (responsavel_id no FVS) pode update cells
CREATE POLICY "vu_update_executor"
  ON verificacao_unidades FOR UPDATE
  USING (
    verificacao_id IN (
      SELECT id FROM public.verificacoes_servico
      WHERE responsavel_id = auth.uid()
    )
  );

-- ===================== REALTIME =====================

ALTER PUBLICATION supabase_realtime ADD TABLE verificacao_unidades;
