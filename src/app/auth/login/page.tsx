'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [recovering, setRecovering] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou password incorretos.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'superadmin') {
      router.push('/admin')
    } else if (profile?.role === 'manager') {
      router.push('/manager')
    } else {
      router.push('/worker')
    }
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setRecoveryLoading(true)
    const supabase = createClient()
    const appUrl = window.location.origin
    await supabase.auth.resetPasswordForEmail(recoveryEmail.trim().toLowerCase(), {
      redirectTo: `${appUrl}/auth/reset-password`,
    })
    setRecoveryLoading(false)
    setRecoverySent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-blue-600 p-3 rounded-xl">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FichasWork</h1>
          <p className="text-gray-500 text-sm">Gestão de trabalho em campo</p>
        </div>

        <Card>
          {!recovering ? (
            <>
              <CardHeader>
                <CardTitle>Entrar</CardTitle>
                <CardDescription>Aceda à sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@empresa.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setRecovering(true); setRecoveryEmail(email); setRecoverySent(false) }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Esqueceu a password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'A entrar...' : 'Entrar'}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Recuperar password</CardTitle>
                <CardDescription>Enviaremos um link para redefinir a sua password</CardDescription>
              </CardHeader>
              <CardContent>
                {recoverySent ? (
                  <div className="space-y-4 text-center py-2">
                    <p className="text-sm text-gray-700">
                      Se o email <strong>{recoveryEmail}</strong> estiver registado, receberá um link em breve.
                    </p>
                    <button
                      type="button"
                      onClick={() => setRecovering(false)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Voltar ao login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRecovery} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recovery-email">Email</Label>
                      <Input
                        id="recovery-email"
                        type="email"
                        placeholder="email@empresa.com"
                        value={recoveryEmail}
                        onChange={e => setRecoveryEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={recoveryLoading}>
                      {recoveryLoading ? 'A enviar...' : 'Enviar link de recuperação'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setRecovering(false)}
                      className="w-full text-sm text-gray-500 hover:text-gray-700"
                    >
                      Voltar ao login
                    </button>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
