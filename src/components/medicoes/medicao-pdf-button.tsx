'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { MedicaoPDFRow } from './medicao-pdf'

interface Props {
  orgName: string
  empreendimentoName: string
  orcamentoVersao: number
  mesReferencia: string
  rows: MedicaoPDFRow[]
  totalBudgeted: number
  totalPhysical: number
  observacoes: string | null
}

export default function MedicaoPdfButton(props: Props) {
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  async function handleDownload() {
    setGenerating(true)
    try {
      const [{ pdf }, { MedicaoPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./medicao-pdf'),
      ])
      const blob = await pdf(<MedicaoPDF {...props} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const slug = `${props.mesReferencia.slice(0, 7)}-${props.empreendimentoName.replace(/\s+/g, '-').toLowerCase()}`
      a.download = `medicao-${slug}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'PDF gerado' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={generating}>
      {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
      Baixar PDF
    </Button>
  )
}
