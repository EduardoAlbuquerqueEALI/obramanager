'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload } from 'lucide-react'
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
import { uploadFile, MIME_IMAGES_OR_PDF } from '@/lib/upload'
import { createTreinamento } from '@/actions/treinamentos'
import { useToast } from '@/hooks/use-toast'

type Funcionario = { id: string; nome_completo: string }
type TipoTreinamento = { id: string; codigo: string; nome: string; validade_meses: number }

interface Props {
  funcionarios: Funcionario[]
  tipos: TipoTreinamento[]
  preSelectFuncionario?: string
  preSelectTipo?: string
  external?: { open: boolean; onOpenChange: (v: boolean) => void }
}

export default function NovoTreinamentoDialog({
  funcionarios,
  tipos,
  preSelectFuncionario,
  preSelectTipo,
  external,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = external?.open ?? internalOpen
  const setOpen = external?.onOpenChange ?? setInternalOpen

  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const [funcionarioId, setFuncionarioId] = useState(preSelectFuncionario ?? '')
  const [tipoId, setTipoId] = useState(preSelectTipo ?? '')
  const [dataRealizacao, setDataRealizacao] = useState(() => new Date().toISOString().slice(0, 10))
  const [dataVencimento, setDataVencimento] = useState('')
  const [instrutor, setInstrutor] = useState('')
  const [cargaHoraria, setCargaHoraria] = useState<number | ''>('')
  const [certificadoUrl, setCertificadoUrl] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Quando troca tipo, sugere data de vencimento automaticamente
  useEffect(() => {
    if (!tipoId || !dataRealizacao) return
    const tipo = tipos.find(t => t.id === tipoId)
    if (!tipo) return
    const data = new Date(dataRealizacao)
    data.setMonth(data.getMonth() + tipo.validade_meses)
    setDataVencimento(data.toISOString().slice(0, 10))
  }, [tipoId, dataRealizacao, tipos])

  // Reset ao abrir com preSelects novos
  useEffect(() => {
    if (open) {
      if (preSelectFuncionario) setFuncionarioId(preSelectFuncionario)
      if (preSelectTipo) setTipoId(preSelectTipo)
    }
  }, [open, preSelectFuncionario, preSelectTipo])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadFile(file, {
      prefix: 'certificados',
      allowedMimes: MIME_IMAGES_OR_PDF,
      maxSizeMB: 10,
    })
    setUploading(false)
    if (!result.ok) {
      toast({ title: result.error || 'Erro ao subir arquivo', variant: 'destructive' })
      return
    }
    setCertificadoUrl(result.url!)
    toast({ title: 'Certificado anexado' })
  }

  function reset() {
    if (!preSelectFuncionario) setFuncionarioId('')
    if (!preSelectTipo) setTipoId('')
    setDataRealizacao(new Date().toISOString().slice(0, 10))
    setDataVencimento('')
    setInstrutor(''); setCargaHoraria(''); setCertificadoUrl(''); setObservacoes('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!funcionarioId) { toast({ title: 'Selecione funcionário', variant: 'destructive' }); return }
    if (!tipoId) { toast({ title: 'Selecione a NR', variant: 'destructive' }); return }
    startTransition(async () => {
      const result = await createTreinamento({
        funcionario_id: funcionarioId,
        tipo_treinamento_id: tipoId,
        data_realizacao: dataRealizacao,
        data_vencimento: dataVencimento || null,
        instrutor: instrutor || null,
        carga_horaria: cargaHoraria === '' ? null : Number(cargaHoraria),
        certificado_url: certificadoUrl || null,
        observacoes: observacoes || null,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Treinamento registrado' })
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!external && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Treinamento
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo treinamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Funcionário *</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId} disabled={!!preSelectFuncionario}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar funcionário" />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>NR / Tipo de treinamento *</Label>
            <Select value={tipoId} onValueChange={setTipoId} disabled={!!preSelectTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar NR" />
              </SelectTrigger>
              <SelectContent>
                {tipos.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.codigo} — {t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data de realização *</Label>
              <Input type="date" value={dataRealizacao} onChange={e => setDataRealizacao(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data de vencimento</Label>
              <Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
              <p className="text-xs text-muted-foreground">Preenche automaticamente pela NR</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Carga horária</Label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 40"
                value={cargaHoraria}
                onChange={e => setCargaHoraria(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Instrutor</Label>
              <Input value={instrutor} onChange={e => setInstrutor(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Certificado (PDF/imagem)</Label>
            <div className="relative">
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background text-sm">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-muted-foreground">
                  {certificadoUrl ? 'Arquivo anexado — substituir' : 'Anexar arquivo'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
            {certificadoUrl && !uploading && (
              <a href={certificadoUrl} target="_blank" rel="noopener" className="text-xs text-primary underline">
                Ver arquivo enviado
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending || uploading}>
              {isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
