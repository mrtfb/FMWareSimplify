'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { addDays, format, getDaysInMonth, startOfMonth } from 'date-fns'
import { pt as ptPT } from 'date-fns/locale'
import { MapPin, ChevronRight, Calendar } from 'lucide-react'
import type { Job } from '@/types'

interface WorkerCalendarProps {
  jobs: (Job & { client?: { name: string; address: string | null } | null })[]
}

const statusConfig = {
  pending:     { label: 'Pendente',  color: 'bg-yellow-500' },
  in_progress: { label: 'Em curso',  color: 'bg-blue-500'   },
  completed:   { label: 'Concluído', color: 'bg-green-500'  },
  cancelled:   { label: 'Cancelado', color: 'bg-red-400'    },
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function WorkerCalendar({ jobs }: WorkerCalendarProps) {
  const today = new Date()
  const todayISO = format(today, 'yyyy-MM-dd')

  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(todayISO)

  const firstOfMonth = startOfMonth(new Date(currentYear, currentMonth))
  // Monday-based offset: Mon=0 … Sun=6
  const startPad = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = getDaysInMonth(firstOfMonth)

  // Expand every job across all its days so multi-day jobs appear on each day
  const jobsByDate: Record<string, typeof jobs> = {}
  jobs.forEach(job => {
    if (!job.scheduled_date) return
    const duration = Math.max(1, job.duration_days ?? 1)
    for (let d = 0; d < duration; d++) {
      const dateStr = format(addDays(new Date(job.scheduled_date + 'T12:00:00'), d), 'yyyy-MM-dd')
      if (!jobsByDate[dateStr]) jobsByDate[dateStr] = []
      // avoid duplicates (shouldn't happen but defensive)
      if (!jobsByDate[dateStr].some(j => j.id === job.id)) {
        jobsByDate[dateStr].push(job)
      }
    }
  })

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const monthLabel = format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy', { locale: ptPT })
  const selectedJobs = selectedDate ? (jobsByDate[selectedDate] ?? []) : []

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
        <p className="text-gray-500 text-sm mt-1">Os teus trabalhos agendados</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        {/* Month nav */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="outline" size="sm" onClick={prevMonth}>{'‹'}</Button>
          <h3 className="font-semibold capitalize">{monthLabel}</h3>
          <Button variant="outline" size="sm" onClick={nextMonth}>{'›'}</Button>
        </div>

        {/* Week day headers — Monday first */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b">
          {WEEK_DAYS.map(d => (
            <div key={d} className="p-2">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {/* Leading empty cells */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[64px] border-r border-b p-1 bg-gray-50" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayJobs = jobsByDate[dateStr] ?? []
            const isToday = dateStr === todayISO
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={[
                  'min-h-[64px] border-r border-b p-1 text-left w-full transition-colors',
                  isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-gray-50',
                  isToday && !isSelected ? 'bg-blue-50' : '',
                ].join(' ')}
              >
                <p className={[
                  'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-700',
                ].join(' ')}>{day}</p>
                <div className="space-y-0.5">
                  {dayJobs.slice(0, 2).map(job => {
                    const isStart = job.scheduled_date === dateStr
                    const st = statusConfig[job.status]
                    return (
                      <div
                        key={job.id}
                        className={[
                          'text-[10px] text-white px-1 py-0.5 rounded truncate',
                          st.color,
                          !isStart && 'opacity-70',
                        ].join(' ')}
                      >
                        {isStart ? job.title : `↦ ${job.title}`}
                      </div>
                    )
                  })}
                  {dayJobs.length > 2 && (
                    <p className="text-[10px] text-gray-400">+{dayJobs.length - 2}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 capitalize">
            {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, dd MMMM', { locale: ptPT })}
          </h2>
          {selectedJobs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sem trabalhos neste dia</p>
          ) : (
            selectedJobs.map(job => {
              const st = statusConfig[job.status]
              const client = job.client as { name: string; address: string | null } | null
              const duration = Math.max(1, job.duration_days ?? 1)
              const isStart = job.scheduled_date === selectedDate
              const dayIndex = isStart ? 0 : Math.round(
                (new Date(selectedDate + 'T12:00:00').getTime() - new Date(job.scheduled_date + 'T12:00:00').getTime()) / 86400000
              )

              return (
                <Link key={job.id} href={`/worker/jobs/${job.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full shrink-0 ${st.color}`} />
                        <div>
                          <p className="font-semibold text-sm">{job.title}</p>
                          {client && <p className="text-xs text-gray-500">{client.name}</p>}
                          {(client?.address || job.location) && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />{client?.address ?? job.location}
                            </p>
                          )}
                          {duration > 1 && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              Dia {dayIndex + 1} de {duration}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.scheduled_time_start && (
                          <span className="text-xs text-gray-500">{job.scheduled_time_start.slice(0, 5)}</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
