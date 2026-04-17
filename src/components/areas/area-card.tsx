'use client'

import Link from 'next/link'
import { ClipboardList, Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { deleteArea } from '@/actions/areas'
import { useToast } from '@/hooks/use-toast'
import { getIconComponent } from './icon-picker'

type Area = {
  id: string
  name: string
  description: string | null
  icon: string
  color: string
}

export default function AreaCard({ area, templateCount }: { area: Area; templateCount: number }) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const Icon = getIconComponent(area.icon)

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Excluir área "${area.name}"? Os templates associados também serão removidos.`)) return
    startTransition(async () => {
      const result = await deleteArea(area.id)
      if (result.error) toast({ title: result.error, variant: 'destructive' })
      else toast({ title: 'Área excluída' })
    })
  }

  return (
    <Link href={`/admin/areas/${area.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: `${area.color}20`, color: area.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <h3 className="font-semibold text-base mt-2">{area.name}</h3>
          {area.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{area.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>{templateCount} template{templateCount !== 1 ? 's' : ''} de checklist</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
