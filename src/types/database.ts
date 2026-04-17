export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileRole = 'admin' | 'member'
export type EmpreendimentoStatus = 'planning' | 'in_progress' | 'completed' | 'paused'
export type UnidadeStatus = 'pendente' | 'em_andamento' | 'concluida' | 'entregue'
export type UnidadeStatusGeral = 'pending' | 'in_progress' | 'completed' | 'issue'
export type ChecklistStatus = 'pending' | 'in_progress' | 'completed' | 'approved'
export type SolicitacaoStatus = 'pending' | 'em_cotacao' | 'approved' | 'purchased' | 'entregue' | 'rejected'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          full_name: string
          role: ProfileRole
          email: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id: string
          full_name: string
          role?: ProfileRole
          email?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          full_name?: string
          role?: ProfileRole
          email?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      empreendimentos: {
        Row: {
          id: string
          org_id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          status: EmpreendimentoStatus
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          status?: EmpreendimentoStatus
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          status?: EmpreendimentoStatus
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      torres: {
        Row: {
          id: string
          empreendimento_id: string
          name: string
          floors: number
          created_at: string
        }
        Insert: {
          id?: string
          empreendimento_id: string
          name: string
          floors: number
          created_at?: string
        }
        Update: {
          id?: string
          empreendimento_id?: string
          name?: string
          floors?: number
          created_at?: string
        }
      }
      unidades: {
        Row: {
          id: string
          torre_id: string
          number: string
          floor: number
          type: string | null
          status: UnidadeStatus
          status_geral: UnidadeStatusGeral
          owner_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          torre_id: string
          number: string
          floor: number
          type?: string | null
          status?: UnidadeStatus
          status_geral?: UnidadeStatusGeral
          owner_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          torre_id?: string
          number?: string
          floor?: number
          type?: string | null
          status?: UnidadeStatus
          status_geral?: UnidadeStatusGeral
          owner_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      areas_servico: {
        Row: {
          id: string
          org_id: string | null
          empreendimento_id: string | null
          name: string
          description: string | null
          icon: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          empreendimento_id?: string | null
          name: string
          description?: string | null
          icon?: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          empreendimento_id?: string | null
          name?: string
          description?: string | null
          icon?: string
          color?: string
          created_at?: string
        }
      }
      checklist_templates: {
        Row: {
          id: string
          org_id: string
          area_servico_id: string | null
          empreendimento_id: string | null
          name: string
          items: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          area_servico_id?: string | null
          empreendimento_id?: string | null
          name: string
          items: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          area_servico_id?: string | null
          empreendimento_id?: string | null
          name?: string
          items?: Json
          created_at?: string
          updated_at?: string
        }
      }
      empreendimento_areas_servico: {
        Row: {
          empreendimento_id: string
          area_servico_id: string
          created_at: string
        }
        Insert: {
          empreendimento_id: string
          area_servico_id: string
          created_at?: string
        }
        Update: {
          empreendimento_id?: string
          area_servico_id?: string
          created_at?: string
        }
      }
      unidade_checklist: {
        Row: {
          id: string
          unidade_id: string
          checklist_template_id: string
          status: ChecklistStatus
          responsavel_id: string | null
          completed_items: Json | null
          photos: string[] | null
          signature_url: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unidade_id: string
          checklist_template_id: string
          status?: ChecklistStatus
          responsavel_id?: string | null
          completed_items?: Json | null
          photos?: string[] | null
          signature_url?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unidade_id?: string
          checklist_template_id?: string
          status?: ChecklistStatus
          responsavel_id?: string | null
          completed_items?: Json | null
          photos?: string[] | null
          signature_url?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      unidade_checklist_items: {
        Row: {
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
        Insert: {
          id?: string
          unidade_checklist_id: string
          template_item_id: string
          title: string
          required?: boolean
          status?: ChecklistStatus
          responsavel_id?: string | null
          photo_url?: string | null
          signature_url?: string | null
          observacao?: string | null
          assumed_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unidade_checklist_id?: string
          template_item_id?: string
          title?: string
          required?: boolean
          status?: ChecklistStatus
          responsavel_id?: string | null
          photo_url?: string | null
          signature_url?: string | null
          observacao?: string | null
          assumed_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_empreendimentos: {
        Row: {
          user_id: string
          empreendimento_id: string
        }
        Insert: {
          user_id: string
          empreendimento_id: string
        }
        Update: {
          user_id?: string
          empreendimento_id?: string
        }
      }
      user_areas: {
        Row: {
          user_id: string
          area_servico_id: string
        }
        Insert: {
          user_id: string
          area_servico_id: string
        }
        Update: {
          user_id?: string
          area_servico_id?: string
        }
      }
      solicitacoes_compra: {
        Row: {
          id: string
          empreendimento_id: string
          unidade_id: string | null
          area_servico_id: string | null
          requested_by: string
          title: string
          description: string | null
          items: Json
          urgencia: string
          status: SolicitacaoStatus
          approved_by: string | null
          comments: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empreendimento_id: string
          unidade_id?: string | null
          area_servico_id?: string | null
          requested_by: string
          title: string
          description?: string | null
          items: Json
          urgencia?: string
          status?: SolicitacaoStatus
          approved_by?: string | null
          comments?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empreendimento_id?: string
          unidade_id?: string | null
          area_servico_id?: string | null
          requested_by?: string
          title?: string
          description?: string | null
          items?: Json
          urgencia?: string
          status?: SolicitacaoStatus
          approved_by?: string | null
          comments?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      get_user_org: {
        Args: { uid: string }
        Returns: string
      }
      get_unidades_status_by_area: {
        Args: { p_emp: string; p_area: string }
        Returns: {
          unidade_id: string
          torre_id: string
          torre_name: string
          number: string
          floor: number
          status_area: 'pending' | 'in_progress' | 'completed' | 'issue'
          total: number
          done: number
          wip: number
          has_issue: boolean
        }[]
      }
    }
    Enums: {
      profile_role: ProfileRole
      empreendimento_status: EmpreendimentoStatus
      unidade_construction_status: UnidadeStatus
      unidade_status_geral: UnidadeStatusGeral
      checklist_status: ChecklistStatus
      solicitacao_status: SolicitacaoStatus
    }
  }
}
