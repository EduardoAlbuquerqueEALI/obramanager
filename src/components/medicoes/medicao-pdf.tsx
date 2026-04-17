import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({ family: 'Helvetica', fonts: [] })

const DARK = '#1a1a1a'
const GREY = '#555555'
const LIGHT = '#888888'
const BORDER = '#cccccc'
const BG = '#f2f2f2'
const PRIMARY = '#0d1117'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: DARK, padding: 32, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1.5px solid ${PRIMARY}`,
  },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.8 },
  subtitle: { fontSize: 9, color: GREY, marginTop: 3 },
  meta: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metaBox: { flex: 1, border: `1px solid ${BORDER}`, padding: 8, backgroundColor: BG },
  metaLabel: { fontSize: 7, color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    color: '#fff',
    padding: 6,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: { flexDirection: 'row', padding: 6, borderBottom: `1px solid ${BORDER}` },
  totalRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: BG,
    borderTop: `2px solid ${PRIMARY}`,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  colStage: { flex: 3 },
  colPct: { flex: 1, textAlign: 'right' },
  colMoney: { flex: 1.4, textAlign: 'right' },
  obs: {
    marginTop: 14,
    padding: 8,
    backgroundColor: BG,
    border: `1px solid ${BORDER}`,
  },
  obsLabel: { fontSize: 7, color: LIGHT, textTransform: 'uppercase', marginBottom: 3 },
  signatures: { flexDirection: 'row', gap: 40, marginTop: 40 },
  sigBox: { flex: 1, borderTop: `1px solid ${DARK}`, paddingTop: 4, alignItems: 'center' },
  sigLabel: { fontSize: 7, color: GREY, textTransform: 'uppercase' },
  footer: { marginTop: 20, fontSize: 7, color: LIGHT, textAlign: 'center' },
})

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface MedicaoPDFRow {
  id: string
  nome: string
  subtotal: number
  pct: number
  valorFisico: number
  qtdApropriada: number
}

interface Props {
  orgName: string
  empreendimentoName: string
  orcamentoVersao: number
  mesReferencia: string
  rows: MedicaoPDFRow[]
  totalBudgeted: number
  totalPhysical: number
  observacoes: string | null
}

export function MedicaoPDF({
  orgName,
  empreendimentoName,
  orcamentoVersao,
  mesReferencia,
  rows,
  totalBudgeted,
  totalPhysical,
  observacoes,
}: Props) {
  const date = new Date(mesReferencia)
  const monthStr = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const overallPct = totalBudgeted > 0 ? (totalPhysical / totalBudgeted) * 100 : 0

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Medição de Obra</Text>
            <Text style={s.subtitle}>
              {orgName} · {empreendimentoName} · Orçamento v{orcamentoVersao}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
              {monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}
            </Text>
            <Text style={{ fontSize: 8, color: GREY, textAlign: 'right', marginTop: 2 }}>
              Emitido em {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        {/* Metrics */}
        <View style={s.meta}>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Avanço físico</Text>
            <Text style={s.metaValue}>{overallPct.toFixed(1)}%</Text>
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Orçado total</Text>
            <Text style={s.metaValue}>{fmtBRL(totalBudgeted)}</Text>
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Valor do %</Text>
            <Text style={s.metaValue}>{fmtBRL(totalPhysical)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={s.colStage}>Etapa</Text>
          <Text style={s.colPct}>% Físico</Text>
          <Text style={s.colMoney}>Orçado</Text>
          <Text style={s.colMoney}>Valor do %</Text>
          <Text style={s.colPct}>Qtd apropriada</Text>
        </View>

        {rows.map(row => (
          <View key={row.id} style={s.tableRow}>
            <Text style={s.colStage}>{row.nome}</Text>
            <Text style={s.colPct}>{row.pct.toFixed(1)}%</Text>
            <Text style={s.colMoney}>{fmtBRL(row.subtotal)}</Text>
            <Text style={s.colMoney}>{fmtBRL(row.valorFisico)}</Text>
            <Text style={s.colPct}>{row.qtdApropriada > 0 ? row.qtdApropriada.toFixed(2) : '-'}</Text>
          </View>
        ))}

        <View style={s.totalRow}>
          <Text style={s.colStage}>TOTAL GERAL</Text>
          <Text style={s.colPct}>{overallPct.toFixed(1)}%</Text>
          <Text style={s.colMoney}>{fmtBRL(totalBudgeted)}</Text>
          <Text style={s.colMoney}>{fmtBRL(totalPhysical)}</Text>
          <Text style={s.colPct}></Text>
        </View>

        {observacoes && (
          <View style={s.obs}>
            <Text style={s.obsLabel}>Observações</Text>
            <Text style={{ fontSize: 9 }}>{observacoes}</Text>
          </View>
        )}

        <View style={s.signatures}>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Engenheiro Responsável</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Fiscal / Diretor de Obras</Text>
          </View>
        </View>

        <Text style={s.footer}>
          Gerado por Obra Manager · {new Date().toLocaleString('pt-BR')}
        </Text>
      </Page>
    </Document>
  )
}
