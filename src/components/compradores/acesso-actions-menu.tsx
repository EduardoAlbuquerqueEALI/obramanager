'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Ban, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { revogarAcessoCliente, deletarAcessoCliente } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

export default function AcessoActionsMenu({ id, revogado }: { id: string; revogado: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  function handleRevogar(revogar: boolean) {
    startTransition(async () => {
      const result = await revogarAcessoCliente(id, revogar)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: revogar ? 'Acesso revogado' : 'Acesso reativado' })
      router.refresh()
    })
  }

  function confirmDelete() {
    setConfirmOpen(false)
    startTransition(async () => {
      const result = await deletarAcessoCliente(id)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Acesso removido' })
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isPending}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {revogado ? (
            <DropdownMenuItem onClick={() => handleRevogar(false)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reativar acesso
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleRevogar(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Revogar acesso
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover acesso?</DialogTitle>
            <DialogDescription>
              O token será apagado definitivamente. O comprador não conseguirá mais acessar o portal. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
