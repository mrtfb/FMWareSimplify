import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { imageSize } from 'image-size'

const ORANGE = '#FF6A1A'
const GRAY1 = '#111827'
const GRAY2 = '#374151'
const GRAY3 = '#6b7280'
const GRAY4 = '#e5e7eb'
const GRAY5 = '#f9fafb'

// Visual identity per report type — gives the PDF rhythm as you flip through it
// instead of every page looking identical.
const TYPE_STYLE = {
  start:  { accent: '#059669', soft: '#d1fae5', label: 'FICHA DE INÍCIO' },
  daily:  { accent: '#2563eb', soft: '#dbeafe', label: 'FICHA DIÁRIA' },
  finish: { accent: '#7c3aed', soft: '#ede9fe', label: 'FICHA DE FIM' },
} as const

const LOCATION_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending:     { bg: '#f9fafb', border: GRAY4,    text: GRAY3,      label: 'Por fazer' },
  in_progress: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', label: 'Em curso' },
  completed:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', label: 'Concluído' },
}

const s = StyleSheet.create({
  page: { padding: '36 44 60 44', fontFamily: 'Helvetica', fontSize: 10, color: GRAY1, backgroundColor: '#ffffff' },

  // Colored accent strip at the very top of every report page (color varies by type)
  accentStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },

  // Page header (repeated on every page except cover)
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottom: `1.5 solid ${GRAY4}` },
  pageHeaderLeft: { flex: 1 },
  pageHeaderTitle: { fontSize: 9, fontWeight: 'bold', color: GRAY2 },
  pageHeaderSub: { fontSize: 8, color: GRAY3, marginTop: 1 },
  pageHeaderLogo: { fontSize: 10, fontWeight: 'bold', color: ORANGE },

  // Cover
  coverHeader: { marginBottom: 32, paddingBottom: 16, borderBottom: `2 solid ${ORANGE}` },
  coverTitle: { fontSize: 22, fontWeight: 'bold', color: ORANGE },
  coverSubtitle: { fontSize: 11, color: GRAY3, marginTop: 4 },
  coverMeta: { marginTop: 24, gap: 6 },
  metaRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  metaLabel: { fontSize: 9, color: GRAY3, width: 100 },
  metaValue: { fontSize: 9, fontWeight: 'bold', color: GRAY2, flex: 1 },

  // Summary boxes
  summaryGrid: { flexDirection: 'row', gap: 10, marginTop: 24 },
  summaryBox: { flex: 1, backgroundColor: GRAY5, borderRadius: 4, padding: '10 12', border: `1 solid ${GRAY4}` },
  summaryNum: { fontSize: 20, fontWeight: 'bold', color: ORANGE },
  summaryLabel: { fontSize: 8, color: GRAY3, marginTop: 2 },

  // Section heading on report pages
  sectionHeading: { fontSize: 13, fontWeight: 'bold', color: GRAY1, marginBottom: 14 },
  sectionTag: { fontSize: 8, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginBottom: 8, alignSelf: 'flex-start' },

  // Info rows
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { fontWeight: 'bold', width: 110, color: GRAY2, fontSize: 9 },
  infoValue: { flex: 1, color: GRAY2, fontSize: 9 },

  // Description block
  descBlock: { backgroundColor: GRAY5, borderRadius: 4, padding: 10, marginBottom: 10, border: `1 solid ${GRAY4}` },
  descText: { color: GRAY2, lineHeight: 1.5, fontSize: 9.5 },

  // Photo mosaic — each photo keeps its own natural aspect ratio (see PhotoMosaic below)
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  photoWrap: { borderRadius: 4, overflow: 'hidden', border: `1 solid ${GRAY4}` },

  // Signature
  signatureBox: { marginTop: 10 },
  signatureLabel: { fontSize: 8, color: GRAY3, marginBottom: 4 },
  signature: { width: 200, height: 70, border: `1 solid ${GRAY4}`, borderRadius: 3, backgroundColor: '#ffffff', objectFit: 'contain' },

  // Approval badge
  badgeApproved: { fontSize: 8, fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeRejected: { fontSize: 8, fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeHours: { fontSize: 8, fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },

  // Footer
  footer: { position: 'absolute', bottom: 22, left: 44, right: 44, borderTop: `1 solid ${GRAY4}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: GRAY3 },
  divider: { borderTop: `1 solid ${GRAY4}`, marginTop: 12, marginBottom: 12 },

  // Locations summary (grid of chips, color-coded by status)
  locationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  locationChip: { width: 110, borderRadius: 4, padding: '6 8', border: `1 solid ${GRAY4}` },
  locationChipText: { fontSize: 8.5, fontWeight: 'bold' },
  locationChipStatus: { fontSize: 7, marginTop: 2 },
})

function formatDate(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d }
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em curso', completed: 'Concluído', cancelled: 'Cancelado',
}

// ── Photo loading — fetch each image once, read its real dimensions, and
// hand react-pdf the raw bytes directly (no distortion, no forced square crop). ──
interface LoadedPhoto {
  key: string
  ok: true
  data: Buffer
  format: 'jpg' | 'png'
  aspectRatio: number
}
interface FailedPhoto {
  key: string
  ok: false
  url: string
}

async function loadPhoto(url: string, key: string): Promise<LoadedPhoto | FailedPhoto> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const dim = imageSize(bytes)
    const format = dim.type === 'png' ? 'png' : dim.type === 'jpg' || dim.type === 'jpeg' ? 'jpg' : null
    if (!format || !dim.width || !dim.height) throw new Error(`Unsupported format: ${dim.type}`)
    return { key, ok: true, data: Buffer.from(bytes), format, aspectRatio: dim.width / dim.height }
  } catch (err) {
    console.warn('[PDF] failed to load photo for sizing, falling back to URL:', url, err)
    return { key, ok: false, url }
  }
}

// Renders photos in a "justified gallery" style: fixed row height, width
// proportional to each photo's real aspect ratio — landscape shots come out
// wide, portrait shots come out narrow and tall, nothing gets squashed.
function PhotoMosaic({ photos, rowHeight = 130, maxWidth = 260 }: { photos: (LoadedPhoto | FailedPhoto)[]; rowHeight?: number; maxWidth?: number }) {
  return (
    <View style={s.photoGrid}>
      {photos.map(p => {
        if (p.ok) {
          const width = Math.min(maxWidth, rowHeight * p.aspectRatio)
          const height = width / p.aspectRatio
          return (
            <View key={p.key} style={[s.photoWrap, { width, height }]}>
              <Image src={{ data: p.data, format: p.format }} style={{ width, height }} />
            </View>
          )
        }
        // Fallback: still show the photo, just without a known aspect ratio
        return (
          <View key={p.key} style={[s.photoWrap, { width: rowHeight * 1.3, height: rowHeight }]}>
            <Image src={p.url} style={{ width: rowHeight * 1.3, height: rowHeight, objectFit: 'cover' }} />
          </View>
        )
      })}
    </View>
  )
}

function PageFooter({ jobTitle, clientName }: { jobTitle: string; clientName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{jobTitle}{clientName ? ` — ${clientName}` : ''}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function ReportPageHeader({ jobTitle, clientName, accent }: { jobTitle: string; clientName: string; accent: string }) {
  return (
    <>
      <View style={[s.accentStrip, { backgroundColor: accent }]} fixed />
      <View style={s.pageHeader}>
        <View style={s.pageHeaderLeft}>
          <Text style={s.pageHeaderTitle}>{jobTitle}</Text>
          {clientName && <Text style={s.pageHeaderSub}>{clientName}</Text>}
        </View>
        <Text style={s.pageHeaderLogo}>GestObra</Text>
      </View>
    </>
  )
}

function SectionTag({ type }: { type: keyof typeof TYPE_STYLE }) {
  const t = TYPE_STYLE[type]
  return <Text style={[s.sectionTag, { color: t.accent, backgroundColor: t.soft }]}>{t.label}</Text>
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

  const [{ data: job, error: jobError }, { data: dailyReports }, { data: jobReports }, { data: jobWorkers }, { data: locations }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(*)').eq('id', jobId).single(),
    supabase.from('daily_reports').select('*, media(*)').eq('job_id', jobId).order('report_date'),
    supabase.from('job_reports').select('*, media(*)').eq('job_id', jobId).order('report_date'),
    supabase.from('job_workers').select('worker:profiles(id, full_name)').eq('job_id', jobId),
    supabase.from('job_locations').select('name, status').eq('job_id', jobId).order('sort_order'),
  ])

  if (!job) {
    console.error('[PDF] job query error:', jobError)
    return NextResponse.json({ error: `Trabalho não encontrado: ${jobError?.message ?? 'null'}` }, { status: 404 })
  }

  const client = job.client as Record<string, string> | null
  const clientName = client?.name ?? ''

  // Build a worker id→name map from job_workers
  const workerMap: Record<string, string> = {}
  for (const jw of (jobWorkers ?? [])) {
    const w = (jw as any).worker
    if (w?.id) workerMap[w.id] = w.full_name
  }
  const teamNames = Object.values(workerMap).join(', ')

  const startReport = jobReports?.find((r: any) => r.report_type === 'start')
  const finishReport = jobReports?.find((r: any) => r.report_type === 'finish')

  const totalHours = (dailyReports ?? []).reduce((sum: number, r: any) => sum + (r.hours_worked ?? 0), 0)
  const totalPhotos = [...(dailyReports ?? []), ...(jobReports ?? [])].reduce((sum, r: any) => sum + (r.media?.length ?? 0), 0)

  // Collect all report dates sorted ascending
  const allDates = [
    ...(dailyReports ?? []).map((r: any) => r.report_date),
    ...(jobReports ?? []).map((r: any) => r.report_date),
  ].sort()

  // Preload every photo referenced anywhere in the report, in parallel, so
  // we know each one's true aspect ratio before laying out the PDF.
  const allMedia: { id: string; public_url: string; caption: string | null }[] = [
    ...(startReport?.media ?? []),
    ...(dailyReports ?? []).flatMap((r: any) => r.media ?? []),
    ...(finishReport?.media ?? []),
  ]
  const loadedById = new Map<string, LoadedPhoto | FailedPhoto>(
    (await Promise.all(allMedia.map(m => loadPhoto(m.public_url, m.id)))).map(p => [p.key, p])
  )
  function photosFor(media: { id: string; public_url: string }[] | undefined): (LoadedPhoto | FailedPhoto)[] {
    if (!media) return []
    return media.map(m => loadedById.get(m.id) ?? { key: m.id, ok: false, url: m.public_url })
  }

  let pdf: Buffer
  try {
    pdf = await renderToBuffer(
      <Document title={`Relatório — ${job.title}`} author="GestObra">
        {/* ── Cover / Summary page ─────────────────────────────── */}
        <Page size="A4" style={s.page}>
          <View style={s.coverHeader}>
            <Text style={s.coverTitle}>Relatório de Trabalho</Text>
            <Text style={s.coverSubtitle}>GestObra — gerado em {new Date().toLocaleDateString('pt-PT')}</Text>
          </View>

          <View style={s.coverMeta}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Trabalho</Text>
              <Text style={s.metaValue}>{job.title}</Text>
            </View>
            {clientName && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Cliente</Text>
                <Text style={s.metaValue}>{clientName}</Text>
              </View>
            )}
            {client?.address && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Morada</Text>
                <Text style={s.metaValue}>{client.address}</Text>
              </View>
            )}
            {job.location && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Local</Text>
                <Text style={s.metaValue}>{job.location}</Text>
              </View>
            )}
            {teamNames && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Equipa</Text>
                <Text style={s.metaValue}>{teamNames}</Text>
              </View>
            )}
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Estado</Text>
              <Text style={s.metaValue}>{statusLabels[job.status] ?? job.status}</Text>
            </View>
            {allDates.length > 0 && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Data de início</Text>
                <Text style={s.metaValue}>{formatDate(allDates[0])}</Text>
              </View>
            )}
            {allDates.length > 1 && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Data de fim</Text>
                <Text style={s.metaValue}>{formatDate(allDates[allDates.length - 1])}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={s.summaryGrid}>
            <View style={s.summaryBox}>
              <Text style={s.summaryNum}>{(dailyReports ?? []).length}</Text>
              <Text style={s.summaryLabel}>Fichas diárias</Text>
            </View>
            <View style={s.summaryBox}>
              <Text style={s.summaryNum}>{totalHours > 0 ? `${totalHours}h` : '—'}</Text>
              <Text style={s.summaryLabel}>Horas registadas</Text>
            </View>
            <View style={s.summaryBox}>
              <Text style={s.summaryNum}>{totalPhotos}</Text>
              <Text style={s.summaryLabel}>Fotografias</Text>
            </View>
          </View>

          <PageFooter jobTitle={job.title} clientName={clientName} />
        </Page>

        {/* ── Locais — only rendered if the job has any defined ─────── */}
        {locations && locations.length > 0 && (
          <Page size="A4" style={s.page}>
            <ReportPageHeader jobTitle={job.title} clientName={clientName} accent={ORANGE} />
            <Text style={s.sectionHeading}>
              Locais ({(locations as any[]).filter(l => l.status === 'completed').length}/{locations.length} concluídos)
            </Text>
            <View style={s.locationsGrid}>
              {(locations as any[]).map((loc, i) => {
                const ls = LOCATION_STYLE[loc.status] ?? LOCATION_STYLE.pending
                return (
                  <View key={i} style={[s.locationChip, { backgroundColor: ls.bg, borderColor: ls.border }]}>
                    <Text style={[s.locationChipText, { color: GRAY1 }]}>{loc.name}</Text>
                    <Text style={[s.locationChipStatus, { color: ls.text }]}>{ls.label}</Text>
                  </View>
                )
              })}
            </View>
            <PageFooter jobTitle={job.title} clientName={clientName} />
          </Page>
        )}

        {/* ── Ficha de Início ──────────────────────────────────── */}
        {startReport && (
          <Page size="A4" style={s.page}>
            <ReportPageHeader jobTitle={job.title} clientName={clientName} accent={TYPE_STYLE.start.accent} />
            <SectionTag type="start" />
            <Text style={s.sectionHeading}>{formatDate(startReport.report_date)}</Text>

            {startReport.description && (
              <View style={s.descBlock}>
                <Text style={s.descText}>{startReport.description}</Text>
              </View>
            )}

            {(startReport.client_name || startReport.client_approved != null) && (
              <View>
                {startReport.client_name && (
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Recebido por:</Text>
                    <Text style={s.infoValue}>{startReport.client_name}</Text>
                  </View>
                )}
                {startReport.client_approved != null && (
                  <View style={[s.infoRow, { alignItems: 'center' }]}>
                    <Text style={s.infoLabel}>Aprovação:</Text>
                    <Text style={startReport.client_approved ? s.badgeApproved : s.badgeRejected}>
                      {startReport.client_approved ? 'Aprovado' : 'Não aprovado'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {startReport.client_observations && (
              <>
                <View style={s.divider} />
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Obs. cliente:</Text>
                  <Text style={s.infoValue}>{startReport.client_observations}</Text>
                </View>
              </>
            )}

            {startReport.client_signature_url && (
              <View style={s.signatureBox}>
                <Text style={s.signatureLabel}>Assinatura do cliente:</Text>
                <Image src={startReport.client_signature_url} style={s.signature} />
              </View>
            )}

            {startReport.media && startReport.media.length > 0 && (
              <>
                <View style={s.divider} />
                <Text style={{ fontSize: 9, color: GRAY3, marginBottom: 4 }}>Fotografias ({startReport.media.length})</Text>
                <PhotoMosaic photos={photosFor(startReport.media)} />
              </>
            )}

            <PageFooter jobTitle={job.title} clientName={clientName} />
          </Page>
        )}

        {/* ── Fichas Diárias — one page each ───────────────────── */}
        {(dailyReports ?? []).map((report: any, idx: number) => {
          const workerName = workerMap[report.worker_id] ?? null
          return (
            <Page key={report.id} size="A4" style={s.page}>
              <ReportPageHeader jobTitle={job.title} clientName={clientName} accent={TYPE_STYLE.daily.accent} />
              <SectionTag type="daily" />
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: GRAY3, marginBottom: -6 }}>{idx + 1} / {(dailyReports ?? []).length}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, marginTop: 10 }}>
                <View>
                  <Text style={s.sectionHeading}>{formatDate(report.report_date)}</Text>
                  {workerName && <Text style={{ fontSize: 9, color: GRAY3, marginTop: -10, marginBottom: 14 }}>Por {workerName}</Text>}
                </View>
                {report.hours_worked && (
                  <Text style={s.badgeHours}>{report.hours_worked}h trabalhadas</Text>
                )}
              </View>

              {(report.time_start || report.time_end) && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Horário:</Text>
                  <Text style={s.infoValue}>
                    {report.time_start ? report.time_start.slice(0, 5) : '—'}
                    {' – '}
                    {report.time_end ? report.time_end.slice(0, 5) : '—'}
                  </Text>
                </View>
              )}

              <View style={s.descBlock}>
                <Text style={s.descText}>{report.description}</Text>
              </View>

              {report.materials_used && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Materiais:</Text>
                  <Text style={s.infoValue}>{report.materials_used}</Text>
                </View>
              )}

              {report.observations && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Observações:</Text>
                  <Text style={s.infoValue}>{report.observations}</Text>
                </View>
              )}

              {report.media && report.media.length > 0 && (
                <>
                  <View style={s.divider} />
                  <Text style={{ fontSize: 9, color: GRAY3, marginBottom: 4 }}>Fotografias ({report.media.length})</Text>
                  <PhotoMosaic photos={photosFor(report.media)} />
                </>
              )}

              <PageFooter jobTitle={job.title} clientName={clientName} />
            </Page>
          )
        })}

        {/* ── Ficha de Fim ─────────────────────────────────────── */}
        {finishReport && (
          <Page size="A4" style={s.page}>
            <ReportPageHeader jobTitle={job.title} clientName={clientName} accent={TYPE_STYLE.finish.accent} />
            <SectionTag type="finish" />
            <Text style={s.sectionHeading}>{formatDate(finishReport.report_date)}</Text>

            {finishReport.description && (
              <View style={s.descBlock}>
                <Text style={s.descText}>{finishReport.description}</Text>
              </View>
            )}

            {(finishReport.client_name || finishReport.client_approved != null) && (
              <View>
                {finishReport.client_name && (
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Recebido por:</Text>
                    <Text style={s.infoValue}>{finishReport.client_name}</Text>
                  </View>
                )}
                {finishReport.client_approved != null && (
                  <View style={[s.infoRow, { alignItems: 'center' }]}>
                    <Text style={s.infoLabel}>Aprovação:</Text>
                    <Text style={finishReport.client_approved ? s.badgeApproved : s.badgeRejected}>
                      {finishReport.client_approved ? 'Aprovado' : 'Não aprovado'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {finishReport.client_observations && (
              <>
                <View style={s.divider} />
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Obs. cliente:</Text>
                  <Text style={s.infoValue}>{finishReport.client_observations}</Text>
                </View>
              </>
            )}

            {finishReport.client_signature_url && (
              <View style={s.signatureBox}>
                <Text style={s.signatureLabel}>Assinatura do cliente:</Text>
                <Image src={finishReport.client_signature_url} style={s.signature} />
              </View>
            )}

            {finishReport.media && finishReport.media.length > 0 && (
              <>
                <View style={s.divider} />
                <Text style={{ fontSize: 9, color: GRAY3, marginBottom: 4 }}>Fotografias ({finishReport.media.length})</Text>
                <PhotoMosaic photos={photosFor(finishReport.media)} />
              </>
            )}

            <PageFooter jobTitle={job.title} clientName={clientName} />
          </Page>
        )}
      </Document>
    )
  } catch (err) {
    console.error('[PDF] renderToBuffer failed:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const safeName = (s: string) => s.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '_').slice(0, 40)
  const filename = `relatorio_${safeName(job.title)}${clientName ? `_${safeName(clientName)}` : ''}.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
