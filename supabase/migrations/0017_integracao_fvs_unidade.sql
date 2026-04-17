-- ============================================================
-- 0017_integracao_fvs_unidade.sql
-- Quando TODAS as cells FVS de uma unidade são aprovadas/reaprovadas,
-- marca a unidade como 'concluida' automaticamente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_fvs_unidade_concluida()
RETURNS TRIGGER
SET search_path = ''
AS $$
DECLARE
  v_unidade_id UUID;
  v_total INTEGER;
  v_aprovados INTEGER;
BEGIN
  v_unidade_id := NEW.unidade_id;

  -- Conta total de cells FVS para essa unidade (em TODAS as FVS ativas, não concluídas)
  SELECT COUNT(*) INTO v_total
  FROM public.verificacao_unidades vu
  JOIN public.verificacoes_servico vs ON vs.id = vu.verificacao_id
  WHERE vu.unidade_id = v_unidade_id
    AND vs.status = 'em_andamento';

  -- Conta aprovados (aprovado + aprovado_reinspecao)
  SELECT COUNT(*) INTO v_aprovados
  FROM public.verificacao_unidades vu
  JOIN public.verificacoes_servico vs ON vs.id = vu.verificacao_id
  WHERE vu.unidade_id = v_unidade_id
    AND vs.status = 'em_andamento'
    AND vu.status IN ('aprovado', 'aprovado_reinspecao');

  -- Se total > 0 e todos aprovados → marca unidade como concluída
  IF v_total > 0 AND v_total = v_aprovados THEN
    UPDATE public.unidades
    SET status = 'concluida'
    WHERE id = v_unidade_id
      AND status != 'concluida'   -- evita update desnecessário
      AND status != 'entregue';   -- não regride entregue → concluída
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispara após update de status em verificacao_unidades
CREATE TRIGGER trg_fvs_auto_concluir_unidade
  AFTER UPDATE OF status ON public.verificacao_unidades
  FOR EACH ROW
  WHEN (NEW.status IN ('aprovado', 'aprovado_reinspecao'))
  EXECUTE FUNCTION public.check_fvs_unidade_concluida();
