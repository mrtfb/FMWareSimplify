'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, ChevronRight, Building2, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface ReportsManagerProps {
  jobs: any[]
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Em curso', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
}

export function ReportsManager({ jobs }: ReportsManagerProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  async function generatePDF(jobId: string) {
    setGeneratingId(jobId)
    try {
      const res = await fetch(`/api/pdf/${jobId}`)
      if (!res.ok) throw new Error('Erro ao gerar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-${jobId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao gerar PDF. Tente novamente.')
    }
    setGeneratingId(null)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Gere e exporte relatórios PDF por trabalho</p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum trabalho com fichas preenchidas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const st = statusConfig[job.status as keyof typeof statusConfig]
            const dailyCount = job.daily_reports?.length ?? 0
            const startReport = job.job_reports?.find((r: any) => r.report_type === 'start')
            const finishReport = job.job_reports?.find((r: any) => r.report_type === 'finish')
            const hasData = dailyCount > 0 || startReport || finishReport

            return (
              <Card key={job.id} className={!hasData ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{job.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        {job.client && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.client.name}</span>}
                        {job.worker && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{job.worker.full_name}</span>}
                        {job.scheduled_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(job.scheduled_date), 'dd/MM/yyyy')}</span>}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        <span className={startReport ? 'text-green-600 font-medium' : ''}>{startReport ? '✓ Ficha início' : '— Sem início'}</span>
                        <span className={dailyCount > 0 ? 'text-blue-600 font-medium' : ''}>{dailyCount} ficha{dailyCount !== 1 ? 's' : ''} diária{dailyCount !== 1 ? 's' : ''}</span>
                        <span className={finishReport ? 'text-green-600 font-medium' : ''}>{finishReport ? '✓ Ficha fim' : '— Sem fim'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Link href={`/manager/jobs/${job.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <ChevronRight className="h-3.5 w-3.5 mr-1" />Ver fichas
                        </Button>
                      </Link>
                      {hasData && (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => generatePDF(job.id)}
                          disabled={generatingId === job.id}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          {generatingId === job.id ? 'A gerar...' : 'Exportar PDF'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
