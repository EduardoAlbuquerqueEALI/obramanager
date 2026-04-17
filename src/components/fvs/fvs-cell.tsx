'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Upload, X as XIcon, Check, RefreshCw } from 'lucide-react'
import { uploadFile, MIME_IMAGES } from '@/lib/upload'
import { marcarVerificacao } from '@/actions/fvs'
import { useToast } from '@/hooks/use-toast'

type CellData = {
  id: string
  status: 'nao_inspecionado' | 'aprovado' | 'reprovado' | 'aprovado_reinspecao'
  observacao: string | null
  solucao: string | null
  foto_url: string | null
  inspecionado_em: string | null
}

const STYLE: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  nao_inspecionado:  { icon: '○', bg: 'bg-gray-50',     text: 'text-gray-400',    border: 'border-gray-200' },
  aprovado:          { icon: 'O', bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-300' },
  reprovado:         { icon: 'X', bg: 'bg-red-100',      text: 'text-red-700',     border: 'border-red-300' },
  aprovado_reinspecao: { icon: '⊕', bg: 'bg-blue-100', text: 'text-blue-700',    border: 'border-blue-300' },
}

export default function FvsCell({ cell }: { cell: CellData }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [observacao, setObservacao] = useState(cell.observacao ?? '')
  const [solucao, setSolucao] = useState(cell.solucao ?? '')
  const [fotoUrl, setFotoUrl] = useState(cell.foto_url ?? '')
  const router = useRouter()
  const { toast } = useToast()

  const s = STYLE[cell.status] ?? STYLE.nao_inspecionado

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadFile(file, {
      prefix: 'fvs-evidencias',
      allowedMimes: MIME_IMAGES,
      maxSizeMB: 5,
    })
    setUploading(false)
    if (!result.ok) { toast({ title: result.error || 'Erro', variant: 'destructive' }); return }
    setFotoUrl(result.url!)
  }

  function submit(status: 'aprovado' | 'reprovado' | 'aprovado_reinspecao' | 'nao_inspecionado') {
    // Validação local
    if (status === 'reprovado' && (!observacao.trim() || !fotoUrl)) {
      toast({ title: 'Foto e observação obrigatórias ao reprovar', variant: 'destructive' })
      return
    }

    startTransition(async () => {
      const result = await marcarVerificacao({
        cell_id: cell.id,
        status,
        observacao: observacao.trim() || null,
        solucao: solucao.trim() || null,
        foto_url: fotoUrl || null,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center h-9 w-9 rounded border font-bold text-sm transition-all hover:scale-110 hover:shadow ${s.bg} ${s.text} ${s.border}`}
          title={cell.status === 'reprovado' ? `Reprovado: ${cell.observacao}` : cell.status}
        >
          {s.icon}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" side="bottom" align="center">
        {/* Se não inspecionado → mostrar botões Aprovar / Reprovar */}
        {cell.status === 'nao_inspecionado' && (
          <div className="space-y-3">
            <div className="text-sm font-medium mb-2">Verificar item</div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => submit('aprovado')}
              disabled={isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Aprovar
            </Button>

            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs">Reprovar (foto + motivo obrigatórios)</Label>
              <Textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Motivo da reprovação..."
                rows={2}
                className="text-xs"
              />
              <div className="relative">
                <div className={`flex items-center gap-2 h-8 px-2 border rounded text-xs ${fotoUrl ? 'border-emerald-300 bg-emerald-50' : ''}`}>
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  {uploading ? 'Enviando...' : fotoUrl ? 'Foto anexada ✓' : 'Anexar foto'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => submit('reprovado')}
                disabled={isPending || uploading}
              >
                <XIcon className="h-4 w-4 mr-2" />
                Reprovar
              </Button>
            </div>
          </div>
        )}

        {/* Se aprovado → mostrar info + botão desfazer */}
        {cell.status === 'aprovado' && (
          <div className="space-y-2 text-sm">
            <div className="font-medium text-emerald-700">✓ Aprovado</div>
            {cell.inspecionado_em && (
              <div className="text-xs text-muted-foreground">
                {new Date(cell.inspecionado_em).toLocaleString('pt-BR')}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => submit('nao_inspecionado')} disabled={isPending}>
              Desfazer
            </Button>
          </div>
        )}

        {/* Se reprovado → mostrar motivo + foto + botão reaprovar */}
        {cell.status === 'reprovado' && (
          <div className="space-y-2 text-sm">
            <div className="font-medium text-red-700">✗ Reprovado</div>
            {cell.observacao && <div className="text-xs bg-red-50 p-2 rounded">{cell.observacao}</div>}
            {cell.foto_url && (
              <a href={cell.foto_url} target="_blank" rel="noopener" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cell.foto_url} alt="Evidência" className="w-full rounded border aspect-video object-cover" />
              </a>
            )}
            <div className="border-t pt-2 space-y-2">
              <Label className="text-xs">Solução aplicada</Label>
              <Textarea
                value={solucao}
                onChange={e => setSolucao(e.target.value)}
                placeholder="Descreva a correção feita..."
                rows={2}
                className="text-xs"
              />
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
                onClick={() => submit('aprovado_reinspecao')}
                disabled={isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aprovar após reinspeção
              </Button>
            </div>
          </div>
        )}

        {/* Se aprovado após reinspeção → info */}
        {cell.status === 'aprovado_reinspecao' && (
          <div className="space-y-2 text-sm">
            <div className="font-medium text-blue-700">⊕ Aprovado após reinspeção</div>
            {cell.observacao && <div className="text-xs bg-red-50 p-2 rounded"><span className="font-medium">Reprovação:</span> {cell.observacao}</div>}
            {cell.solucao && <div className="text-xs bg-blue-50 p-2 rounded"><span className="font-medium">Solução:</span> {cell.solucao}</div>}
            {cell.foto_url && (
              <a href={cell.foto_url} target="_blank" rel="noopener" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cell.foto_url} alt="Evidência" className="w-full rounded border aspect-video object-cover" />
              </a>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
