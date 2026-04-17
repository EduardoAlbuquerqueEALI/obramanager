export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { validateTokenAndGetAccess } from '@/lib/portal-access'
import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default async function DocumentosPage({ params }: { params: { token: string } }) {
  const access = await validateTokenAndGetAccess(params.token)
  if (!access) notFound()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Documentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contratos, boletos, book mensal da obra e outros documentos da sua unidade.
        </p>
      </div>

      <Card className="p-10 text-center">
        <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <div className="text-sm font-medium">Em breve</div>
        <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Assim que a incorporadora gerar seu primeiro relatório mensal, ele aparecerá aqui.
        </div>
      </Card>
    </div>
  )
}
