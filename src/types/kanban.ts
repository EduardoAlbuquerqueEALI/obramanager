import type { SolicitacaoStatus } from './database'

export type { SolicitacaoStatus }

export interface KanbanComprasColumn {
  id: SolicitacaoStatus
  label: string
  color: string
}

export const KANBAN_COMPRAS_COLUMNS: KanbanComprasColumn[] = [
  { id: 'pending',    label: 'Solicitado',  color: 'bg-gray-100 border-gray-300' },
  { id: 'em_cotacao', label: 'Em Cotação',  color: 'bg-yellow-50 border-yellow-300' },
  { id: 'approved',   label: 'Aprovado',    color: 'bg-blue-50 border-blue-300' },
  { id: 'purchased',  label: 'Comprado',    color: 'bg-purple-50 border-purple-300' },
  { id: 'entregue',   label: 'Entregue',    color: 'bg-green-50 border-green-300' },
  { id: 'rejected',   label: 'Recusado',    color: 'bg-red-50 border-red-300' },
]

export interface SolicitacaoComment {
  author_id: string
  author_name: string
  text: string
  created_at: string
}

export interface SolicitacaoCard {
  id: string
  title: string
  description: string | null
  status: SolicitacaoStatus
  urgencia: string
  empreendimento_name: string
  unidade_number: string | null
  area_name: string | null
  requested_by_name: string
  comments: SolicitacaoComment[]
  items: unknown
  created_at: string
  approved_by: string | null
}

export type KanbanTarefasColumnId = 'pendente' | 'com_pendencia' | 'em_andamento' | 'concluido'

export interface KanbanTarefasColumn {
  id: KanbanTarefasColumnId
  label: string
  color: string
  readOnly?: boolean
}

export const KANBAN_TAREFAS_COLUMNS: KanbanTarefasColumn[] = [
  { id: 'pendente',      label: 'Pendente',      color: 'bg-gray-100 border-gray-300' },
  { id: 'com_pendencia', label: 'Com Pendência',  color: 'bg-orange-50 border-orange-300', readOnly: true },
  { id: 'em_andamento',  label: 'Em Andamento',   color: 'bg-blue-50 border-blue-300' },
  { id: 'concluido',     label: 'Concluído',      color: 'bg-green-50 border-green-300' },
]

export interface TarefaCard {
  id: string
  title: string
  status: string
  observacao: string | null
  virtual_column: KanbanTarefasColumnId
  unidade_number: string
  torre_name: string
  empreendimento_name: string
  area_name: string
  area_color: string
  responsavel_name: string | null
  responsavel_id: string | null
  photo_url: string | null
  completed_at: string | null
  unidade_checklist_id: string
}

export interface ProgressByArea {
  area_id: string
  area_name: string
  area_color: string
  total: number
  completed: number
  pct: number
}

export interface RecentCompletion {
  id: string
  title: string
  unidade_number: string
  responsavel_name: string | null
  photo_url: string | null
  completed_at: string
}

export interface DashboardStats {
  totalUnidades: number
  pctConcluido: number
  tarefasEmAndamento: number
  solicitacoesPendentes: number
  progressByArea: ProgressByArea[]
  recentCompletions: RecentCompletion[]
}
