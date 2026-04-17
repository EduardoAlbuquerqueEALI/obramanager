import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { render } from '@react-email/components'
import FvsConcluida from '@/emails/FvsConcluida'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4040'

interface FvsConcluidaEmailParams {
  fvsId: string
}

export async function sendFvsConcluidaEmail(params: FvsConcluidaEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const admin = createAdminClient()

  // Get FVS with related data
  const { data: fvs } = await admin
    .from('verificacoes_servico')
    .select('id, responsavel_id, empreendimento_id, area_servico_id')
    .eq('id', params.fvsId)
    .single()
  if (!fvs) return
  const f = fvs as { id: string; responsavel_id: string | null; empreendimento_id: string; area_servico_id: string }
  if (!f.responsavel_id) return

  // Get responsavel profile
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', f.responsavel_id)
    .single()
  if (!profile) return
  const p = profile as { full_name: string; email: string | null }
  if (!p.email) return

  // Get empreendimento + area names
  const { data: emp } = await admin
    .from('empreendimentos')
    .select('name')
    .eq('id', f.empreendimento_id)
    .single()
  const { data: area } = await admin
    .from('areas_servico')
    .select('name')
    .eq('id', f.area_servico_id)
    .single()

  const empNome = (emp as { name: string } | null)?.name ?? 'Empreendimento'
  const areaNome = (area as { name: string } | null)?.name ?? 'Area'

  const html = await render(
    FvsConcluida({
      responsavelNome: p.full_name,
      empreendimentoNome: empNome,
      areaNome,
      fvsUrl: `${appUrl()}/admin/fvs/${params.fvsId}`,
    }),
  )

  await resend.emails.send({
    from: FROM_EMAIL,
    to: p.email,
    subject: `[Obra Manager] FVS concluida — ${areaNome}`,
    html,
  })
}
