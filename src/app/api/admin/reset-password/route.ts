import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { render } from '@react-email/components'
import ResetSenha from '@/emails/ResetSenha'

type CallerProfile = { org_id: string; role: 'admin' | 'member' } | null
type TargetProfile = { org_id: string; full_name: string; email: string | null } | null

export async function POST(req: NextRequest) {
  // Verify caller is admin
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: callerData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const callerProfile = callerData as CallerProfile
  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

  // Verify target is in same org
  const { data: targetData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const targetProfile = targetData as TargetProfile
  if (!targetProfile || targetProfile.org_id !== callerProfile.org_id) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const admin = createAdminClient()

  // Generate password recovery link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: targetProfile.email ?? '',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    },
  })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const actionLink = linkData.properties.action_link

  // Send reset email
  const resend = getResend()
  if (resend && actionLink) {
    const html = await render(
      ResetSenha({ fullName: targetProfile.full_name, actionLink }),
    )
    await resend.emails.send({
      from: FROM_EMAIL,
      to: targetProfile.email ?? '',
      subject: 'Redefinição de senha — Obra Manager',
      html,
    })
  }

  return NextResponse.json({ success: true })
}
