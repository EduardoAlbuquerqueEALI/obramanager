-- ============================================================
-- 0013_portal_cliente.sql — Portal do Comprador (acesso via token público)
-- ============================================================

-- ===================== ENUMS =====================

CREATE TYPE chamado_status AS ENUM ('aberto', 'em_andamento', 'resolvido', 'fechado');
CREATE TYPE chamado_categoria AS ENUM ('hidraulica', 'eletrica', 'infiltracao', 'acabamento', 'estrutural', 'outros');


-- ===================== TABLES =====================

-- Acesso do comprador (token único por unidade)
CREATE TABLE acessos_cliente (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id          UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  token               TEXT NOT NULL UNIQUE,  -- hex 64 chars
  comprador_nome      TEXT,
  comprador_email     TEXT,
  comprador_telefone  TEXT,
  revogado            BOOLEAN NOT NULL DEFAULT false,
  ultimo_acesso_em    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unidade_id)  -- um token por unidade
);
ALTER TABLE acessos_cliente ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_acessos_cliente_token ON acessos_cliente(token);
CREATE INDEX idx_acessos_cliente_empreendimento ON acessos_cliente(empreendimento_id);

-- Atualizações da obra (feed público por empreendimento)
CREATE TABLE atualizacoes_obra (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  titulo              TEXT NOT NULL,
  descricao           TEXT,
  fotos               JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array de URLs
  percentual_avanco   NUMERIC(5,2),
  publicado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE atualizacoes_obra ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_atualizacoes_empreendimento ON atualizacoes_obra(empreendimento_id, publicado_em DESC);

-- Chamados de assistência técnica
CREATE TABLE chamados_assistencia (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id          UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  categoria           chamado_categoria NOT NULL,
  titulo              TEXT NOT NULL,
  descricao           TEXT NOT NULL,
  fotos               JSONB DEFAULT '[]'::jsonb,
  status              chamado_status NOT NULL DEFAULT 'aberto',
  aberto_pelo_cliente BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chamados_assistencia ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chamados_unidade ON chamados_assistencia(unidade_id);
CREATE INDEX idx_chamados_empreendimento ON chamados_assistencia(empreendimento_id);
CREATE INDEX idx_chamados_status ON chamados_assistencia(status);

-- Mensagens no chamado (thread)
CREATE TABLE mensagens_chamado (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id          UUID NOT NULL REFERENCES chamados_assistencia(id) ON DELETE CASCADE,
  autor_tipo          TEXT NOT NULL CHECK (autor_tipo IN ('cliente', 'empresa')),
  autor_nome          TEXT,
  mensagem            TEXT NOT NULL,
  fotos               JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE mensagens_chamado ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mensagens_chamado ON mensagens_chamado(chamado_id, created_at);


-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.acessos_cliente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chamados_assistencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ===================== RLS POLICIES =====================
-- IMPORTANTE: o portal público acessa via service_role + validação de token na aplicação.
-- As policies abaixo cobrem SOMENTE o acesso dos admins/members da org.

-- acessos_cliente: admin manage, members see
CREATE POLICY "acessos_cliente_select"
  ON acessos_cliente FOR SELECT
  USING (
    empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "acessos_cliente_all_admin"
  ON acessos_cliente FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- atualizacoes_obra: admin manage, members see
CREATE POLICY "atualizacoes_obra_select"
  ON atualizacoes_obra FOR SELECT
  USING (
    empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "atualizacoes_obra_all_admin"
  ON atualizacoes_obra FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- chamados_assistencia
CREATE POLICY "chamados_select"
  ON chamados_assistencia FOR SELECT
  USING (
    empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "chamados_all_admin"
  ON chamados_assistencia FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- mensagens_chamado
CREATE POLICY "mensagens_chamado_select"
  ON mensagens_chamado FOR SELECT
  USING (
    chamado_id IN (
      SELECT ca.id FROM public.chamados_assistencia ca
      JOIN public.empreendimentos e ON e.id = ca.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "mensagens_chamado_all_admin"
  ON mensagens_chamado FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND chamado_id IN (
      SELECT ca.id FROM public.chamados_assistencia ca
      JOIN public.empreendimentos e ON e.id = ca.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );
