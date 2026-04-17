'use client'

import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect, type MultiSelectOption } from '@/components/multi-select'
import { updateUserPermissions } from '@/actions/admin'
import { useToast } from '@/hooks/use-toast'

interface EditPermissionsDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  user: {
    id: string
    full_name: string
    role: 'admin' | 'member'
    empreendimentoIds: string[]
    areaIds: string[]
  }
  empreendimentos: MultiSelectOption[]
  areas: MultiSelectOption[]
}

interface FormData {
  role: 'admin' | 'member'
  empreendimentoIds: string[]
  areaIds: string[]
}

export default function EditPermissionsDialog({
  open,
  onOpenChange,
  user,
  empreendimentos,
  areas,
}: EditPermissionsDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      role: user.role,
      empreendimentoIds: user.empreendimentoIds,
      areaIds: user.areaIds,
    },
  })

  async function onSubmit(data: FormData) {
    const result = await updateUserPermissions(
      user.id,
      data.empreendimentoIds,
      data.areaIds,
      data.role,
    )
    if (result?.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Permissões atualizadas' })
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar permissões — {user.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Perfil</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue />
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
