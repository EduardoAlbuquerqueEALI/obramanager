'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fornecedorSchema } from '@/lib/validations/fornecedor'

export type ActionResult = { error?: string; success?: boolean; id?: string }

async function getAdminProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = data as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') return null
  return { user, profile, admin }
}

export async function createFornecedor(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = fornecedorSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await ctx.admin
    .from('fornecedores')
    .insert({
      org_id: ctx.profile.org_id,
      nome: parsed.data.nome,
      cnpj: parsed.data.cnpj || null,
      contato_nome: parsed.data.contato_nome || null,
      contato_telefone: parsed.data.contato_telefone || null,
      contato_email: parsed.data.contato_email || null,
      observacoes: parsed.data.observacoes || null,
      ativo: parsed.data.ativo,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/fornecedores')
  return { success: true, id: (data as { id: string }).id }
}

export async function updateFornecedor(id: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = fornecedorSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.admin
    .from('fornecedores')
    .update({
      nome: parsed.data.nome,
      cnpj: parsed.data.cnpj || null,
      contato_nome: parsed.data.contato_nome || null,
      contato_telefone: parsed.data.contato_telefone || null,
      contato_email: parsed.data.contato_email || null,
      observacoes: parsed.data.observacoes || null,
      ativo: parsed.data.ativo,
    })
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/fornecedores')
  return { success: true }
}

export async function deleteFornecedor(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  // Valida que o fornecedor pertence à org antes de tentar deletar
  const { data: forn } = await ctx.admin
    .from('fornecedores')
    .select('id, nome')
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!forn) return { error: 'Fornecedor não encontrado' }

  // Checa dependências — cotações ou ordens_compra vinculadas bloqueiam delete
  const [{ count: cotCount }, { count: ocCount }] = await Promise.all([
    ctx.admin.from('cotacoes').select('id', { count: 'exact', head: true }).eq('fornecedor_id', id),
    ctx.admin.from('ordens_compra').select('id', { count: 'exact', head: true }).eq('fornecedor_id', id),
  ])

  if ((cotCount ?? 0) > 0 || (ocCount ?? 0) > 0) {
    const parts = []
    if (cotCount) parts.push(`${cotCount} cotação(ões)`)
    if (ocCount) parts.push(`${ocCount} ordem(ns) de compra`)
    return {
      error: `Não é possível remover: há ${parts.join(' e ')} vinculada(s). Marque o fornecedor como inativo.`,
    }
  }

  const { error } = await ctx.admin
    .from('fornecedores')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/fornecedores')
  return { success: true }
}
