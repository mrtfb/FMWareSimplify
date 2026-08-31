import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { loadPhoto, PhotoMosaic, type LoadedPhoto, type FailedPhoto } from '@/lib/pdf-photos'

const ORANGE = '#FF6A1A'
const GRAY1 = '#111827'
const GRAY2 = '#374151'
const GRAY3 = '#6b7280'
const GRAY4 = '#e5e7eb'
const GRAY5 = '#f9fafb'

const LOCATION_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending:     { bg: '#f9fafb', border: GRAY4,    text: GRAY3,      label: 'Por fazer' },
  in_progress: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', label: 'Em curso' },
  completed:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', label: 'Concluído' },
}

const s = StyleSheet.create({
  page: { padding: '36 44 60 44', fontFamily: 'Helvetica', fontSize: 10, color: GRAY1, backgroundColor: '#ffffff' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottom: `1.5 solid ${GRAY4}` },
  headerTitle: { fontSize: 9, fontWeight: 'bold', color: GRAY2 },
  headerSub: { fontSize: 8, color: GRAY3, marginTop: 1 },
  headerLogo: { fontSize: 10, fontWeight: 'bold', color: ORANGE },

  coverHeader: { marginBottom: 24, paddingBottom: 16, borderBottom: `2 solid ${ORANGE}` },
  coverTitle: { fontSize: 20, fontWeight: 'bold', color: ORANGE },
  coverSubtitle: { fontSize: 11, color: GRAY3, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  metaLabel: { fontSize: 9, color: GRAY3, width: 90 },
  metaValue: { fontSize: 9, fontWeight: 'bold', color: GRAY2, flex: 1 },

  summaryGrid: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 20 },
  summaryBox: { flex: 1, borderRadius: 4, padding: '10 12', border: `1 solid ${GRAY4}` },
  summaryNum: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 8, color: GRAY3, marginTop: 2 },

  progressTrack: { height: 8, borderRadius: 4, backgroundColor: GRAY4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: 8, backgroundColor: '#22c55e' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginTop: 4, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },

  row: { borderRadius: 4, border: `1 solid ${GRAY4}`, padding: '8 10', marginBottom: 6 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontSize: 9.5, fontWeight: 'bold', color: GRAY1 },
  rowBadge: { fontSize: 7, fontWeight: 'bold', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 },
  rowNote: { fontSize: 8.5, color: GRAY2, marginTop: 4, backgroundColor: GRAY5, borderRadius: 3, padding: 6 },

  footer: { position: 'absolute', bottom: 22, left: 44, right: 44, borderTop: `1 solid ${GRAY4}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: GRAY3 },
})

function formatDate(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d }
}

function PageFooter({ jobTitle, clientName }: { jobTitle: string; clientName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{jobTitle}{clientName ? ` — ${clientName}` : ''} — Relatório de Locais</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function Header({ jobTitle, clientName }: { jobTitle: string; clientName: string }) {
  return (
    <View style={s.header} fixed>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>{jobTitle}</Text>
        {clientName && <Text style={s.headerSub}>{clientName}</Text>}
      </View>
      <Text style={s.headerLogo}>GestObra</Text>
    </View>
  )
}

function LocationRow({ loc, photosFor }: { loc: any; photosFor: (media: any[] | undefined) => (LoadedPhoto | FailedPhoto)[] }) {
  const ls = LOCATION_STYLE[loc.status] ?? LOCATION_STYLE.pending
  const hasExtra = loc.notes || (loc.media && loc.media.length > 0)
  return (
    <View style={s.row} wrap={false}>
      <View style={s.rowHeader}>
        <Text style={s.rowName}>{loc.name}</Text>
        <Text style={[s.rowBadge, { color: ls.text, backgroundColor: ls.bg }]}>{ls.label}</Text>
      </View>
      {loc.notes && <Text style={s.rowNote}>{loc.notes}</Text>}
      {loc.media && loc.media.length > 0 && (
        <View style={{ marginTop: hasExtra ? 6 : 0 }}>
          <PhotoMosaic photos={photosFor(loc.media)} rowHeight={80} maxWidth={140} />
        </View>
      )}
    </View>
  )
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [{ data: job, error: jobError }, { data: locations }, { data: jobWorkers }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(*)').eq('id', jobId).single(),
    supabase.from('job_locations').select('*, media(*)').eq('job_id', jobId).order('sort_order'),
    supabase.from('job_workers').select('worker:profiles(full_name)').eq('job_id', jobId),
  ])

  if (!job) {
    console.error('[PDF locations] job query error:', jobError)
    return NextResponse.json({ error: `Trabalho não encontrado: ${jobError?.message ?? 'null'}` }, { status: 404 })
  }
  if (!locations || locations.length === 0) {
    return NextResponse.json({ error: 'Este trabalho não tem locais definidos.' }, { status: 400 })
  }

  const client = job.client as Record<string, string> | null
  const clientName = client?.name ?? ''
  const teamNames = (jobWorkers ?? []).map((jw: any) => jw.worker?.full_name).filter(Boolean).join(', ')

  const allMedia = (locations as any[]).flatMap(l => l.media ?? [])
  const loadedById = new Map<string, LoadedPhoto | FailedPhoto>(
    (await Promise.all(allMedia.map((m: any) => loadPhoto(m.public_url, m.id)))).map(p => [p.key, p])
  )
  function photosFor(media: any[] | undefined): (LoadedPhoto | FailedPhoto)[] {
    if (!media) return []
    return media.map((m: any) => loadedById.get(m.id) ?? { key: m.id, ok: false, url: m.public_url })
  }

  const completed = (locations as any[]).filter(l => l.status === 'completed')
  const inProgress = (locations as any[]).filter(l => l.status === 'in_progress')
  const pending = (locations as any[]).filter(l => l.status === 'pending')
  const pct = locations.length > 0 ? Math.round((completed.length / locations.length) * 100) : 0

  let pdf: Buffer
  try {
    pdf = await renderToBuffer(
      <Document title={`Relatório de Locais — ${job.title}`} author="GestObra">
        <Page size="A4" style={s.page} wrap>
          <Header jobTitle={job.title} clientName={clientName} />

          <View style={s.coverHeader}>
            <Text style={s.coverTitle}>Relatório de Locais</Text>
            <Text style={s.coverSubtitle}>{job.title}{clientName ? ` — ${clientName}` : ''} · gerado em {new Date().toLocaleDateString('pt-PT')}</Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            {clientName && (
              <View style={s.metaRow}><Text style={s.metaLabel}>Cliente</Text><Text style={s.metaValue}>{clientName}</Text></View>
            )}
            {job.location && (
              <View style={s.metaRow}><Text style={s.metaLabel}>Local</Text><Text style={s.metaValue}>{job.location}</Text></View>
            )}
            {teamNames && (
              <View style={s.metaRow}><Text style={s.metaLabel}>Equipa</Text><Text style={s.metaValue}>{teamNames}</Text></View>
            )}
            {job.scheduled_date && (
              <View style={s.metaRow}><Text style={s.metaLabel}>Data</Text><Text style={s.metaValue}>{formatDate(job.scheduled_date)}</Text></View>
            )}
          </View>

          {/* Progress bar */}
          <View style={{ marginBottom: 4 }}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={{ fontSize: 8, color: GRAY3 }}>{completed.length}/{locations.length} concluídos ({pct}%)</Text>
          </View>

          {/* Stats */}
          <View style={s.summaryGrid}>
            <View style={[s.summaryBox, { backgroundColor: LOCATION_STYLE.completed.bg, borderColor: LOCATION_STYLE.completed.border }]}>
              <Text style={[s.summaryNum, { color: LOCATION_STYLE.completed.text }]}>{completed.length}</Text>
              <Text style={s.summaryLabel}>Concluídos</Text>
            </View>
            <View style={[s.summaryBox, { backgroundColor: LOCATION_STYLE.in_progress.bg, borderColor: LOCATION_STYLE.in_progress.border }]}>
              <Text style={[s.summaryNum, { color: LOCATION_STYLE.in_progress.text }]}>{inProgress.length}</Text>
              <Text style={s.summaryLabel}>Em curso</Text>
            </View>
            <View style={[s.summaryBox, { backgroundColor: LOCATION_STYLE.pending.bg, borderColor: LOCATION_STYLE.pending.border }]}>
              <Text style={[s.summaryNum, { color: GRAY3 }]}>{pending.length}</Text>
              <Text style={s.summaryLabel}>Por fazer</Text>
            </View>
          </View>

          {/* Grouped lists */}
          {completed.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: LOCATION_STYLE.completed.text }]}>Concluídos ({completed.length})</Text>
              {completed.map((loc, i) => <LocationRow key={i} loc={loc} photosFor={photosFor} />)}
            </>
          )}
          {inProgress.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: LOCATION_STYLE.in_progress.text }]}>Em curso ({inProgress.length})</Text>
              {inProgress.map((loc, i) => <LocationRow key={i} loc={loc} photosFor={photosFor} />)}
            </>
          )}
          {pending.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: GRAY3 }]}>Por fazer ({pending.length})</Text>
              {pending.map((loc, i) => <LocationRow key={i} loc={loc} photosFor={photosFor} />)}
            </>
          )}

          <PageFooter jobTitle={job.title} clientName={clientName} />
        </Page>
      </Document>
    )
  } catch (err) {
    console.error('[PDF locations] renderToBuffer failed:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const safeName = (str: string) => str.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '_').slice(0, 40)
  const filename = `locais_${safeName(job.title)}${clientName ? `_${safeName(clientName)}` : ''}.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
