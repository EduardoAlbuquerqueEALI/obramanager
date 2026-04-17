import type { UnidadeStatusGeral, ChecklistStatus } from './database'

export interface UnidadeChecklistItem {
  id: string
  unidade_checklist_id: string
  template_item_id: string
  title: string
  required: boolean
  status: ChecklistStatus
  responsavel_id: string | null
  photo_url: string | null
  signature_url: string | null
  observacao: string | null
  assumed_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AreaProgress {
  areaId: string
  areaName: string
  icon: string
  color: string
  total: number
  completed: number
}

export interface UnidadeForGrid {
  id: string
  number: string
  floor: number
  torre_id: string
  status_geral: UnidadeStatusGeral
}

export interface TorreWithUnidades {
  id: string
  name: string
  floors: number
  empreendimento_id: string
  unidades: UnidadeForGrid[]
}
