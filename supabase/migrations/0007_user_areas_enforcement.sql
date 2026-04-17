-- 0007_user_areas_enforcement.sql
-- Restrict member visibility of areas_servico to only those assigned via user_areas.
-- Admins continue to see all areas in their org (covered by "Admins can manage org areas" from 0003).
-- Defense in depth: even if a query forgets to filter, RLS blocks unassigned areas for members.

DROP POLICY IF EXISTS "Members can view org areas" ON areas_servico;

CREATE POLICY "Members can view assigned areas"
  ON areas_servico FOR SELECT
  USING (
    org_id = (SELECT get_user_org(auth.uid()))
    AND (
      (SELECT is_admin(auth.uid()))
      OR id IN (SELECT area_servico_id FROM user_areas WHERE user_id = auth.uid())
    )
  );
