'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, X, AlertTriangle } from 'lucide-react'
import NovoTreinamentoDialog from './novo-treinamento-dialog'
import CelulaTreinamento from './celula-treinamento'

type Funcionario = {
  id: string
  nome_completo: string
  funcao: string | null
  ativo: boolean
}

type TipoTreinamento = {
  id: string
  codigo: string
  nome: string
  validade_meses: number
  ativo: boolean
  sort_order: number
}

type Treinamento = {
  id: string
  funcionario_id: string
  tipo_treinamento_id: string
  data_realizacao: string
  data_vencimento: string | null
  certificado_url: string | null
  carga_horaria: number | null
  instrutor: string | null
}

export type StatusCelula = 'ok' | 'vencendo' | 'vencido' | 'ausente'

interface Props {
  funcionarios: Funcionario[]
  tipos: TipoTreinamento[]
  treinamentos: Treinamento[]
}

// Para cada (funcionario × tipo), encontra o treinamento mais recente e calcula status
function calcularStatus(dataVencimento: string | null): { status: StatusCelula; diasRestantes: number | null } {
  if (!dataVencimento) return { status: 'ok', diasRestantes: null }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(dataVencimento)
  venc.setHours(0, 0, 0, 0)
  const diff = Math.round((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { status: 'vencido', diasRestantes: diff }
  if (diff <= 30) return { status: 'vencendo', diasRestantes: diff }
  return { status: 'ok', diasRestantes: diff }
}

export default function MatrizTreinamentos({ funcionarios, tipos, treinamentos }: Props) {
  const [filtroFuncao, setFiltroFuncao] = useState('')
  const [ocultarInativos, setOcultarInativos] = useState(true)

  // Agrupa treinamento mais recente por (funcionario_id, tipo_treinamento_id)
  const treinamentoPor = useMemo(() => {
    const map = new Map<string, Treinamento>()
    for (const t of treinamentos) {
      const key = `${t.funcionario_id}:${t.tipo_treinamento_id}`
      const existing = map.get(key)
      if (!existing || new Date(t.data_realizacao) > new Date(existing.data_realizacao)) {
        map.set(key, t)
      }
    }
    return map
  }, [treinamentos])

  // Funcionários filtrados
  const funcsFiltrados = useMemo(() => {
    return funcionarios.filter(f => {
      if (ocultarInativos && !f.ativo) return false
      if (filtroFuncao.trim()) {
        const needle = filtroFuncao.toLowerCase()
        const haystack = `${f.nome_completo} ${f.funcao ?? ''}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [funcionarios, filtroFuncao, ocultarInativos])

  // Stats globais
  const stats = useMemo(() => {
    let ok = 0, vencendo = 0, vencido = 0, ausente = 0
    for (const f of funcsFiltrados) {
      for (const t of tipos) {
        const tr = treinamentoPor.get(`${f.id}:${t.id}`)
        if (!tr) { ausente++; continue }
        const { status } = calcularStatus(tr.data_vencimento)
        if (status === 'ok') ok++
        else if (status === 'vencendo') vencendo++
        else if (status === 'vencido') vencido++
      }
    }
    const total = ok + vencendo + vencido + ausente
    return { ok, vencendo, vencido, ausente, total }
  }, [funcsFiltrados, tipos, treinamentoPor])

  return (
    <div className="space-y-4">
      {/* Filters + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card className="p-3 col-span-2">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Buscar</Label>
              <Input
                placeholder="Nome ou função..."
                value={filtroFuncao}
                onChange={e => setFiltroFuncao(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox id="ocultar-inativos" checked={ocultarInativos} onCheckedChange={v => setOcultarInativos(!!v)} />
              <Label htmlFor="ocultar-inativos" className="cursor-pointer text-xs">Ocultar inativos</Label>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Válidos</div>
          <div className="text-xl font-bold text-emerald-600 flex items-center gap-1">
            <Check className="h-5 w-5" /> {stats.ok}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Vencendo</div>
          <div className="text-xl font-bold text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-5 w-5" /> {stats.vencendo}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Vencidos / Ausentes</div>
          <div className="text-xl font-bold text-red-600 flex items-center gap-1">
            <X className="h-5 w-5" /> {stats.vencido + stats.ausente}
          </div>
        </Card>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Matriz de Treinamentos</h2>
        <NovoTreinamentoDialog funcionarios={funcsFiltrados} tipos={tipos} />
      </div>

      {/* Matrix */}
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left py-3 pl-4 pr-2 font-medium text-xs text-muted-foreground uppercase sticky left-0 bg-muted/40 min-w-[240px]">
                Funcionário
              </th>
              {tipos.map(t => (
                <th
                  key={t.id}
                  className="py-3 px-2 font-medium text-xs text-muted-foreground uppercase text-center min-w-[96px]"
                  title={t.nome}
                >
                  {t.codigo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {funcsFiltrados.map(f => (
              <tr key={f.id} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="py-3 pl-4 pr-2 sticky left-0 bg-background min-w-[240px]">
                  <div className="font-medium">{f.nome_completo}</div>
                  {f.funcao && <div className="text-xs text-muted-foreground">{f.funcao}</div>}
                </td>
                {tipos.map(t => {
                  const tr = treinamentoPor.get(`${f.id}:${t.id}`)
                  const { status, diasRestantes } = tr
                    ? calcularStatus(tr.data_vencimento)
                    : { status: 'ausente' as StatusCelula, diasRestantes: null }
                  return (
                    <td key={t.id} className="py-2 px-2 text-center">
                      <CelulaTreinamento
                        funcionario={f}
                        tipo={t}
                        treinamento={tr ?? null}
                        status={status}
                        diasRestantes={diasRestantes}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
            {funcsFiltrados.length === 0 && (
              <tr>
                <td colSpan={tipos.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum funcionário corresponde ao filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
