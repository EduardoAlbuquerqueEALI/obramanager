'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import UnitCell from './unit-cell'
import FichaUnidade from './ficha-unidade'
import type { TorreWithUnidades, UnidadeForGrid } from '@/types/member'
import type { UnidadeStatusGeral } from '@/types/database'

interface GridUnidadesProps {
  empreendimentoId: string
  torres: TorreWithUnidades[]
  orgId: string
}

export default function GridUnidades({ empreendimentoId, torres: initialTorres, orgId }: GridUnidadesProps) {
  const [torres, setTorres] = useState<TorreWithUnidades[]>(initialTorres)
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeForGrid | null>(null)
  const [selectedTorreName, setSelectedTorreName] = useState('')
  const [fichaOpen, setFichaOpen] = useState(false)

  // Realtime subscription for unit status changes
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel(`empreendimento-${empreendimentoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'unidades',
          filter: `empreendimento_id=eq.${empreendimentoId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status_geral: UnidadeStatusGeral }
          setTorres(prev =>
            prev.map(t => ({
              ...t,
              unidades: t.unidades.map(u =>
                u.id === updated.id ? { ...u, status_geral: updated.status_geral } : u,
              ),
            })),
          )
        },
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [empreendimentoId])

  function handleUnitClick(unidade: UnidadeForGrid, torreName: string) {
    setSelectedUnidade(unidade)
    setSelectedTorreName(torreName)
    setFichaOpen(true)
  }

  if (torres.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhuma torre cadastrada neste empreendimento.
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue={torres[0]?.id} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto px-4 gap-1 rounded-none border-b bg-background h-auto py-2">
          {torres.map(torre => (
            <TabsTrigger key={torre.id} value={torre.id} className="shrink-0">
              {torre.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {torres.map(torre => {
          // Build floor map: floor → unidades[]
          const floorMap = new Map<number, UnidadeForGrid[]>()
          for (const u of torre.unidades) {
            const arr = floorMap.get(u.floor) ?? []
            arr.push(u)
            floorMap.set(u.floor, arr)
          }
          const floors = Array.from(floorMap.keys()).sort((a, b) => b - a) // descending

          // Max units per floor (for grid columns)
          const maxCols = Math.max(...Array.from(floorMap.values()).map(a => a.length), 1)

          return (
            <TabsContent key={torre.id} value={torre.id} className="mt-0">
              <div className="px-4 py-3 overflow-x-auto">
                {floors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma unidade cadastrada.
                  </p>
                ) : (
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `48px repeat(${maxCols}, minmax(44px, 1fr))` }}
                  >
                    {floors.map(floor => {
                      const units = (floorMap.get(floor) ?? []).sort((a, b) =>
                        a.number.localeCompare(b.number, undefined, { numeric: true }),
                      )
                      return (
                        <>
                          {/* Floor label */}
                          <div
                            key={`lbl-${floor}`}
                            className="flex items-center justify-center text-xs text-muted-foreground font-medium min-h-[44px]"
                          >
                            {floor}º
                          </div>
                          {/* Unit cells */}
                          {units.map(u => (
                            <UnitCell
                              key={u.id}
                              number={u.number}
                              status={u.status_geral}
                              onClick={() => handleUnitClick(u, torre.name)}
                            />
                          ))}
                          {/* Fill empty columns */}
                          {Array.from({ length: maxCols - units.length }).map((_, idx) => (
                            <div key={`empty-${floor}-${idx}`} />
                          ))}
                        </>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="px-4 pb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-muted border inline-block" /> Pendente</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Em andamento</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Concluído</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Problema</span>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      <FichaUnidade
        open={fichaOpen}
        onClose={() => setFichaOpen(false)}
        unidade={selectedUnidade}
        torreName={selectedTorreName}
        empreendimentoId={empreendimentoId}
        orgId={orgId}
      />
    </>
  )
}
