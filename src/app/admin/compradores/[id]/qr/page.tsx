export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import QrPrintView from '@/components/compradores/qr-print-view'

type Acesso = {
  id: string
  token: string
  comprador_nome: string | null
  unidade: {
    number: string
    floor: number
    torre_name: string
    empreendimento_name: string
  } | null
}

export default async function QrPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role, full_name').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member'; full_name: string | null } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: acessoData } = await admin
    .from('acessos_cliente')
    .select(`
      id, token, comprador_nome, empreendimento_id,
      empreendimentos!inner(name, org_id),
      unidades(number, floor, torres(name))
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!acessoData) notFound()

  const row = acessoData as unknown as {
    id: string; token: string; comprador_nome: string | null
    empreendimentos: { name: string; org_id: string } | { name: string; org_id: string }[]
    unidades: { number: string; floor: number; torres: { name: string } | { name: string }[] | null } | null
  }

  const emp = Array.isArray(row.empreendimentos) ? row.empreendimentos[0] : row.empreendimentos
  if (emp.org_id !== profile.org_id) notFound()

  let unidade: Acesso['unidade'] = null
  if (row.unidades) {
    const torre = Array.isArray(row.unidades.torres) ? row.unidades.torres[0] : row.unidades.torres
    unidade = {
      number: row.unidades.number,
      floor: row.unidades.floor,
      torre_name: torre?.name ?? '',
      empreendimento_name: emp.name,
    }
  }

  const { data: orgData } = await admin.from('organizations').select('name').eq('id', profile.org_id).single()
  const orgName = (orgData as { name: string } | null)?.name ?? ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4040'
  const fullUrl = `${appUrl}/cliente/${row.token}`

  return (
    <QrPrintView
      url={fullUrl}
      compradorNome={row.comprador_nome}
      unidade={unidade}
      orgName={orgName}
    />
  )
}
