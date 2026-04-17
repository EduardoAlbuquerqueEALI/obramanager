-- ============================================================
-- 0014_treinamentos.sql — Funcionários + Tipos de Treinamento (NRs) + Certificados
-- ============================================================

-- ===================== TABLES =====================

-- Funcionários (operários que trabalham em obra — não são `profiles`/usuários do sistema)
CREATE TABLE funcionarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome_completo   TEXT NOT NULL,
  cpf             TEXT,
  funcao          TEXT,
  foto_url        TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX ux_funcionarios_org_cpf ON funcionarios(org_id, cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_funcionarios_org_id ON funcionarios(org_id);
CREATE INDEX idx_funcionarios_ativo ON funcionarios(org_id, ativo);

-- Tipos de treinamento (catálogo de NRs + customs)
CREATE TABLE tipos_treinamento (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  codigo            TEXT NOT NULL,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  validade_meses    INTEGER NOT NULL DEFAULT 12 CHECK (validade_meses > 0),
  ativo             BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, codigo)
);
ALTER TABLE tipos_treinamento ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tipos_treinamento_org_id ON tipos_treinamento(org_id);

-- Treinamentos (1 registro = 1 certificado emitido a 1 funcionário em 1 NR)
CREATE TABLE treinamentos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id          UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  tipo_treinamento_id     UUID NOT NULL REFERENCES tipos_treinamento(id) ON DELETE RESTRICT,
  data_realizacao         DATE NOT NULL,
  data_vencimento         DATE,  -- calculado por trigger se não informado
  instrutor               TEXT,
  carga_horaria           INTEGER,
  certificado_url         TEXT,
  observacoes             TEXT,
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE treinamentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_treinamentos_funcionario ON treinamentos(funcionario_id);
CREATE INDEX idx_treinamentos_tipo ON treinamentos(tipo_treinamento_id);
CREATE INDEX idx_treinamentos_vencimento ON treinamentos(data_vencimento);


-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tipos_treinamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.treinamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Calcula data_vencimento automaticamente se não informada
CREATE OR REPLACE FUNCTION public.calcular_data_vencimento_treinamento()
RETURNS TRIGGER
SET search_path = ''
AS $$
DECLARE
  v_meses INTEGER;
BEGIN
  IF NEW.data_vencimento IS NULL THEN
    SELECT validade_meses INTO v_meses
    FROM public.tipos_treinamento
    WHERE id = NEW.tipo_treinamento_id;

    IF v_meses IS NOT NULL THEN
      NEW.data_vencimento := NEW.data_realizacao + (v_meses || ' months')::INTERVAL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_vencimento
  BEFORE INSERT OR UPDATE ON public.treinamentos
  FOR EACH ROW EXECUTE FUNCTION public.calcular_data_vencimento_treinamento();


-- ===================== RLS POLICIES =====================

-- funcionarios: SELECT por org, ALL só admin
CREATE POLICY "funcionarios_select"
  ON funcionarios FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "funcionarios_all_admin"
  ON funcionarios FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- tipos_treinamento
CREATE POLICY "tipos_treinamento_select"
  ON tipos_treinamento FOR SELECT
  USING (org_id = public.get_user_org(auth.uid()));

CREATE POLICY "tipos_treinamento_all_admin"
  ON tipos_treinamento FOR ALL
  USING (org_id = public.get_user_org(auth.uid()) AND public.is_admin(auth.uid()));

-- treinamentos: via join com funcionario → org
CREATE POLICY "treinamentos_select"
  ON treinamentos FOR SELECT
  USING (
    funcionario_id IN (
      SELECT id FROM public.funcionarios
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "treinamentos_all_admin"
  ON treinamentos FOR ALL
  USING (
    public.is_admin(auth.uid())
    AND funcionario_id IN (
      SELECT id FROM public.funcionarios
      WHERE org_id = public.get_user_org(auth.uid())
    )
  );


-- ===================== SEED DE NRs PADRÃO (por org existente) =====================

-- Insere as 10 NRs mais comuns da construção civil em TODAS as organizations existentes.
-- Para novas organizations criadas depois, o código da aplicação deve oferecer
-- uma action "Inicializar NRs padrão" (ou seed via trigger — não implementado aqui
-- pra evitar side effect em INSERT de organizations).

INSERT INTO tipos_treinamento (org_id, codigo, nome, descricao, validade_meses, sort_order)
SELECT o.id, t.codigo, t.nome, t.descricao, t.validade_meses, t.sort_order
FROM organizations o
CROSS JOIN (VALUES
  ('NR-6',  'EPI — Equipamento de Proteção Individual',          'Uso e conservação de EPIs',                  12,  6),
  ('NR-10', 'Segurança em Instalações Elétricas',                'Básico 40h ou Complementar 40h',             24,  10),
  ('NR-11', 'Transporte e Movimentação de Materiais',            'Operadores de empilhadeira, guindastes',      12,  11),
  ('NR-12', 'Segurança em Máquinas e Equipamentos',              'Operadores de máquinas pesadas',              24,  12),
  ('NR-17', 'Ergonomia',                                          'Postura, levantamento de peso',               12,  17),
  ('NR-18', 'Condições na Indústria da Construção',              'Específico para canteiro de obra',            12,  18),
  ('NR-20', 'Inflamáveis e Combustíveis',                         'Manuseio de combustíveis',                    36,  20),
  ('NR-33', 'Espaços Confinados',                                 'Trabalho em espaços confinados',              12,  33),
  ('NR-34', 'Construção Naval',                                   'Específico para indústria naval',             12,  34),
  ('NR-35', 'Trabalho em Altura',                                 'Acima de 2m — validade 2 anos',               24,  35)
) AS t(codigo, nome, descricao, validade_meses, sort_order)
ON CONFLICT (org_id, codigo) DO NOTHING;
