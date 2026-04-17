import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { render } from '@react-email/components'
import NovoChamado from '@/emails/NovoChamado'
import RespostaChamado from '@/emails/RespostaChamado'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4040'

// ─── Novo chamado criado pelo cliente → notifica admins ─────────────────────

interface NovoChamadoEmailParams {
  empreendimentoId: string
  chamadoId: string
  compradorNome: string | null
  categoria: string
  titulo: string
  descricao: string
  unidadeNumber: string
  empreendimentoNome: string
}

export async function sendNovoChamadoEmail(params: NovoChamadoEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const admin = createAdminClient()

  // Get org_id from empreendimento
  const { data: emp } = await admin
    .from('empreendimentos')
    .select('org_id')
    .eq('id', params.empreendimentoId)
    .single()
  if (!emp) return
  const orgId = (emp as { org_id: string }).org_id

  // Get admin emails
  const { data: admins } = await admin
    .from('profiles')
    .select('email')
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .not('email', 'is', null)

  const emails = ((admins ?? []) as { email: string }[])
    .map(a => a.email)
    .filter(Boolean)
  if (emails.length === 0) return

  const html = await render(
    NovoChamado({
      compradorNome: params.compradorNome ?? 'Cliente',
      categoria: params.categoria,
      titulo: params.titulo,
      descricao: params.descricao,
      unidadeNumber: params.unidadeNumber,
      empreendimentoNome: params.empreendimentoNome,
      chamadoUrl: `${appUrl()}/admin/chamados/${params.chamadoId}`,
    }),
  )

  await resend.emails.send({
    from: FROM_EMAIL,
    to: emails,
    subject: `[Obra Manager] Novo chamado — ${params.titulo}`,
    html,
  })
}

// ─── Admin responde chamado → notifica cliente ──────────────────────────────

interface RespostaAdminEmailParams {
  chamadoId: string
  chamadoTitulo: string
  autorNome: string
  mensagem: string
  unidadeId: string
}

export async function sendRespostaAdminEmail(params: RespostaAdminEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const admin = createAdminClient()

  // Find the client access token for this unit (to build the portal URL and get email)
  const { data: acessos } = await admin
    .from('acessos_cliente')
    .select('token, comprador_nome, comprador_email')
    .eq('unidade_id', params.unidadeId)
    .eq('revogado', false)

  const rows = (acessos ?? []) as { token: string; comprador_nome: string | null; comprador_email: string | null }[]
  const withEmail = rows.filter(r => r.comprador_email)
  if (withEmail.length === 0) return

  for (const acesso of withEmail) {
    const html = await render(
      RespostaChamado({
        destinatarioNome: acesso.comprador_nome ?? 'Cliente',
        autorNome: params.autorNome,
        chamadoTitulo: params.chamadoTitulo,
        mensagem: params.mensagem,
        chamadoUrl: `${appUrl()}/cliente/${acesso.token}/chamados/${params.chamadoId}`,
      }),
    )

    await resend.emails.send({
      from: FROM_EMAIL,
      to: acesso.comprador_email!,
      subject: `[Obra Manager] Resposta no chamado — ${params.chamadoTitulo}`,
      html,
    })
  }
}

// ─── Cliente responde chamado → notifica admins ─────────────────────────────

interface RespostaClienteEmailParams {
  empreendimentoId: string
  chamadoId: string
  chamadoTitulo: string
  compradorNome: string | null
  mensagem: string
}

export async function sendRespostaClienteEmail(params: RespostaClienteEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const admin = createAdminClient()

  const { data: emp } = await admin
    .from('empreendimentos')
    .select('org_id')
    .eq('id', params.empreendimentoId)
    .single()
  if (!emp) return
  const orgId = (emp as { org_id: string }).org_id

  const { data: admins } = await admin
    .from('profiles')
    .select('email')
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .not('email', 'is', null)

  const emails = ((admins ?? []) as { email: string }[])
    .map(a => a.email)
    .filter(Boolean)
  if (emails.length === 0) return

  const html = await render(
    RespostaChamado({
      destinatarioNome: 'Equipe',
      autorNome: params.compradorNome ?? 'Cliente',
      chamadoTitulo: params.chamadoTitulo,
      mensagem: params.mensagem,
      chamadoUrl: `${appUrl()}/admin/chamados/${params.chamadoId}`,
    }),
  )

  await resend.emails.send({
    from: FROM_EMAIL,
    to: emails,
    subject: `[Obra Manager] Cliente respondeu — ${params.chamadoTitulo}`,
    html,
  })
}
