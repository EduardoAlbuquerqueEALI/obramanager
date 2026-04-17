'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Send } from 'lucide-react'
import { responderChamadoCliente } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

export default function ThreadChamado({ token, chamadoId }: { token: string; chamadoId: string }) {
  const [mensagem, setMensagem] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const msg = mensagem.trim()
    if (msg.length < 1) return
    startTransition(async () => {
      const result = await responderChamadoCliente(token, chamadoId, msg)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      setMensagem('')
      router.refresh()
    })
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          placeholder="Responder..."
          rows={3}
          maxLength={2000}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{mensagem.length}/2000</span>
          <Button type="submit" disabled={isPending || mensagem.trim().length < 1}>
            <Send className="h-4 w-4 mr-2" />
            {isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
