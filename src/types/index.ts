export type UserRole = 'manager' | 'worker'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  organization_id: string | null
  created_at: string
}

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Client {
  id: string
  organization_id: string
  name: string
  address: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  created_at: string
}

export interface Job {
  id: string
  organization_id: string
  client_id: string | null
  worker_id: string | null
  title: string
  description: string | null
  location: string | null
  scheduled_date: string | null
  scheduled_time_start: string | null
  scheduled_time_end: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  duration_days: number
  recurrence: 'none' | 'weekly' | 'monthly'
  created_at: string
  client?: Client
  worker?: Profile
}

export interface DailyReport {
  id: string
  job_id: string
  worker_id: string | null
  report_date: string
  description: string
  time_start: string | null
  time_end: string | null
  hours_worked: number | null
  materials_used: string | null
  observations: string | null
  created_at: string
  worker?: Profile
  media?: Media[]
}

export interface JobReport {
  id: string
  job_id: string
  worker_id: string | null
  report_type: 'start' | 'finish'
  report_date: string
  description: string | null
  client_observations: string | null
  client_name: string | null
  client_approved: boolean | null
  client_signature_url: string | null
  created_at: string
  worker?: Profile
  media?: Media[]
}

export interface Media {
  id: string
  daily_report_id: string | null
  job_report_id: string | null
  storage_path: string
  public_url: string
  caption: string | null
  created_at: string
}

export type JobStatus = Job['status']
