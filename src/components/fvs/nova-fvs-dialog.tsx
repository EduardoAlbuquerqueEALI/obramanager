'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { criarFVS } from '@/actions/fvs'
import { useToast } from '@/hooks/use-toast'

type Emp = { id: string; name: string }
type Area = { id: string; name: string }
type Member = { id: string; full_name: string }

const NONE = '__none__'

export default function NovaFvsDialog({
  empreendimentos, areas, members,
}: {
  empreendimentos: Emp[]; areas: Area[]; members: Member[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const [empId, setEmpId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [responsavelId, setResponsavelId] = useState<string>(NONE)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!empId) { toast({ title: 'Selecione empreendimento', variant: 'destructive' }); return }
    if (!areaId) { toast({ title: 'Selecione área', variant: 'destructive' }); return }

    startTransition(async () => {
      const result = await criarFVS({
        empreendimento_id: empId,
        area_servico_id: areaId,
        responsavel_id: responsavelId === NONE ? null : responsavelId,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'FVS criada — matriz gerada automaticamente' })
      setOpen(false)
      setEmpId(''); setAreaId(''); setResponsavelId(NONE)
      router.push(`/admin/fvs/${result.id}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={empreendimentos.length === 0 || areas.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Nova FVS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Ficha de Verificação</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Empreendimento *</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {empreendimentos.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Área de serviço *</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsável (inspetor)</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem responsável</SelectItem>
                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            O sistema vai gerar automaticamente a matriz de verificação cruzando
            os itens do template da área com todas as unidades do empreendimento.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Gerando matriz...' : 'Criar FVS'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
