import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Valida um token do portal do cliente e retorna os dados básicos do acesso.
 * Usado em rotas públicas `/cliente/[token]/*`. Retorna `null` se inválido/revogado.
 *
 * Efeitos colaterais: atualiza `ultimo_acesso_em` de forma best-effort.
 */
export async function validateTokenAndGetAccess(token: string) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('acessos_cliente')
    .select(`
      id, token, unidade_id, empreendimento_id, revogado,
      comprador_nome, comprador_email, comprador_telefone,
      unidades(number, floor, type, torres(name, empreendimentos(name, city, state, logo_url, org_id))),
      empreendimentos!inner(name, city, state, logo_url, org_id, organizations!inner(name))
    `)
    .eq('token', token)
    .maybeSingle()

  if (!data) return null
  const row = data as unknown as {
    id: string
    token: string
    unidade_id: string
    empreendimento_id: string
    revogado: boolean
    comprador_nome: string | null
    comprador_email: string | null
    comprador_telefone: string | null
    unidades: {
      number: string
      floor: number
      type: string | null
      torres: { name: string; empreendimentos: unknown } | { name: string; empreendimentos: unknown }[] | null
    } | null
    empreendimentos: {
      name: string
      city: string | null
      state: string | null
      logo_url: string | null
      org_id: string
      organizations: { name: string } | { name: string }[]
    } | { name: string; city: string | null; state: string | null; logo_url: string | null; org_id: string; organizations: { name: string } | { name: string }[] }[]
  }

  if (row.revogado) return null

  // Best-effort: grava último acesso (ignora erro)
  admin
    .from('acessos_cliente')
    .update({ ultimo_acesso_em: new Date().toISOString() })
    .eq('id', row.id)
    .then(() => undefined, () => undefined)

  const emp = Array.isArray(row.empreendimentos) ? row.empreendimentos[0] : row.empreendimentos
  const org = Array.isArray(emp.organizations) ? emp.organizations[0] : emp.organizations

  const torre = row.unidades?.torres
    ? Array.isArray(row.unidades.torres) ? row.unidades.torres[0] : row.unidades.torres
    : null

  return {
    id: row.id,
    token: row.token,
    unidadeId: row.unidade_id,
    empreendimentoId: row.empreendimento_id,
    compradorNome: row.comprador_nome,
    compradorEmail: row.comprador_email,
    compradorTelefone: row.comprador_telefone,
    unidade: row.unidades ? {
      number: row.unidades.number,
      floor: row.unidades.floor,
      type: row.unidades.type,
      torreName: torre?.name ?? '',
    } : null,
    empreendimento: {
      id: row.empreendimento_id,
      name: emp.name,
      city: emp.city,
      state: emp.state,
      logoUrl: emp.logo_url,
    },
    orgName: org.name,
    admin,
  }
}

export type PortalAccess = NonNullable<Awaited<ReturnType<typeof validateTokenAndGetAccess>>>
