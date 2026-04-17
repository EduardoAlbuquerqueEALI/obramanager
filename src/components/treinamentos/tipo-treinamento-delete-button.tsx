'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertDialogConfirm } from '@/components/ui/alert-dialog-confirm'
import { deleteTipoTreinamento } from '@/actions/treinamentos'
import { useToast } from '@/hooks/use-toast'

export default function TipoTreinamentoDeleteButton({ id, codigo }: { id: string; codigo: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTipoTreinamento(id)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'NR removida' })
      router.refresh()
    })
  }

  return (
    <AlertDialogConfirm
      title={`Remover ${codigo}?`}
      description="Não será possível remover se houver certificados associados. Alternativa: desmarcar 'Ativo'."
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
