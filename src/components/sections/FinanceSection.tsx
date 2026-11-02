import type { Analysis } from '../../engine/analysis'
import { uid } from '../../engine/defaults'
import type { Inputs, Loan, LoanType } from '../../engine/types'
import { eur, pct } from '../../lib/format'
import type { Update } from '../../state/store'
import { Acc, Grid, Line, Note, NumField, Seg, SelectField, Sub, TextField } from '../ui/controls'

interface P { inp: Inputs; up: Update; a: Analysis }

const typeOptions: { value: LoanType; label: string; hint: string }[] = [
  { value: 'annuity', label: 'Annuität', hint: 'Gleichbleibende Rate aus Zins und Tilgung' },
  { value: 'linear', label: 'Tilgungsdarlehen', hint: 'Gleichbleibende Tilgung, Rate sinkt' },
  { value: 'bullet', label: 'Endfällig', hint: 'Nur Zinsen, Rückzahlung am Ende (z. B. mit Bausparvertrag)' },
  { value: 'kfw', label: 'KfW / Förderkredit', hint: 'Tilgungsfreie Anlaufjahre, danach Annuität' },
]

function newLoan(): Loan {
  return { id: uid(), label: 'Weiteres Darlehen', type: 'annuity', amount: 0, rate: 3.5, repay: 2, termYears: 30, fixedYears: 10, followRate: 4, followRepay: 2, specialRepay: 0, disagio: 0, graceYears: 0 }
}

export function FinanceSection({ inp, up, a }: P) {
  const P = a.sim.purchase
  const k = a.kpis
  const autoAmount = Math.max(0, P.totalInvestment + P.mortgageFees + P.financeFees - 0)
  return (
    <Acc id="finance" title="4 · Finanzierung" summary={`${eur(P.loanSum)} · EK ${eur(P.equity)}`}>
      {inp.loans.length === 0 && <Note>Ohne Darlehen wird die gesamte Investition aus Eigenkapital bezahlt; EK- und GK-Rendite unterscheiden sich dann nur durch die Finanzierungsnebenkosten.</Note>}
      {inp.loans.map((l, idx) => {
        const set = (fn: (x: Loan) => void) => up((d) => fn(d.loans[idx]))
        return (
          <div className="loan" key={l.id}>
            <div className="loan__head">
              <TextField label="Bezeichnung" value={l.label} onChange={(v) => set((x) => { x.label = v })} />
              <button type="button" className="icon-btn" aria-label="Darlehen löschen" onClick={() => up((d) => { d.loans.splice(idx, 1) })}>×</button>
            </div>
            <Seg value={l.type} options={typeOptions} size="sm" onChange={(v) => set((x) => { x.type = v })} />
            <Grid>
              <NumField label="Darlehensbetrag" unit="€" digits={0} value={l.amount} min={0} onChange={(v) => set((x) => { x.amount = v })}
                hint={P.price > 0 ? `${pct(l.amount / P.price)} vom Kaufpreis` : undefined} />
              <NumField label="Sollzins" unit="% p. a." value={l.rate} min={0} max={20} onChange={(v) => set((x) => { x.rate = v })} />
              {l.type === 'annuity' && (
                <NumField label="Anfängliche Tilgung" unit="% p. a." value={l.repay} min={0} max={20} onChange={(v) => set((x) => { x.repay = v })}
                  info="Bei Annuitätendarlehen steigt der Tilgungsanteil mit jeder Rate. 2 % Tilgung bei 3,5 % Zins → ca. 33 Jahre Laufzeit." />
              )}
              {l.type !== 'annuity' && (
                <NumField label="Laufzeit" unit="Jahre" digits={0} value={l.termYears} min={1} max={50} onChange={(v) => set((x) => { x.termYears = Math.round(v) })} />
              )}
              {l.type === 'kfw' && (
                <NumField label="Tilgungsfreie Anlaufjahre" unit="Jahre" digits={0} value={l.graceYears} min={0} max={10} onChange={(v) => set((x) => { x.graceYears = Math.round(v) })} />
              )}
              <NumField label="Zinsbindung" unit="Jahre" digits={0} value={l.fixedYears} min={0} max={40} onChange={(v) => set((x) => { x.fixedYears = Math.round(v) })}
                info="Nach 10 Jahren ab Auszahlung kann jedes Festzinsdarlehen mit 6 Monaten Frist gekündigt werden (§ 489 BGB) – ohne Vorfälligkeitsentschädigung." />
              <NumField label="Anschlusszins" unit="% p. a." value={l.followRate} min={0} max={20} onChange={(v) => set((x) => { x.followRate = v })}
                info="Annahme für die Zeit nach der Zinsbindung (Zinsänderungsrisiko). In der Sensitivität wird ±1 Prozentpunkt getestet." />
              {l.type === 'annuity' && (
                <NumField label="Tilgung nach Zinsbindung" unit="% Restschuld" value={l.followRepay} min={0} max={20} onChange={(v) => set((x) => { x.followRepay = v })} />
              )}
              <NumField label="Sondertilgung" unit="% p. a." value={l.specialRepay} min={0} max={20} onChange={(v) => set((x) => { x.specialRepay = v })}
                info="Jährliche Sondertilgung in % des ursprünglichen Darlehens; meist bis 5 % vertraglich kostenfrei möglich." />
              <NumField label="Disagio" unit="%" value={l.disagio} min={0} max={10} onChange={(v) => set((x) => { x.disagio = v })}
                info="Abschlag bei der Auszahlung gegen niedrigeren Zins. Bis 5 % bei mindestens 5 Jahren Zinsbindung sofort als Werbungskosten abziehbar, sonst über die Zinsbindung verteilt." />
            </Grid>
          </div>
        )
      })}
      <div className="btn-row">
        <button type="button" className="btn btn--sm" onClick={() => up((d) => { d.loans.push(newLoan()) })}>+ Darlehen</button>
        {inp.loans.length > 0 && (
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => up((d) => { d.loans[0].amount = Math.round(autoAmount - d.loans.slice(1).reduce((s, l) => s + l.amount, 0)) })}>
            Vollfinanzierung (110 %) setzen
          </button>
        )}
      </div>

      <Sub>Weitere Finanzierungskosten</Sub>
      <Grid>
        <NumField label="Bereitstellungszinsen, Bankgebühren" unit="€" digits={0} value={inp.financeFees} min={0}
          info="Sofort abziehbare Finanzierungskosten im Kaufjahr." onChange={(v) => up((d) => { d.financeFees = v })} />
        <SelectField label="Vorfälligkeitsentschädigung" value={inp.vfe.mode} options={[{ value: 'auto', label: 'Schätzen (Zinsdifferenz)' }, { value: 'pct', label: 'In % der Restschuld' }]}
          info="Fällt bei Verkauf innerhalb der Zinsbindung an (höchstens bis 10 Jahre nach Auszahlung). Schätzung: Restschuld × (Vertragszins − Wiederanlagezins) × Restlaufzeit, abgezinst. Beim Verkauf innerhalb der Spekulationsfrist mindert sie den steuerpflichtigen Gewinn."
          onChange={(v) => up((d) => { d.vfe.mode = v })} />
        {inp.vfe.mode === 'auto'
          ? <NumField label="Wiederanlagezins (Pfandbrief)" unit="%" value={inp.vfe.reinvestRate} min={0} max={10} onChange={(v) => up((d) => { d.vfe.reinvestRate = v })} />
          : <NumField label="VFE" unit="% der Restschuld" value={inp.vfe.pct} min={0} max={20} onChange={(v) => up((d) => { d.vfe.pct = v })} />}
      </Grid>
      <div className="lines">
        <Line label="Gesamtinvestition" value={eur(P.totalInvestment)} />
        <Line label="+ Finanzierungsnebenkosten" value={eur(P.mortgageFees + P.financeFees)} />
        <Line label="− Auszahlung Darlehen" value={eur(P.loanPayout)} />
        <Line label="Eigenkapital" value={eur(P.equity)} strong />
        <Line label="Beleihungsauslauf (Darlehen ÷ Kaufpreis)" value={pct(k.ltv)} />
        <Line label="Rate im 1. vollen Jahr" value={`${eur(k.loanPaymentMonth)} / Monat`} />
      </div>
      {P.equity < 0 && <Note tone="warn">Die Darlehen übersteigen den Kapitalbedarf. Die EK-Rendite ist dann nicht aussagekräftig.</Note>}
    </Acc>
  )
}
