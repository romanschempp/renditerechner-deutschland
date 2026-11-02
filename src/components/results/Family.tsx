import type { Analysis } from '../../engine/analysis'
import type { Inputs } from '../../engine/types'
import { eur, pct } from '../../lib/format'
import { Line, Note, Signed } from '../ui/controls'

export function FamilyCompare({ inp, a }: { inp: Inputs; a: Analysis }) {
  if (!a.family.length) return null
  const best = a.family.reduce((b, f) => (f.wealth > b.wealth ? f : b), a.family[0])
  const horizon = a.mode === 'sale' ? `bis Verkauf nach ${a.sim.months / 12} Jahren` : `über ${a.sim.months / 12} Jahre (unverkauft)`
  return (
    <>
      <p className="muted small">Familie konsolidiert (Eltern + Kind), {horizon}. Gleiche Annahmen, nur die Nutzung bzw. Übertragung unterscheidet sich.</p>
      <div className="table-wrap table-wrap--scroll">
        <table className="tbl tbl--family">
          <thead>
            <tr>
              <th>Variante</th>
              <th className="num">Ø Cashflow / Monat</th>
              <th className="num">Einkommensteuer (− = Ersparnis)</th>
              <th className="num">Steuer Verkauf</th>
              <th className="num">Schenkungsteuer</th>
              <th className="num">Familienvermögen am Ende</th>
              <th className="num">IRR EK</th>
            </tr>
          </thead>
          <tbody>
            {a.family.map((f) => (
              <tr key={f.key} className={f.key === best.key ? 'is-best' : ''}>
                <th>
                  {f.label}
                  <span className="tbl__sub">{f.description}</span>
                </th>
                <td className="num"><Signed value={f.cfMonth}>{eur(f.cfMonth)}</Signed></td>
                <td className="num">{eur(f.incomeTax)}</td>
                <td className="num">{eur(f.saleTax)}</td>
                <td className="num">{eur(f.giftTax)}</td>
                <td className="num"><strong>{eur(f.wealth)}</strong></td>
                <td className="num"><Signed value={f.irrEk}>{pct(f.irrEk, 1)}</Signed></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {a.inheritance && (
        <div className="lines">
          <Line label={`Zum Vergleich: Erbschaftsteuer bei Erbfall ${a.inheritance.year} (ohne Schenkung)`} value={eur(a.inheritance.tax)}
            info={`Wert ${eur(a.inheritance.value)} − Schulden ${eur(a.inheritance.debt)}, 10 % Abschlag (§ 13d ErbStG), Freibetrag 400.000 € je Elternteil (${inp.family.donors}).`} />
        </div>
      )}
      <Note>
        Lesart: „Vermietung an Kind“ lohnt sich, wenn das Kind ohnehin unterstützt wird – der Mietverlust gegenüber der Marktmiete ist Unterhalt, die Werbungskosten bleiben (ab 66 %) voll abziehbar. „Unentgeltlich“ spart den Mietvertrag, kostet aber den Werbungskostenabzug, macht dafür einen Verkauf vor 10 Jahren steuerfrei (solange Kindergeldanspruch). Schenkung/Nießbrauch nutzen die Freibeträge alle 10 Jahre und verlagern künftige Wertsteigerung und ggf. Mieteinkünfte auf das Kind.
      </Note>
    </>
  )
}
