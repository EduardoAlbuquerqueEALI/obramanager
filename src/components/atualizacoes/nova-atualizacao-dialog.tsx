'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { uploadFile, MIME_IMAGES } from '@/lib/upload'
import { criarAtualizacaoObra } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

type Empreendimento = { id: string; name: string }

export default function NovaAtualizacaoDialog({ empreendimentos }: { empreendimentos: Empreendimento[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const [empId, setEmpId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [avanco, setAvanco] = useState<string>('')
  const [fotos, setFotos] = useState<string[]>([])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    for (const file of files) {
      const result = await uploadFile(file, {
        prefix: 'atualizacoes',
        allowedMimes: MIME_IMAGES,
        maxSizeMB: 5,
      })
      if (!result.ok) {
        toast({ title: result.error || 'Falha ao subir', variant: 'destructive' })
        continue
      }
      setFotos(f => [...f, result.url!])
    }
    setUploading(false)
    e.target.value = ''
  }

  function reset() {
    setEmpId(''); setTitulo(''); setDescricao(''); setAvanco(''); setFotos([])
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!empId) { toast({ title: 'Selecione empreendimento', variant: 'destructive' }); return }
    if (titulo.trim().length < 2) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return }

    const parsedAvanco = avanco.trim() === '' ? null : Number(avanco)
    if (parsedAvanco !== null && (isNaN(parsedAvanco) || parsedAvanco < 0 || parsedAvanco > 100)) {
      toast({ title: '% de avanço deve estar entre 0 e 100', variant: 'destructive' })
      return
    }

    startTransition(async () => {
      const result = await criarAtualizacaoObra({
        empreendimento_id: empId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        percentual_avanco: parsedAvanco,
        fotos,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Atualização publicada' })
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={empreendimentos.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Nova atualização
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova atualização de obra</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Empreendimento *</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {empreendimentos.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Estrutura do 5º pavimento concluída"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>% de avanço geral (opcional)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={avanco}
              onChange={e => setAvanco(e.target.value)}
              placeholder="0-100"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhe o que aconteceu na semana..."
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos</Label>
            <div className="relative">
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background text-sm">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {uploading ? 'Enviando...' : 'Adicionar fotos'}
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
              <div className="grid grid-cols-4 gap-2 mt-3">
                {fotos.map(src => (
                  <div key={src} className="relative group aspect-square rounded overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotos(f => f.filter(x => x !== src))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending || uploading}>
              {isPending ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
