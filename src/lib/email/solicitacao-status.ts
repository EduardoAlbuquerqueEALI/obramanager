import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { render } from '@react-email/components'
import StatusSolicitacao from '@/emails/StatusSolicitacao'

interface SolicitacaoStatusEmailParams {
  solicitacaoId: string
  novoStatus: string
}

export async function sendSolicitacaoStatusEmail(params: SolicitacaoStatusEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const admin = createAdminClient()

  // Get solicitacao with requester info
  const { data: sol } = await admin
    .from('solicitacoes_compra')
    .select('title, description, requested_by')
    .eq('id', params.solicitacaoId)
    .single()
  if (!sol) return
  const solRow = sol as { title: string; description: string | null; requested_by: string | null }
  if (!solRow.requested_by) return

  // Get requester profile
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', solRow.requested_by)
    .single()
  if (!profile) return
  const p = profile as { full_name: string; email: string | null }
  if (!p.email) return

  const html = await render(
    StatusSolicitacao({
      memberNome: p.full_name,
      titulo: solRow.title,
      novoStatus: params.novoStatus,
      descricao: solRow.description,
    }),
  )

  await resend.emails.send({
    from: FROM_EMAIL,
    to: p.email,
    subject: `[Obra Manager] Solicitacao atualizada — ${solRow.title}`,
    html,
  })
}
