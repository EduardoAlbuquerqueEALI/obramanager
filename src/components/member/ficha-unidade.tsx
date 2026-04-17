'use client'

import { useState, useTransition, useCallback } from 'react'
import { ShoppingCart } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getIconComponent } from '@/components/areas/icon-picker'
import { ensureChecklistItemsForUnidade } from '@/actions/member'
import ChecklistArea from './checklist-area'
import PurchaseRequestForm from './purchase-request-form'
import type { UnidadeForGrid } from '@/types/member'
import type { AreaProgress } from '@/types/member'

const statusGeral = {
  pending: { label: 'Pendente', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Em andamento', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  issue: { label: 'Problema', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}

interface FichaUnidadeProps {
  open: boolean
  onClose: () => void
  unidade: UnidadeForGrid | null
  torreName: string
  empreendimentoId: string
  orgId: string
}

export default function FichaUnidade({
  open,
  onClose,
  unidade,
  torreName,
  empreendimentoId,
  orgId,
}: FichaUnidadeProps) {
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedArea, setSelectedArea] = useState<AreaProgress | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [, startTransition] = useTransition()

  const loadData = useCallback(() => {
    if (!unidade) return
    setLoading(true)
    startTransition(async () => {
      const result = await ensureChecklistItemsForUnidade(unidade.id)
      if (result.areaProgress) setAreaProgress(result.areaProgress)
      setLoading(false)
    })
  }, [unidade])

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      loadData()
    } else {
      onClose()
      setAreaProgress([])
      setSelectedArea(null)
    }
  }

  if (!unidade) return null
  const sg = statusGeral[unidade.status_geral] ?? statusGeral.pending

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl pb-safe">
          <SheetHeader className="mb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SheetTitle className="text-base">
                  Unid. {unidade.number} · Andar {unidade.floor} · Torre {torreName}
                </SheetTitle>
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 mt-0.5 ${sg.color}`}>
                {sg.label}
              </Badge>
            </div>
          </SheetHeader>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : areaProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma área de serviço configurada para este empreendimento.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {areaProgress.map(area => {
                const Icon = getIconComponent(area.icon)
                const pct = area.total > 0 ? Math.round((area.completed / area.total) * 100) : 0
                return (
                  <button
                    key={area.areaId}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className="text-left border rounded-xl p-3 space-y-2 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-md p-1.5 shrink-0"
                        style={{ backgroundColor: `${area.color}20`, color: area.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium leading-tight">{area.areaName}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{area.completed}/{area.total} itens</p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Purchase request FAB */}
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setPurchaseOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              Solicitar Compra
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Checklist area sheet */}
      {selectedArea && (
        <ChecklistArea
          open={!!selectedArea}
          onClose={() => { setSelectedArea(null); loadData() }}
          unidadeId={unidade.id}
          unidadeNumber={unidade.number}
          areaId={selectedArea.areaId}
          areaName={selectedArea.areaName}
          orgId={orgId}
        />
      )}

      {/* Purchase request sheet */}
      <PurchaseRequestForm
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        unidadeId={unidade.id}
        empreendimentoId={empreendimentoId}
        unidadeNumber={unidade.number}
      />
    </>
  )
}
