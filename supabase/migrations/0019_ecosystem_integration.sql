-- ============================================================
-- 0019_ecosystem_integration.sql
-- Integração com SPELHO e FLUXO via webhooks
-- ============================================================

-- Adicionar campos de integração na organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS spelho_webhook_secret TEXT,    -- valida webhooks recebidos do SPELHO
  ADD COLUMN IF NOT EXISTS spelho_callback_url    TEXT,   -- URL SPELHO para notificar de volta
  ADD COLUMN IF NOT EXISTS spelho_callback_secret TEXT;   -- secret para enviar ao SPELHO

-- Tabela de mapeamento entre sistemas externos e entidades internas
CREATE TABLE IF NOT EXISTS external_mappings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,  -- 'empreendimento' | 'unidade' | 'cliente'
  internal_id   UUID NOT NULL,
  system        TEXT NOT NULL,  -- 'spelho' | 'fluxo'
  external_id   TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system, entity_type, external_id)
);
ALTER TABLE external_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ext_map_org ON external_mappings(org_id);
CREATE INDEX idx_ext_map_lookup ON external_mappings(system, entity_type, external_id);
CREATE INDEX idx_ext_map_internal ON external_mappings(org_id, entity_type, internal_id);

-- RLS: apenas admins da org podem ver/gerenciar mappings
CREATE POLICY "ext_mappings_select"
  ON external_mappings FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "ext_mappings_all_admin"
  ON external_mappings FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND org_id = public.get_user_org(auth.uid())
  );
