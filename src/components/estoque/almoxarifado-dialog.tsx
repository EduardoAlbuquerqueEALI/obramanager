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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { almoxarifadoSchema, type AlmoxarifadoFormData } from '@/lib/validations/estoque'
import { createAlmoxarifado, updateAlmoxarifado } from '@/actions/estoque'
import { useToast } from '@/hooks/use-toast'

interface Props {
  mode: 'create' | 'edit'
  almoxarifado?: { id: string; nome: string; empreendimento_id: string | null; ativo: boolean }
  empreendimentos: Array<{ id: string; name: string }>
}

const CENTRAL = '__central__'

export default function AlmoxarifadoDialog({ mode, almoxarifado, empreendimentos }: Props) {
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
  } = useForm<AlmoxarifadoFormData>({
    resolver: zodResolver(almoxarifadoSchema),
    defaultValues: {
      nome: almoxarifado?.nome ?? '',
      empreendimento_id: almoxarifado?.empreendimento_id ?? null,
      ativo: almoxarifado?.ativo ?? true,
    },
  })

  const ativo = watch('ativo')
  const empId = watch('empreendimento_id')

  function onSubmit(data: AlmoxarifadoFormData) {
    startTransition(async () => {
      const result = mode === 'create'
        ? await createAlmoxarifado(data)
        : await updateAlmoxarifado(almoxarifado!.id, data)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: mode === 'create' ? 'Almoxarifado criado' : 'Atualizado' })
      setOpen(false)
      if (mode === 'create') reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={mode === 'edit' ? 'sm' : 'default'} variant={mode === 'edit' ? 'outline' : 'default'}>
          {mode === 'create' ? <><Plus className="h-4 w-4 mr-2" />Novo almoxarifado</> : <><Pencil className="h-4 w-4 mr-2" />Editar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo almoxarifado' : 'Editar almoxarifado'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('nome')} placeholder="Ex: Canteiro Torre A" />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Vinculação</Label>
            <Select
              value={empId ?? CENTRAL}
              onValueChange={v => setValue('empreendimento_id', v === CENTRAL ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CENTRAL}>Central (sem obra específica)</SelectItem>
                {empreendimentos.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="ativo-alm" checked={ativo} onCheckedChange={v => setValue('ativo', !!v)} />
            <Label htmlFor="ativo-alm" className="cursor-pointer">Ativo</Label>
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
