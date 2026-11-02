import type { Analysis } from '../../engine/analysis'
import { COST_LABELS, type YearRow } from '../../engine/simulate'
import type { Inputs } from '../../engine/types'
import { eur, num, pct } from '../../lib/format'
import { Info, Line, Signed } from '../ui/controls'
import { PHASE_LABELS } from '../../lib/labels'

interface RowDef {
  key: string
  label: string
  get: (y: YearRow) => number | null
  fmt?: 'eur' | 'pct' | 'num'
  sign?: boolean
  strong?: boolean
  info?: string
  sep?: boolean
}

function TransposedTable({ years, rows, className }: { years: YearRow[]; rows: RowDef[]; className?: string }) {
  return (
    <div className="table-wrap table-wrap--scroll">
      <table className={`tbl tbl--years ${className ?? ''}`}>
        <thead>
          <tr>
            <th className="sticky">Jahr</th>
            {years.map((y) => (
              <th key={y.year} className="num" title={y.phases.map((p) => PHASE_LABELS[p]).join(', ')}>
                {y.year}<span className="tbl__sub">{y.months < 12 ? `${y.months} Mon.` : `J${y.idx}`}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={`${r.strong ? 'is-strong' : ''}${r.sep ? ' is-sep' : ''}`}>
              <th className="sticky">{r.label}{r.info && <Info text={r.info} />}</th>
              {years.map((y) => {
                const v = r.get(y)
                const s = v == null ? '–' : r.fmt === 'pct' ? pct(v, 1) : r.fmt === 'num' ? num(v, 2) : eur(v)
                return <td key={y.year} className="num">{r.sign ? <Signed value={v}>{s}</Signed> : s}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function YearTable({ a }: { a: Analysis }) {
  const rows: RowDef[] = [
    { key: 'soll', label: 'Sollmiete', get: (y) => y.rentSoll },
    { key: 'vac', label: '− Leerstand / Ausfall', get: (y) => -y.vacancyLoss },
    { key: 'eff', label: 'Effektive Miete', get: (y) => y.rentEff, strong: true },
    { key: 'saved', label: '+ Ersparte Miete', get: (y) => y.savedRent },
    { key: 'op', label: '− Kosten Vermieter', get: (y) => -y.opCosts },
    { key: 'capex', label: '− Investitionen / Mieterwechsel', get: (y) => -(y.capex + (y.costs.agent ?? 0)) },
    { key: 'noi', label: 'Reinertrag (NOI)', get: (y) => y.noi, strong: true, sign: true, info: 'Mieteinnahmen − nicht umlagefähige Kosten − Investitionen, vor Zins, Tilgung und Steuern.' },
    { key: 'int', label: '− Zinsen', get: (y) => -y.interest, sep: true },
    { key: 'tilg', label: '− Tilgung', get: (y) => -y.principal },
    { key: 'trans', label: '± Übertragung / Schenkungsteuer', get: (y) => (y.transferFlow ? y.transferFlow : null) },
    { key: 'cfPre', label: 'Cashflow vor Steuern', get: (y) => y.cfPre, strong: true, sign: true },
    { key: 'vv', label: 'Steuerliches Ergebnis V+V', get: (y) => y.vv, sign: true, sep: true, info: 'Einnahmen − Werbungskosten (inkl. AfA und Zinsen). Negativ = Verlust, der die Steuer auf das übrige Einkommen senkt.' },
    { key: 'gain', label: 'Veräußerungsgewinn (§ 23)', get: (y) => (y.gain ? y.gain : null) },
    { key: 'tax', label: '− Steuer (+ = Erstattung)', get: (y) => -y.taxEffect, sign: true },
    { key: 'cfPost', label: 'Cashflow nach Steuern', get: (y) => y.cfPost, strong: true, sign: true },
    { key: 'cum', label: 'Kumulierter Cashflow', get: (y) => y.cumCf, sign: true },
    { key: 'bal', label: 'Restschuld', get: (y) => y.balance, sep: true },
    { key: 'val', label: 'Immobilienwert', get: (y) => y.value },
    { key: 'net', label: 'Nettovermögen in der Immobilie', get: (y) => y.netEquity, strong: true },
    { key: 'ek', label: 'EK-Rendite', get: (y) => y.ekReturn, fmt: 'pct', sign: true, strong: true, sep: true, info: '(Cashflow nach Steuern + Tilgung [+ Wertänderung]) ÷ Eigenkapital. Übertragungen und Verkaufssteuer sind herausgerechnet; die Rendite inkl. Verkauf zeigt die IRR.' },
    { key: 'gk', label: 'GK-Rendite', get: (y) => y.gkReturn, fmt: 'pct', sign: true, strong: true, info: '(Reinertrag − Steuer bei Kauf ohne Kredit [+ Wertänderung]) ÷ Gesamtinvestition.' },
  ]
  return <TransposedTable years={a.sim.years} rows={rows} />
}

export function TaxTable({ inp, a }: { inp: Inputs; a: Analysis }) {
  const years = a.sim.years
  const costKeys = Object.keys(COST_LABELS).filter((k) => years.some((y) => (y.costs[k] ?? 0) > 0))
  const rows: RowDef[] = [
    { key: 'inc', label: 'Mieteinnahmen', get: (y) => y.rentEff, strong: true },
    { key: 'q', label: 'Abzugsquote Werbungskosten', get: (y) => y.quota, fmt: 'pct', info: '100 % bei Vermietung; anteilig bei verbilligter Vermietung unter 50 % (bzw. 66 % ohne positive Prognose); 0 % bei Eigennutzung und unentgeltlicher Überlassung.' },
    { key: 'int', label: 'Schuldzinsen', get: (y) => -y.interest * y.quota },
    { key: 'fin', label: 'Finanzierungskosten, Disagio', get: (y) => -y.financeCosts },
    { key: 'afaB', label: 'AfA Gebäude', get: (y) => -y.afaBuilding },
    { key: 'afaS', label: 'Erhöhte / Sonder-AfA', get: (y) => (y.afaSpecial ? -y.afaSpecial : null) },
    { key: 'afaI', label: 'AfA Inventar', get: (y) => -y.afaInventory },
    { key: 'erh', label: 'Erhaltungsaufwand', get: (y) => -y.erhaltung },
    { key: 'wk', label: 'Laufende Werbungskosten', get: (y) => -y.deductibleCosts },
    { key: 'vv', label: 'Einkünfte aus V+V', get: (y) => y.vv, strong: true, sign: true, sep: true },
    { key: 'gain', label: 'Private Veräußerungsgeschäfte', get: (y) => (y.gain ? y.gain : null) },
    ...(inp.tax.mode === 'exact' ? [
      { key: 'zve', label: 'zvE ohne Immobilie', get: (y: YearRow) => y.zve, sep: true },
      { key: 'est0', label: 'Steuer ohne Immobilie', get: (y: YearRow) => y.estWithout, info: 'Einkommensteuer + Soli + Kirchensteuer.' },
      { key: 'est1', label: 'Steuer mit Immobilie', get: (y: YearRow) => y.estWith },
    ] : []),
    { key: 'eff', label: 'Steuerwirkung (− = Ersparnis)', get: (y) => y.taxEffect, strong: true, sign: false },
  ]
  return (
    <>
      <TransposedTable years={years} rows={rows} className="tbl--tax" />
      <details className="details">
        <summary>Laufende Kosten nach Art (Zahlungen)</summary>
        <TransposedTable years={years} rows={costKeys.map((k) => ({ key: k, label: COST_LABELS[k], get: (y) => y.costs[k] ?? 0 }))} />
      </details>
    </>
  )
}

export function LoanTable({ a }: { a: Analysis }) {
  if (!a.sim.purchase.loanSum) return <p className="muted">Ohne Finanzierung gibt es keinen Tilgungsplan.</p>
  const rows: RowDef[] = [
    { key: 'rate', label: 'Rate gesamt', get: (y) => y.debtService },
    { key: 'int', label: 'Zinsen', get: (y) => y.interest },
    { key: 'tilg', label: 'Tilgung inkl. Sondertilgung', get: (y) => y.principal },
    { key: 'bal', label: 'Restschuld Jahresende', get: (y) => y.balance, strong: true },
    { key: 'ltv', label: 'Schuld ÷ Wert', get: (y) => (y.value ? y.balance / y.value : null), fmt: 'pct' },
  ]
  return <TransposedTable years={a.sim.years} rows={rows} />
}

export function SaleBlock({ a }: { a: Analysis }) {
  const sc = a.scenarios
  if (!sc.length || !a.sim.sale) return null
  const label = { pess: 'Pessimistisch', real: 'Realistisch', opt: 'Optimistisch' }
  const rows: { label: string; get: (s: typeof sc[number]) => number | string; sign?: boolean; strong?: boolean; info?: string }[] = [
    { label: 'Wertentwicklung p. a.', get: (s) => `${num(s.growth, 1)} %` },
    { label: 'Verkaufspreis', get: (s) => s.sim.sale!.price, strong: true },
    { label: '− Verkaufskosten', get: (s) => -s.sim.sale!.saleCosts },
    { label: 'davon Vorfälligkeitsentschädigung', get: (s) => s.sim.sale!.vfe },
    { label: 'Anschaffungs-/Herstellungskosten', get: (s) => s.sim.sale!.akTotal },
    { label: '− in Anspruch genommene AfA', get: (s) => -s.sim.sale!.afaTaken, info: 'Mindert die steuerlichen Anschaffungskosten und erhöht so den Veräußerungsgewinn.' },
    { label: 'Steuerlicher Restbuchwert', get: (s) => s.sim.sale!.bookValue },
    { label: 'Veräußerungsgewinn vor Steuer', get: (s) => s.sim.sale!.gainPre, sign: true },
    { label: 'Steuerpflichtiger Gewinn (§ 23)', get: (s) => s.sim.sale!.taxableGain },
    { label: '− Steuer auf den Gewinn', get: (s) => -s.sim.sale!.tax },
    { label: '− Restschuld', get: (s) => -s.sim.sale!.balance },
    { label: 'Nettoerlös nach Steuer', get: (s) => s.sim.sale!.netProceeds, strong: true },
    { label: 'Summe Cashflows (Haltedauer)', get: (s) => s.sim.sumCf + s.sim.sale!.tax, sign: true },
    { label: '− Eingesetztes Eigenkapital', get: (s) => -s.sim.equity },
    { label: 'Gewinn / Verlust', get: (s) => s.sim.sumCf + s.sim.sale!.cashAtSale - s.sim.equity, sign: true, strong: true },
    { label: 'IRR Eigenkapital', get: (s) => `${pct(s.sim.irrEk, 1)}` },
    { label: 'IRR Gesamtkapital', get: (s) => `${pct(s.sim.irrGk, 1)}` },
  ]
  const real = a.sim.sale
  return (
    <>
      <div className="table-wrap">
        <table className="tbl tbl--sale">
          <thead>
            <tr><th />{sc.map((s) => <th key={s.key} className={`num scen-h scen-h--${s.key}`}>{label[s.key]}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={r.strong ? 'is-strong' : ''}>
                <th>{r.label}{r.info && <Info text={r.info} />}</th>
                {sc.map((s) => {
                  const v = r.get(s)
                  const t = typeof v === 'number' ? eur(v) : v
                  return <td key={s.key} className="num">{r.sign && typeof v === 'number' ? <Signed value={v}>{t}</Signed> : t}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lines">
        <Line label="Steuerstatus (realistisch)" value={real.taxFree ? `steuerfrei – ${real.taxFreeReason}` : 'steuerpflichtig (§ 23 EStG)'} />
        <Line label="Laufender Gewinn (Miete − Kosten − Zinsen − Steuern)" value={eur(a.kpis.rentalProfit)} info="Tilgung ist nicht abgezogen, sie steckt im Nettoerlös." />
        <Line label="Gewinn aus dem Verkauf (nach Nebenkosten und Steuer)" value={eur(a.kpis.saleProfit)} />
        <Line label="Gesamtgewinn" value={eur(a.kpis.profit)} strong />
        <Line label="Ø Rendite p. a. auf das EK (ohne Zinseszins)" value={pct(a.kpis.equity > 0 ? a.kpis.profit / a.kpis.equity / (a.sim.months / 12) : null, 1)} />
      </div>
    </>
  )
}
