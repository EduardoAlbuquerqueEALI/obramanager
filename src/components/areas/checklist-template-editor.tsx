'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Plus, Trash2, GripVertical, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { templateSchema, type TemplateFormData, type TemplateItem } from '@/lib/validations/area'
import { createTemplate, deleteTemplate, updateTemplateItems } from '@/actions/areas'
import { useToast } from '@/hooks/use-toast'

type Template = {
  id: string
  name: string
  items: TemplateItem[]
}

interface ChecklistTemplateEditorProps {
  areaId: string
  templates: Template[]
}

// ─── Sortable item ────────────────────────────────────────────────────────────

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

// ─── Template editor panel ────────────────────────────────────────────────────

function TemplatePanel({ template, areaId }: { template: Template; areaId: string }) {
  const [items, setItems] = useState<TemplateItem[]>(template.items)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, startSave] = useTransition()
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
    const newItem: TemplateItem = {
      id: `item-${Date.now()}`,
      title: '',
      required: true,
    }
    setItems(prev => [...prev, newItem])
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

  function handleSave() {
    startSave(async () => {
      const result = await updateTemplateItems(template.id, areaId, items)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Template salvo' })
        setIsDirty(false)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Excluir template "${template.name}"?`)) return
    startDelete(async () => {
      const result = await deleteTemplate(template.id, areaId)
      if (result.error) toast({ title: result.error, variant: 'destructive' })
      else toast({ title: 'Template excluído' })
    })
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <span className="font-medium">{template.name}</span>
        <div className="flex items-center gap-2">
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

// ─── Add template dialog ──────────────────────────────────────────────────────

function AddTemplateDialog({ areaId }: { areaId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', items: [] },
  })

  function onSubmit(data: TemplateFormData) {
    startTransition(async () => {
      const result = await createTemplate(areaId, data)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Template criado' })
        setOpen(false)
        reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo Template de Checklist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('name')} placeholder="Ex: Vistoria Final" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Criando...' : 'Criar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ChecklistTemplateEditor({ areaId, templates }: ChecklistTemplateEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Templates de Checklist</h2>
        <AddTemplateDialog areaId={areaId} />
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
          <p className="text-sm">Nenhum template criado.</p>
          <p className="text-xs mt-1">Templates definem os itens padrão de inspeção para esta área.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(t => (
            <TemplatePanel key={t.id} template={t} areaId={areaId} />
          ))}
        </div>
      )}
    </div>
  )
}
