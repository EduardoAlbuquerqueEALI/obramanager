'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { movimentoEstoqueSchema, type MovimentoEstoqueFormData } from '@/lib/validations/estoque'
import { createMovimento } from '@/actions/estoque'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

type Item = { id: string; codigo: string; descricao: string; unidade: string }
type Almox = { id: string; nome: string; empreendimento_id: string | null; ativo: boolean }
type Emp = { id: string; name: string }
type Etapa = { id: string; nome: string; empreendimento_id: string }

interface Props {
  itens: Item[]
  almoxarifados: Almox[]
  empreendimentos: Emp[]
}

const NONE = '__none__'

export default function MovimentoDialog({ itens, almoxarifados, empreendimentos }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MovimentoEstoqueFormData>({
    resolver: zodResolver(movimentoEstoqueSchema),
    defaultValues: {
      item_id: '',
      tipo: 'entrada',
      quantidade: 0,
      almoxarifado_origem_id: null,
      almoxarifado_destino_id: null,
      etapa_orcamento_id: null,
      observacoes: '',
    },
  })

  const tipo = watch('tipo')

  // Carrega etapas do empreendimento selecionado (para tipo 'saida')
  useEffect(() => {
    async function loadEtapas() {
      if (!selectedEmp) { setEtapas([]); return }
      const { data } = await supabase
        .from('orcamentos')
        .select('id, empreendimento_id, etapas_orcamento(id, nome)')
        .eq('empreendimento_id', selectedEmp)
        .in('status', ['rascunho', 'ativo', 'congelado'])
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle()
      const orc = data as unknown as { etapas_orcamento: Array<{ id: string; nome: string }>; empreendimento_id: string } | null
      setEtapas((orc?.etapas_orcamento ?? []).map(et => ({ id: et.id, nome: et.nome, empreendimento_id: orc!.empreendimento_id })))
    }
    loadEtapas()
  }, [selectedEmp, supabase])

  function onSubmit(data: MovimentoEstoqueFormData) {
    startTransition(async () => {
      const result = await createMovimento(data)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Movimento registrado' })
      setOpen(false)
      reset()
      setSelectedEmp(null)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo movimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={v => setValue('tipo', v as MovimentoEstoqueFormData['tipo'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída (apropriação)</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Item *</Label>
            <Select value={watch('item_id')} onValueChange={v => setValue('item_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar item" />
              </SelectTrigger>
              <SelectContent>
                {itens.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.codigo} · {i.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.item_id && <p className="text-xs text-destructive">{errors.item_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              step="0.01"
              min={0.01}
              {...register('quantidade', {
                setValueAs: (v) => v === '' || v === null ? 0 : Number(v),
              })}
            />
            {errors.quantidade && <p className="text-xs text-destructive">{errors.quantidade.message}</p>}
          </div>

          {(tipo === 'saida' || tipo === 'transferencia') && (
            <div className="space-y-2">
              <Label>Almoxarifado de origem *</Label>
              <Select value={watch('almoxarifado_origem_id') ?? NONE} onValueChange={v => setValue('almoxarifado_origem_id', v === NONE ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {almoxarifados.filter(a => a.ativo).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(tipo === 'entrada' || tipo === 'transferencia') && (
            <div className="space-y-2">
              <Label>Almoxarifado de destino *</Label>
              <Select value={watch('almoxarifado_destino_id') ?? NONE} onValueChange={v => setValue('almoxarifado_destino_id', v === NONE ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {almoxarifados.filter(a => a.ativo).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === 'saida' && (
            <>
              <div className="space-y-2">
                <Label>Empreendimento (para etapa)</Label>
                <Select value={selectedEmp ?? NONE} onValueChange={v => { setSelectedEmp(v === NONE ? null : v); setValue('etapa_orcamento_id', null) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional — para vincular etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem vínculo</SelectItem>
                    {empreendimentos.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {etapas.length > 0 && (
                <div className="space-y-2">
                  <Label>Etapa do orçamento (apropriação)</Label>
                  <Select value={watch('etapa_orcamento_id') ?? NONE} onValueChange={v => setValue('etapa_orcamento_id', v === NONE ? null : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem etapa</SelectItem>
                      {etapas.map(et => (
                        <SelectItem key={et.id} value={et.id}>{et.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} {...register('observacoes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Registrar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
