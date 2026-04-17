import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Building2, MapPin } from 'lucide-react'

type EmpRow = {
  id: string
  name: string
  city: string | null
  state: string | null
  status: string
  logo_url: string | null
}

const statusLabel: Record<string, string> = {
  planning: 'Planejamento',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  paused: 'Pausado',
}

const statusColor: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-gray-100 text-gray-500',
}

export default async function EmpreendimentosPage() {
  const supabase = createClient()

  const { data: empsData } = await supabase
    .from('empreendimentos')
    .select('id, name, city, state, status, logo_url')
    .order('name')

  const empreendimentos = (empsData ?? []) as EmpRow[]

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-5">Meus Empreendimentos</h1>

      {!empreendimentos.length ? (
        <p className="text-muted-foreground text-sm">
          Nenhum empreendimento atribuído a você ainda.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empreendimentos.map((emp) => (
            <Link
              key={emp.id}
              href={`/app/empreendimentos/${emp.id}`}
              className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden block active:scale-[0.98]"
            >
              {emp.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={emp.logo_url}
                  alt={emp.name}
                  className="w-full h-28 object-cover"
                />
              ) : (
                <div className="w-full h-28 bg-muted flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold leading-tight">{emp.name}</h2>
                {emp.city && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {emp.city}{emp.state ? `, ${emp.state}` : ''}
                  </p>
                )}
                <span
                  className={`mt-2 inline-block text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor[emp.status] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {statusLabel[emp.status] ?? emp.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
