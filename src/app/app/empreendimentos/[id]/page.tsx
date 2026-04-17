export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ChevronRight } from 'lucide-react'
import { getIconComponent } from '@/components/areas/icon-picker'
import GridUnidades from '@/components/member/grid-unidades'
import type { TorreWithUnidades } from '@/types/member'

interface Props {
  params: { id: string }
}

type AreaCardData = {
  id: string
  name: string
  icon: string
  color: string
  completed: number
  total: number
}

export default async function EmpreendimentoDetailPage({ params }: Props) {
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
    .select('id, name, city, state, org_id, logo_url')
    .eq('id', params.id)
    .eq('org_id', profile.org_id)
    .maybeSingle()
  if (!empData) notFound()
  const emp = empData as { id: string; name: string; city: string | null; state: string | null; org_id: string; logo_url: string | null }

  // Member access check (admins bypass)
  if (profile.role !== 'admin') {
    const { data: hasEmp } = await admin
      .from('user_empreendimentos')
      .select('empreendimento_id')
      .eq('user_id', user.id)
      .eq('empreendimento_id', params.id)
      .maybeSingle()
    if (!hasEmp) notFound()
  }

  // Areas active in this empreendimento
  const { data: empAreasData } = await admin
    .from('empreendimento_areas_servico')
    .select('area_servico_id, areas_servico(id, name, icon, color)')
    .eq('empreendimento_id', params.id)

  // Areas assigned to this user (admins see all)
  let allowedAreaIds: Set<string> | null = null
  if (profile.role !== 'admin') {
    const { data: userAreasData } = await admin
      .from('user_areas')
      .select('area_servico_id')
      .eq('user_id', user.id)
    allowedAreaIds = new Set(
      ((userAreasData ?? []) as { area_servico_id: string }[]).map(r => r.area_servico_id),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAreas = ((empAreasData ?? []) as any[])
    .map(r => r.areas_servico as { id: string; name: string; icon: string; color: string } | null)
    .filter((a): a is { id: string; name: string; icon: string; color: string } => !!a)
    .filter(a => allowedAreaIds === null || allowedAreaIds.has(a.id))

  // Per-area progress (concluded units / total units in emp)
  const areaCards: AreaCardData[] = []
  for (const a of rawAreas) {
    const { data: statusData } = await admin.rpc('get_unidades_status_by_area', {
      p_emp: params.id,
      p_area: a.id,
    })
    const rows = (statusData ?? []) as { status_area: string }[]
    const total = rows.length
    const completed = rows.filter(r => r.status_area === 'completed').length
    areaCards.push({ id: a.id, name: a.name, icon: a.icon, color: a.color, completed, total })
  }
  areaCards.sort((a, b) => a.name.localeCompare(b.name))

  // Torres for "Visão geral" (status_geral)
  const { data: torresData } = await admin
    .from('torres')
    .select('id, name, floors, empreendimento_id, unidades(id, number, floor, torre_id, status_geral)')
    .eq('empreendimento_id', params.id)
    .order('name')

  const torres: TorreWithUnidades[] = ((torresData ?? []) as unknown[]).map((t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const torre = t as any
    return {
      id: torre.id,
      name: torre.name,
      floors: torre.floors,
      empreendimento_id: torre.empreendimento_id,
      unidades: (torre.unidades ?? []).map((u: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const un = u as any
        return {
          id: un.id,
          number: un.number,
          floor: un.floor,
          torre_id: un.torre_id,
          status_geral: un.status_geral ?? 'pending',
        }
      }),
    }
  })

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold">{emp.name}</h1>
        {emp.city && (
          <p className="text-sm text-muted-foreground">
            {emp.city}{emp.state ? `, ${emp.state}` : ''}
          </p>
        )}
      </div>

      {/* Áreas atribuídas */}
      <section className="px-4 pt-3 pb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Minhas áreas
        </h2>

        {areaCards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhuma área de serviço atribuída a você neste empreendimento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {areaCards.map(area => {
              const Icon = getIconComponent(area.icon)
              const pct = area.total > 0 ? Math.round((area.completed / area.total) * 100) : 0
              return (
                <Link
                  key={area.id}
                  href={`/app/empreendimentos/${params.id}/areas/${area.id}`}
                  className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3"
                >
                  <div
                    className="rounded-lg p-2.5 shrink-0"
                    style={{ backgroundColor: `${area.color}20`, color: area.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{area.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {area.completed}/{area.total} unidades · {pct}%
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Visão geral */}
      <section className="pt-2">
        <details className="group">
          <summary className="px-4 py-2 cursor-pointer text-sm font-semibold text-muted-foreground uppercase tracking-wide select-none flex items-center gap-2">
            Visão geral da obra
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <GridUnidades
            empreendimentoId={params.id}
            torres={torres}
            orgId={emp.org_id}
          />
        </details>
      </section>
    </div>
  )
}
