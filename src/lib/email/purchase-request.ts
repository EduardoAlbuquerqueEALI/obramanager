import { createAdminClient } from '@/lib/supabase/admin'
import { FROM_EMAIL } from '@/lib/resend'

interface PurchaseRequestEmailParams {
  orgId: string
  unidadeId: string
  empreendimentoId: string
  userName: string
  descricao: string
  quantidade: number
  urgencia: string
  solicitacaoId: string
}

export async function sendPurchaseRequestEmail(params: PurchaseRequestEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const admin = createAdminClient()

  // Get admin emails for this org
  const { data: admins } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('org_id', params.orgId)
    .eq('role', 'admin')
    .not('email', 'is', null)

  if (!admins || admins.length === 0) return

  const adminEmails = (admins as { email: string; full_name: string }[])
    .filter(a => a.email)
    .map(a => a.email)

  if (adminEmails.length === 0) return

  const urgenciaLabel: Record<string, string> = {
    baixa: 'Baixa',
    normal: 'Normal',
    alta: '⚠️ Alta',
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4040'

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">Nova Solicitação de Compra</h2>
      <p style="color:#555">Solicitado por <strong>${params.userName}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Descrição</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${params.descricao}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Quantidade</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${params.quantidade}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Urgência</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${urgenciaLabel[params.urgencia] ?? params.urgencia}</td>
        </tr>
      </table>
      <a href="${appUrl}/admin/empreendimentos/${params.empreendimentoId}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
        Ver no painel
      </a>
    </div>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: adminEmails,
      subject: `[Obra Manager] Nova solicitação de compra — ${params.urgencia === 'alta' ? '⚠️ URGENTE' : 'Normal'}`,
      html,
    }),
  })
}
