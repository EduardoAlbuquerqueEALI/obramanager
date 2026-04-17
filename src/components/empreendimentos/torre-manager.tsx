'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { torreSchema, type TorreFormData } from '@/lib/validations/empreendimento'
import { createTorre, deleteTorre } from '@/actions/empreendimentos'
import { useToast } from '@/hooks/use-toast'
import UnidadeTable from './unidade-table'

type Torre = { id: string; name: string; floors: number; empreendimento_id: string }
type Unidade = { id: string; number: string; floor: number; status: string; owner_name: string | null; torre_id: string }

interface TorreManagerProps {
  empreendimentoId: string
  torres: Torre[]
  unidades: Unidade[]
}

function AddTorreDialog({ empreendimentoId }: { empreendimentoId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TorreFormData>({
    resolver: zodResolver(torreSchema),
    defaultValues: { name: '', floors: 5 },
  })

  function onSubmit(data: TorreFormData) {
    startTransition(async () => {
      const result = await createTorre(empreendimentoId, data)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Torre criada' })
        setOpen(false)
        reset()
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Nova Torre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Torre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('name')} placeholder="Ex: Torre A" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Andares *</Label>
            <Input {...register('floors', { valueAsNumber: true })} type="number" min={1} max={99} />
            {errors.floors && <p className="text-xs text-destructive">{errors.floors.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Criando...' : 'Criar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TorreItem({
  torre,
  empreendimentoId,
  unidades,
}: {
  torre: Torre
  empreendimentoId: string
  unidades: Unidade[]
}) {
  const [expanded, setExpanded] = useState(true)
  const [deleting, startDelete] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  function handleDelete() {
    if (!confirm(`Excluir torre "${torre.name}"? Todas as unidades serão removidas.`)) return
    startDelete(async () => {
      const result = await deleteTorre(torre.id, empreendimentoId)
      if (result.error) toast({ title: result.error, variant: 'destructive' })
      else { toast({ title: 'Torre excluída' }); router.refresh() }
    })
  }

  const torreUnidades = unidades.filter(u => u.torre_id === torre.id)

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 rounded-t-lg">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="font-medium flex-1">{torre.name}</span>
        <span className="text-xs text-muted-foreground">{torre.floors} andares · {torreUnidades.length} unidades</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground hover:text-destructive transition-colors ml-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4">
          <UnidadeTable
            torreId={torre.id}
            torreName={torre.name}
            empreendimentoId={empreendimentoId}
            unidades={torreUnidades}
          />
        </div>
      )}
    </div>
  )
}

export default function TorreManager({ empreendimentoId, torres, unidades }: TorreManagerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Torres & Unidades</h2>
        <AddTorreDialog empreendimentoId={empreendimentoId} />
      </div>

      {torres.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
          <p className="text-sm">Nenhuma torre cadastrada.</p>
          <p className="text-xs mt-1">Clique em &quot;Nova Torre&quot; para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {torres.map(torre => (
            <TorreItem
              key={torre.id}
              torre={torre}
              empreendimentoId={empreendimentoId}
              unidades={unidades}
            />
          ))}
        </div>
      )}
    </div>
  )
}
