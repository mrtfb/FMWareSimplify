import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const BLUE = '#2563eb'
const GRAY1 = '#111827'
const GRAY2 = '#374151'
const GRAY3 = '#6b7280'
const GRAY4 = '#e5e7eb'
const GRAY5 = '#f9fafb'

const s = StyleSheet.create({
  page: { padding: '36 44 60 44', fontFamily: 'Helvetica', fontSize: 10, color: GRAY1, backgroundColor: '#ffffff' },

  // Page header (repeated on every page except cover)
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottom: `1.5 solid ${BLUE}` },
  pageHeaderLeft: { flex: 1 },
  pageHeaderTitle: { fontSize: 9, fontWeight: 'bold', color: GRAY2 },
  pageHeaderSub: { fontSize: 8, color: GRAY3, marginTop: 1 },
  pageHeaderLogo: { fontSize: 10, fontWeight: 'bold', color: BLUE },

  // Cover
  coverHeader: { marginBottom: 32, paddingBottom: 16, borderBottom: `2 solid ${BLUE}` },
  coverTitle: { fontSize: 22, fontWeight: 'bold', color: BLUE },
  coverSubtitle: { fontSize: 11, color: GRAY3, marginTop: 4 },
  coverMeta: { marginTop: 24, gap: 6 },
  metaRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  metaLabel: { fontSize: 9, color: GRAY3, width: 100 },
  metaValue: { fontSize: 9, fontWeight: 'bold', color: GRAY2, flex: 1 },

  // Summary boxes
  summaryGrid: { flexDirection: 'row', gap: 10, marginTop: 24 },
  summaryBox: { flex: 1, backgroundColor: GRAY5, borderRadius: 4, padding: '10 12', border: `1 solid ${GRAY4}` },
  summaryNum: { fontSize: 20, fontWeight: 'bold', color: BLUE },
  summaryLabel: { fontSize: 8, color: GRAY3, marginTop: 2 },

  // Section heading on report pages
  sectionHeading: { fontSize: 13, fontWeight: 'bold', color: GRAY1, marginBottom: 14 },
  sectionTag: { fontSize: 8, fontWeight: 'bold', color: BLUE, backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginBottom: 8, alignSelf: 'flex-start' },

  // Info rows
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { fontWeight: 'bold', width: 110, color: GRAY2, fontSize: 9 },
  infoValue: { flex: 1, color: GRAY2, fontSize: 9 },

  // Description block
  descBlock: { backgroundColor: GRAY5, borderRadius: 4, padding: 10, marginBottom: 10, border: `1 solid ${GRAY4}` },
  descText: { color: GRAY2, lineHeight: 1.5, fontSize: 9.5 },

  // Photo grid
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photo: { width: 230, height: 172, borderRadius: 4, border: `1 solid ${GRAY4}` },

  // Signature
  signatureBox: { marginTop: 10 },
  signatureLabel: { fontSize: 8, color: GRAY3, marginBottom: 4 },
  signature: { width: 200, height: 70, border: `1 solid ${GRAY4}`, borderRadius: 3, backgroundColor: '#ffffff' },

  // Approval badge
  badgeApproved: { fontSize: 8, fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeRejected: { fontSize: 8, fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeHours: { fontSize: 8, fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },

  // Footer
  footer: { position: 'absolute', bottom: 22, left: 44, right: 44, borderTop: `1 solid ${GRAY4}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: GRAY3 },
  divider: { borderTop: `1 solid ${GRAY4}`, marginTop: 12, marginBottom: 12 },
})

function formatDate(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d }
}
function formatDateShort(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return d }
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em curso', completed: 'Concluído', cancelled: 'Cancelado',
}

function PageFooter({ jobTitle, clientName }: { jobTitle: string; clientName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{jobTitle}{clientName ? ` — ${clientName}` : ''}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function ReportPageHeader({ jobTitle, clientName }: { jobTitle: string; clientName: string }) {
  return (
    <View style={s.pageHeader}>
      <View style={s.pageHeaderLeft}>
        <Text style={s.pageHeaderTitle}>{jobTitle}</Text>
        {clientName && <Text style={s.pageHeaderSub}>{clientName}</Text>}
      </View>
      <Text style={s.pageHeaderLogo}>FichasWork</Text>
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

  const [{ data: job, error: jobError }, { data: dailyReports }, { data: jobReports }, { data: jobWorkers }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(*)').eq('id', jobId).single(),
    supabase.from('daily_reports').select('*, media(*)').eq('job_id', jobId).order('report_date'),
    supabase.from('job_reports').select('*, media(*)').eq('job_id', jobId).order('report_date'),
    supabase.from('job_workers').select('worker:profiles(id, full_name)').eq('job_id', jobId),
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

  // Date range: earliest to latest report date
  const allDates = [
    ...(dailyReports ?? []).map((r: any) => r.report_date),
    ...(jobReports ?? []).map((r: any) => r.report_date),
  ].sort()
  const dateRange = allDates.length
    ? allDates.length === 1
      ? formatDateShort(allDates[0])
      : `${formatDateShort(allDates[0])} – ${formatDateShort(allDates[allDates.length - 1])}`
    : job.scheduled_date ? formatDateShort(job.scheduled_date) : '—'

  let pdf: Buffer
  try {
    pdf = await renderToBuffer(
      <Document title={`Relatório — ${job.title}`} author="FichasWork">
        {/* ── Cover / Summary page ─────────────────────────────── */}
        <Page size="A4" style={s.page}>
          <View style={s.coverHeader}>
            <Text style={s.coverTitle}>Relatório de Trabalho</Text>
            <Text style={s.coverSubtitle}>FichasWork — gerado em {new Date().toLocaleDateString('pt-PT')}</Text>
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
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Período</Text>
              <Text style={s.metaValue}>{dateRange}</Text>
            </View>
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
            <View style={s.summaryBox}>
              <Text style={s.summaryNum}>{startReport && finishReport ? '✓' : startReport || finishReport ? '½' : '—'}</Text>
              <Text style={s.summaryLabel}>Fichas início/fim</Text>
            </View>
          </View>

          <PageFooter jobTitle={job.title} clientName={clientName} />
        </Page>

        {/* ── Ficha de Início ──────────────────────────────────── */}
        {startReport && (
          <Page size="A4" style={s.page}>
            <ReportPageHeader jobTitle={job.title} clientName={clientName} />
            <Text style={s.sectionTag}>FICHA DE INÍCIO</Text>
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
                <View style={s.photoGrid}>
                  {startReport.media.map((m: any, i: number) => (
                    <Image key={i} src={m.public_url} style={s.photo} />
                  ))}
                </View>
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
              <ReportPageHeader jobTitle={job.title} clientName={clientName} />
              <Text style={s.sectionTag}>FICHA DIÁRIA {idx + 1} / {(dailyReports ?? []).length}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
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
                  <View style={s.photoGrid}>
                    {report.media.map((m: any, i: number) => (
                      <Image key={i} src={m.public_url} style={s.photo} />
                    ))}
                  </View>
                </>
              )}

              <PageFooter jobTitle={job.title} clientName={clientName} />
            </Page>
          )
        })}

        {/* ── Ficha de Fim ─────────────────────────────────────── */}
        {finishReport && (
          <Page size="A4" style={s.page}>
            <ReportPageHeader jobTitle={job.title} clientName={clientName} />
            <Text style={s.sectionTag}>FICHA DE FIM</Text>
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
                <View style={s.photoGrid}>
                  {finishReport.media.map((m: any, i: number) => (
                    <Image key={i} src={m.public_url} style={s.photo} />
                  ))}
                </View>
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
