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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { tipoTreinamentoSchema, type TipoTreinamentoFormData } from '@/lib/validations/treinamento'
import { createTipoTreinamento, updateTipoTreinamento } from '@/actions/treinamentos'
import { useToast } from '@/hooks/use-toast'

interface Props {
  mode: 'create' | 'edit'
  tipo?: {
    id: string
    codigo: string
    nome: string
    descricao: string | null
    validade_meses: number
    ativo: boolean
    sort_order: number
  }
}

export default function TipoTreinamentoDialog({ mode, tipo }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TipoTreinamentoFormData>({
    resolver: zodResolver(tipoTreinamentoSchema),
    defaultValues: {
      codigo: tipo?.codigo ?? '',
      nome: tipo?.nome ?? '',
      descricao: tipo?.descricao ?? '',
      validade_meses: tipo?.validade_meses ?? 12,
      ativo: tipo?.ativo ?? true,
      sort_order: tipo?.sort_order ?? 100,
    },
  })

  const ativo = watch('ativo')

  function onSubmit(data: TipoTreinamentoFormData) {
    startTransition(async () => {
      const result = mode === 'create'
        ? await createTipoTreinamento(data)
        : await updateTipoTreinamento(tipo!.id, data)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: mode === 'create' ? 'NR criada' : 'Atualizada' })
      setOpen(false)
      if (mode === 'create') reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={mode === 'edit' ? 'sm' : 'default'} variant={mode === 'edit' ? 'outline' : 'default'}>
          {mode === 'create' ? <><Plus className="h-4 w-4 mr-2" />Nova NR</> : <><Pencil className="h-4 w-4 mr-2" />Editar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova NR' : 'Editar NR'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input {...register('codigo')} placeholder="NR-XX" />
              {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Validade (meses) *</Label>
              <Input
                type="number"
                min={1}
                max={120}
                {...register('validade_meses', {
                  setValueAs: (v) => v === '' || v === null ? 12 : Number(v),
                })}
              />
              {errors.validade_meses && <p className="text-xs text-destructive">{errors.validade_meses.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('nome')} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={2} {...register('descricao')} />
          </div>

          <div className="space-y-2">
            <Label>Ordem de exibição</Label>
            <Input
              type="number"
              {...register('sort_order', {
                setValueAs: (v) => v === '' || v === null ? 100 : Number(v),
              })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="ativo-tipo" checked={ativo} onCheckedChange={v => setValue('ativo', !!v)} />
            <Label htmlFor="ativo-tipo" className="cursor-pointer">Ativo</Label>
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
