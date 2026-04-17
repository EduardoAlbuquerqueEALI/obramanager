'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, GripVertical, Save, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { TemplateItem } from '@/lib/validations/area'
import { createTemplate, deleteTemplate, updateTemplate } from '@/actions/areas'
import { useToast } from '@/hooks/use-toast'

type TplData = { id: string; name: string; items: TemplateItem[] }

interface OverrideTemplateEditorProps {
  empreendimentoId: string
  areaId: string
  areaName: string
  override: TplData | null
  global: TplData | null
}

function SortableItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: TemplateItem
  onUpdate: (id: string, field: keyof TemplateItem, value: string | boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-md border bg-background group">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={item.title}
        onChange={e => onUpdate(item.id, 'title', e.target.value)}
        className="flex-1 h-8 text-sm"
        placeholder="Título do item"
      />

      <div className="flex items-center gap-1.5">
        <Checkbox
          id={`req-${item.id}`}
          checked={item.required}
          onCheckedChange={v => onUpdate(item.id, 'required', Boolean(v))}
        />
        <label htmlFor={`req-${item.id}`} className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
          Obrigatório
        </label>
      </div>

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function OverrideTemplateEditor({
  empreendimentoId,
  areaId,
  areaName,
  override,
  global,
}: OverrideTemplateEditorProps) {
  const [currentOverride, setCurrentOverride] = useState<TplData | null>(override)
  const [items, setItems] = useState<TemplateItem[]>(override?.items ?? [])
  const [name, setName] = useState<string>(override?.name ?? areaName)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, startSave] = useTransition()
  const [isCreating, startCreate] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    setItems(arrayMove(items, oldIndex, newIndex))
    setIsDirty(true)
  }

  function addItem() {
    setItems(prev => [...prev, { id: `item-${Date.now()}`, title: '', required: true }])
    setIsDirty(true)
  }

  function updateItem(id: string, field: keyof TemplateItem, value: string | boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    setIsDirty(true)
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setIsDirty(true)
  }

  function handleCreateFromGlobal() {
    const seed: TemplateItem[] = global?.items ?? []
    startCreate(async () => {
      const result = await createTemplate(
        areaId,
        { name: global?.name ?? areaName, items: seed },
        empreendimentoId,
      )
      if (result.error || !result.id) {
        toast({ title: result.error ?? 'Erro ao criar override', variant: 'destructive' })
        return
      }
      setCurrentOverride({ id: result.id, name: global?.name ?? areaName, items: seed })
      setItems(seed)
      setName(global?.name ?? areaName)
      setIsDirty(false)
      toast({ title: 'Override criado' })
    })
  }

  function handleSave() {
    if (!currentOverride) return
    startSave(async () => {
      const result = await updateTemplate(
        currentOverride.id,
        areaId,
        { name: name.trim() || areaName, items },
        empreendimentoId,
      )
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Checklist salvo' })
        setIsDirty(false)
      }
    })
  }

  function handleDelete() {
    if (!currentOverride) return
    if (!confirm('Excluir este override? O template global voltará a ser usado.')) return
    startDelete(async () => {
      const result = await deleteTemplate(currentOverride.id, areaId)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        setCurrentOverride(null)
        setItems([])
        setIsDirty(false)
        toast({ title: 'Override excluído' })
      }
    })
  }

  // No override: show prompt
  if (!currentOverride) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <div>
          <p className="text-sm">
            Este empreendimento usa o <span className="font-medium">template global</span>{' '}
            da área &quot;{areaName}&quot;.
          </p>
          {global && (
            <p className="text-xs text-muted-foreground mt-1">
              {global.items.length} {global.items.length === 1 ? 'item' : 'itens'} no template global.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCreateFromGlobal} disabled={isCreating}>
            <Copy className="h-4 w-4 mr-1.5" />
            {isCreating ? 'Criando...' : 'Criar override (cópia do global)'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Um override permite que este empreendimento tenha um checklist diferente
          do padrão, sem afetar outros empreendimentos.
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">
            Override
          </span>
          <Input
            value={name}
            onChange={e => { setName(e.target.value); setIsDirty(true) }}
            className="h-8 text-sm max-w-xs"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-destructive transition-colors text-xs"
            title="Excluir override"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <SortableItem
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onDelete={removeItem}
              />
            ))}
          </SortableContext>
        </DndContext>

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhum item. Adicione abaixo.</p>
        )}

        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar item
        </button>
      </div>
    </div>
  )
}
