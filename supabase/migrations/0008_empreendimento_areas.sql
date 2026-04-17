-- 0008_empreendimento_areas.sql
-- N:N relation between empreendimentos and areas_servico
-- + per-empreendimento override for checklist_templates
-- + RPC get_unidades_status_by_area for area-level status aggregation

-- ===================== TABLE: empreendimento_areas_servico =====================

CREATE TABLE empreendimento_areas_servico (
  empreendimento_id UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  area_servico_id   UUID NOT NULL REFERENCES areas_servico(id)  ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empreendimento_id, area_servico_id)
);
ALTER TABLE empreendimento_areas_servico ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_eas_empreendimento ON empreendimento_areas_servico(empreendimento_id);
CREATE INDEX idx_eas_area           ON empreendimento_areas_servico(area_servico_id);

-- ===================== TEMPLATES: allow per-empreendimento override =====================

ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS empreendimento_id UUID REFERENCES empreendimentos(id) ON DELETE CASCADE;

-- One template per (area, empreendimento) pair (NULL empreendimento_id = global)
CREATE UNIQUE INDEX idx_tpl_area_emp
  ON checklist_templates(area_servico_id, COALESCE(empreendimento_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE area_servico_id IS NOT NULL;

-- ===================== RLS: empreendimento_areas_servico =====================

CREATE POLICY "eas_select"
  ON empreendimento_areas_servico FOR SELECT
  USING (
    empreendimento_id IN (
      SELECT id FROM empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
        AND (
          public.is_admin(auth.uid())
          OR id IN (SELECT empreendimento_id FROM user_empreendimentos WHERE user_id = auth.uid())
        )
    )
  );

CREATE POLICY "eas_all_admin"
  ON empreendimento_areas_servico FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM empreendimentos WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- ===================== SEED (soft migration) =====================
-- Vincular áreas org-level existentes a todos os empreendimentos da org.
-- Admin pode desligar depois; isso evita UX quebrado logo após a migração.

INSERT INTO empreendimento_areas_servico (empreendimento_id, area_servico_id)
SELECT e.id, a.id
FROM empreendimentos e
JOIN areas_servico a ON a.org_id = e.org_id
ON CONFLICT DO NOTHING;

-- ===================== RPC: get_unidades_status_by_area =====================
-- Retorna, para o par (empreendimento, área), todas as unidades do empreendimento
-- com status agregado dos checklist items dessa área.

CREATE OR REPLACE FUNCTION public.get_unidades_status_by_area(
  p_emp UUID,
  p_area UUID
)
RETURNS TABLE (
  unidade_id UUID,
  torre_id UUID,
  torre_name TEXT,
  number TEXT,
  floor INTEGER,
  status_area TEXT,
  total INTEGER,
  done INTEGER,
  wip INTEGER,
  has_issue BOOLEAN
)
SET search_path = ''
AS $$
  WITH items AS (
    SELECT
      u.id AS unidade_id,
      u.torre_id,
      t.name AS torre_name,
      u.number,
      u.floor,
      uci.status,
      uci.observacao
    FROM public.unidades u
    JOIN public.torres t ON t.id = u.torre_id
    LEFT JOIN public.unidade_checklist uc
      ON uc.unidade_id = u.id
    LEFT JOIN public.checklist_templates tpl
      ON tpl.id = uc.checklist_template_id
     AND tpl.area_servico_id = p_area
    LEFT JOIN public.unidade_checklist_items uci
      ON uci.unidade_checklist_id = uc.id
     AND tpl.id IS NOT NULL
    WHERE t.empreendimento_id = p_emp
  ),
  agg AS (
    SELECT
      i.unidade_id,
      i.torre_id,
      i.torre_name,
      i.number,
      i.floor,
      COUNT(i.status) AS total,
      COUNT(i.status) FILTER (WHERE i.status IN ('completed','approved')) AS done,
      COUNT(i.status) FILTER (WHERE i.status = 'in_progress') AS wip,
      COALESCE(BOOL_OR(i.observacao IS NOT NULL AND i.status = 'pending'), FALSE) AS has_issue
    FROM items i
    GROUP BY i.unidade_id, i.torre_id, i.torre_name, i.number, i.floor
  )
  SELECT
    agg.unidade_id,
    agg.torre_id,
    agg.torre_name,
    agg.number,
    agg.floor,
    CASE
      WHEN agg.has_issue THEN 'issue'
      WHEN agg.total > 0 AND agg.done = agg.total THEN 'completed'
      WHEN agg.wip > 0 OR agg.done > 0 THEN 'in_progress'
      ELSE 'pending'
    END AS status_area,
    agg.total::INTEGER,
    agg.done::INTEGER,
    agg.wip::INTEGER,
    agg.has_issue
  FROM agg;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_unidades_status_by_area(UUID, UUID) TO authenticated;
