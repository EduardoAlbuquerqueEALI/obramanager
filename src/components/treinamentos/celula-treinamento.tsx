'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, AlertTriangle, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import NovoTreinamentoDialog from './novo-treinamento-dialog'
import { deleteTreinamento } from '@/actions/treinamentos'
import { useToast } from '@/hooks/use-toast'
import type { StatusCelula } from './matriz-treinamentos'

type Funcionario = { id: string; nome_completo: string; funcao: string | null; ativo: boolean }
type TipoTreinamento = { id: string; codigo: string; nome: string; validade_meses: number; ativo: boolean; sort_order: number }
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

interface Props {
  funcionario: Funcionario
  tipo: TipoTreinamento
  treinamento: Treinamento | null
  status: StatusCelula
  diasRestantes: number | null
}

const STATUS_STYLE: Record<StatusCelula, string> = {
  ok:       'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300',
  vencendo: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300',
  vencido:  'bg-red-100 text-red-700 hover:bg-red-200 border-red-300',
  ausente:  'bg-red-50 text-red-500 hover:bg-red-100 border-red-200',
}

export default function CelulaTreinamento({ funcionario, tipo, treinamento, status, diasRestantes }: Props) {
  const [open, setOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  // Célula X (sem treinamento) → abre dialog de cadastro rápido
  if (status === 'ausente') {
    return (
      <>
        <button
          type="button"
          className={`inline-flex items-center justify-center h-8 min-w-[56px] px-3 rounded border text-xs font-medium transition-colors ${STATUS_STYLE.ausente}`}
          onClick={() => setNewOpen(true)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <NovoTreinamentoDialog
          funcionarios={[funcionario]}
          tipos={[tipo]}
          preSelectFuncionario={funcionario.id}
          preSelectTipo={tipo.id}
          external={{ open: newOpen, onOpenChange: setNewOpen }}
        />
      </>
    )
  }

  // Com treinamento → mostra badge clicável + dialog de detalhe
  const icon = status === 'ok' ? <Check className="h-3.5 w-3.5" /> : status === 'vencendo' ? <AlertTriangle className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />
  const label = status === 'ok'
    ? 'OK'
    : status === 'vencendo'
      ? `${diasRestantes}d`
      : `-${Math.abs(diasRestantes ?? 0)}d`

  function confirmDelete() {
    if (!treinamento) return
    setConfirmDeleteOpen(false)
    startTransition(async () => {
      const result = await deleteTreinamento(treinamento.id)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Certificado removido' })
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        className={`inline-flex items-center gap-1 justify-center h-8 min-w-[56px] px-3 rounded border text-xs font-medium transition-colors ${STATUS_STYLE[status]}`}
        onClick={() => setOpen(true)}
      >
        {icon}
        <span>{label}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tipo.codigo} — {funcionario.nome_completo}</DialogTitle>
          </DialogHeader>

          {treinamento && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Nome da NR</div>
                <div>{tipo.nome}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Data de realização</div>
                  <div>{new Date(treinamento.data_realizacao).toLocaleDateString('pt-BR')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Vencimento</div>
                  <div className={status === 'vencido' ? 'text-red-600 font-medium' : status === 'vencendo' ? 'text-amber-600 font-medium' : ''}>
                    {treinamento.data_vencimento ? new Date(treinamento.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
              </div>
              {(treinamento.carga_horaria || treinamento.instrutor) && (
                <div className="grid grid-cols-2 gap-3">
                  {treinamento.carga_horaria && (
                    <div>
                      <div className="text-xs text-muted-foreground">Carga horária</div>
                      <div>{treinamento.carga_horaria}h</div>
                    </div>
                  )}
                  {treinamento.instrutor && (
                    <div>
                      <div className="text-xs text-muted-foreground">Instrutor</div>
                      <div>{treinamento.instrutor}</div>
                    </div>
                  )}
                </div>
              )}
              {treinamento.certificado_url && (
                <a
                  href={treinamento.certificado_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-sm text-primary underline"
                >
                  <Download className="h-4 w-4" />
                  Baixar certificado
                </a>
              )}
            </div>
          )}

          <DialogFooter className="flex-row sm:justify-between">
            <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)} disabled={isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
              <Button type="button" onClick={() => { setOpen(false); setNewOpen(true) }}>
                Renovar / Novo certificado
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover certificado?</DialogTitle>
            <DialogDescription>
              O registro de {tipo.codigo} de {funcionario.nome_completo} será removido. O funcionário voltará ao status &quot;sem treinamento&quot; para essa NR.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoTreinamentoDialog
        funcionarios={[funcionario]}
        tipos={[tipo]}
        preSelectFuncionario={funcionario.id}
        preSelectTipo={tipo.id}
        external={{ open: newOpen, onOpenChange: setNewOpen }}
      />
    </>
  )
}
