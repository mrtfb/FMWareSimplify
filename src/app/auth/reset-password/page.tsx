'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ClipboardList } from 'lucide-react'
import { PasswordField, isPasswordStrong } from '@/components/shared/password-field'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase sends tokens in the URL hash (implicit flow)
    // We need to establish the session before allowing password update
    const hash = window.location.hash
    if (!hash) { setReady(true); return }

    const params = new URLSearchParams(hash.substring(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      const supabase = createClient()
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        // Clean the hash from the URL without reloading
        window.history.replaceState(null, '', window.location.pathname)
        setReady(true)
      })
    } else {
      setReady(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isPasswordStrong(password)) {
      setError('A password não cumpre os requisitos mínimos.')
      return
    }
    if (password !== confirm) {
      setError('As passwords não coincidem.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError('Erro ao definir password. Tente novamente.')
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-blue-600 p-3 rounded-xl">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FichasWork</h1>
          <p className="text-gray-500 text-sm">Definir nova password</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          {!ready ? (
            <p className="text-sm text-gray-500 text-center py-4">A verificar sessão...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nova password</Label>
                <PasswordField value={password} onChange={setPassword} showStrength />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar password</Label>
                <PasswordField value={confirm} onChange={setConfirm} />
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-red-500">As passwords não coincidem.</p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !isPasswordStrong(password) || password !== confirm}
              >
                {loading ? 'A guardar...' : 'Definir password e entrar'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
