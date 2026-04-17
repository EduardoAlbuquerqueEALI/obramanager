import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 },
    )
  }

  const { orgName, fullName, email, password } = parsed.data
  const admin = createAdminClient()

  // Create organization
  const slug = orgName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, slug: `${slug}-${Date.now()}` })
    .select('id')
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Erro ao criar organização' }, { status: 500 })
  }

  // Create user via admin (auto-confirms email)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { org_id: org.id, full_name: fullName, role: 'admin' },
    app_metadata: { role: 'admin', org_id: org.id },
  })

  if (authError || !authData.user) {
    // Rollback org
    await admin.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário' }, { status: 500 })
  }

  // Trigger handle_new_user already created the profile.
  // But we need to also store email in profile (trigger updated in migration 0002 does this).
  // Fallback: update email in case trigger ran before migration was applied
  await admin
    .from('profiles')
    .update({ email })
    .eq('id', authData.user.id)

  return NextResponse.json({ success: true })
}
