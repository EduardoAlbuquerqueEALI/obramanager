'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil } from 'lucide-react'
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
import { itemEstoqueSchema, type ItemEstoqueFormData } from '@/lib/validations/estoque'
import { createItemEstoque, updateItemEstoque } from '@/actions/estoque'
import { useToast } from '@/hooks/use-toast'

interface Props {
  mode: 'create' | 'edit'
  item?: { id: string; codigo: string; descricao: string; unidade: string; estoque_minimo: number | null }
}

export default function ItemEstoqueDialog({ mode, item }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ItemEstoqueFormData>({
    resolver: zodResolver(itemEstoqueSchema),
    defaultValues: {
      codigo: item?.codigo ?? '',
      descricao: item?.descricao ?? '',
      unidade: item?.unidade ?? 'un',
      estoque_minimo: Number(item?.estoque_minimo ?? 0),
    },
  })

  function onSubmit(data: ItemEstoqueFormData) {
    startTransition(async () => {
      const result = mode === 'create'
        ? await createItemEstoque(data)
        : await updateItemEstoque(item!.id, data)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: mode === 'create' ? 'Item criado' : 'Item atualizado' })
      setOpen(false)
      if (mode === 'create') reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={mode === 'edit' ? 'sm' : 'default'} variant={mode === 'edit' ? 'outline' : 'default'}>
          {mode === 'create' ? <><Plus className="h-4 w-4 mr-2" />Novo item</> : <><Pencil className="h-4 w-4 mr-2" />Editar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo item de estoque' : 'Editar item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input {...register('codigo')} />
              {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descrição *</Label>
              <Input {...register('descricao')} />
              {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input {...register('unidade')} placeholder="un, kg, m, m², m³" />
            </div>
            <div className="space-y-2">
              <Label>Estoque mínimo</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register('estoque_minimo', {
                  setValueAs: (v) => v === '' || v === null ? 0 : Number(v),
                })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
