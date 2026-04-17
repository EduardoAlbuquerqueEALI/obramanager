'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import SignaturePad from './signature-pad'
import { assumeChecklistItem, completeChecklistItem } from '@/actions/member'
import { useToast } from '@/hooks/use-toast'
import type { UnidadeChecklistItem } from '@/types/member'

interface ChecklistItemRowProps {
  item: UnidadeChecklistItem
  myUserId: string
  orgId: string
  unidadeId: string
  onUpdated: () => void
}

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  approved: 'bg-blue-100 text-blue-700 border-blue-200',
}

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  approved: 'Aprovado',
}

export default function ChecklistItemRow({
  item,
  myUserId,
  orgId,
  unidadeId,
  onUpdated,
}: ChecklistItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(item.photo_url)
  const [sigUrl, setSigUrl] = useState<string | null>(item.signature_url)
  const [sigConfirmed, setSigConfirmed] = useState(!!item.signature_url)
  const [observacao, setObservacao] = useState(item.observacao ?? '')
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const isMyItem = item.responsavel_id === myUserId
  const canExpand = item.status === 'in_progress' && isMyItem
  const isDone = item.status === 'completed' || item.status === 'approved'

  async function handleAssume() {
    startTransition(async () => {
      const result = await assumeChecklistItem(item.id)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Item assumido!' })
        setExpanded(true)
        onUpdated()
      }
    })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const sb = createClient()
      const path = `${orgId}/${unidadeId}/${item.id}-photo-${Date.now()}.jpg`
      const { error } = await sb.storage.from('obra-evidencias').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = sb.storage.from('obra-evidencias').getPublicUrl(path)
      setPhotoUrl(publicUrl)
    } catch {
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  async function handleSignatureConfirm(dataUrl: string) {
    setUploading(true)
    try {
      const sb = createClient()
      const resp = await fetch(dataUrl)
      const blob = await resp.blob()
      const path = `${orgId}/${unidadeId}/${item.id}-signature-${Date.now()}.png`
      const { error } = await sb.storage.from('obra-evidencias').upload(path, blob, { upsert: true, contentType: 'image/png' })
      if (error) throw error
      const { data: { publicUrl } } = sb.storage.from('obra-evidencias').getPublicUrl(path)
      setSigUrl(publicUrl)
      setSigConfirmed(true)
    } catch {
      toast({ title: 'Erro ao salvar assinatura', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  function handleComplete() {
    if (!photoUrl || !sigUrl) return
    startTransition(async () => {
      const result = await completeChecklistItem(item.id, {
        photo_url: photoUrl,
        signature_url: sigUrl,
        observacao: observacao || null,
      })
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Item concluído!' })
        setExpanded(false)
        onUpdated()
      }
    })
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-background"
        onClick={() => canExpand && setExpanded(e => !e)}
        style={{ cursor: canExpand ? 'pointer' : 'default' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {item.required && <span className="text-xs text-muted-foreground">Obrigatório</span>}
        </div>

        <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[item.status]}`}>
          {statusLabel[item.status]}
        </Badge>

        {item.status === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0"
            onClick={(e) => { e.stopPropagation(); handleAssume() }}
            disabled={isPending}
          >
            Assumir
          </Button>
        )}

        {canExpand && (
          <button type="button" className="text-muted-foreground shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Expanded content */}
      {expanded && canExpand && (
        <div className="border-t px-3 py-3 space-y-4 bg-muted/20">
          {/* Photo upload */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Foto da evidência *</p>
            <label className="block">
              <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-muted/30 transition-colors">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Evidência" className="max-h-40 rounded object-contain" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Tirar foto ou escolher arquivo</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
            {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
          </div>

          {/* Signature */}
          <SignaturePad onConfirm={handleSignatureConfirm} confirmed={sigConfirmed} />

          {/* Observação */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Observação <span className="text-muted-foreground font-normal">(opcional)</span></p>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Alguma observação sobre este item..."
              rows={2}
            />
          </div>

          {/* Complete button */}
          <Button
            className="w-full"
            onClick={handleComplete}
            disabled={!photoUrl || !sigUrl || isPending || uploading}
          >
            {isPending ? 'Salvando...' : 'Concluir Item'}
          </Button>
        </div>
      )}

      {/* Done state — show evidence */}
      {isDone && item.photo_url && (
        <div className="border-t px-3 py-2 bg-muted/10 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photo_url} alt="Evidência" className="h-10 w-10 rounded object-cover border" />
          <span className="text-xs text-muted-foreground">Evidência registrada</span>
        </div>
      )}
    </div>
  )
}
