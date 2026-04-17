'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertDialogConfirm } from '@/components/ui/alert-dialog-confirm'
import { deletarAtualizacaoObra } from '@/actions/portal'
import { useToast } from '@/hooks/use-toast'

export default function AtualizacaoDeleteButton({ id, titulo }: { id: string; titulo: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletarAtualizacaoObra(id)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Atualização removida' })
      router.refresh()
    })
  }

  return (
    <AlertDialogConfirm
      title={`Remover "${titulo}"?`}
      description="A publicação sumirá do portal dos compradores. Essa ação não pode ser desfeita."
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
