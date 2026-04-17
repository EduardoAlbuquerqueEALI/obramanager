export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ensureChecklistItemsForArea,
  getUnidadesStatusByArea,
} from '@/actions/member'
import AreaUnitPreview from '@/components/member/area-unit-preview'

interface Props {
  params: { id: string; areaId: string }
}

type AreaRow = {
  id: string
  name: string
  icon: string
  color: string
  org_id: string | null
}

type EmpRow = {
  id: string
  name: string
  org_id: string
}

export default async function MemberAreaPreviewPage({ params }: Props) {
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
  if (!profile) redirect('/login')

  // Empreendimento
  const { data: empData } = await admin
    .from('empreendimentos')
    .select('id, name, org_id')
    .eq('id', params.id)
    .eq('org_id', profile.org_id)
    .maybeSingle()
  const emp = empData as EmpRow | null
  if (!emp) notFound()

  // Area
  const { data: areaData } = await admin
    .from('areas_servico')
    .select('id, name, icon, color, org_id')
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

  // Member access checks
  if (profile.role !== 'admin') {
    const { data: hasEmp } = await admin
      .from('user_empreendimentos')
      .select('empreendimento_id')
      .eq('user_id', user.id)
      .eq('empreendimento_id', params.id)
      .maybeSingle()
    if (!hasEmp) notFound()

    const { data: hasArea } = await admin
      .from('user_areas')
      .select('area_servico_id')
      .eq('user_id', user.id)
      .eq('area_servico_id', params.areaId)
      .maybeSingle()
    if (!hasArea) notFound()
  }

  // Materialize checklist items for all units in this emp × area
  await ensureChecklistItemsForArea(params.id, params.areaId)

  // Fetch per-unit status
  const statusResult = await getUnidadesStatusByArea(params.id, params.areaId)
  const torres = statusResult.torres ?? []

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Link
          href={`/app/empreendimentos/${params.id}`}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 truncate">{emp.name}</p>
        </div>
      </div>

      <AreaUnitPreview
        empreendimentoId={params.id}
        areaId={params.areaId}
        areaName={area.name}
        orgId={profile.org_id}
        initialTorres={torres}
      />
    </div>
  )
}
