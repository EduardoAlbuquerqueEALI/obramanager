-- ============================================================
-- 0018_fix_rls_anon_leak.sql — Fix RLS policies leaking to anon
-- Issue: empreendimentos, chamados_assistencia, acessos_cliente,
-- mensagens_chamado, atualizacoes_obra were readable by
-- unauthenticated (anon) users.
-- Fix: revoke anon access + add auth.uid() IS NOT NULL guards +
-- drop duplicate permissive policies that lacked the guard.
-- ============================================================

-- ===================== REVOKE ANON ACCESS =====================

REVOKE ALL ON empreendimentos FROM anon;
REVOKE ALL ON acessos_cliente FROM anon;
REVOKE ALL ON chamados_assistencia FROM anon;
REVOKE ALL ON mensagens_chamado FROM anon;
REVOKE ALL ON atualizacoes_obra FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON empreendimentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON acessos_cliente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chamados_assistencia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mensagens_chamado TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON atualizacoes_obra TO authenticated;

-- ===================== DROP DUPLICATE POLICIES =====================
-- These old policies lacked auth.uid() IS NOT NULL guard

DROP POLICY IF EXISTS "atualizacoes_obra_all_admin" ON atualizacoes_obra;
DROP POLICY IF EXISTS "atualizacoes_obra_select" ON atualizacoes_obra;
DROP POLICY IF EXISTS "mensagens_chamado_all_admin" ON mensagens_chamado;
DROP POLICY IF EXISTS "mensagens_chamado_select" ON mensagens_chamado;

-- ===================== empreendimentos =====================

DROP POLICY IF EXISTS "empreendimentos_all_admin" ON empreendimentos;
DROP POLICY IF EXISTS "empreendimentos_select_member" ON empreendimentos;

CREATE POLICY "empreendimentos_all_admin"
  ON empreendimentos FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.is_admin(auth.uid())
    AND org_id = public.get_user_org(auth.uid())
  );

CREATE POLICY "empreendimentos_select_member"
  ON empreendimentos FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND org_id = public.get_user_org(auth.uid())
    AND (
      public.is_admin(auth.uid())
      OR id IN (
        SELECT empreendimento_id FROM public.user_empreendimentos
        WHERE user_id = auth.uid()
      )
    )
  );

-- ===================== acessos_cliente =====================

DROP POLICY IF EXISTS "acessos_cliente_select" ON acessos_cliente;
DROP POLICY IF EXISTS "acessos_cliente_all_admin" ON acessos_cliente;

CREATE POLICY "acessos_cliente_select"
  ON acessos_cliente FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "acessos_cliente_all_admin"
  ON acessos_cliente FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- ===================== chamados_assistencia =====================

DROP POLICY IF EXISTS "chamados_select" ON chamados_assistencia;
DROP POLICY IF EXISTS "chamados_all_admin" ON chamados_assistencia;

CREATE POLICY "chamados_select"
  ON chamados_assistencia FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "chamados_all_admin"
  ON chamados_assistencia FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- ===================== mensagens_chamado =====================
-- Also fix mensagens_chamado which inherits from chamados

DROP POLICY IF EXISTS "mensagens_select" ON mensagens_chamado;
DROP POLICY IF EXISTS "mensagens_all_admin" ON mensagens_chamado;

CREATE POLICY "mensagens_select"
  ON mensagens_chamado FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND chamado_id IN (
      SELECT id FROM public.chamados_assistencia
      WHERE empreendimento_id IN (
        SELECT id FROM public.empreendimentos
        WHERE org_id = public.get_user_org(auth.uid())
      )
    )
  );

CREATE POLICY "mensagens_all_admin"
  ON mensagens_chamado FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.is_admin(auth.uid())
    AND chamado_id IN (
      SELECT id FROM public.chamados_assistencia
      WHERE empreendimento_id IN (
        SELECT id FROM public.empreendimentos
        WHERE org_id = public.get_user_org(auth.uid())
      )
    )
  );

-- ===================== atualizacoes_obra =====================
-- Also fix atualizacoes_obra (same pattern)

DROP POLICY IF EXISTS "atualizacoes_select" ON atualizacoes_obra;
DROP POLICY IF EXISTS "atualizacoes_all_admin" ON atualizacoes_obra;

CREATE POLICY "atualizacoes_select"
  ON atualizacoes_obra FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "atualizacoes_all_admin"
  ON atualizacoes_obra FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );
