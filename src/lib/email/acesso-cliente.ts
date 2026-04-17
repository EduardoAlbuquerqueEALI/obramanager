import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { render } from '@react-email/components'
import AcessoCliente from '@/emails/AcessoCliente'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4040'

interface AcessoClienteEmailParams {
  token: string
  compradorNome: string | null
  compradorEmail: string | null
  unidadeId: string
  empreendimentoId: string
}

export async function sendAcessoClienteEmail(params: AcessoClienteEmailParams): Promise<void> {
  if (!params.compradorEmail) return

  const resend = getResend()
  if (!resend) return

  const admin = createAdminClient()

  // Get empreendimento name
  const { data: emp } = await admin
    .from('empreendimentos')
    .select('name')
    .eq('id', params.empreendimentoId)
    .single()
  const empNome = (emp as { name: string } | null)?.name ?? 'Empreendimento'

  // Get unidade number
  const { data: unidade } = await admin
    .from('unidades')
    .select('number')
    .eq('id', params.unidadeId)
    .single()
  const unidadeNumber = (unidade as { number: string } | null)?.number ?? 'Unidade'

  const html = await render(
    AcessoCliente({
      compradorNome: params.compradorNome ?? 'Cliente',
      empreendimentoNome: empNome,
      unidadeNumber,
      portalUrl: `${appUrl()}/cliente/${params.token}`,
    }),
  )

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.compradorEmail,
    subject: `[Obra Manager] Seu acesso ao portal — ${empNome}`,
    html,
  })
}
