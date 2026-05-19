'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Rule {
  label: string
  test: (v: string) => boolean
}

const rules: Rule[] = [
  { label: 'Pelo menos 8 caracteres',  test: v => v.length >= 8 },
  { label: 'Uma letra maiúscula (A-Z)', test: v => /[A-Z]/.test(v) },
  { label: 'Uma letra minúscula (a-z)', test: v => /[a-z]/.test(v) },
  { label: 'Um número ou símbolo',      test: v => /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v) },
]

export function isPasswordStrong(password: string) {
  return rules.every(r => r.test(password))
}

interface PasswordFieldProps {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  showStrength?: boolean
  dark?: boolean
}

export function PasswordField({ id, value, onChange, placeholder = '••••••••', showStrength = false, dark = false }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('pr-10 h-11', dark && 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#FF6A1A] focus:ring-[#FF6A1A]/20')}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(v => !v)}
          className={cn('absolute right-3 top-1/2 -translate-y-1/2', dark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600')}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <ul className="space-y-1 pt-1">
          {rules.map(rule => {
            const ok = rule.test(value)
            return (
              <li key={rule.label} className={cn('flex items-center gap-2 text-xs',
                ok
                  ? dark ? 'text-green-400' : 'text-green-600'
                  : dark ? 'text-white/30' : 'text-gray-400'
              )}>
                {ok
                  ? <Check className="h-3.5 w-3.5 shrink-0" />
                  : <X className="h-3.5 w-3.5 shrink-0" />
                }
                {rule.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
