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
import { fornecedorSchema, type FornecedorFormData } from '@/lib/validations/fornecedor'
import { createFornecedor, updateFornecedor } from '@/actions/fornecedores'
import { useToast } from '@/hooks/use-toast'

type Mode = 'create' | 'edit'

interface Props {
  mode: Mode
  fornecedor?: {
    id: string
    nome: string
    cnpj: string | null
    contato_nome: string | null
    contato_telefone: string | null
    contato_email: string | null
    observacoes: string | null
    ativo: boolean
  }
}

export default function FornecedorFormDialog({ mode, fornecedor }: Props) {
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
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      nome: fornecedor?.nome ?? '',
      cnpj: fornecedor?.cnpj ?? '',
      contato_nome: fornecedor?.contato_nome ?? '',
      contato_telefone: fornecedor?.contato_telefone ?? '',
      contato_email: fornecedor?.contato_email ?? '',
      observacoes: fornecedor?.observacoes ?? '',
      ativo: fornecedor?.ativo ?? true,
    },
  })

  const ativo = watch('ativo')

  function onSubmit(data: FornecedorFormData) {
    startTransition(async () => {
      const result = mode === 'create'
        ? await createFornecedor(data)
        : await updateFornecedor(fornecedor!.id, data)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: mode === 'create' ? 'Fornecedor criado' : 'Fornecedor atualizado' })
      setOpen(false)
      if (mode === 'create') reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={mode === 'edit' ? 'sm' : 'default'} variant={mode === 'edit' ? 'outline' : 'default'}>
          {mode === 'create' ? <><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</> : <><Pencil className="h-4 w-4 mr-2" />Editar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo fornecedor' : 'Editar fornecedor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('nome')} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input {...register('cnpj')} placeholder="00.000.000/0000-00" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input {...register('contato_nome')} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input {...register('contato_telefone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" {...register('contato_email')} />
            {errors.contato_email && <p className="text-xs text-destructive">{errors.contato_email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} {...register('observacoes')} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="ativo" checked={ativo} onCheckedChange={v => setValue('ativo', !!v)} />
            <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
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
