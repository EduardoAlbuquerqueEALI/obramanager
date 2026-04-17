'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateChecklistItemStatus } from '@/actions/admin'
import type { TarefaCard, KanbanTarefasColumnId } from '@/types/kanban'
import { KANBAN_TAREFAS_COLUMNS } from '@/types/kanban'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Props {
  initialCards: TarefaCard[]
  empreendimentos: { id: string; name: string }[]
  areas: { id: string; name: string }[]
  membros: { id: string; full_name: string }[]
}

const STATUS_MAP: Record<KanbanTarefasColumnId, string> = {
  pendente: 'pending',
  com_pendencia: 'pending',
  em_andamento: 'in_progress',
  concluido: 'completed',
}

function TarefaCardItem({ card, isDragOverlay = false }: { card: TarefaCard; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })
  return (
    <div
      ref={setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      className={cn(
        'bg-white border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing select-none',
        isDragging && !isDragOverlay && 'opacity-40',
        isDragOverlay && 'shadow-xl opacity-90',
      )}
    >
      <div className="text-sm font-medium leading-tight line-clamp-2 mb-1">{card.title}</div>
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: card.area_color }}
        />
        <span className="text-xs text-muted-foreground">{card.area_name}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {card.empreendimento_name} · {card.torre_name} · Unid.&nbsp;{card.unidade_number}
      </div>
      {card.responsavel_name && (
        <div className="text-xs text-muted-foreground mt-1">{card.responsavel_name}</div>
      )}
      {card.observacao && (
        <div className="mt-1 text-xs text-orange-600 bg-orange-50 rounded px-1.5 py-0.5 line-clamp-1">
          {card.observacao}
        </div>
      )}
      {card.photo_url && (
        <div className="mt-2">
          <Image
            src={card.photo_url}
            alt="Foto"
            width={32}
            height={32}
            className="rounded object-cover"
          />
        </div>
      )}
    </div>
  )
}

function Column({
  col,
  cards,
}: {
  col: (typeof KANBAN_TAREFAS_COLUMNS)[number]
  cards: TarefaCard[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id, disabled: col.readOnly })
  return (
    <div className={cn('flex flex-col rounded-lg border-2 min-w-[240px] w-64 shrink-0', col.color, isOver && 'ring-2 ring-primary')}>
      <div className="px-3 py-2 border-b font-semibold text-sm flex items-center justify-between">
        <span>{col.label}</span>
        <span className="text-xs font-normal text-muted-foreground bg-white/70 rounded-full px-1.5 py-0.5">{cards.length}</span>
      </div>
      <div ref={setNodeRef} className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
        {cards.map(card => (
          <TarefaCardItem key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}

export default function KanbanTarefas({ initialCards, empreendimentos, areas, membros }: Props) {
  const [cards, setCards] = useState<TarefaCard[]>(initialCards)
  const [activeCard, setActiveCard] = useState<TarefaCard | null>(null)

  // Filters
  const [filterEmp, setFilterEmp] = useState<string>('all')
  const [filterArea, setFilterArea] = useState<string>('all')
  const [filterMembro, setFilterMembro] = useState<string>('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const filteredCards = cards.filter(c => {
    if (filterEmp !== 'all' && c.empreendimento_name !== filterEmp) return false
    if (filterArea !== 'all' && c.area_name !== filterArea) return false
    if (filterMembro !== 'all' && c.responsavel_id !== filterMembro) return false
    return true
  })

  function handleDragStart(e: DragStartEvent) {
    setActiveCard(cards.find(c => c.id === e.active.id) ?? null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = e
    if (!over) return

    const newColumn = over.id as KanbanTarefasColumnId
    const card = cards.find(c => c.id === active.id)
    if (!card || card.virtual_column === newColumn) return

    // com_pendencia is read-only target
    const targetColDef = KANBAN_TAREFAS_COLUMNS.find(c => c.id === newColumn)
    if (targetColDef?.readOnly) return

    const newStatus = STATUS_MAP[newColumn]

    // Optimistic update
    setCards(prev => prev.map(c =>
      c.id === card.id ? { ...c, virtual_column: newColumn, status: newStatus } : c
    ))

    const result = await updateChecklistItemStatus(card.id, newStatus)
    if (result.error) {
      setCards(prev => prev.map(c =>
        c.id === card.id ? { ...c, virtual_column: card.virtual_column, status: card.status } : c
      ))
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + filters */}
      <div className="px-6 py-4 border-b flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold mr-4">Kanban de Tarefas</h1>
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Empreendimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos empreend.</SelectItem>
            {empreendimentos.map(e => (
              <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas áreas</SelectItem>
            {areas.map(a => (
              <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMembro} onValueChange={setFilterMembro}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos membros</SelectItem>
            {membros.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-full">
            {KANBAN_TAREFAS_COLUMNS.map(col => (
              <Column
                key={col.id}
                col={col}
                cards={filteredCards.filter(c => c.virtual_column === col.id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard && <TarefaCardItem card={activeCard} isDragOverlay />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
