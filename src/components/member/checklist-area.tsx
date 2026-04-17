'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getChecklistItemsForArea } from '@/actions/member'
import ChecklistItemRow from './checklist-item-row'
import type { UnidadeChecklistItem } from '@/types/member'

interface ChecklistAreaProps {
  open: boolean
  onClose: () => void
  unidadeId: string
  unidadeNumber: string
  areaId: string
  areaName: string
  orgId: string
}

export default function ChecklistArea({
  open,
  onClose,
  unidadeId,
  unidadeNumber,
  areaId,
  areaName,
  orgId,
}: ChecklistAreaProps) {
  const [items, setItems] = useState<UnidadeChecklistItem[]>([])
  const [myUserId, setMyUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  const loadItems = useCallback(() => {
    startTransition(async () => {
      setLoading(true)
      const result = await getChecklistItemsForArea(unidadeId, areaId)
      if (result.items) setItems(result.items)
      if (result.myUserId) setMyUserId(result.myUserId)
      setLoading(false)
    })
  }, [unidadeId, areaId])

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      loadItems()
    } else {
      onClose()
    }
  }

  const pending = items.filter(i => i.status === 'pending').length
  const inProgress = items.filter(i => i.status === 'in_progress').length
  const done = items.filter(i => i.status === 'completed' || i.status === 'approved').length

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle>{areaName} — Unid. {unidadeNumber}</SheetTitle>
          {!loading && items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {done}/{items.length} concluídos
              {inProgress > 0 && ` · ${inProgress} em andamento`}
              {pending > 0 && ` · ${pending} pendentes`}
            </p>
          )}
        </SheetHeader>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum item de checklist para esta área.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                myUserId={myUserId}
                orgId={orgId}
                unidadeId={unidadeId}
                onUpdated={loadItems}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
