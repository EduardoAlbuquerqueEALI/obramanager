'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface Props {
  url: string
  compradorNome: string | null
  unidade: {
    number: string
    floor: number
    torre_name: string
    empreendimento_name: string
  } | null
  orgName: string
}

export default function QrPrintView({ url, compradorNome, unidade, orgName }: Props) {
  return (
    <>
      {/* Controle flutuante não-imprimível */}
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <Button onClick={() => window.print()} size="lg">
          <Printer className="h-5 w-5 mr-2" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Conteúdo printable */}
      <div className="min-h-screen flex items-center justify-center bg-muted/30 print:bg-white p-8">
        <div className="bg-white border border-gray-200 shadow-md rounded-xl p-12 max-w-[600px] w-full print:shadow-none print:border-none">
          {/* Header */}
          <div className="text-center mb-10">
            {orgName && (
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                {orgName}
              </div>
            )}
            <h1 className="text-3xl font-bold mb-1">Seu Portal Exclusivo</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe a obra, veja documentos e abra chamados
            </p>
          </div>

          {/* QR */}
          <div className="flex justify-center mb-10">
            <div className="border-8 border-white p-6 bg-white rounded-lg ring-1 ring-gray-200">
              <QRCodeSVG
                value={url}
                size={280}
                level="H"
                marginSize={0}
              />
            </div>
          </div>

          {/* Dados do comprador */}
          {compradorNome && (
            <div className="text-center mb-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Comprador</div>
              <div className="text-lg font-semibold">{compradorNome}</div>
            </div>
          )}

          {unidade && (
            <div className="text-center mb-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Unidade</div>
              <div className="text-base font-medium">
                {unidade.empreendimento_name} · {unidade.torre_name} · Apto {unidade.number}
              </div>
            </div>
          )}

          {/* Instrução */}
          <div className="text-center mb-6">
            <div className="text-sm text-muted-foreground mb-1">
              Aponte a câmera do celular para o QR Code acima
            </div>
            <div className="text-xs text-muted-foreground">ou acesse:</div>
          </div>

          {/* URL textual (fallback) */}
          <div className="text-center">
            <code className="text-xs bg-muted/50 px-3 py-2 rounded break-all block">
              {url}
            </code>
          </div>

          {/* Rodapé */}
          <div className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground">
            Mantenha este código em local seguro. Em caso de perda, solicite um novo à incorporadora.
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </>
  )
}
