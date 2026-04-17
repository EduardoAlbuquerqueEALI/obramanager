'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect, type MultiSelectOption } from '@/components/multi-select'
import { inviteSchema, type InviteInput } from '@/lib/validations/invite'
import { useToast } from '@/hooks/use-toast'
import { UserPlus } from 'lucide-react'

interface InviteUserDialogProps {
  empreendimentos: MultiSelectOption[]
  areas: MultiSelectOption[]
}

export default function InviteUserDialog({ empreendimentos, areas }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'member', empreendimentoIds: [], areaIds: [] },
  })

  async function onSubmit(data: InviteInput) {
    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro ao convidar', description: json.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Convite enviado!', description: `Um email foi enviado para ${data.email}` })
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="invite-name">Nome completo</Label>
            <Input id="invite-name" placeholder="João Silva" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" placeholder="joao@empresa.com" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Perfil</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {empreendimentos.length > 0 && (
            <div className="space-y-1">
              <Label>Empreendimentos</Label>
              <Controller
                control={control}
                name="empreendimentoIds"
                render={({ field }) => (
                  <MultiSelect
                    options={empreendimentos}
                    selected={field.value}
                    onChange={field.onChange}
                    placeholder="Selecionar empreendimentos…"
                  />
                )}
              />
            </div>
          )}

          {areas.length > 0 && (
            <div className="space-y-1">
              <Label>Áreas de serviço</Label>
              <Controller
                control={control}
                name="areaIds"
                render={({ field }) => (
                  <MultiSelect
                    options={areas}
                    selected={field.value}
                    onChange={field.onChange}
                    placeholder="Selecionar áreas…"
                  />
                )}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar convite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
