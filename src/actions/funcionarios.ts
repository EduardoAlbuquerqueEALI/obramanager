'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { funcionarioSchema } from '@/lib/validations/treinamento'

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

export async function createFuncionario(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = funcionarioSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await ctx.admin
    .from('funcionarios')
    .insert({
      org_id: ctx.profile.org_id,
      nome_completo: parsed.data.nome_completo,
      cpf: parsed.data.cpf || null,
      funcao: parsed.data.funcao || null,
      foto_url: parsed.data.foto_url || null,
      ativo: parsed.data.ativo,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/funcionarios')
  revalidatePath('/admin/treinamentos')
  return { success: true, id: (data as { id: string }).id }
}

export async function updateFuncionario(id: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = funcionarioSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.admin
    .from('funcionarios')
    .update({
      nome_completo: parsed.data.nome_completo,
      cpf: parsed.data.cpf || null,
      funcao: parsed.data.funcao || null,
      foto_url: parsed.data.foto_url || null,
      ativo: parsed.data.ativo,
    })
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/funcionarios')
  revalidatePath('/admin/treinamentos')
  return { success: true }
}

export async function deleteFuncionario(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { error } = await ctx.admin
    .from('funcionarios')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/funcionarios')
  revalidatePath('/admin/treinamentos')
  return { success: true }
}
