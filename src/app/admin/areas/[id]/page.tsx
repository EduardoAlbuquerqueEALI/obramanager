export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import AreaFormDialog from '@/components/areas/area-form-dialog'
import ChecklistTemplateEditor from '@/components/areas/checklist-template-editor'

type AreaRow = {
  id: string
  name: string
  description: string | null
  icon: string
  color: string
}

type TemplateRow = {
  id: string
  name: string
  items: unknown
  area_servico_id: string | null
}

export default async function AreaDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: areaData } = await admin
    .from('areas_servico')
    .select('id, name, description, icon, color')
    .eq('id', params.id)
    .eq('org_id', profile.org_id)
    .single()

  const area = areaData as AreaRow | null
  if (!area) notFound()

  const { data: templatesData } = await admin
    .from('checklist_templates')
    .select('id, name, items, area_servico_id')
    .eq('org_id', profile.org_id)
    .eq('area_servico_id', params.id)
    .order('name')

  const templates = (templatesData ?? []) as TemplateRow[]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/areas" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{area.name}</h1>
          {area.description && (
            <p className="text-sm text-muted-foreground">{area.description}</p>
          )}
        </div>
        <AreaFormDialog
          mode="edit"
          area={{
            id: area.id,
            name: area.name,
            description: area.description,
            icon: area.icon,
            color: area.color,
          }}
        />
      </div>

      <ChecklistTemplateEditor
        areaId={params.id}
        templates={templates.map(t => ({
          id: t.id,
          name: t.name,
          items: Array.isArray(t.items) ? t.items as { id: string; title: string; required: boolean }[] : [],
        }))}
      />
    </div>
  )
}
