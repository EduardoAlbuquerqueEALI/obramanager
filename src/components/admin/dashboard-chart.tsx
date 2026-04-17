'use client'

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ProgressByArea } from '@/types/kanban'

interface Props {
  data: ProgressByArea[]
}

export default function DashboardChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Nenhum dado disponível
      </div>
    )
  }

  const chartData = data.map(d => ({
    name: d.area_name,
    pct: d.pct,
    color: d.area_color,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip
          formatter={(value) => [`${value}%`, 'Concluído']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color || '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
