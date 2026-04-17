'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateSolicitacaoStatus, addSolicitacaoComment } from '@/actions/admin'
import type { SolicitacaoCard, SolicitacaoStatus } from '@/types/kanban'
import { KANBAN_COMPRAS_COLUMNS } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { Clock, MessageSquare } from 'lucide-react'

interface Props {
  initialCards: SolicitacaoCard[]
  empreendimentos: { id: string; name: string }[]
  areas: { id: string; name: string }[]
}

function urgenciaBadge(urgencia: string) {
  if (urgencia === 'alta') return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Alta</Badge>
  if (urgencia === 'baixa') return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Baixa</Badge>
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Normal</Badge>
}

function daysOpen(created_at: string) {
  const diff = Date.now() - new Date(created_at).getTime()
  return Math.floor(diff / 86400000)
}

function CardItem({ card, onClick }: { card: SolicitacaoCard; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'bg-white border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow select-none',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium leading-tight line-clamp-2">{card.title}</span>
        {urgenciaBadge(card.urgencia)}
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {card.empreendimento_name}
        {card.unidade_number && ` · Unid. ${card.unidade_number}`}
        {card.area_name && ` · ${card.area_name}`}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{card.requested_by_name}</span>
        <div className="flex items-center gap-2">
          {card.comments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {card.comments.length}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {daysOpen(card.created_at)}d
          </span>
        </div>
      </div>
    </div>
  )
}

function Column({
  colId,
  label,
  colorClass,
  cards,
  onCardClick,
}: {
  colId: SolicitacaoStatus
  label: string
  colorClass: string
  cards: SolicitacaoCard[]
  onCardClick: (card: SolicitacaoCard) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })
  return (
    <div className={cn('flex flex-col rounded-lg border-2 min-w-[240px] w-64 shrink-0', colorClass, isOver && 'ring-2 ring-primary')}>
      <div className="px-3 py-2 border-b font-semibold text-sm flex items-center justify-between">
        <span>{label}</span>
        <span className="text-xs font-normal text-muted-foreground bg-white/70 rounded-full px-1.5 py-0.5">{cards.length}</span>
      </div>
      <div ref={setNodeRef} className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
        {cards.map(card => (
          <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
        ))}
      </div>
    </div>
  )
}

export default function KanbanCompras({ initialCards, empreendimentos, areas }: Props) {
  const router = useRouter()
  const [cards, setCards] = useState<SolicitacaoCard[]>(initialCards)
  const [activeCard, setActiveCard] = useState<SolicitacaoCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<SolicitacaoCard | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [filterEmp, setFilterEmp] = useState<string>('all')
  const [filterArea, setFilterArea] = useState<string>('all')
  const [filterUrgencia, setFilterUrgencia] = useState<string>('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const filteredCards = cards.filter(c => {
    if (filterEmp !== 'all' && c.empreendimento_name !== filterEmp) return false
    if (filterArea !== 'all' && c.area_name !== filterArea) return false
    if (filterUrgencia !== 'all' && c.urgencia !== filterUrgencia) return false
    return true
  })

  function handleDragStart(e: DragStartEvent) {
    setActiveCard(cards.find(c => c.id === e.active.id) ?? null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const newStatus = over.id as SolicitacaoStatus
    const card = cards.find(c => c.id === active.id)
    if (!card || card.status === newStatus) return

    // Optimistic update
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: newStatus } : c))
    const result = await updateSolicitacaoStatus(card.id, newStatus)
    if (result.error) {
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: card.status } : c))
    }
  }

  const handleAddComment = useCallback(async () => {
    if (!selectedCard || !comment.trim()) return
    setSubmitting(true)
    const result = await addSolicitacaoComment(selectedCard.id, comment.trim())
    if (!result.error) {
      setComment('')
      router.refresh()
    }
    setSubmitting(false)
  }, [selectedCard, comment, router])

  return (
    <div className="flex flex-col h-full">
      {/* Header + filters */}
      <div className="px-6 py-4 border-b flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold mr-4">Kanban de Compras</h1>
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
        <Select value={filterUrgencia} onValueChange={setFilterUrgencia}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Urgência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda urgência</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-full">
            {KANBAN_COMPRAS_COLUMNS.map(col => (
              <Column
                key={col.id}
                colId={col.id}
                label={col.label}
                colorClass={col.color}
                cards={filteredCards.filter(c => c.status === col.id)}
                onCardClick={(card) => setSelectedCard(card)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard && (
              <div className="bg-white border rounded-lg p-3 shadow-xl w-64 opacity-90">
                <div className="text-sm font-medium line-clamp-2">{activeCard.title}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selectedCard} onOpenChange={(open) => { if (!open) setSelectedCard(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCard && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-base leading-tight">{selectedCard.title}</SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {urgenciaBadge(selectedCard.urgencia)}
                  <Badge variant="outline" className="text-xs">{selectedCard.status}</Badge>
                </div>
              </SheetHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Empreendimento:</span><br /><strong>{selectedCard.empreendimento_name}</strong></div>
                  {selectedCard.unidade_number && <div><span className="text-muted-foreground">Unidade:</span><br /><strong>{selectedCard.unidade_number}</strong></div>}
                  {selectedCard.area_name && <div><span className="text-muted-foreground">Área:</span><br /><strong>{selectedCard.area_name}</strong></div>}
                  <div><span className="text-muted-foreground">Solicitante:</span><br /><strong>{selectedCard.requested_by_name}</strong></div>
                  <div><span className="text-muted-foreground">Aberto há:</span><br /><strong>{daysOpen(selectedCard.created_at)} dias</strong></div>
                </div>

                {selectedCard.description && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Descrição</div>
                    <p className="text-sm">{selectedCard.description}</p>
                  </div>
                )}

                {Array.isArray(selectedCard.items) && (selectedCard.items as unknown[]).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Itens</div>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {(selectedCard.items as { name?: string; qty?: number }[]).map((item, i) => (
                        <li key={i}>{item.name ?? JSON.stringify(item)}{item.qty ? ` × ${item.qty}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Comentários ({selectedCard.comments.length})</div>
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                    {selectedCard.comments.map((c, i) => (
                      <div key={i} className="bg-muted rounded p-2 text-xs">
                        <div className="font-medium">{c.author_name}</div>
                        <div className="text-muted-foreground mb-0.5">{new Date(c.created_at).toLocaleString('pt-BR')}</div>
                        <div>{c.text}</div>
                      </div>
                    ))}
                    {selectedCard.comments.length === 0 && (
                      <div className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</div>
                    )}
                  </div>
                  <Textarea
                    placeholder="Escreva um comentário..."
                    className="text-sm min-h-[80px]"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleAddComment}
                    disabled={submitting || !comment.trim()}
                  >
                    {submitting ? 'Enviando...' : 'Comentar'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
