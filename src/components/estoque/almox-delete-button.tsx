'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertDialogConfirm } from '@/components/ui/alert-dialog-confirm'
import { deleteAlmoxarifado } from '@/actions/estoque'
import { useToast } from '@/hooks/use-toast'

export default function AlmoxDeleteButton({ id, nome }: { id: string; nome: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAlmoxarifado(id)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Almoxarifado removido' })
      router.refresh()
    })
  }

  return (
    <AlertDialogConfirm
      title={`Remover ${nome}?`}
      description="Não será possível remover se houver movimentações registradas."
      confirmLabel="Remover"
      destructive
      onConfirm={handleDelete}
      trigger={
        <Button size="sm" variant="ghost" disabled={isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      }
    />
  )
}
