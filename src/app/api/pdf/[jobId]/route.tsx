import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { marginBottom: 24, borderBottom: '2px solid #2563eb', paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  subtitle: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: 6, marginBottom: 8, borderRadius: 3 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontWeight: 'bold', width: 120, color: '#374151' },
  value: { flex: 1, color: '#4b5563' },
  reportCard: { border: '1px solid #e5e7eb', borderRadius: 4, padding: 10, marginBottom: 8 },
  reportDate: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  reportText: { color: '#4b5563', lineHeight: 1.4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  photo: { width: 140, height: 105, objectFit: 'cover', borderRadius: 3 },
  badge: { backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2 6', borderRadius: 2, fontSize: 9 },
  approved: { backgroundColor: '#dcfce7', color: '#16a34a', padding: '2 6', borderRadius: 2, fontSize: 9 },
  notApproved: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '2 6', borderRadius: 2, fontSize: 9 },
  signature: { width: 180, height: 60, border: '1px solid #e5e7eb', borderRadius: 3, marginTop: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: '1px solid #e5e7eb', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af' },
})

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('pt-PT') } catch { return d }
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

  const [{ data: job }, { data: dailyReports }, { data: jobReports }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(*), worker:profiles(full_name)').eq('id', jobId).single(),
    supabase.from('daily_reports').select('*, media(*), worker:profiles(full_name)').eq('job_id', jobId).order('report_date'),
    supabase.from('job_reports').select('*, media(*), worker:profiles(full_name)').eq('job_id', jobId).order('report_date'),
  ])

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado' }, { status: 404 })

  const client = job.client as Record<string, string> | null
  const worker = job.worker as { full_name: string } | null
  const startReport = jobReports?.find((r: any) => r.report_type === 'start')
  const finishReport = jobReports?.find((r: any) => r.report_type === 'finish')

  const statusLabels: Record<string, string> = {
    pending: 'Pendente', in_progress: 'Em curso', completed: 'Concluído', cancelled: 'Cancelado',
  }

  const pdf = await renderToBuffer(
    <Document title={`Relatório - ${job.title}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Trabalho</Text>
          <Text style={styles.subtitle}>FichasWork — {formatDate(new Date().toISOString())}</Text>
        </View>

        {/* Job info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informação do Trabalho</Text>
          <View style={styles.row}><Text style={styles.label}>Título:</Text><Text style={styles.value}>{job.title}</Text></View>
          {client && <View style={styles.row}><Text style={styles.label}>Cliente:</Text><Text style={styles.value}>{client.name}</Text></View>}
          {client?.address && <View style={styles.row}><Text style={styles.label}>Morada:</Text><Text style={styles.value}>{client.address}</Text></View>}
          {worker && <View style={styles.row}><Text style={styles.label}>Trabalhador:</Text><Text style={styles.value}>{worker.full_name}</Text></View>}
          {job.scheduled_date && <View style={styles.row}><Text style={styles.label}>Data agendada:</Text><Text style={styles.value}>{formatDate(job.scheduled_date)}</Text></View>}
          {job.location && <View style={styles.row}><Text style={styles.label}>Local:</Text><Text style={styles.value}>{job.location}</Text></View>}
          <View style={styles.row}><Text style={styles.label}>Estado:</Text><Text style={styles.value}>{statusLabels[job.status] ?? job.status}</Text></View>
        </View>

        {/* Start report */}
        {startReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ficha de Início</Text>
            <View style={styles.reportCard}>
              <Text style={styles.reportDate}>{formatDate(startReport.report_date)}</Text>
              {startReport.description && <Text style={styles.reportText}>{startReport.description}</Text>}
              {startReport.client_name && (
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Text style={styles.label}>Cliente recebeu:</Text>
                  <Text style={styles.value}>{startReport.client_name}</Text>
                </View>
              )}
              {startReport.client_approved != null && (
                <View style={[styles.row, { marginTop: 4 }]}>
                  <Text style={styles.label}>Aprovação:</Text>
                  <Text style={startReport.client_approved ? styles.approved : styles.notApproved}>
                    {startReport.client_approved ? 'Aprovado' : 'Não aprovado'}
                  </Text>
                </View>
              )}
              {startReport.client_signature_url && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>Assinatura:</Text>
                  <Image src={startReport.client_signature_url} style={styles.signature} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Daily reports */}
        {dailyReports && dailyReports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fichas Diárias ({dailyReports.length})</Text>
            {dailyReports.map((report: any) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Text style={styles.reportDate}>{formatDate(report.report_date)}</Text>
                  {report.hours_worked && <Text style={styles.badge}>{report.hours_worked}h</Text>}
                </View>
                <Text style={[styles.reportText, { marginTop: 4 }]}>{report.description}</Text>
                {report.materials_used && (
                  <View style={[styles.row, { marginTop: 4 }]}>
                    <Text style={styles.label}>Materiais:</Text>
                    <Text style={styles.value}>{report.materials_used}</Text>
                  </View>
                )}
                {report.observations && (
                  <View style={[styles.row, { marginTop: 4 }]}>
                    <Text style={styles.label}>Observações:</Text>
                    <Text style={styles.value}>{report.observations}</Text>
                  </View>
                )}
                {report.media && report.media.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 4 }}>Fotos ({report.media.length}):</Text>
                    <View style={styles.photoGrid}>
                      {report.media.slice(0, 4).map((m: any, i: number) => (
                        <Image key={i} src={m.public_url} style={styles.photo} />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Finish report */}
        {finishReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ficha de Fim</Text>
            <View style={styles.reportCard}>
              <Text style={styles.reportDate}>{formatDate(finishReport.report_date)}</Text>
              {finishReport.description && <Text style={styles.reportText}>{finishReport.description}</Text>}
              {finishReport.client_name && (
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Text style={styles.label}>Cliente recebeu:</Text>
                  <Text style={styles.value}>{finishReport.client_name}</Text>
                </View>
              )}
              {finishReport.client_observations && (
                <View style={[styles.row, { marginTop: 4 }]}>
                  <Text style={styles.label}>Obs. cliente:</Text>
                  <Text style={styles.value}>{finishReport.client_observations}</Text>
                </View>
              )}
              {finishReport.client_approved != null && (
                <View style={[styles.row, { marginTop: 4 }]}>
                  <Text style={styles.label}>Aprovação:</Text>
                  <Text style={finishReport.client_approved ? styles.approved : styles.notApproved}>
                    {finishReport.client_approved ? 'Aprovado' : 'Não aprovado'}
                  </Text>
                </View>
              )}
              {finishReport.client_signature_url && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>Assinatura:</Text>
                  <Image src={finishReport.client_signature_url} style={styles.signature} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{job.title} — {client?.name ?? ''}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-${job.title.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
