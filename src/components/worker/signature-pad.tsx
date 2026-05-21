'use client'

import { useRef, forwardRef, useImperativeHandle } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'

export interface SignaturePadRef {
  toDataURL: () => string
  isEmpty: () => boolean
}

interface SignaturePadProps {
  label?: string
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad({ label = 'Assinatura do cliente' }, ref) {
  const sigRef = useRef<SignatureCanvas>(null)

  useImperativeHandle(ref, () => ({
    toDataURL: () => sigRef.current?.toDataURL('image/png') ?? '',
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
  }))

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="border-2 border-border rounded-xl overflow-hidden">
        <SignatureCanvas
          ref={sigRef}
          penColor="#111111"
          canvasProps={{ className: 'w-full', height: 200, style: { background: 'white' } }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => sigRef.current?.clear()}
      >
        Limpar assinatura
      </Button>
    </div>
  )
})
