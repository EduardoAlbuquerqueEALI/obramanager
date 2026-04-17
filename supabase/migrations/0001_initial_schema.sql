-- ============================================================
-- 0001_initial_schema.sql
-- obra-manager: construction management system
-- ============================================================

-- ===================== ENUMS =====================

CREATE TYPE profile_role AS ENUM ('admin', 'member');
CREATE TYPE empreendimento_status AS ENUM ('planning', 'in_progress', 'completed', 'paused');
CREATE TYPE unidade_status AS ENUM ('available', 'sold', 'reserved', 'delivered');
CREATE TYPE checklist_status AS ENUM ('pending', 'in_progress', 'completed', 'approved');
CREATE TYPE solicitacao_status AS ENUM ('pending', 'approved', 'rejected', 'purchased');


-- ===================== TABLES =====================

-- Organizations
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        profile_role NOT NULL DEFAULT 'member',
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Empreendimentos (developments / construction sites)
CREATE TABLE empreendimentos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  status      empreendimento_status NOT NULL DEFAULT 'planning',
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE empreendimentos ENABLE ROW LEVEL SECURITY;

-- Torres (towers / buildings)
CREATE TABLE torres (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  floors              INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE torres ENABLE ROW LEVEL SECURITY;

-- Unidades (units / apartments)
CREATE TABLE unidades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torre_id    UUID NOT NULL REFERENCES torres(id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  floor       INTEGER NOT NULL,
  type        TEXT,
  status      unidade_status NOT NULL DEFAULT 'available',
  owner_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;

-- Areas de Servico (service areas)
CREATE TABLE areas_servico (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE areas_servico ENABLE ROW LEVEL SECURITY;

-- Checklist Templates
CREATE TABLE checklist_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  area_servico_id UUID REFERENCES areas_servico(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- Unidade Checklist (checklist instances per unit)
CREATE TABLE unidade_checklist (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id            UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  status                checklist_status NOT NULL DEFAULT 'pending',
  completed_items       JSONB DEFAULT '[]'::jsonb,
  photos                TEXT[] DEFAULT '{}',
  signature_url         TEXT,
  completed_at          TIMESTAMPTZ,
  completed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE unidade_checklist ENABLE ROW LEVEL SECURITY;

-- User <-> Empreendimento assignment (composite PK)
CREATE TABLE user_empreendimentos (
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, empreendimento_id)
);
ALTER TABLE user_empreendimentos ENABLE ROW LEVEL SECURITY;

-- User <-> Area de Servico assignment (composite PK)
CREATE TABLE user_areas (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_servico_id UUID NOT NULL REFERENCES areas_servico(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, area_servico_id)
);
ALTER TABLE user_areas ENABLE ROW LEVEL SECURITY;

-- Solicitacoes de Compra (purchase requests)
CREATE TABLE solicitacoes_compra (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  area_servico_id     UUID REFERENCES areas_servico(id) ON DELETE SET NULL,
  requested_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  items               JSONB NOT NULL DEFAULT '[]'::jsonb,
  status              solicitacao_status NOT NULL DEFAULT 'pending',
  approved_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE solicitacoes_compra ENABLE ROW LEVEL SECURITY;


-- ===================== HELPER FUNCTIONS =====================

-- Check if user is admin in their org
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get user's org_id
CREATE OR REPLACE FUNCTION get_user_org(uid UUID)
RETURNS UUID
SET search_path = ''
AS $$
  SELECT org_id FROM public.profiles WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ===================== RLS POLICIES =====================

-- === organizations ===
CREATE POLICY "org_select_own"
  ON organizations FOR SELECT
  USING (id = public.get_user_org(auth.uid()));

CREATE POLICY "org_update_admin"
  ON organizations FOR UPDATE
  USING (id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- === profiles ===
CREATE POLICY "profiles_select_org"
  ON profiles FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_all_admin"
  ON profiles FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- === empreendimentos ===
CREATE POLICY "empreendimentos_all_admin"
  ON empreendimentos FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

CREATE POLICY "empreendimentos_select_member"
  ON empreendimentos FOR SELECT
  USING (
    org_id = public.get_user_org(auth.uid())
    AND (
      public.is_admin(auth.uid())
      OR id IN (
        SELECT empreendimento_id FROM public.user_empreendimentos
        WHERE user_id = auth.uid()
      )
    )
  );

-- === torres ===
CREATE POLICY "torres_select"
  ON torres FOR SELECT
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

CREATE POLICY "torres_all_admin"
  ON torres FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- === unidades ===
CREATE POLICY "unidades_select"
  ON unidades FOR SELECT
  USING (
    torre_id IN (
      SELECT t.id FROM public.torres t
      JOIN public.empreendimentos e ON e.id = t.empreendimento_id
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

CREATE POLICY "unidades_all_admin"
  ON unidades FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND torre_id IN (
      SELECT t.id FROM public.torres t
      JOIN public.empreendimentos e ON e.id = t.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );

-- === areas_servico ===
CREATE POLICY "areas_select"
  ON areas_servico FOR SELECT
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
    OR id IN (
      SELECT area_servico_id FROM public.user_areas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "areas_all_admin"
  ON areas_servico FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- === checklist_templates ===
CREATE POLICY "templates_select_org"
  ON checklist_templates FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "templates_all_admin"
  ON checklist_templates FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- === unidade_checklist ===
CREATE POLICY "uc_select"
  ON unidade_checklist FOR SELECT
  USING (
    unidade_id IN (
      SELECT u.id FROM public.unidades u
      JOIN public.torres t ON t.id = u.torre_id
      JOIN public.empreendimentos e ON e.id = t.empreendimento_id
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

CREATE POLICY "uc_insert"
  ON unidade_checklist FOR INSERT
  WITH CHECK (
    unidade_id IN (
      SELECT u.id FROM public.unidades u
      JOIN public.torres t ON t.id = u.torre_id
      JOIN public.empreendimentos e ON e.id = t.empreendimento_id
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

CREATE POLICY "uc_update"
  ON unidade_checklist FOR UPDATE
  USING (
    unidade_id IN (
      SELECT u.id FROM public.unidades u
      JOIN public.torres t ON t.id = u.torre_id
      JOIN public.empreendimentos e ON e.id = t.empreendimento_id
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

-- === user_empreendimentos ===
CREATE POLICY "ue_select_own"
  ON user_empreendimentos FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ue_all_admin"
  ON user_empreendimentos FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

-- === user_areas ===
CREATE POLICY "ua_select_own"
  ON user_areas FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ua_all_admin"
  ON user_areas FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND area_servico_id IN (
      SELECT a.id FROM public.areas_servico a
      JOIN public.empreendimentos e ON e.id = a.empreendimento_id
      WHERE e.org_id = public.get_user_org(auth.uid())
    )
  );

-- === solicitacoes_compra ===
CREATE POLICY "sc_all_admin"
  ON solicitacoes_compra FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND empreendimento_id IN (
      SELECT id FROM public.empreendimentos
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "sc_select_member"
  ON solicitacoes_compra FOR SELECT
  USING (
    empreendimento_id IN (
      SELECT empreendimento_id FROM public.user_empreendimentos
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sc_insert_member"
  ON solicitacoes_compra FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND empreendimento_id IN (
      SELECT empreendimento_id FROM public.user_empreendimentos
      WHERE user_id = auth.uid()
    )
  );


-- ===================== TRIGGER: auto-create profile =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, org_id, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'org_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.profile_role, 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ===================== UPDATED_AT TRIGGER =====================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.empreendimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.unidade_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ===================== INDEXES =====================

CREATE INDEX idx_profiles_org_id               ON profiles(org_id);
CREATE INDEX idx_empreendimentos_org_id         ON empreendimentos(org_id);
CREATE INDEX idx_torres_empreendimento_id       ON torres(empreendimento_id);
CREATE INDEX idx_unidades_torre_id              ON unidades(torre_id);
CREATE INDEX idx_areas_servico_empreendimento   ON areas_servico(empreendimento_id);
CREATE INDEX idx_checklist_templates_org_id     ON checklist_templates(org_id);
CREATE INDEX idx_uc_unidade_id                  ON unidade_checklist(unidade_id);
CREATE INDEX idx_uc_template_id                 ON unidade_checklist(checklist_template_id);
CREATE INDEX idx_sc_empreendimento_id           ON solicitacoes_compra(empreendimento_id);
CREATE INDEX idx_sc_requested_by                ON solicitacoes_compra(requested_by);


-- ===================== STORAGE BUCKETS =====================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('empreendimentos', 'empreendimentos', true),
  ('obra-evidencias', 'obra-evidencias', false)
ON CONFLICT (id) DO NOTHING;

-- Storage: empreendimentos (public read)
CREATE POLICY "storage_empreendimentos_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'empreendimentos');

CREATE POLICY "storage_empreendimentos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'empreendimentos' AND auth.role() = 'authenticated');

CREATE POLICY "storage_empreendimentos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'empreendimentos' AND auth.role() = 'authenticated');

-- Storage: obra-evidencias (private)
CREATE POLICY "storage_evidencias_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'obra-evidencias' AND auth.role() = 'authenticated');

CREATE POLICY "storage_evidencias_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'obra-evidencias' AND auth.role() = 'authenticated');
