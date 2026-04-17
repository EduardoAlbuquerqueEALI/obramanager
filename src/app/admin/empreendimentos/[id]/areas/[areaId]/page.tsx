export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import OverrideTemplateEditor from '@/components/empreendimentos/override-template-editor'

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
  empreendimento_id: string | null
}

export default async function EmpreendimentoAreaOverridePage({
  params,
}: {
  params: { id: string; areaId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  // Empreendimento belongs to org
  const { data: empData } = await admin
    .from('empreendimentos')
    .select('id, name')
    .eq('id', params.id)
    .eq('org_id', profile.org_id)
    .maybeSingle()
  const emp = empData as { id: string; name: string } | null
  if (!emp) notFound()

  // Area belongs to org
  const { data: areaData } = await admin
    .from('areas_servico')
    .select('id, name, description, icon, color')
    .eq('id', params.areaId)
    .eq('org_id', profile.org_id)
    .maybeSingle()
  const area = areaData as AreaRow | null
  if (!area) notFound()

  // Pair must be active
  const { data: pair } = await admin
    .from('empreendimento_areas_servico')
    .select('empreendimento_id')
    .eq('empreendimento_id', params.id)
    .eq('area_servico_id', params.areaId)
    .maybeSingle()
  if (!pair) notFound()

  // Load templates for this area: override (for this emp) OR global (NULL)
  const { data: templatesData } = await admin
    .from('checklist_templates')
    .select('id, name, items, empreendimento_id')
    .eq('org_id', profile.org_id)
    .eq('area_servico_id', params.areaId)

  const templates = ((templatesData ?? []) as TemplateRow[])
  const override = templates.find(t => t.empreendimento_id === params.id) ?? null
  const global = templates.find(t => t.empreendimento_id === null) ?? null

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/admin/empreendimentos/${params.id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {area.name} — {emp.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Checklist customizado para este empreendimento
          </p>
        </div>
      </div>

      <OverrideTemplateEditor
        empreendimentoId={params.id}
        areaId={params.areaId}
        areaName={area.name}
        override={override ? {
          id: override.id,
          name: override.name,
          items: Array.isArray(override.items)
            ? (override.items as { id: string; title: string; required: boolean }[])
            : [],
        } : null}
        global={global ? {
          id: global.id,
          name: global.name,
          items: Array.isArray(global.items)
            ? (global.items as { id: string; title: string; required: boolean }[])
            : [],
        } : null}
      />
    </div>
  )
}
