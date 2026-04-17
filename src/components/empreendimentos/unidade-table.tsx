'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { unidadeSchema, type UnidadeFormData } from '@/lib/validations/empreendimento'
import { createUnidade, deleteUnidade } from '@/actions/empreendimentos'
import { useToast } from '@/hooks/use-toast'
import BulkUnidadeDialog from './bulk-unidade-dialog'

type Unidade = { id: string; number: string; floor: number; status: string; owner_name: string | null; torre_id: string }

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  entregue: 'Entregue',
}

function AddUnidadeDialog({ torreId, empreendimentoId }: { torreId: string; empreendimentoId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UnidadeFormData>({
    resolver: zodResolver(unidadeSchema),
    defaultValues: { number: '', floor: 1, status: 'pendente' },
  })

  const statusVal = watch('status')

  function onSubmit(data: UnidadeFormData) {
    startTransition(async () => {
      const result = await createUnidade(torreId, empreendimentoId, data)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Unidade criada' })
        setOpen(false)
        reset()
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Unidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Unidade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Número *</Label>
              <Input {...register('number')} placeholder="101" />
              {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Andar *</Label>
              <Input {...register('floor', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Proprietário</Label>
            <Input {...register('owner_name')} placeholder="Nome do proprietário" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusVal} onValueChange={(v) => setValue('status', v as UnidadeFormData['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
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

function DeleteUnidadeButton({ unidade, empreendimentoId }: { unidade: Unidade; empreendimentoId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  function handleDelete() {
    if (!confirm(`Excluir unidade ${unidade.number}?`)) return
    startTransition(async () => {
      const result = await deleteUnidade(unidade.id, empreendimentoId)
      if (result.error) toast({ title: result.error, variant: 'destructive' })
      else { toast({ title: 'Unidade excluída' }); router.refresh() }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

export default function UnidadeTable({
  torreId,
  torreName,
  empreendimentoId,
  unidades,
}: {
  torreId: string
  torreName: string
  empreendimentoId: string
  unidades: Unidade[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{unidades.length} unidade{unidades.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          <BulkUnidadeDialog
            torreId={torreId}
            torreName={torreName}
            empreendimentoId={empreendimentoId}
          />
          <AddUnidadeDialog torreId={torreId} empreendimentoId={empreendimentoId} />
        </div>
      </div>

      {unidades.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma unidade. Adicione acima ou importe um .xlsx.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Nº</TableHead>
                <TableHead className="w-16">Andar</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-sm">{u.number}</TableCell>
                  <TableCell className="text-sm">{u.floor}°</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.owner_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{statusLabels[u.status] ?? u.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DeleteUnidadeButton unidade={u} empreendimentoId={empreendimentoId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
