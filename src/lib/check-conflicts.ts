import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, format } from 'date-fns'

export interface ConflictInfo {
  workerName: string
  jobTitle: string
  date: string
}

export async function checkWorkerConflicts(
  supabase: SupabaseClient,
  {
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
  }
): Promise<ConflictInfo[]> {
  if (!workerIds.length || !scheduledDate || !timeStart) return []

  const endDate = format(
    addDays(new Date(scheduledDate + 'T12:00:00'), Math.max(1, durationDays) - 1),
    'yyyy-MM-dd'
  )

  // Fetch all jobs assigned to any of these workers that overlap the date range.
  const { data: rows } = await supabase
    .from('job_workers')
    .select('worker_id, worker:profiles(full_name), job:jobs(id, title, scheduled_date, duration_days, scheduled_time_start, scheduled_time_end, status)')
    .in('worker_id', workerIds)

  if (!rows) return []

  const conflicts: ConflictInfo[] = []

  for (const row of rows) {
    const j = row.job as unknown as {
      id: string; title: string; scheduled_date: string | null
      duration_days: number | null; scheduled_time_start: string | null
      scheduled_time_end: string | null; status: string
    } | null
    if (!j || !j.scheduled_date) continue
    if (j.id === excludeJobId) continue
    if (j.status === 'cancelled') continue

    const jEnd = format(
      addDays(new Date(j.scheduled_date + 'T12:00:00'), Math.max(1, j.duration_days ?? 1) - 1),
      'yyyy-MM-dd'
    )

    // Date ranges overlap?
    if (j.scheduled_date > endDate || jEnd < scheduledDate) continue

    // Time ranges overlap on the overlapping days?
    const jTimeStart = j.scheduled_time_start ?? '00:00'
    const jTimeEnd   = j.scheduled_time_end   ?? '23:59'
    if (timeStart >= jTimeEnd || timeEnd <= jTimeStart) continue

    const workerName = (row.worker as unknown as { full_name: string } | null)?.full_name ?? 'Técnico'
    conflicts.push({ workerName, jobTitle: j.title, date: j.scheduled_date })
  }

  return conflicts
}
