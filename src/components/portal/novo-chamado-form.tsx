'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, X } from 'lucide-react'
import { uploadFile, MIME_IMAGES } from '@/lib/upload'
import { criarChamadoCliente } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

const CATEGORIAS = [
  { value: 'hidraulica',  label: 'Hidráulica (vazamento, pressão, esgoto)' },
  { value: 'eletrica',    label: 'Elétrica (tomada, disjuntor, fiação)' },
  { value: 'infiltracao', label: 'Infiltração / umidade' },
  { value: 'acabamento',  label: 'Acabamento (piso, pintura, azulejo)' },
  { value: 'estrutural',  label: 'Estrutural (rachadura, trinca)' },
  { value: 'outros',      label: 'Outros' },
]

export default function NovoChamadoForm({ token }: { token: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)

  const [categoria, setCategoria] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fotos, setFotos] = useState<string[]>([])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    for (const file of files) {
      const result = await uploadFile(file, {
        prefix: `chamados/${token.slice(0, 12)}`,
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
    e.target.value = ''  // permite reselecionar mesmo arquivo
  }

  function removerFoto(url: string) {
    setFotos(f => f.filter(x => x !== url))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoria) { toast({ title: 'Escolha a categoria', variant: 'destructive' }); return }
    if (titulo.trim().length < 2) { toast({ title: 'Título muito curto', variant: 'destructive' }); return }
    if (descricao.trim().length < 5) { toast({ title: 'Descrição muito curta', variant: 'destructive' }); return }

    startTransition(async () => {
      const result = await criarChamadoCliente(token, {
        categoria,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        fotos,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Chamado aberto — vamos te responder em breve' })
      router.push(`/cliente/${token}/chamados/${result.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo do problema" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Título *</Label>
          <Input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ex: Torneira pingando no banheiro"
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descreva com detalhes: onde é, desde quando, se piora em certos momentos..."
            rows={5}
            maxLength={2000}
            required
          />
          <div className="text-xs text-muted-foreground text-right">{descricao.length}/2000</div>
        </div>

        <div className="space-y-2">
          <Label>Fotos (opcional)</Label>
          <div className="relative">
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background text-sm">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {uploading ? 'Enviando...' : 'Adicionar fotos (até 5MB cada)'}
              </span>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
          </div>

          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {fotos.map(src => (
                <div key={src} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removerFoto(src)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? 'Enviando...' : 'Abrir chamado'}
        </Button>
      </div>
    </form>
  )
}
