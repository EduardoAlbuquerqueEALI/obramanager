'use client'

import Link from 'next/link'
import { Building2, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Emp = {
  id: string
  name: string
  city: string | null
  state: string | null
  status: string
  logo_url: string | null
  totalUnits: number
  completedUnits: number
  pct: number
}

const statusLabels: Record<string, string> = {
  planning: 'Planejamento',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  paused: 'Pausado',
}

const statusVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  planning: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  paused: 'destructive',
}

export default function EmpreendimentoCard({ emp }: { emp: Emp }) {
  return (
    <Link href={`/admin/empreendimentos/${emp.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="relative h-36 bg-muted rounded-t-lg overflow-hidden">
          {emp.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={emp.logo_url} alt={emp.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge variant={statusVariants[emp.status] ?? 'outline'}>
              {statusLabels[emp.status] ?? emp.status}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-2">
          <h3 className="font-semibold text-base leading-tight">{emp.name}</h3>
          {(emp.city || emp.state) && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[emp.city, emp.state].filter(Boolean).join(', ')}
            </p>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{emp.completedUnits} / {emp.totalUnits} unidades concluídas</span>
              <span className="font-medium">{emp.pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${emp.pct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
