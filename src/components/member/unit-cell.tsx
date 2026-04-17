'use client'

import { cn } from '@/lib/utils'
import type { UnidadeStatusGeral } from '@/types/database'

interface UnitCellProps {
  number: string
  status: UnidadeStatusGeral
  onClick: () => void
}

const colorMap: Record<UnidadeStatusGeral, string> = {
  completed: 'bg-emerald-500 text-white hover:bg-emerald-600',
  in_progress: 'bg-amber-400 text-black hover:bg-amber-500',
  pending: 'bg-muted text-muted-foreground hover:bg-muted/80',
  issue: 'bg-rose-500 text-white hover:bg-rose-600',
}

export default function UnitCell({ number, status, onClick }: UnitCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full min-h-[44px] rounded text-xs font-semibold transition-colors leading-tight flex items-center justify-center px-0.5',
        colorMap[status],
      )}
      style={{ minWidth: 0 }}
    >
      <span className="truncate">{number}</span>
    </button>
  )
}
