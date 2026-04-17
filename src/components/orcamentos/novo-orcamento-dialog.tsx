'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
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
import { orcamentoCreateSchema, type OrcamentoCreateData } from '@/lib/validations/orcamento'
import { createOrcamento } from '@/actions/orcamentos'
import { useToast } from '@/hooks/use-toast'

export default function NovoOrcamentoDialog({ empreendimentoId }: { empreendimentoId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrcamentoCreateData>({
    resolver: zodResolver(orcamentoCreateSchema),
    defaultValues: {
      empreendimento_id: empreendimentoId,
      nome: 'Orçamento Principal',
      bdi_percent: 0,
      contingencia_percent: 0,
      observacoes: '',
    },
  })

  function onSubmit(data: OrcamentoCreateData) {
    startTransition(async () => {
      const result = await createOrcamento(data)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Orçamento criado' })
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Criar orçamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('empreendimento_id')} />

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('nome')} placeholder="Orçamento Principal" />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>BDI (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('bdi_percent', {
                  setValueAs: (v) => v === '' || v === null ? 0 : Number(v),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contingência (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('contingencia_percent', {
                  setValueAs: (v) => v === '' || v === null ? 0 : Number(v),
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea {...register('observacoes')} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Criando...' : 'Criar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
