-- Migration 0003: areas_servico org-level support
-- Add org_id, icon, color; make empreendimento_id nullable

ALTER TABLE areas_servico
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'wrench',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';

ALTER TABLE areas_servico
  ALTER COLUMN empreendimento_id DROP NOT NULL;

-- Backfill org_id from existing rows via empreendimentos
UPDATE areas_servico a
SET org_id = e.org_id
FROM empreendimentos e
WHERE a.empreendimento_id = e.id
  AND a.org_id IS NULL;

-- Create empreendimentos storage bucket (ignore error if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('empreendimentos', 'empreendimentos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: admins can upload
CREATE POLICY "Admins can upload empreendimento images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'empreendimentos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public can read empreendimento images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'empreendimentos');

CREATE POLICY "Admins can delete empreendimento images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'empreendimentos'
    AND auth.role() = 'authenticated'
  );

-- Update RLS on areas_servico: drop old policies, create new org-scoped ones
DROP POLICY IF EXISTS "Members can view their areas" ON areas_servico;
DROP POLICY IF EXISTS "Admins can manage areas" ON areas_servico;

-- Members can view areas in their org
CREATE POLICY "Members can view org areas"
  ON areas_servico FOR SELECT
  USING (
    org_id = (SELECT get_user_org(auth.uid()))
    OR empreendimento_id IN (
      SELECT empreendimento_id FROM user_empreendimentos WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all areas in their org
CREATE POLICY "Admins can manage org areas"
  ON areas_servico FOR ALL
  USING (
    (SELECT is_admin(auth.uid()))
    AND (
      org_id = (SELECT get_user_org(auth.uid()))
      OR empreendimento_id IN (
        SELECT id FROM empreendimentos WHERE org_id = (SELECT get_user_org(auth.uid()))
      )
    )
  );
