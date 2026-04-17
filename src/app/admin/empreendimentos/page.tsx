export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import EmpreendimentoCard from '@/components/empreendimentos/empreendimento-card'
import EmpreendimentoFormDialog from '@/components/empreendimentos/empreendimento-form-dialog'

type EmpRow = {
  id: string
  name: string
  city: string | null
  state: string | null
  status: string
  logo_url: string | null
}

type TorreRow = { id: string; empreendimento_id: string }
type UnidadeRow = { id: string; torre_id: string }
type ChecklistRow = { id: string; unidade_id: string; status: string }

export default async function EmpreendimentosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const orgId = profile.org_id

  const [empsResult, torresResult, unidadesResult, checklistsResult] = await Promise.all([
    admin.from('empreendimentos').select('id, name, city, state, status, logo_url').eq('org_id', orgId).order('name'),
    admin.from('torres').select('id, empreendimento_id'),
    admin.from('unidades').select('id, torre_id'),
    admin.from('unidade_checklist').select('id, unidade_id, status'),
  ])

  const emps = (empsResult.data ?? []) as EmpRow[]
  const allTorres = (torresResult.data ?? []) as TorreRow[]
  const allUnidades = (unidadesResult.data ?? []) as UnidadeRow[]
  const checklists = (checklistsResult.data ?? []) as ChecklistRow[]

  const empIds = new Set(emps.map(e => e.id))

  const torresByEmp = new Map<string, string[]>()
  for (const t of allTorres) {
    if (!empIds.has(t.empreendimento_id)) continue
    if (!torresByEmp.has(t.empreendimento_id)) torresByEmp.set(t.empreendimento_id, [])
    torresByEmp.get(t.empreendimento_id)!.push(t.id)
  }

  const unidadesByTorre = new Map<string, string[]>()
  for (const u of allUnidades) {
    if (!unidadesByTorre.has(u.torre_id)) unidadesByTorre.set(u.torre_id, [])
    unidadesByTorre.get(u.torre_id)!.push(u.id)
  }

  const completedByUnidade = new Set<string>()
  for (const c of checklists) {
    if (c.status === 'completed' || c.status === 'approved') {
      completedByUnidade.add(c.unidade_id)
    }
  }

  const empStats = emps.map(emp => {
    const torreIds = torresByEmp.get(emp.id) ?? []
    const unitIds = torreIds.flatMap(tid => unidadesByTorre.get(tid) ?? [])
    const totalUnits = unitIds.length
    const completedUnits = unitIds.filter(uid => completedByUnidade.has(uid)).length
    const pct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0
    return { ...emp, totalUnits, completedUnits, pct }
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Empreendimentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie os empreendimentos da organização</p>
        </div>
        <EmpreendimentoFormDialog mode="create" />
      </div>

      {empStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">Nenhum empreendimento cadastrado.</p>
          <p className="text-xs mt-1">Clique em &quot;Novo Empreendimento&quot; para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empStats.map(emp => (
            <EmpreendimentoCard key={emp.id} emp={emp} />
          ))}
        </div>
      )}
    </div>
  )
}
