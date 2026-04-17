export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AreaFormDialog from '@/components/areas/area-form-dialog'
import AreaCard from '@/components/areas/area-card'

type AreaRow = {
  id: string
  name: string
  description: string | null
  icon: string
  color: string
  org_id: string | null
}

type TemplateRow = { id: string; area_servico_id: string | null }

export default async function AreasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const orgId = profile.org_id

  const [areasResult, templatesResult] = await Promise.all([
    admin
      .from('areas_servico')
      .select('id, name, description, icon, color, org_id')
      .eq('org_id', orgId)
      .is('empreendimento_id', null)
      .order('name'),
    admin
      .from('checklist_templates')
      .select('id, area_servico_id')
      .eq('org_id', orgId),
  ])

  const areas = (areasResult.data ?? []) as AreaRow[]
  const templates = (templatesResult.data ?? []) as TemplateRow[]

  const templateCountByArea = new Map<string, number>()
  for (const t of templates) {
    if (!t.area_servico_id) continue
    templateCountByArea.set(t.area_servico_id, (templateCountByArea.get(t.area_servico_id) ?? 0) + 1)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Áreas de Serviço</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Categorias de trabalho e modelos de checklist</p>
        </div>
        <AreaFormDialog mode="create" />
      </div>

      {areas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">Nenhuma área de serviço cadastrada.</p>
          <p className="text-xs mt-1">Clique em &quot;Nova Área&quot; para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(area => (
            <AreaCard
              key={area.id}
              area={area}
              templateCount={templateCountByArea.get(area.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
