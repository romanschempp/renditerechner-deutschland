import {
  Area, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Analysis } from '../../engine/analysis'
import { COST_LABELS } from '../../engine/simulate'
import { eur, num, pct } from '../../lib/format'

const C = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)']
const axis = { stroke: 'var(--ink-3)', fontSize: 11, tickLine: false }
const kfmt = (v: number) => (Math.abs(v) >= 1000 ? `${num(v / 1000, 0)} T` : num(v, 0))
const tip = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 3, fontSize: 12 },
  labelStyle: { color: 'var(--ink)', fontWeight: 600 },
  itemStyle: { color: 'var(--ink-2)' },
  formatter: (v: unknown) => eur(Number(v)),
}

export function ChartBox({ title, children, height = 260, note }: { title: string; children: React.ReactElement; height?: number; note?: string }) {
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
      {note && <p className="small muted">{note}</p>}
    </figure>
  )
}

export function CapitalChart({ a }: { a: Analysis }) {
  const P = a.sim.purchase
  const renov = P.renovationInitial - P.subsidy
  const data = [
    { name: 'Kaufpreis', value: P.price },
    { name: 'Grunderwerbsteuer', value: P.grest },
    { name: 'Notar + Grundbuch', value: P.notary + P.registry },
    { name: 'Makler', value: P.agent },
    { name: 'Sonstiges', value: P.appraisal + P.other + P.mortgageFees + P.financeFees },
    { name: 'Renovierung', value: Math.max(0, renov) },
  ].filter((d) => d.value > 0)
  const fin = [
    { name: 'Eigenkapital', value: Math.max(0, P.equity) },
    { name: 'Darlehen', value: P.loanPayout },
  ].filter((d) => d.value > 0)
  return (
    <ChartBox title="Kapitalbedarf und Finanzierung" height={240}>
      <PieChart>
        <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="72%" cx="30%" stroke="var(--surface)">
          {data.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
        </Pie>
        <Pie isAnimationActive={false} data={fin} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="72%" cx="75%" stroke="var(--surface)">
          <Cell fill="var(--eq)" />
          <Cell fill="var(--debt)" />
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ChartBox>
  )
}

export function CashflowChart({ a }: { a: Analysis }) {
  const data = a.sim.years.map((y) => ({ year: y.year, 'vor Steuern': y.cfPre, 'nach Steuern': y.cfPost, kumuliert: y.cumCf }))
  return (
    <ChartBox title="Cashflow pro Jahr">
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" {...axis} />
        <YAxis {...axis} tickFormatter={kfmt} width={44} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={0} stroke="var(--ink-3)" />
        <Bar isAnimationActive={false} dataKey="vor Steuern" fill="var(--s3)" />
        <Bar isAnimationActive={false} dataKey="nach Steuern" fill="var(--s1)" />
        <Line isAnimationActive={false} dataKey="kumuliert" stroke="var(--s2)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ChartBox>
  )
}

export function CostsChart({ a }: { a: Analysis }) {
  const keys = Object.keys(COST_LABELS).filter((k) => a.sim.years.some((y) => (y.costs[k] ?? 0) > 0))
  const data = a.sim.years.map((y) => {
    const row: Record<string, number> = { year: y.year }
    for (const k of keys) row[COST_LABELS[k]] = y.costs[k] ?? 0
    row['Zinsen'] = y.interest
    return row
  })
  return (
    <ChartBox title="Kosten pro Jahr nach Art (inkl. Zinsen)">
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" {...axis} />
        <YAxis {...axis} tickFormatter={kfmt} width={44} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar isAnimationActive={false} dataKey="Zinsen" stackId="c" fill="var(--debt)" />
        {keys.map((k, i) => <Bar isAnimationActive={false} key={k} dataKey={COST_LABELS[k]} stackId="c" fill={C[(i + 1) % C.length]} />)}
      </ComposedChart>
    </ChartBox>
  )
}

export function LoanChart({ a }: { a: Analysis }) {
  if (!a.sim.purchase.loanSum) return null
  const data = a.sim.years.map((y) => ({ year: y.year, Zinsen: y.interest, Tilgung: y.principal, Restschuld: y.balance }))
  return (
    <ChartBox title="Tilgungsplan: Zins und Tilgung">
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" {...axis} />
        <YAxis yAxisId="l" {...axis} tickFormatter={kfmt} width={44} />
        <YAxis yAxisId="r" orientation="right" {...axis} tickFormatter={kfmt} width={44} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar isAnimationActive={false} yAxisId="l" dataKey="Zinsen" stackId="d" fill="var(--debt)" />
        <Bar isAnimationActive={false} yAxisId="l" dataKey="Tilgung" stackId="d" fill="var(--eq)" />
        <Line isAnimationActive={false} yAxisId="r" dataKey="Restschuld" stroke="var(--s1)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ChartBox>
  )
}

export function WealthChart({ a }: { a: Analysis }) {
  const data = a.sim.years.map((y) => ({ year: y.year, Immobilienwert: y.value, Restschuld: y.balance, 'Nettovermögen inkl. Cashflows': y.netEquity + y.cumCf }))
  return (
    <ChartBox title="Vermögensentwicklung" note="Nominal. Wert nicht realisiert, ohne Verkaufskosten und -steuern.">
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" {...axis} />
        <YAxis {...axis} tickFormatter={kfmt} width={44} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area isAnimationActive={false} dataKey="Immobilienwert" fill="var(--brand-soft)" stroke="var(--s3)" />
        <Line isAnimationActive={false} dataKey="Restschuld" stroke="var(--neg)" strokeWidth={2} dot={false} />
        <Line isAnimationActive={false} dataKey="Nettovermögen inkl. Cashflows" stroke="var(--s2)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ChartBox>
  )
}

export function ReturnChart({ a }: { a: Analysis }) {
  const data = a.sim.years.map((y) => ({ year: y.year, 'EK-Rendite': y.ekReturn == null ? null : y.ekReturn * 100, 'GK-Rendite': y.gkReturn == null ? null : y.gkReturn * 100 }))
  return (
    <ChartBox title="EK- und GK-Rendite pro Jahr">
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => `${num(v, 0)} %`} width={44} />
        <Tooltip {...tip} formatter={(v: unknown) => `${num(Number(v), 1)} %`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={0} stroke="var(--ink-3)" />
        <Bar isAnimationActive={false} dataKey="EK-Rendite" fill="var(--s2)" />
        <Line isAnimationActive={false} dataKey="GK-Rendite" stroke="var(--s1)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ChartBox>
  )
}

export function HoldChart({ a }: { a: Analysis }) {
  const data = a.hold.map((h) => ({ years: h.years, 'IRR EK': h.irrEk == null ? null : h.irrEk * 100, steuer: h.tax }))
  const vals = data.map((d) => d['IRR EK']).filter((v): v is number => v != null)
  const lo = Math.max(Math.min(0, ...vals), -25)
  const best = a.hold.reduce((b, h) => ((h.irrEk ?? -9) > (b.irrEk ?? -9) ? h : b), a.hold[0])
  return (
    <ChartBox title="Bester Verkaufszeitpunkt: IRR auf das EK nach Haltedauer"
      note={`Höchste IRR bei Verkauf nach ${best.years} Jahren (${pct(best.irrEk, 1)}). Verkäufe bis 10 Jahre sind steuerpflichtig (§ 23); in der Grafik jeweils am Jahrestag – steuerfrei erst ab 10 Jahren + 1 Tag.`}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="years" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => `${num(v, 0)} %`} width={44} domain={[Math.floor(lo), 'auto']} allowDataOverflow />
        <Tooltip {...tip} labelFormatter={(l) => `Verkauf nach ${l} Jahren`} formatter={(v: unknown, n: unknown) => (n === 'IRR EK' ? `${num(Number(v), 2)} %` : eur(Number(v)))} />
        <ReferenceLine x={10} stroke="var(--accent)" strokeDasharray="4 3" label={{ value: '10 J.', fill: 'var(--ink-3)', fontSize: 10, position: 'top' }} />
        <ReferenceLine y={0} stroke="var(--ink-3)" />
        <Bar isAnimationActive={false} dataKey="IRR EK">
          {data.map((d, i) => <Cell key={i} fill={(a.hold[i].taxFree ? 'var(--s1)' : 'var(--s4)')} opacity={d['IRR EK'] != null && d['IRR EK'] < 0 ? 0.6 : 1} />)}
        </Bar>
      </ComposedChart>
    </ChartBox>
  )
}

export function Tornado({ a }: { a: Analysis }) {
  const base = a.mode === 'sale' ? a.kpis.irrEk : a.kpis.ekReturn
  const pick = (x: { ek: number | null; irr: number | null }) => (a.mode === 'sale' ? x.irr : x.ek)
  const rows = a.sensitivity.map((s) => ({ ...s, lo: pick(s.low), hi: pick(s.high) }))
  const span = Math.max(0.0001, ...rows.flatMap((r) => [Math.abs((r.lo ?? 0) - (base ?? 0)), Math.abs((r.hi ?? 0) - (base ?? 0))]))
  return (
    <figure className="chart">
      <figcaption>Sensitivität der {a.mode === 'sale' ? 'EK-IRR' : `EK-Rendite (${a.kpis.stabYear ?? ''})`} · Basis {pct(base, 1)}</figcaption>
      <div className="tornado">
        {rows.map((r) => {
          const dl = (r.lo ?? 0) - (base ?? 0)
          const dh = (r.hi ?? 0) - (base ?? 0)
          const seg = (d: number) => ({ width: `${(Math.abs(d) / span) * 50}%`, [d < 0 ? 'right' : 'left']: '50%' })
          return (
            <div className="tornado__row" key={r.label}>
              <span className="tornado__label">{r.label}</span>
              <div className="tornado__bar">
                <span className={`tornado__seg ${dl < 0 ? 'is-neg' : 'is-pos'}`} style={seg(dl)} title={`${r.lowLabel}: ${pct(r.lo, 1)}`} />
                <span className={`tornado__seg ${dh < 0 ? 'is-neg' : 'is-pos'}`} style={seg(dh)} title={`${r.highLabel}: ${pct(r.hi, 1)}`} />
                <i className="tornado__mid" />
              </div>
              <span className="tornado__vals num">{r.lowLabel} {pct(r.lo, 1)} · {r.highLabel} {pct(r.hi, 1)}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}
