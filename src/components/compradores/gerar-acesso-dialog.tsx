'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { gerarAcessoCliente } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

type UnidadeOption = {
  id: string
  number: string
  floor: number
  torres: { name: string; empreendimentos: { id: string; name: string } } | null
}

interface Props {
  unidades: UnidadeOption[]
}

export default function GerarAcessoDialog({ unidades }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const [unidadeId, setUnidadeId] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!unidadeId) { toast({ title: 'Selecione uma unidade', variant: 'destructive' }); return }
    startTransition(async () => {
      const result = await gerarAcessoCliente({
        unidade_id: unidadeId,
        comprador_nome: nome || null,
        comprador_email: email || null,
        comprador_telefone: telefone || null,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Acesso gerado' })
      setOpen(false)
      setUnidadeId(''); setNome(''); setEmail(''); setTelefone('')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo acesso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar acesso do comprador</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar unidade" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.torres?.empreendimentos?.name} · {u.torres?.name} · Apto {u.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unidades.length === 0 && (
              <p className="text-xs text-amber-700">Todas as unidades já têm acesso gerado.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nome do comprador</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending || !unidadeId}>
              {isPending ? 'Gerando...' : 'Gerar acesso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
