import { Settings } from 'lucide-react'
import { getEcosystemConfig } from '@/actions/configuracoes'
import { ConfiguracoesIntegracaoForm } from './form'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const config = await getEcosystemConfig()

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm">Integrações do ecossistema Dynamus</p>
        </div>
      </div>

      <ConfiguracoesIntegracaoForm initialConfig={config} />
    </div>
  )
}
