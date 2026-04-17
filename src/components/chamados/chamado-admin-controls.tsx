'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { mudarStatusChamado } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

type Status = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado'

export default function ChamadoAdminControls({ id, status }: { id: string; status: Status }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  function handleChange(novoStatus: string) {
    if (novoStatus === status) return
    startTransition(async () => {
      const result = await mudarStatusChamado(id, novoStatus as Status)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Status atualizado' })
      router.refresh()
    })
  }

  return (
    <div className="shrink-0">
      <Label className="text-xs block mb-1">Status</Label>
      <Select value={status} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aberto">Aberto</SelectItem>
          <SelectItem value="em_andamento">Em andamento</SelectItem>
          <SelectItem value="resolvido">Resolvido</SelectItem>
          <SelectItem value="fechado">Fechado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
