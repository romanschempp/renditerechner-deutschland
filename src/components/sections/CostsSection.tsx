import { co2LandlordShare, maintenanceGuide } from '../../engine/constants'
import type { Analysis } from '../../engine/analysis'
import type { Inputs } from '../../engine/types'
import { eur, num } from '../../lib/format'
import { useState } from 'react'
import type { Update } from '../../state/store'
import { Acc, Grid, Line, NumField, Sub, Toggle } from '../ui/controls'

interface P { inp: Inputs; up: Update; a: Analysis }

export function CostsSection({ inp, up, a }: P) {
  const c = inp.costs
  const age = inp.object.purchaseYear - inp.object.yearBuilt
  const guide = maintenanceGuide(age)
  const st = a.sim.stabilized
  const etw = inp.object.type === 'ETW'
  return (
    <Acc id="costs" title="6 · Laufende Kosten" summary={st ? `${eur(st.opCosts)} / Jahr` : undefined}>
      <Sub>{etw ? 'Hausgeld' : 'Betriebskosten'}</Sub>
      <Grid>
        <NumField label="Umlagefähige Betriebskosten" unit="€/Monat" value={c.umlage} min={0}
          info="Nach Betriebskostenverordnung (Heizung, Wasser, Müll, Hausmeister, Gebäudeversicherung, Grundsteuer …). Zahlt der Mieter als Vorauszahlung – für die Rendite neutral, außer bei Leerstand und Mietausfall."
          onChange={(v) => up((d) => { d.costs.umlage = v })} />
        <NumField label={etw ? 'Nicht umlagefähiges Hausgeld' : 'Nicht umlagefähige Kosten'} unit="€/Monat" value={c.hausgeldNonUml} min={0}
          info="WEG-Verwaltung, Bankgebühren der WEG, Instandhaltung Gemeinschaftseigentum (soweit nicht Rücklage). Sofort abziehbar."
          onChange={(v) => up((d) => { d.costs.hausgeldNonUml = v })} />
        {etw && (
          <NumField label="Zuführung Erhaltungsrücklage" unit="€/Monat" value={c.reserve} min={0}
            info="Teil des Hausgelds für die Erhaltungsrücklage der WEG (§ 19 WEG). Steuerlich erst abziehbar, wenn die WEG das Geld für Erhaltung ausgibt (BFH IX R 19/21)."
            onChange={(v) => up((d) => { d.costs.reserve = v })} />
        )}
        {etw && (
          <Toggle label="Rücklage wie laufende Erhaltung abziehen (Verwendung ≈ Zuführung)" checked={c.reserveDeductible}
            info="Vereinfachung: Langfristig gibt die WEG etwa so viel aus, wie sie zuführt. Genauer: aus, und größere Entnahmen (Sonderumlagen) als spätere Posten erfassen."
            onChange={(v) => up((d) => { d.costs.reserveDeductible = v })} />
        )}
        <NumField label="Grundsteuer" unit="€/Jahr" value={c.grundsteuer} min={0}
          info="Seit 2025 nach neuem Grundsteuerrecht (Bundes- oder Landesmodell). Betrag aus dem Grundsteuerbescheid." onChange={(v) => up((d) => { d.costs.grundsteuer = v })} />
        <Toggle label="Grundsteuer ist in den umlagefähigen Kosten enthalten" checked={c.grundsteuerUmlage} onChange={(v) => up((d) => { d.costs.grundsteuerUmlage = v })} />
      </Grid>

      <Sub>Eigene Kosten des Vermieters</Sub>
      <Grid>
        <NumField label="Versicherungen (nicht umgelegt)" unit="€/Jahr" value={c.insurance} min={0}
          info="Haus- und Grundbesitzerhaftpflicht (bei ETW oft über WEG), Mietausfall-, Vermieterrechtsschutz-Versicherung." onChange={(v) => up((d) => { d.costs.insurance = v })} />
        {etw && (
          <NumField label="Sondereigentumsverwaltung" unit="€/Monat" value={c.sev} min={0}
            info="Optional: Verwaltung des Mietverhältnisses (typisch 25–40 € pro Monat und Einheit)." onChange={(v) => up((d) => { d.costs.sev = v })} />
        )}
        <NumField label={etw ? 'Instandhaltung Sondereigentum' : 'Instandhaltung'} unit="€/m² · Jahr" value={c.maintenance} min={0}
          info={`Rücklage für Reparaturen in der Wohnung (Bad, Fenster in Sondereigentum, Thermen). Richtwert II. BV bei ${age} Jahren Alter: ca. ${num(guide, 2)} €/m² für das Gesamtobjekt – bei ETW trägt die WEG den Großteil über die Rücklage, für das Sondereigentum reichen oft 4–8 €/m².`}
          hint={`Richtwert Gesamtobjekt: ${num(guide, 1)} €/m² · Ansatz: ${eur(c.maintenance * inp.object.area)}/Jahr`}
          onChange={(v) => up((d) => { d.costs.maintenance = v })} />
        <Co2Helper inp={inp} up={up} a={a} />
        <NumField label="Kontoführung" unit="€/Jahr" value={c.bank} min={0} info="Ohne Nachweis akzeptiert das Finanzamt meist 16 € pauschal." onChange={(v) => up((d) => { d.costs.bank = v })} />
        <NumField label="Steuerberatung (Anlage V)" unit="€/Jahr" value={c.taxAdvice} min={0} onChange={(v) => up((d) => { d.costs.taxAdvice = v })} />
        <NumField label="Fahrtkosten" unit="€/Jahr" value={c.travel} min={0} info="Fahrten zum Objekt: 0,30 € je gefahrenem km (Dienstreisegrundsätze)." onChange={(v) => up((d) => { d.costs.travel = v })} />
        <NumField label="Sonstiges" unit="€/Jahr" value={c.other} min={0} hint="Inserate, Porto, Rechtsberatung, Schornsteinfeger (falls nicht umgelegt)" onChange={(v) => up((d) => { d.costs.other = v })} />
        <NumField label="Kostensteigerung" unit="% p. a." value={c.growth} min={-5} max={15} onChange={(v) => up((d) => { d.costs.growth = v })} />
      </Grid>
      {st && (
        <div className="lines">
          <Line label={`Kosten Vermieter ${st.year}`} value={eur(st.opCosts)} strong />
          <Line label="in % der Jahreskaltmiete" value={st.rentSoll > 0 ? `${num((st.opCosts / st.rentSoll) * 100, 1)} %` : '–'} />
        </div>
      )}
    </Acc>
  )
}

function Co2Helper({ inp, up }: P) {
  const [open, setOpen] = useState(false)
  const [kg, setKg] = useState(30)
  const [heat, setHeat] = useState(900)
  const share = co2LandlordShare(kg)
  const co2Price = 0.22
  return (
    <div className="field">
      <NumField label="CO₂-Kosten Vermieteranteil" unit="€/Jahr" value={inp.costs.co2} min={0}
        info="CO₂-Kostenaufteilungsgesetz: Bei Öl/Gas trägt der Vermieter je nach CO₂-Ausstoß des Gebäudes 0–95 % der CO₂-Kosten (10-Stufen-Modell). Bei Wärmepumpe/Fernwärme ohne CO₂-Preis: 0."
        onChange={(v) => up((d) => { d.costs.co2 = v })} />
      <button type="button" className="link" onClick={() => setOpen((o) => !o)}>{open ? 'Helfer schließen' : 'Helfer: aus Heizkosten berechnen'}</button>
      {open && (
        <div className="helper">
          <NumField label="CO₂ des Gebäudes" unit="kg/m²·a" digits={0} value={kg} min={0} onChange={setKg} />
          <NumField label="Heizkosten der Wohnung" unit="€/Jahr" digits={0} value={heat} min={0} onChange={setHeat} />
          <p className="small muted">Vermieteranteil {share} %. CO₂-Anteil der Heizkosten bei Gas ca. {Math.round(co2Price * 100)} % (CO₂-Preis 2026: 55–65 €/t).</p>
          <button type="button" className="btn btn--sm" onClick={() => up((d) => { d.costs.co2 = Math.round(heat * co2Price * (share / 100)) })}>
            {eur(heat * co2Price * (share / 100))} übernehmen
          </button>
        </div>
      )}
    </div>
  )
}
