export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Settings } from 'lucide-react'
import MatrizTreinamentos from '@/components/treinamentos/matriz-treinamentos'

type Funcionario = {
  id: string
  nome_completo: string
  funcao: string | null
  ativo: boolean
}

type TipoTreinamento = {
  id: string
  codigo: string
  nome: string
  validade_meses: number
  ativo: boolean
  sort_order: number
}

type Treinamento = {
  id: string
  funcionario_id: string
  tipo_treinamento_id: string
  data_realizacao: string
  data_vencimento: string | null
  certificado_url: string | null
  carga_horaria: number | null
  instrutor: string | null
}

export default async function TreinamentosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const [funcionariosRes, tiposRes, treinamentosRes] = await Promise.all([
    admin.from('funcionarios').select('id, nome_completo, funcao, ativo').eq('org_id', profile.org_id).order('nome_completo'),
    admin.from('tipos_treinamento').select('*').eq('org_id', profile.org_id).eq('ativo', true).order('sort_order'),
    // Treinamentos: filtrar via join com funcionarios da org
    admin
      .from('treinamentos')
      .select('id, funcionario_id, tipo_treinamento_id, data_realizacao, data_vencimento, certificado_url, carga_horaria, instrutor, funcionarios!inner(org_id)')
      .eq('funcionarios.org_id', profile.org_id),
  ])

  const funcionarios = (funcionariosRes.data ?? []) as Funcionario[]
  const tipos = (tiposRes.data ?? []) as TipoTreinamento[]
  const treinamentos = (treinamentosRes.data ?? []) as unknown as Treinamento[]

  return (
    <div className="p-8 max-w-[100rem] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Matriz de Treinamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controle de NRs por funcionário. Verde = válido · Amarelo = vence em 30 dias · Vermelho = vencido ou ausente.
          </p>
        </div>
        <Link href="/admin/treinamentos/tipos">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Tipos de NR
          </Button>
        </Link>
      </div>

      {funcionarios.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Cadastre funcionários em <Link href="/admin/funcionarios" className="underline">Funcionários</Link> para montar a matriz.
        </Card>
      ) : tipos.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum tipo de treinamento (NR) cadastrado. Vá em <Link href="/admin/treinamentos/tipos" className="underline">Tipos de NR</Link>.
        </Card>
      ) : (
        <MatrizTreinamentos
          funcionarios={funcionarios}
          tipos={tipos}
          treinamentos={treinamentos}
        />
      )}
    </div>
  )
}
