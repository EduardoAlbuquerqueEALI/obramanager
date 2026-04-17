export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { validateTokenAndGetAccess } from '@/lib/portal-access'
import { ArrowLeft } from 'lucide-react'
import NovoChamadoForm from '@/components/portal/novo-chamado-form'

export default async function NovoChamadoPage({ params }: { params: { token: string } }) {
  const access = await validateTokenAndGetAccess(params.token)
  if (!access) notFound()

  return (
    <div className="space-y-4">
      <Link
        href={`/cliente/${params.token}/chamados`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Chamados
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Abrir chamado</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Descreva o problema com o máximo de detalhe possível. Se puder, anexe fotos.
        </p>
      </div>

      <NovoChamadoForm token={params.token} />
    </div>
  )
}
