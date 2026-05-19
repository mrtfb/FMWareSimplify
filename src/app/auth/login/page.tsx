'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

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
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'superadmin') router.push('/admin')
    else if (profile?.role === 'manager') router.push('/manager')
    else router.push('/worker')
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setRecoveryLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(recoveryEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setRecoveryLoading(false)
    setRecoverySent(true)
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">
      {/* Left panel — brand */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-between py-16 px-12 border-r border-white/5">
        <div className="flex-1 flex items-center justify-center w-full">
          <Image
            src="/fmware-logo.svg"
            alt="FMWare"
            width={480}
            height={280}
            className="w-full max-w-md"
            priority
          />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-white tracking-wide">GestObra</p>
          <p className="text-xs text-white/30">Gestão de obras e trabalho em campo</p>
          <p className="text-xs text-white/15 pt-2">© {new Date().getFullYear()} FMWare</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <Image src="/fmware-icon.svg" alt="FMWare" width={52} height={52} priority />
          <div className="text-center">
            <p className="text-lg font-bold text-white">GestObra</p>
            <p className="text-xs text-white/40">by FMWare</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {!recovering ? (
            <>
              <div className="mb-8 lg:block hidden">
                <h1 className="text-2xl font-bold text-white">Bem-vindo</h1>
                <p className="text-sm text-white/40 mt-1">Inicie sessão na sua conta</p>
              </div>
              <div className="mb-8 lg:hidden block text-center">
                <h1 className="text-xl font-bold text-white">Iniciar sessão</h1>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs font-medium uppercase tracking-wide">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#FF6A1A] focus:ring-[#FF6A1A]/20 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/70 text-xs font-medium uppercase tracking-wide">Password</Label>
                    <button
                      type="button"
                      onClick={() => { setRecovering(true); setRecoveryEmail(email); setRecoverySent(false) }}
                      className="text-xs text-[#FF6A1A] hover:text-[#FF8A3D] transition-colors"
                    >
                      Esqueceu a password?
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#FF6A1A] focus:ring-[#FF6A1A]/20 h-11"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[#FF6A1A] text-white font-semibold text-sm hover:bg-[#FF8A3D] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'A entrar...' : 'Entrar'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Recuperar password</h1>
                <p className="text-sm text-white/40 mt-1">Enviaremos um link para o seu email</p>
              </div>

              {recoverySent ? (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-sm text-white/70">
                    Se o email <span className="text-white font-medium">{recoveryEmail}</span> estiver registado, receberá um link em breve.
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecovering(false)}
                    className="w-full h-11 rounded-lg border border-white/10 text-white/60 text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecovery} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs font-medium uppercase tracking-wide">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@empresa.com"
                      value={recoveryEmail}
                      onChange={e => setRecoveryEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#FF6A1A] focus:ring-[#FF6A1A]/20 h-11"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full h-11 rounded-lg bg-[#FF6A1A] text-white font-semibold text-sm hover:bg-[#FF8A3D] disabled:opacity-50 transition-colors"
                  >
                    {recoveryLoading ? 'A enviar...' : 'Enviar link de recuperação'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecovering(false)}
                    className="w-full h-11 rounded-lg border border-white/10 text-white/60 text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Voltar ao login
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
