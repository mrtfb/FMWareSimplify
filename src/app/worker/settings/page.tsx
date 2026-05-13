'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordField, isPasswordStrong } from '@/components/shared/password-field'
import { KeyRound } from 'lucide-react'

export default function WorkerSettingsPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isPasswordStrong(password)) {
      setIsError(true)
      setMessage('A password não cumpre os requisitos mínimos.')
      return
    }
    if (password !== confirm) {
      setIsError(true)
      setMessage('As passwords não coincidem.')
      return
    }
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setIsError(true)
      setMessage('Erro ao alterar password. Tente novamente.')
    } else {
      setIsError(false)
      setMessage('Password alterada com sucesso!')
      setPassword('')
      setConfirm('')
    }
  }

  return (
    <div className="p-8 max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Definições</h1>
        <p className="text-sm text-gray-500 mt-1">Configurações da sua conta</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <KeyRound className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Alterar password</p>
            <p className="text-xs text-gray-500">Escolha uma nova password segura</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nova password</Label>
            <PasswordField value={password} onChange={setPassword} showStrength />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova password</Label>
            <PasswordField value={confirm} onChange={setConfirm} />
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-red-500">As passwords não coincidem.</p>
            )}
          </div>

          {message && (
            <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !isPasswordStrong(password) || password !== confirm}
          >
            {loading ? 'A guardar...' : 'Guardar password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
