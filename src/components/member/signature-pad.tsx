'use client'

import { useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void
  confirmed: boolean
}

export default function SignaturePad({ onConfirm, confirmed }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null)

  function handleClear() {
    sigRef.current?.clear()
  }

  function handleConfirm() {
    if (!sigRef.current || sigRef.current.isEmpty()) return
    const dataUrl = sigRef.current.toDataURL('image/png')
    onConfirm(dataUrl)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Assinatura</p>
      <div className="border rounded-md overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{ className: 'w-full', height: 140, style: { display: 'block', touchAction: 'none' } }}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={confirmed}>
          Limpar
        </Button>
        <Button type="button" size="sm" onClick={handleConfirm} disabled={confirmed}>
          {confirmed ? 'Assinatura confirmada ✓' : 'Confirmar assinatura'}
        </Button>
      </div>
    </div>
  )
}
