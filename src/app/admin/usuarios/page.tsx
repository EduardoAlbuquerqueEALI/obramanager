export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import UsuariosTable, { type UserRow } from '@/components/usuarios-table'
import InviteUserDialog from '@/components/invite-user-dialog'
import type { MultiSelectOption } from '@/components/multi-select'

type ProfileRow = { id: string; full_name: string; email: string | null; role: 'admin' | 'member' }
type EmpRow = { id: string; name: string }
type AreaRow = { id: string; name: string }
type UserEmpRow = { user_id: string; empreendimento_id: string }
type UserAreaRow = { user_id: string; area_servico_id: string }

export default async function UsuariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: callerData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const callerProfile = callerData as { org_id: string; role: 'admin' | 'member' } | null
  if (!callerProfile || callerProfile.role !== 'admin') redirect('/app')

  const orgId = callerProfile.org_id

  const [profilesResult, empreendimentosResult] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role').eq('org_id', orgId).order('full_name'),
    admin.from('empreendimentos').select('id, name').eq('org_id', orgId).order('name'),
  ])

  const profiles = (profilesResult.data ?? []) as ProfileRow[]
  const empreendimentos = (empreendimentosResult.data ?? []) as EmpRow[]

  const empIds = empreendimentos.map(e => e.id)
  const areasResult = empIds.length > 0
    ? await admin.from('areas_servico').select('id, name').in('empreendimento_id', empIds).order('name')
    : { data: [] }
  const areas = (areasResult.data ?? []) as AreaRow[]

  const userIds = profiles.map(p => p.id)

  const [userEmpsResult, userAreasResult] = userIds.length > 0
    ? await Promise.all([
        admin.from('user_empreendimentos').select('user_id, empreendimento_id').in('user_id', userIds),
        admin.from('user_areas').select('user_id, area_servico_id').in('user_id', userIds),
      ])
    : [{ data: [] }, { data: [] }]

  const userEmps = (userEmpsResult.data ?? []) as UserEmpRow[]
  const userAreas = (userAreasResult.data ?? []) as UserAreaRow[]

  const userRows: UserRow[] = profiles.map(p => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role,
    empreendimentoIds: userEmps.filter(ue => ue.user_id === p.id).map(ue => ue.empreendimento_id),
    areaIds: userAreas.filter(ua => ua.user_id === p.id).map(ua => ua.area_servico_id),
  }))

  const empOptions: MultiSelectOption[] = empreendimentos.map(e => ({ value: e.id, label: e.name }))
  const areaOptions: MultiSelectOption[] = areas.map(a => ({ value: a.id, label: a.name }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os membros da sua organização
          </p>
        </div>
        <InviteUserDialog empreendimentos={empOptions} areas={areaOptions} />
      </div>

      <UsuariosTable
        users={userRows}
        empreendimentos={empOptions}
        areas={areaOptions}
        currentUserId={user.id}
      />
    </div>
  )
}
