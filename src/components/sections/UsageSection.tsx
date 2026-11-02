import type { Analysis } from '../../engine/analysis'
import { uid } from '../../engine/defaults'
import type { Inputs, PhaseKind } from '../../engine/types'
import { PHASE_LABELS } from '../../lib/labels'
import { eur, num, pct } from '../../lib/format'
import type { Update } from '../../state/store'
import { Acc, Grid, Line, Note, NumField, Seg, SelectField, Sub, Toggle } from '../ui/controls'

interface P { inp: Inputs; up: Update; a: Analysis }

const PHASE_INFO: Record<PhaseKind, string> = {
  vacant: 'Keine Miete, alle Nebenkosten trägt der Eigentümer. Kosten, Zinsen und AfA sind als vorweggenommene Werbungskosten abziehbar, wenn danach vermietet wird.',
  rent: 'Vermietung zu Marktkonditionen. Voller Werbungskostenabzug, Verkaufsgewinn innerhalb von 10 Jahren steuerpflichtig.',
  childRent: '§ 21 Abs. 2 EStG: ab 66 % der ortsüblichen Warmmiete voller Abzug; 50–66 % nur mit positiver Totalüberschussprognose; unter 50 % anteilig. Mietvertrag muss einem Fremdvergleich standhalten.',
  childFree: 'Keine Einnahmen und keine abziehbaren Kosten. Gilt bei kindergeldberechtigten Kindern als Nutzung zu eigenen Wohnzwecken – Verkauf auch vor 10 Jahren steuerfrei.',
  own: 'Selbst bewohnt: keine Steuerwirkung, ersparte Miete optional als Ertrag. Eigennutzung im Verkaufsjahr und den beiden Vorjahren macht den Verkauf steuerfrei (§ 23 Abs. 1 Nr. 1 S. 3 EStG).',
}

export function UsageSection({ inp, up, a }: P) {
  const r = inp.rent
  const childPhase = r.phases.some((p) => p.kind === 'childRent' || p.kind === 'childFree')
  return (
    <Acc id="usage" title="5 · Nutzung & Vermietung" summary={`${eur(r.coldRent)} kalt / Monat`}>
      <Sub>Zeitachse der Nutzung</Sub>
      <p className="muted small">Phasen laufen nacheinander ab dem Kaufmonat. Die letzte Phase gilt bis zum Ende.</p>
      <div className="phases">
        {r.phases.map((ph, idx) => {
          const last = idx === r.phases.length - 1
          return (
            <div className={`phase phase--${ph.kind}`} key={ph.id}>
              <SelectField label={`Phase ${idx + 1}`} value={ph.kind} info={PHASE_INFO[ph.kind]}
                options={(Object.keys(PHASE_LABELS) as PhaseKind[]).map((k) => ({ value: k, label: PHASE_LABELS[k] }))}
                onChange={(v) => up((d) => { d.rent.phases[idx].kind = v })} />
              <NumField label="Dauer" unit="Monate" digits={0} value={ph.months} min={0} max={600} placeholder="bis Ende"
                disabled={last}
                hint={last ? 'bis zum Ende' : `≈ ${num((ph.months ?? 0) / 12, 1)} Jahre`}
                onChange={(v) => up((d) => { d.rent.phases[idx].months = Math.round(v) })} />
              {ph.kind === 'childRent' && (
                <NumField label="Miete in % der ortsüblichen Warmmiete" unit="%" digits={0} value={ph.childPct} min={0} max={150}
                  hint={ph.childPct >= 66 ? 'voller Werbungskostenabzug' : ph.childPct >= 50 ? 'Totalüberschussprognose entscheidet' : 'Werbungskosten nur anteilig'}
                  onChange={(v) => up((d) => { d.rent.phases[idx].childPct = v })} />
              )}
              <div className="phase__tools">
                <button type="button" className="icon-btn" aria-label="Nach oben" disabled={idx === 0} onClick={() => up((d) => { const p = d.rent.phases; [p[idx - 1], p[idx]] = [p[idx], p[idx - 1]]; p.forEach((x, i) => { if (i < p.length - 1 && x.months == null) x.months = 12 }); p[p.length - 1].months = null })}>↑</button>
                <button type="button" className="icon-btn" aria-label="Phase löschen" disabled={r.phases.length <= 1} onClick={() => up((d) => { d.rent.phases.splice(idx, 1); const p = d.rent.phases; p[p.length - 1].months = null })}>×</button>
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" className="btn btn--sm" onClick={() => up((d) => {
        const p = d.rent.phases
        if (p.length) p[p.length - 1].months = p[p.length - 1].months ?? 12
        p.push({ id: uid(), kind: 'rent', months: null, childPct: 66 })
      })}>+ Phase</button>
      <PhaseBar a={a} />
      {childPhase && !inp.family.enabled && (
        <Note>Für Kindergeld-Prüfung und Familienvergleich unter „8 · Familie“ die Angaben zum Kind aktivieren.</Note>
      )}
      {r.phases.some((p) => p.kind === 'childRent') && (
        <Note tone="warn">
          Fremdvergleich bei Vermietung an Kinder: schriftlicher Mietvertrag, Miete tatsächlich und regelmäßig vom Konto des Kindes, Nebenkostenabrechnung, Kind volljährig mit eigenem Haushalt. Zahlung aus dem Barunterhalt der Eltern ist zulässig (BFH IX R 30/98), eine bloße Verrechnung mit dem Unterhalt nicht. Steuerlich: Abzugsquote aktuell {pct(a.sim.childQuota, 0)}{a.sim.childTup != null ? `, Totalüberschussprognose ${eur(a.sim.childTup)}` : ''}.
        </Note>
      )}

      <Sub>Miete</Sub>
      <Grid>
        <NumField label="Nettokaltmiete" unit="€/Monat" value={r.coldRent} min={0} onChange={(v) => up((d) => { d.rent.coldRent = v })}
          hint={inp.object.area > 0 ? `${num(r.coldRent / inp.object.area, 2)} €/m²` : undefined} />
        <NumField label="Ortsübliche Vergleichsmiete" unit="€/Monat" value={r.localRent} min={0}
          info="Laut Mietspiegel. Basis für Kappungsgrenze, Mietpreisbremse, Neuvermietung, Miete an Kinder und ersparte Miete bei Eigennutzung."
          onChange={(v) => up((d) => { d.rent.localRent = v })}
          hint={inp.object.area > 0 ? `${num(r.localRent / inp.object.area, 2)} €/m²` : undefined} />
        <NumField label="Stellplatz / Garage" unit="€/Monat" value={r.parking} min={0} onChange={(v) => up((d) => { d.rent.parking = v })} />
        <NumField label="Möblierungszuschlag" unit="€/Monat" value={r.furnished} min={0}
          info="Bei möblierter Vermietung ist ein Zuschlag üblich (oft 2 % des Zeitwerts der Möbel pro Monat). Möbel als Inventar über 10 Jahre abschreiben." onChange={(v) => up((d) => { d.rent.furnished = v })} />
      </Grid>

      <Sub>Mieterhöhungen</Sub>
      <Seg value={r.model} onChange={(v) => up((d) => { d.rent.model = v })} options={[
        { value: 'index', label: 'Indexmiete', hint: '§ 557b BGB: Anpassung an den Verbraucherpreisindex' },
        { value: 'staffel', label: 'Staffelmiete', hint: '§ 557a BGB: feste Erhöhungen' },
        { value: 'vergleich', label: 'Vergleichsmiete', hint: '§ 558 BGB mit Kappungsgrenze' },
      ]} info="Indexmiete folgt der Inflationsannahme (unter „Annahmen“). Staffelmiete mit festem Satz. Vergleichsmiete: Erhöhung bis zur ortsüblichen Vergleichsmiete, max. 20 % (angespannter Markt 15 %) in 3 Jahren – der Rechner begrenzt automatisch." />
      <Grid>
        {r.model !== 'index' && <NumField label={r.model === 'staffel' ? 'Staffel pro Jahr' : 'Gewünschte Steigerung'} unit="% p. a." value={r.growth} min={-10} max={20} onChange={(v) => up((d) => { d.rent.growth = v })} />}
        <NumField label="Entwicklung Vergleichsmiete" unit="% p. a." value={r.localGrowth} min={-10} max={20} onChange={(v) => up((d) => { d.rent.localGrowth = v })} />
        <Toggle label="Angespannter Wohnungsmarkt (Kappungsgrenze 15 %)" checked={r.tightMarket} onChange={(v) => up((d) => { d.rent.tightMarket = v })} />
        <Toggle label="Mietpreisbremse gilt (bis 31.12.2029)" checked={r.mietpreisbremse}
          info="In Gebieten mit Landesverordnung darf die Miete bei Neuvermietung höchstens 10 % über der ortsüblichen Vergleichsmiete liegen (§ 556d BGB). Ausnahmen: Erstbezug nach dem 01.10.2014, erste Vermietung nach umfassender Modernisierung, höhere Vormiete."
          onChange={(v) => up((d) => { d.rent.mietpreisbremse = v })} />
      </Grid>

      <Sub>Mietausfall und Mieterwechsel</Sub>
      <Grid>
        <NumField label="Mietausfallwagnis" unit="% der Miete" value={r.vacancyPct} min={0} max={50}
          info="Pauschale für Zahlungsausfälle und kurze Leerstände; die anteiligen Nebenkosten trägt der Vermieter. Üblich 2–4 %." onChange={(v) => up((d) => { d.rent.vacancyPct = v })} />
        <NumField label="Mieterwechsel alle" unit="Jahre" digits={0} value={r.tenantYears} min={0} max={40} hint="0 = kein Wechsel" onChange={(v) => up((d) => { d.rent.tenantYears = Math.round(v) })} />
        <NumField label="Leerstand je Wechsel" unit="Monate" digits={1} value={r.changeVacancy} min={0} max={24} onChange={(v) => up((d) => { d.rent.changeVacancy = v })} />
        <NumField label="Renovierung je Wechsel" unit="€" digits={0} value={r.changeCost} min={0} hint="Erhaltungsaufwand, steigt mit den Kosten" onChange={(v) => up((d) => { d.rent.changeCost = v })} />
        <NumField label="Vermietungsmakler" unit="Kaltmieten" digits={1} value={r.changeAgentMonths} min={0} max={3}
          info="Bestellerprinzip: Beauftragt der Vermieter den Makler, zahlt er (max. 2 Kaltmieten + USt üblich)." onChange={(v) => up((d) => { d.rent.changeAgentMonths = v })} />
        <NumField label="Neuvertragsmiete" unit="% Vergleichsmiete" digits={0} value={r.newLeasePct} min={50} max={200}
          info="Miete bei Neuvermietung. Mit Mietpreisbremse auf 110 % begrenzt; eine höhere Bestandsmiete darf weiter verlangt werden." onChange={(v) => up((d) => { d.rent.newLeasePct = v })} />
        <Toggle label="Ersparte Miete bei Eigennutzung als Ertrag ansetzen" checked={r.ownSavedRent} onChange={(v) => up((d) => { d.rent.ownSavedRent = v })} />
      </Grid>

      <ManualRent inp={inp} up={up} a={a} />
      <Note>
        Kaution: höchstens 3 Nettokaltmieten (§ 551 BGB), getrennt anzulegen – kein Ertrag. Kurzzeit- und Ferienvermietung: Zweckentfremdungsverbote, ggf. Gewerblichkeit und Umsatzsteuer – hier nicht gerechnet.
      </Note>
    </Acc>
  )
}

function ManualRent({ inp, up }: P) {
  const years = Math.min(15, inp.assumptions.horizon)
  const manual = inp.rent.manual
  const active = Object.keys(manual).length > 0
  return (
    <details className="details" open={active}>
      <summary>Miete pro Jahr manuell festlegen</summary>
      <p className="muted small">Leer = automatische Steigerung. Ein Wert (Kaltmiete pro Monat) gilt ab diesem Mietjahr als neue Basis.</p>
      <div className="manual">
        {Array.from({ length: years }, (_, i) => i + 2).map((y) => (
          <NumField key={y} label={`Jahr ${y}`} unit="€" digits={0} value={manual[y] ?? null}
            onChange={(v) => up((d) => { if (v > 0) d.rent.manual[y] = v; else delete d.rent.manual[y] })} />
        ))}
      </div>
      {active && <button type="button" className="btn btn--sm btn--ghost" onClick={() => up((d) => { d.rent.manual = {} })}>Zurücksetzen</button>}
    </details>
  )
}

function PhaseBar({ a }: { a: Analysis }) {
  const years = a.sim.years
  if (!years.length) return null
  return (
    <div className="phasebar" aria-label="Nutzung pro Jahr">
      {years.map((y) => (
        <div key={y.year} className="phasebar__y" title={`${y.year}: ${y.phases.map((p) => PHASE_LABELS[p]).join(', ')}`}>
          {y.phases.map((p) => <span key={p} className={`pb pb--${p}`} />)}
        </div>
      ))}
      <div className="phasebar__legend">
        {(Object.keys(PHASE_LABELS) as PhaseKind[]).filter((k) => years.some((y) => y.phases.includes(k))).map((k) => (
          <span key={k}><i className={`pb pb--${k}`} />{PHASE_LABELS[k]}</span>
        ))}
      </div>
      <Line label="Erstes volles Mietjahr (Kennzahlen „laufend“)" value={a.kpis.stabYear ?? '–'} />
    </div>
  )
}
