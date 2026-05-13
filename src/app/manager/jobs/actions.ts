'use server'

import { createClient } from '@/lib/supabase/server'
import { addDays, format } from 'date-fns'

export interface ConflictInfo {
  workerName: string
  jobTitle: string
  date: string
}

export async function checkConflictsAction({
  workerIds,
  scheduledDate,
  durationDays,
  timeStart,
  timeEnd,
  excludeJobId,
}: {
  workerIds: string[]
  scheduledDate: string
  durationDays: number
  timeStart: string
  timeEnd: string
  excludeJobId?: string
}): Promise<ConflictInfo[]> {
  if (!workerIds.length || !scheduledDate || !timeStart) return []

  const supabase = await createClient()

  const endDate = format(
    addDays(new Date(scheduledDate + 'T12:00:00'), Math.max(1, durationDays) - 1),
    'yyyy-MM-dd'
  )

  const { data: jwRows } = await supabase
    .from('job_workers')
    .select('job_id, worker_id, worker:profiles(full_name)')
    .in('worker_id', workerIds)

  if (!jwRows?.length) return []

  const jobIds = [...new Set(jwRows.map(r => r.job_id as string))]
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, scheduled_date, duration_days, scheduled_time_start, scheduled_time_end, status')
    .in('id', jobIds)

  if (!jobs?.length) return []

  const jobMap = new Map(jobs.map(j => [j.id, j]))
  const conflicts: ConflictInfo[] = []

  for (const jw of jwRows) {
    const j = jobMap.get(jw.job_id as string)
    if (!j || !j.scheduled_date) continue
    if (j.id === excludeJobId) continue
    if (j.status === 'cancelled') continue

    const jEnd = format(
      addDays(new Date(j.scheduled_date + 'T12:00:00'), Math.max(1, j.duration_days ?? 1) - 1),
      'yyyy-MM-dd'
    )

    if (j.scheduled_date > endDate || jEnd < scheduledDate) continue

    const jTimeStart = (j.scheduled_time_start ?? '00:00').slice(0, 5)
    const jTimeEnd   = (j.scheduled_time_end   ?? '23:59').slice(0, 5)
    const tStart     = timeStart.slice(0, 5)
    const tEnd       = timeEnd.slice(0, 5)
    if (tStart >= jTimeEnd || tEnd <= jTimeStart) continue

    const workerName = (jw.worker as unknown as { full_name: string } | null)?.full_name ?? 'Técnico'
    conflicts.push({ workerName, jobTitle: j.title, date: j.scheduled_date })
  }

  return conflicts
}
