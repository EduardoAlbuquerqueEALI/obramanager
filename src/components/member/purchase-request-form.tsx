'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { purchaseRequestSchema, type PurchaseRequestData } from '@/lib/validations/member'
import { createPurchaseRequest } from '@/actions/member'
import { useToast } from '@/hooks/use-toast'

interface PurchaseRequestFormProps {
  open: boolean
  onClose: () => void
  unidadeId: string
  empreendimentoId: string
  unidadeNumber: string
}

export default function PurchaseRequestForm({
  open,
  onClose,
  unidadeId,
  empreendimentoId,
  unidadeNumber,
}: PurchaseRequestFormProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PurchaseRequestData>({
    resolver: zodResolver(purchaseRequestSchema),
    defaultValues: { descricao: '', quantidade: 1, urgencia: 'normal' },
  })

  const urgencia = watch('urgencia')

  function onSubmit(data: PurchaseRequestData) {
    startTransition(async () => {
      const result = await createPurchaseRequest(unidadeId, empreendimentoId, data)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Solicitação enviada com sucesso!' })
        reset()
        onClose()
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle>Solicitar Compra — Unid. {unidadeNumber}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Textarea
              {...register('descricao')}
              placeholder="O que precisa ser comprado?"
              rows={3}
            />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min={1}
              {...register('quantidade', { valueAsNumber: true })}
            />
            {errors.quantidade && (
              <p className="text-xs text-destructive">{errors.quantidade.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Urgência</Label>
            <Select value={urgencia} onValueChange={(v) => setValue('urgencia', v as PurchaseRequestData['urgencia'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta ⚠️</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
