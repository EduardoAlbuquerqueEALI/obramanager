-- 1. Enum for overall unit status
CREATE TYPE unidade_status_geral AS ENUM ('pending', 'in_progress', 'completed', 'issue');

-- 2. Unidades gains status_geral (aggregated color for grid)
ALTER TABLE unidades
  ADD COLUMN status_geral unidade_status_geral NOT NULL DEFAULT 'pending';
CREATE INDEX idx_unidades_status_geral ON unidades(status_geral);

-- 3. Checklist gains responsavel + normalized items table
ALTER TABLE unidade_checklist
  ADD COLUMN responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE unidade_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_checklist_id UUID NOT NULL REFERENCES unidade_checklist(id) ON DELETE CASCADE,
  template_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  status checklist_status NOT NULL DEFAULT 'pending',
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  photo_url TEXT,
  signature_url TEXT,
  observacao TEXT,
  assumed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unidade_checklist_id, template_item_id)
);
CREATE INDEX idx_checklist_items_checklist ON unidade_checklist_items(unidade_checklist_id);
CREATE INDEX idx_checklist_items_responsavel ON unidade_checklist_items(responsavel_id);

-- 4. Solicitações de compra — link to unit + urgência
ALTER TABLE solicitacoes_compra
  ADD COLUMN unidade_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
  ADD COLUMN urgencia TEXT NOT NULL DEFAULT 'normal' CHECK (urgencia IN ('baixa', 'normal', 'alta'));

-- 5. Trigger: recalc unidades.status_geral whenever items change
CREATE OR REPLACE FUNCTION recalc_unidade_status_geral() RETURNS TRIGGER AS $$
DECLARE
  v_unidade_id UUID;
  v_total INT;
  v_completed INT;
  v_in_progress INT;
  v_has_issue BOOLEAN;
BEGIN
  SELECT uc.unidade_id INTO v_unidade_id
  FROM unidade_checklist uc
  WHERE uc.id = COALESCE(NEW.unidade_checklist_id, OLD.unidade_checklist_id);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE uci.status IN ('completed','approved')),
    COUNT(*) FILTER (WHERE uci.status = 'in_progress'),
    BOOL_OR(uci.observacao IS NOT NULL AND uci.status = 'pending')
  INTO v_total, v_completed, v_in_progress, v_has_issue
  FROM unidade_checklist uc
  JOIN unidade_checklist_items uci ON uci.unidade_checklist_id = uc.id
  WHERE uc.unidade_id = v_unidade_id;

  UPDATE unidades SET status_geral =
    CASE
      WHEN v_has_issue THEN 'issue'
      WHEN v_total > 0 AND v_completed = v_total THEN 'completed'
      WHEN v_in_progress > 0 OR v_completed > 0 THEN 'in_progress'
      ELSE 'pending'
    END::unidade_status_geral
  WHERE id = v_unidade_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_status_geral
  AFTER INSERT OR UPDATE OR DELETE ON unidade_checklist_items
  FOR EACH ROW EXECUTE FUNCTION recalc_unidade_status_geral();

-- 6. RLS: org members read/write checklist items
ALTER TABLE unidade_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read checklist items" ON unidade_checklist_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM unidade_checklist uc
    JOIN unidades u ON u.id = uc.unidade_id
    JOIN torres t ON t.id = u.torre_id
    JOIN empreendimentos e ON e.id = t.empreendimento_id
    JOIN profiles p ON p.org_id = e.org_id
    WHERE uc.id = unidade_checklist_items.unidade_checklist_id AND p.id = auth.uid()
  ));

CREATE POLICY "org members write checklist items" ON unidade_checklist_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM unidade_checklist uc
    JOIN unidades u ON u.id = uc.unidade_id
    JOIN torres t ON t.id = u.torre_id
    JOIN empreendimentos e ON e.id = t.empreendimento_id
    JOIN profiles p ON p.org_id = e.org_id
    WHERE uc.id = unidade_checklist_items.unidade_checklist_id AND p.id = auth.uid()
  ));

-- 7. Realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE unidades;
ALTER PUBLICATION supabase_realtime ADD TABLE unidade_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE solicitacoes_compra;
