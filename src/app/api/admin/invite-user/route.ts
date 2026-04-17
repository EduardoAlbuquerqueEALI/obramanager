import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { inviteSchema } from '@/lib/validations/invite'
import { render } from '@react-email/components'
import ConviteUsuario from '@/emails/ConviteUsuario'

type CallerProfile = { org_id: string; role: 'admin' | 'member' } | null

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

  const body = await req.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 },
    )
  }

  const { email, fullName, role, empreendimentoIds, areaIds } = parsed.data
  const admin = createAdminClient()

  // Generate invite link (creates user + returns link)
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { org_id: callerProfile.org_id, full_name: fullName, role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    },
  })

  if (linkError || !linkData.user) {
    return NextResponse.json(
      { error: linkError?.message ?? 'Erro ao gerar convite' },
      { status: 500 },
    )
  }

  const newUserId = linkData.user.id
  const actionLink = linkData.properties.action_link

  // Set app_metadata with role + org
  await admin.auth.admin.updateUserById(newUserId, {
    app_metadata: { role, org_id: callerProfile.org_id },
  })

  // Also store email in profile (trigger might have run already)
  await admin.from('profiles').update({ email }).eq('id', newUserId)

  // Insert empreendimento assignments
  if (empreendimentoIds.length > 0) {
    await admin.from('user_empreendimentos').insert(
      empreendimentoIds.map((id) => ({ user_id: newUserId, empreendimento_id: id })),
    )
  }

  // Insert area assignments
  if (areaIds.length > 0) {
    await admin.from('user_areas').insert(
      areaIds.map((id) => ({ user_id: newUserId, area_servico_id: id })),
    )
  }

  // Send invite email
  const resend = getResend()
  if (resend && actionLink) {
    const html = await render(ConviteUsuario({ fullName, actionLink }))
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Você foi convidado para o Obra Manager',
      html,
    })
  }

  return NextResponse.json({ success: true })
}
