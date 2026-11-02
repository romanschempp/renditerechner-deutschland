import type { Analysis } from '../../engine/analysis'
import type { Inputs } from '../../engine/types'
import { eur, num } from '../../lib/format'
import type { Update } from '../../state/store'
import { Acc, Grid, Line, Note, NumField, Seg, Sub, Toggle } from '../ui/controls'

interface P { inp: Inputs; up: Update; a: Analysis }

export function SaleSection({ inp, up, a }: P) {
  const s = inp.sale
  const sale = a.sim.sale
  const saleYear = inp.object.purchaseYear + Math.floor((inp.object.purchaseMonth - 1 + s.years * 12) / 12)
  return (
    <Acc id="sale" title="9 · Verkauf" summary={`nach ${num(s.years, 1)} Jahren`} defaultOpen>
      <Grid>
        <NumField label="Haltedauer bis Verkauf" unit="Jahre" digits={2} value={s.years} min={0.1} max={40}
          info="Für die Spekulationsfrist zählen die Daten der notariellen Verträge. Steuerfrei erst, wenn mehr als 10 Jahre zwischen Kauf- und Verkaufsvertrag liegen – also z. B. 10 Jahre + 1 Monat."
          hint={`Verkauf ≈ ${saleYear}${s.years * 12 <= 120 ? ' · innerhalb der 10-Jahres-Frist' : ' · nach der 10-Jahres-Frist'}`}
          onChange={(v) => up((d) => { d.sale.years = v })} />
        <Seg label="Verkaufspreis" value={s.priceMode} onChange={(v) => up((d) => { d.sale.priceMode = v })} options={[
          { value: 'growth', label: 'Über Wertentwicklung' }, { value: 'direct', label: 'Direkt eingeben' },
        ]} />
        {s.priceMode === 'growth'
          ? <NumField label="Wertentwicklung p. a. (realistisch)" unit="%" value={inp.assumptions.valueGrowth} min={-10} max={15} onChange={(v) => up((d) => { d.assumptions.valueGrowth = v })} />
          : <NumField label="Verkaufspreis" unit="€" digits={0} value={s.direct} min={0} onChange={(v) => up((d) => { d.sale.direct = v })} />}
        <NumField label="Pessimistisch" unit="Pp. p. a." value={s.pessDelta} min={-10} max={0} onChange={(v) => up((d) => { d.sale.pessDelta = v })} />
        <NumField label="Optimistisch" unit="Pp. p. a." value={s.optDelta} min={0} max={10} onChange={(v) => up((d) => { d.sale.optDelta = v })} />
      </Grid>
      <Note>Auch stagnierende oder fallende Preise testen. Die Wertentwicklung ist eine Annahme, keine Garantie – Nebenkosten (ca. 10 %) müssen erst wieder verdient werden.</Note>

      <Sub>Verkaufskosten</Sub>
      <Grid>
        <NumField label="Makler (Verkäuferanteil)" unit="%" value={s.agent} min={0} max={10} onChange={(v) => up((d) => { d.sale.agent = v })} />
        <NumField label="Löschung Grundschuld" unit="€" digits={0} value={s.deletion} min={0} onChange={(v) => up((d) => { d.sale.deletion = v })} />
        <NumField label="Aufbereitung / Reparaturen / Energieausweis" unit="€" digits={0} value={s.preparation} min={0} onChange={(v) => up((d) => { d.sale.preparation = v })} />
        <NumField label="Sonstiges" unit="€" digits={0} value={s.other} min={0} onChange={(v) => up((d) => { d.sale.other = v })} />
      </Grid>
      {sale && (
        <div className="lines">
          <Line label="Verkaufspreis (realistisch)" value={eur(sale.price)} />
          <Line label="Verkaufskosten inkl. Vorfälligkeitsentschädigung" value={eur(sale.saleCosts)} />
          {sale.vfe > 0 && <Line label="davon Vorfälligkeitsentschädigung" value={eur(sale.vfe)} />}
          <Line label="Steuer auf den Veräußerungsgewinn" value={sale.taxFree ? `0 € (${sale.taxFreeReason})` : eur(sale.tax)} strong />
        </div>
      )}
      <Note>Mehr als drei Objektverkäufe innerhalb von 5 Jahren nach Kauf/Bau können einen gewerblichen Grundstückshandel begründen (Gewerbesteuer, keine 10-Jahres-Frist).</Note>
    </Acc>
  )
}

export function AssumptionsSection({ inp, up }: P) {
  const as = inp.assumptions
  return (
    <Acc id="assumptions" title="10 · Betrachtungszeitraum & Annahmen" summary={`${as.horizon} Jahre`}>
      <Grid>
        <NumField label="Betrachtungszeitraum (ohne Verkauf)" unit="Jahre" digits={0} value={as.horizon} min={1} max={50} onChange={(v) => up((d) => { d.assumptions.horizon = Math.round(v) })} />
        <NumField label="Wertentwicklung p. a." unit="%" value={as.valueGrowth} min={-10} max={15}
          info="Für Vermögensaufbau, Verkaufspreis (realistisch) und optional die jährliche Rendite." onChange={(v) => up((d) => { d.assumptions.valueGrowth = v })} />
        <NumField label="Inflation (VPI)" unit="% p. a." value={as.inflation} min={-5} max={15} info="Basis für die Indexmiete und die reale Betrachtung." onChange={(v) => up((d) => { d.assumptions.inflation = v })} />
        <NumField label="Alternativrendite Eigenkapital" unit="% p. a." value={as.altReturn} min={0} max={20}
          info="Opportunitätskosten: Vergleich der IRR mit einer anderen Anlage (z. B. ETF nach Steuern)." onChange={(v) => up((d) => { d.assumptions.altReturn = v })} />
        <Toggle label="Wertsteigerung in die jährliche EK-/GK-Rendite einrechnen" checked={as.appreciationInReturn}
          info="Aus: jährliche Rendite nur aus laufendem Ertrag (+ Tilgung bei der EK-Rendite). Ein: zusätzlich die (nicht realisierte) Wertänderung des Jahres." onChange={(v) => up((d) => { d.assumptions.appreciationInReturn = v })} />
        <Seg label="Bezugsgröße EK-Rendite" value={as.ekBase} onChange={(v) => up((d) => { d.assumptions.ekBase = v })} options={[
          { value: 'invested', label: 'Eingesetztes Eigenkapital' },
          { value: 'bound', label: 'Gebundenes Kapital (Wert − Schuld)' },
        ]} info="Eingesetzt: Ertrag ÷ ursprüngliches Eigenkapital (wie im Spanien-Rechner). Gebunden: Ertrag ÷ Nettovermögen in der Immobilie zu Jahresbeginn – zeigt, ob sich das Behalten noch lohnt." />
      </Grid>
    </Acc>
  )
}
