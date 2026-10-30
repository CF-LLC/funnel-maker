import { Document, Page, Text, View, Image, StyleSheet, Svg, Rect, Polyline, Circle, Line } from '@react-pdf/renderer'
import { chartGeometry, fmtValue, monthLabel, type ViewSection } from '@/lib/reports/core'

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#0f172a' },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  logo: { width: 44, height: 44, objectFit: 'contain', marginRight: 12 },
  kicker: { fontSize: 8, color: '#0369a1', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold' },
  h1: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  owner: { fontSize: 9, color: '#64748b', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  card: { width: '25%', padding: 4 },
  cardIn: { border: '1 solid #e2e8f0', borderRadius: 6, padding: 8 },
  label: { fontSize: 7, color: '#64748b', textTransform: 'uppercase' },
  val: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  good: { fontSize: 8, color: '#047857', marginTop: 3 }, badc: { fontSize: 8, color: '#be123c', marginTop: 3 }, flat: { fontSize: 8, color: '#64748b', marginTop: 3 },
  box: { border: '1 solid #e2e8f0', borderRadius: 6, padding: 10, marginBottom: 10 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  note: { color: '#334155', lineHeight: 1.45 },
  imgs: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  imgBox: { width: '50%', padding: 4 }, img: { width: '100%', maxHeight: 220, objectFit: 'contain' }, cap: { fontSize: 8, color: '#64748b', marginTop: 2 },
  foot: { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 7, color: '#94a3b8', textAlign: 'center' },
})

export function ReportPdf({ sections, owner, logoUrl, title }: { sections: ViewSection[]; owner: string; logoUrl: string | null; title: string }) {
  return (
    <Document title={title} author={owner}>
      <Page size="LETTER" style={s.page}>
        {sections.map((x, i) => {
          switch (x.type) {
            case 'title': return (
              <View key={i} style={s.head}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                {logoUrl ? <Image src={logoUrl} style={s.logo} /> : null}
                <View><Text style={s.kicker}>{(x.subtitle || 'Monthly report').toUpperCase()} · {monthLabel(x.month).toUpperCase()}</Text><Text style={s.h1}>{x.title}</Text><Text style={s.owner}>Prepared by {owner}</Text></View>
              </View>
            )
            case 'kpis': return (
              <View key={i} style={s.grid} wrap={false}>
                {x.cards.map((c) => (
                  <View key={c.kpi.key} style={s.card}><View style={s.cardIn}>
                    <Text style={s.label}>{c.kpi.label}</Text><Text style={s.val}>{c.text}</Text>
                    <Text style={c.change ? (c.change.good == null ? s.flat : c.change.good ? s.good : s.badc) : s.flat}>{c.change ? `${c.change.label} vs ${monthLabel(c.prevMonth!, 'short')}` : 'No earlier month'}</Text>
                  </View></View>
                ))}
              </View>
            )
            case 'chart': {
              const W = 520, H = 120, g = chartGeometry(x.series, W, H, 6)
              const slot = (W - 12) / x.series.length
              return (
                <View key={i} style={s.box} wrap={false}>
                  <Text style={s.h2}>{x.kpi.label} · last {x.series.length} months</Text>
                  <Svg width={W} height={H + 4}>
                    <Line x1={6} x2={W - 6} y1={g.zero} y2={g.zero} stroke="#cbd5e1" strokeWidth={1} />
                    {x.kind === 'bar' ? g.bars.map((b, j) => b ? <Rect key={j} x={b.x} y={b.y} width={b.w} height={b.h} fill={j === g.bars.length - 1 ? '#0284c7' : '#7dd3fc'} /> : null)
                      : <Polyline points={g.bars.filter(Boolean).map((b) => `${b!.cx},${b!.cy}`).join(' ')} stroke="#0284c7" strokeWidth={2} fill="none" />}
                    {x.kind === 'line' ? g.bars.map((b, j) => b ? <Circle key={j} cx={b.cx} cy={b.cy} r={3} fill="#0284c7" /> : null) : null}
                  </Svg>
                  <View style={{ flexDirection: 'row', marginTop: 2 }}>
                    {x.series.map((p) => <View key={p.month} style={{ width: slot, alignItems: 'center' }}><Text style={{ fontSize: 7, color: '#334155' }}>{fmtValue(p.value, x.kpi.format)}</Text><Text style={{ fontSize: 7, color: '#94a3b8' }}>{monthLabel(p.month, 'short')}</Text></View>)}
                  </View>
                </View>
              )
            }
            case 'notes': return <View key={i} style={s.box}><Text style={s.h2}>{x.heading}</Text><Text style={s.note}>{x.text}</Text></View>
            case 'images': return (
              <View key={i} style={{ marginBottom: 10 }}>
                <Text style={s.h2}>{x.heading}</Text>
                <View style={s.imgs}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  {x.images.map((im, j) => im?.url ? <View key={j} style={s.imgBox} wrap={false}><Image src={im.url} style={s.img} />{im.caption ? <Text style={s.cap}>{im.caption}</Text> : null}</View> : null)}
                </View>
              </View>
            )
          }
        })}
        <Text style={s.foot} fixed>{owner} · private report</Text>
      </Page>
    </Document>
  )
}
