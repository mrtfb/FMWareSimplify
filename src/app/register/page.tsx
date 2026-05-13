'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerOrganization } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ClipboardList } from 'lucide-react'
import { PasswordField, isPasswordStrong } from '@/components/shared/password-field'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ orgName: '', managerName: '', email: '', password: '' })
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.orgName || !form.managerName || !form.email || !form.password) {
      setError('Preencha todos os campos.')
      return
    }
    if (!isPasswordStrong(form.password)) {
      setError('A password não cumpre os requisitos mínimos.')
      return
    }
    if (form.password !== confirm) {
      setError('As passwords não coincidem.')
      return
    }
    setLoading(true)
    setError('')
    const result = await registerOrganization(form)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <ClipboardList className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Conta criada!</h1>
          <p className="text-gray-500">A sua empresa foi registada com sucesso. Pode agora entrar com as suas credenciais.</p>
          <Button className="w-full" onClick={() => router.push('/auth/login')}>
            Entrar na plataforma
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-blue-600 p-3 rounded-xl">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FichasWork</h1>
          <p className="text-gray-500 text-sm">Registe a sua empresa — 14 dias grátis</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Criar conta</h2>
            <p className="text-sm text-gray-500 mt-0.5">Sem cartão de crédito. Cancele quando quiser.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da empresa *</Label>
              <Input
                placeholder="Ex: Electricidade Silva Lda"
                value={form.orgName}
                onChange={e => set('orgName', e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>O seu nome *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={form.managerName}
                onChange={e => set('managerName', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="joao@empresa.pt"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <PasswordField
                value={form.password}
                onChange={v => set('password', v)}
                showStrength
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar password *</Label>
              <PasswordField
                value={confirm}
                onChange={setConfirm}
              />
              {confirm.length > 0 && form.password !== confirm && (
                <p className="text-xs text-red-500">As passwords não coincidem.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isPasswordStrong(form.password) || form.password !== confirm}
            >
              {loading ? 'A criar conta...' : 'Criar conta grátis'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
