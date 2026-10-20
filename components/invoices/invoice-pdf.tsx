import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatCurrency, totals } from '@/lib/invoices/core'
import type { PreviewData } from './invoice-preview'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1e293b' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#6d28d9', textAlign: 'right' },
  muted: { color: '#64748b' },
  label: { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
  th: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', paddingBottom: 4, marginTop: 20, color: '#94a3b8', fontSize: 8 },
  tr: { flexDirection: 'row', borderBottom: '1 solid #f1f5f9', paddingVertical: 5 },
  desc: { flex: 1 }, num: { width: 70, textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 200 },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #cbd5e1', paddingTop: 4, marginTop: 4, fontFamily: 'Helvetica-Bold', fontSize: 12 },
  paid: { color: '#166534', fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 4 },
  notes: { marginTop: 20, padding: 8, backgroundColor: '#f8fafc', color: '#475569' },
})

export function InvoicePdf({ d }: { d: PreviewData }) {
  const t = totals(d.lines, d.tax_rate)
  const f = (c: number) => formatCurrency(c, d.currency)
  return (
    <Document title={`Invoice ${d.number}`} author={d.seller_name}>
      <Page size="LETTER" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.h1}>{d.seller_name || 'Invoice'}</Text>
            {d.seller_email ? <Text style={s.muted}>{d.seller_email}</Text> : null}
            {d.seller_address ? <Text style={s.muted}>{d.seller_address}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>INVOICE</Text>
            <Text style={{ textAlign: 'right' }}>#{d.number}</Text>
            {d.status === 'paid' ? <Text style={s.paid}>PAID</Text> : null}
          </View>
        </View>
        <View style={[s.row, { marginTop: 24 }]}>
          <View>
            <Text style={s.label}>BILL TO</Text>
            <Text>{d.client_name}</Text>
            {d.client_email ? <Text style={s.muted}>{d.client_email}</Text> : null}
            {d.client_address ? <Text style={s.muted}>{d.client_address}</Text> : null}
          </View>
          <View>
            <Text style={{ textAlign: 'right' }}>Issued: {d.issue_date}</Text>
            <Text style={{ textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>Due: {d.due_date}</Text>
          </View>
        </View>
        <View style={s.th}><Text style={s.desc}>DESCRIPTION</Text><Text style={s.num}>QTY</Text><Text style={s.num}>PRICE</Text><Text style={s.num}>AMOUNT</Text></View>
        {d.lines.map((l, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.desc}>{l.description}</Text><Text style={s.num}>{String(l.quantity)}</Text>
            <Text style={s.num}>{f(l.unit_price_cents)}</Text><Text style={s.num}>{f(Math.round(l.quantity * l.unit_price_cents))}</Text>
          </View>
        ))}
        <View style={s.totals}>
          <View style={s.row}><Text style={s.muted}>Subtotal</Text><Text>{f(t.subtotal)}</Text></View>
          {d.tax_rate ? <View style={s.row}><Text style={s.muted}>Tax ({d.tax_rate}%)</Text><Text>{f(t.tax)}</Text></View> : null}
          <View style={s.total}><Text>Total</Text><Text>{f(t.total)}</Text></View>
        </View>
        {d.notes ? <Text style={s.notes}>{d.notes}</Text> : null}
      </Page>
    </Document>
  )
}
