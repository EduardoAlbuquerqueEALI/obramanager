import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { render } from '@react-email/components'
import AtualizacaoObra from '@/emails/AtualizacaoObra'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4040'

interface AtualizacaoObraEmailParams {
  empreendimentoId: string
  empreendimentoNome: string
  titulo: string
  descricao: string | null
  percentualAvanco: number | null
}

export async function sendAtualizacaoObraEmail(params: AtualizacaoObraEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const admin = createAdminClient()

  // Get all active client accesses for this empreendimento that have email
  const { data: acessos } = await admin
    .from('acessos_cliente')
    .select('token, comprador_nome, comprador_email')
    .eq('empreendimento_id', params.empreendimentoId)
    .eq('revogado', false)

  const rows = (acessos ?? []) as { token: string; comprador_nome: string | null; comprador_email: string | null }[]
  const withEmail = rows.filter(r => r.comprador_email)
  if (withEmail.length === 0) return

  for (const acesso of withEmail) {
    const html = await render(
      AtualizacaoObra({
        compradorNome: acesso.comprador_nome ?? 'Cliente',
        empreendimentoNome: params.empreendimentoNome,
        titulo: params.titulo,
        descricao: params.descricao,
        percentualAvanco: params.percentualAvanco,
        portalUrl: `${appUrl()}/cliente/${acesso.token}`,
      }),
    )

    await resend.emails.send({
      from: FROM_EMAIL,
      to: acesso.comprador_email!,
      subject: `[Obra Manager] Atualizacao da obra — ${params.titulo}`,
      html,
    })
  }
}
