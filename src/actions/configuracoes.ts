'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

async function getAdminCtx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = data as { org_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') return null
  return { user, profile, admin }
}

export type EcosystemConfig = {
  spelho_webhook_secret: string | null
  spelho_callback_url: string | null
  spelho_callback_secret: string | null
}

export async function getEcosystemConfig(): Promise<EcosystemConfig | null> {
  const ctx = await getAdminCtx()
  if (!ctx) return null
  const { data } = await ctx.admin
    .from('organizations')
    .select('spelho_webhook_secret, spelho_callback_url, spelho_callback_secret')
    .eq('id', ctx.profile.org_id)
    .single()
  return data as EcosystemConfig | null
}

export async function saveEcosystemConfig(config: {
  spelho_callback_url?: string | null
  spelho_callback_secret?: string | null
}): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Não autorizado' }
  const { error } = await ctx.admin
    .from('organizations')
    .update({
      spelho_callback_url: config.spelho_callback_url?.trim() || null,
      spelho_callback_secret: config.spelho_callback_secret?.trim() || null,
    })
    .eq('id', ctx.profile.org_id)
  if (error) return { error: error.message }
  revalidatePath('/admin/configuracoes')
  return { success: true }
}

export async function generateSpelhoWebhookSecret(): Promise<{ error?: string; secret?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Não autorizado' }
  const secret = crypto.randomBytes(32).toString('hex')
  const { error } = await ctx.admin
    .from('organizations')
    .update({ spelho_webhook_secret: secret })
    .eq('id', ctx.profile.org_id)
  if (error) return { error: error.message }
  return { secret }
}
