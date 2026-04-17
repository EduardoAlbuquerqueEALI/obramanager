export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import EmpreendimentoFormDialog from '@/components/empreendimentos/empreendimento-form-dialog'
import TorreManager from '@/components/empreendimentos/torre-manager'
import ImportXlsxDialog from '@/components/empreendimentos/import-xlsx-dialog'
import EmpreendimentoAreasManager from '@/components/empreendimentos/empreendimento-areas-manager'

type EmpRow = {
  id: string
  name: string
  city: string | null
  state: string | null
  status: string
  logo_url: string | null
  address: string | null
}

type TorreRow = { id: string; name: string; floors: number; empreendimento_id: string }
type UnidadeRow = { id: string; number: string; floor: number; status: string; owner_name: string | null; torre_id: string }

export default async function EmpreendimentoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: empData } = await admin
    .from('empreendimentos')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', profile.org_id)
    .single()

  const emp = empData as EmpRow | null
  if (!emp) notFound()

  const [torresResult, unidadesResult, allAreasResult, activeAreasResult] = await Promise.all([
    admin.from('torres').select('*').eq('empreendimento_id', params.id).order('name'),
    admin.from('unidades').select('*').in(
      'torre_id',
      (await admin.from('torres').select('id').eq('empreendimento_id', params.id)).data?.map(t => (t as {id:string}).id) ?? []
    ).order('floor').order('number'),
    admin
      .from('areas_servico')
      .select('id, name, icon, color')
      .eq('org_id', profile.org_id)
      .is('empreendimento_id', null)
      .order('name'),
    admin
      .from('empreendimento_areas_servico')
      .select('area_servico_id')
      .eq('empreendimento_id', params.id),
  ])

  const torres = (torresResult.data ?? []) as TorreRow[]
  const unidades = (unidadesResult.data ?? []) as UnidadeRow[]
  const allAreas = (allAreasResult.data ?? []) as { id: string; name: string; icon: string; color: string }[]
  const activeAreaIds = ((activeAreasResult.data ?? []) as { area_servico_id: string }[]).map(r => r.area_servico_id)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/empreendimentos" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{emp.name}</h1>
          {emp.city && (
            <p className="text-sm text-muted-foreground">{emp.city}{emp.state ? `, ${emp.state}` : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ImportXlsxDialog empreendimentoId={params.id} torres={torres.map(t => ({ id: t.id, name: t.name }))} />
          <EmpreendimentoFormDialog
            mode="edit"
            empreendimento={{
              id: emp.id,
              name: emp.name,
              address: emp.address,
              city: emp.city,
              state: emp.state,
              status: emp.status as 'planning' | 'in_progress' | 'completed' | 'paused',
              logo_url: emp.logo_url,
            }}
          />
        </div>
      </div>

      {emp.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emp.logo_url}
          alt={emp.name}
          className="w-full h-48 object-cover rounded-lg mb-6 border"
        />
      )}

      <TorreManager
        empreendimentoId={params.id}
        torres={torres}
        unidades={unidades}
      />

      <div className="mt-8">
        <EmpreendimentoAreasManager
          empreendimentoId={params.id}
          allAreas={allAreas}
          activeAreaIds={activeAreaIds}
        />
      </div>
    </div>
  )
}
