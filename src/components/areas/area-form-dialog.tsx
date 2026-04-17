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
import { areaSchema, type AreaFormData } from '@/lib/validations/area'
import { createArea, updateArea } from '@/actions/areas'
import { useToast } from '@/hooks/use-toast'
import IconPicker from './icon-picker'

type Mode = 'create' | 'edit'

interface AreaFormDialogProps {
  mode: Mode
  area?: {
    id: string
    name: string
    description: string | null
    icon: string
    color: string
  }
}

export default function AreaFormDialog({ mode, area }: AreaFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: area?.name ?? '',
      icon: area?.icon ?? 'wrench',
      color: area?.color ?? '#6366f1',
      description: area?.description ?? '',
    },
  })

  const icon = watch('icon')
  const color = watch('color')

  function onSubmit(data: AreaFormData) {
    startTransition(async () => {
      const result = mode === 'create'
        ? await createArea(data)
        : await updateArea(area!.id, data)

      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: mode === 'create' ? 'Área criada' : 'Área atualizada' })
        setOpen(false)
        if (mode === 'create') {
          reset()
        }
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={mode === 'edit' ? 'sm' : 'default'} variant={mode === 'edit' ? 'outline' : 'default'}>
          {mode === 'create' ? <><Plus className="h-4 w-4 mr-2" />Nova Área</> : <><Pencil className="h-4 w-4 mr-2" />Editar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova Área de Serviço' : 'Editar Área'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('name')} placeholder="Ex: Alvenaria" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input {...register('description')} placeholder="Descrição opcional" />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setValue('color', e.target.value)}
                className="h-9 w-14 rounded border cursor-pointer"
              />
              <Input
                {...register('color')}
                value={color}
                onChange={e => setValue('color', e.target.value)}
                placeholder="#6366f1"
                className="font-mono"
              />
            </div>
            {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <IconPicker value={icon} onChange={(name) => setValue('icon', name)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
