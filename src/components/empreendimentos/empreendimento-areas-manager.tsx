'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronRight, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { setEmpreendimentoAreas } from '@/actions/empreendimentos'
import { useToast } from '@/hooks/use-toast'
import { getIconComponent } from '@/components/areas/icon-picker'

type AreaOption = {
  id: string
  name: string
  icon: string
  color: string
}

interface EmpreendimentoAreasManagerProps {
  empreendimentoId: string
  allAreas: AreaOption[]
  activeAreaIds: string[]
}

export default function EmpreendimentoAreasManager({
  empreendimentoId,
  allAreas,
  activeAreaIds: initialActive,
}: EmpreendimentoAreasManagerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialActive))
  const [baseline, setBaseline] = useState<Set<string>>(new Set(initialActive))
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const isDirty =
    selected.size !== baseline.size ||
    Array.from(selected).some(id => !baseline.has(id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    startTransition(async () => {
      const result = await setEmpreendimentoAreas(empreendimentoId, Array.from(selected))
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Áreas atualizadas' })
        setBaseline(new Set(selected))
      }
    })
  }

  if (allAreas.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground text-center">
        Nenhuma área de serviço cadastrada na organização.{' '}
        <Link href="/admin/areas" className="text-primary hover:underline">
          Criar áreas
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <div>
          <h2 className="font-medium text-sm">Áreas de serviço ativas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione quais áreas os members verão neste empreendimento.
          </p>
        </div>
        {isDirty && (
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        )}
      </div>

      <ul className="divide-y">
        {allAreas.map(area => {
          const Icon = getIconComponent(area.icon)
          const isOn = selected.has(area.id)
          const wasActive = baseline.has(area.id)
          return (
            <li key={area.id} className="flex items-center gap-3 px-4 py-3">
              <Checkbox
                id={`area-${area.id}`}
                checked={isOn}
                onCheckedChange={() => toggle(area.id)}
              />
              <label
                htmlFor={`area-${area.id}`}
                className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
              >
                <span
                  className="rounded-md p-1.5 shrink-0"
                  style={{ backgroundColor: `${area.color}20`, color: area.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium truncate">{area.name}</span>
              </label>

              {wasActive && isOn && (
                <Link
                  href={`/admin/empreendimentos/${empreendimentoId}/areas/${area.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
                >
                  Customizar checklist <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
