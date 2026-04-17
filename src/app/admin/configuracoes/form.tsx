'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Copy, Eye, EyeOff, RefreshCw, Link2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveEcosystemConfig, generateSpelhoWebhookSecret } from '@/actions/configuracoes'
import type { EcosystemConfig } from '@/actions/configuracoes'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://obra.dynamus.cc'

export function ConfiguracoesIntegracaoForm({ initialConfig }: { initialConfig: EcosystemConfig | null }) {
  const { toast } = useToast()
  const [spelhoWebhookSecret, setSpelhoWebhookSecret] = useState(
    initialConfig?.spelho_webhook_secret ?? null
  )
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState(initialConfig?.spelho_callback_url ?? '')
  const [callbackSecret, setCallbackSecret] = useState(initialConfig?.spelho_callback_secret ?? '')
  const [showCallbackSecret, setShowCallbackSecret] = useState(false)

  const [isPendingGenerate, startGenerate] = useTransition()
  const [isPendingSave, startSave] = useTransition()

  const webhookUrl = `${APP_URL}/api/webhooks/spelho`

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado!` })
  }

  function handleGenerate() {
    startGenerate(async () => {
      const result = await generateSpelhoWebhookSecret()
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        setSpelhoWebhookSecret(result.secret!)
        setShowWebhookSecret(true)
        toast({ title: 'Novo token gerado! Copie e configure no SPELHO.' })
      }
    })
  }

  function handleSave() {
    startSave(async () => {
      const result = await saveEcosystemConfig({
        spelho_callback_url: callbackUrl,
        spelho_callback_secret: callbackSecret,
      })
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Configurações salvas!' })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Receber eventos do SPELHO */}
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">SPELHO → OBRA (Receber eventos)</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure no SPELHO para que contratos assinados criem automaticamente o acesso do comprador aqui.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL (read-only) */}
          <div className="space-y-2">
            <Label>URL do Webhook (cole no SPELHO)</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted" />
              <Button variant="outline" size="icon" onClick={() => copy(webhookUrl, 'URL')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Secret token */}
          <div className="space-y-2">
            <Label>Token de autenticação (cole no SPELHO como &quot;obra_webhook_secret&quot;)</Label>
            {spelhoWebhookSecret ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={spelhoWebhookSecret}
                  className="font-mono text-xs bg-muted"
                />
                <Button variant="outline" size="icon" onClick={() => setShowWebhookSecret(v => !v)}>
                  {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {showWebhookSecret && (
                  <Button variant="outline" size="icon" onClick={() => copy(spelhoWebhookSecret, 'Token')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum token gerado ainda.</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isPendingGenerate}
              className="gap-2"
            >
              {isPendingGenerate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {spelhoWebhookSecret ? 'Gerar novo token' : 'Gerar token'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notificar SPELHO (callback) */}
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">OBRA → SPELHO (Notificar entrega)</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Quando uma unidade tiver o FVS concluído, OBRA notifica o SPELHO automaticamente.
            Obtenha a URL e o Token em <strong>SPELHO → Configurações → Integração OBRA</strong>.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="callback_url">URL de callback SPELHO</Label>
            <Input
              id="callback_url"
              value={callbackUrl}
              onChange={e => setCallbackUrl(e.target.value)}
              placeholder="https://spelho.dynamus.cc/api/webhooks/obra"
              disabled={isPendingSave}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="callback_secret">Token de callback</Label>
            <div className="flex gap-2">
              <Input
                id="callback_secret"
                type={showCallbackSecret ? 'text' : 'password'}
                value={callbackSecret}
                onChange={e => setCallbackSecret(e.target.value)}
                placeholder="Token gerado no SPELHO"
                disabled={isPendingSave}
              />
              <Button variant="outline" size="icon" onClick={() => setShowCallbackSecret(v => !v)}>
                {showCallbackSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {callbackUrl && callbackSecret && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Callback configurado
            </div>
          )}

          <Button onClick={handleSave} disabled={isPendingSave} className="gap-2">
            {isPendingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
