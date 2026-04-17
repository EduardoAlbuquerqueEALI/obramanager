'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Send, Upload, X } from 'lucide-react'
import { uploadFile, MIME_IMAGES } from '@/lib/upload'
import { responderChamadoAdmin } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

export default function ResponderChamadoForm({ chamadoId, autorNome }: { chamadoId: string; autorNome: string }) {
  const [mensagem, setMensagem] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    for (const file of files) {
      const result = await uploadFile(file, {
        prefix: `chamados-respostas/${chamadoId.slice(0, 12)}`,
        allowedMimes: MIME_IMAGES,
        maxSizeMB: 5,
      })
      if (!result.ok) {
        toast({ title: result.error || 'Falha ao subir foto', variant: 'destructive' })
        continue
      }
      setFotos(f => [...f, result.url!])
    }
    setUploading(false)
    e.target.value = ''
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const msg = mensagem.trim()
    if (msg.length < 1) return
    startTransition(async () => {
      const result = await responderChamadoAdmin({
        chamado_id: chamadoId,
        autor_tipo: 'empresa',
        autor_nome: autorNome,
        mensagem: msg,
        fotos,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Resposta enviada' })
      setMensagem(''); setFotos([])
      router.refresh()
    })
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          placeholder="Responder ao comprador..."
          rows={3}
          maxLength={2000}
        />

        {fotos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {fotos.map(src => (
              <div key={src} className="relative group aspect-square rounded overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFotos(f => f.filter(x => x !== src))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="relative inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
            <Upload className="h-4 w-4" />
            {uploading ? 'Enviando...' : 'Anexar foto'}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
          </label>
          <Button type="submit" disabled={isPending || uploading || mensagem.trim().length < 1}>
            <Send className="h-4 w-4 mr-2" />
            {isPending ? 'Enviando...' : 'Responder'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
