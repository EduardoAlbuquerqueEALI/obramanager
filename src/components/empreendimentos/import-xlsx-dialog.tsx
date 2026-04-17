'use client'

import { useState, useTransition } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { importUnidadesAction, type XlsxRow } from '@/actions/empreendimentos'
import { useToast } from '@/hooks/use-toast'

interface ImportXlsxDialogProps {
  empreendimentoId: string
  torres: { id: string; name: string }[]
}

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase()
}

function mapRow(headers: string[], rawRow: unknown[]): XlsxRow | null {
  const obj: Record<string, string> = {}
  headers.forEach((h, i) => {
    const val = rawRow[i]
    obj[normalizeHeader(h)] = val != null ? String(val) : ''
  })

  const apto = obj['APTO']
  if (!apto) return null

  return {
    apto,
    equipe: obj['EQUIPE'],
    dtInicio: obj['DT INICIO'],
    dtConclusao: obj['DT CONCLUSÃO'],
    diasTrab: obj['DIAS TRAB.'],
    periferia: obj['PERIFERIA'],
    situacao: obj['SITUAÇÃO'],
    observacao: obj['OBSERVAÇÃO'],
  }
}

export default function ImportXlsxDialog({ empreendimentoId, torres }: ImportXlsxDialogProps) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<XlsxRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [selectedTorre, setSelectedTorre] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError(null)
    setRows([])

    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

      // Find header row (row containing 'APTO')
      let headerRowIdx = -1
      let headers: string[] = []
      for (let i = 0; i < raw.length; i++) {
        const row = raw[i] as unknown[]
        const normalized = row.map(c => String(c).trim().toUpperCase())
        if (normalized.includes('APTO')) {
          headerRowIdx = i
          headers = row.map(c => String(c))
          break
        }
      }

      if (headerRowIdx === -1) {
        setParseError('Coluna "APTO" não encontrada. Verifique o formato do arquivo.')
        return
      }

      const dataRows = raw.slice(headerRowIdx + 1)
      const parsed = dataRows
        .map(r => mapRow(headers, r as unknown[]))
        .filter((r): r is XlsxRow => r !== null && r.apto.trim() !== '')

      if (parsed.length === 0) {
        setParseError('Nenhuma linha de dados encontrada após o cabeçalho.')
        return
      }

      setRows(parsed)
    } catch {
      setParseError('Erro ao processar o arquivo. Verifique se é um .xlsx válido.')
    }

    // Reset input
    e.target.value = ''
  }

  function handleConfirm() {
    if (!selectedTorre) {
      toast({ title: 'Selecione uma torre', variant: 'destructive' })
      return
    }

    startTransition(async () => {
      const result = await importUnidadesAction(selectedTorre, empreendimentoId, rows)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: `${result.id} unidades importadas com sucesso` })
        setOpen(false)
        setRows([])
        setSelectedTorre('')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar .xlsx
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Unidades via Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker */}
          <div className="space-y-2">
            <Label>Arquivo .xlsx</Label>
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {rows.length > 0 ? `${rows.length} linhas carregadas` : 'Selecionar arquivo...'}
                </span>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Formato: colunas APTO, EQUIPE, DT INICIO, DT CONCLUSÃO, DIAS TRAB., PERIFERIA, SITUAÇÃO, OBSERVAÇÃO
            </p>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({rows.length} unidades)</Label>
              <div className="max-h-48 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>APTO</TableHead>
                      <TableHead>EQUIPE</TableHead>
                      <TableHead>DT INICIO</TableHead>
                      <TableHead>DT CONCLUSÃO</TableHead>
                      <TableHead>SITUAÇÃO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{r.apto}</TableCell>
                        <TableCell className="text-sm">{r.equipe ?? '—'}</TableCell>
                        <TableCell className="text-sm">{r.dtInicio ?? '—'}</TableCell>
                        <TableCell className="text-sm">{r.dtConclusao ?? '—'}</TableCell>
                        <TableCell className="text-sm">{r.situacao ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {rows.length > 20 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-xs text-muted-foreground text-center py-2">
                          + {rows.length - 20} linhas não exibidas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Torre selector */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <Label>Torre de destino *</Label>
              {torres.length === 0 ? (
                <p className="text-sm text-muted-foreground">Crie uma torre antes de importar.</p>
              ) : (
                <Select value={selectedTorre} onValueChange={setSelectedTorre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a torre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {torres.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setRows([]); setSelectedTorre('') }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={rows.length === 0 || !selectedTorre || isPending}
            >
              {isPending ? 'Importando...' : `Importar ${rows.length} unidades`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
