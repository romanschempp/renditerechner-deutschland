import { STATES, LEGAL_DATE, type StateCode } from '../../engine/constants'
import { uid } from '../../engine/defaults'
import type { Analysis } from '../../engine/analysis'
import type { CostKind, Inputs } from '../../engine/types'
import { eur, pct } from '../../lib/format'
import type { Update } from '../../state/store'
import { Acc, Grid, Line, Note, NumField, Seg, SelectField, Sub, TextField, Toggle } from '../ui/controls'

interface P { inp: Inputs; up: Update; a: Analysis }

const stateOptions = (Object.keys(STATES) as StateCode[]).map((k) => ({ value: k, label: `${STATES[k].name} · ${STATES[k].grest.toString().replace('.', ',')} %` }))
const monthOptions = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'].map((m, i) => ({ value: i + 1, label: m }))

export function ObjectSection({ inp, up, a }: P) {
  const o = inp.object
  const P = a.sim.purchase
  return (
    <Acc id="object" title="1 · Objekt & Kauf" summary={eur(o.price)} defaultOpen>
      <Grid>
        <TextField label="Name des Objekts" value={o.name} onChange={(v) => up((d) => { d.object.name = v })} wide />
        <Seg label="Objektart" value={o.type} onChange={(v) => up((d) => { d.object.type = v })} options={[
          { value: 'ETW', label: 'Eigentumswohnung' }, { value: 'EFH', label: 'Haus (EFH/ZFH)' }, { value: 'MFH', label: 'Mehrfamilienhaus' },
        ]} />
        <SelectField label="Bundesland" value={o.state} options={stateOptions} wide
          info={`Bestimmt den Grunderwerbsteuersatz (Stand ${LEGAL_DATE}). Der Satz wird bei Wechsel übernommen und kann unter „Kaufnebenkosten“ überschrieben werden.`}
          onChange={(v) => up((d) => { d.object.state = v; d.purchase.grest = STATES[v].grest })} />
        <NumField label="Kaufpreis" unit="€" digits={0} value={o.price} onChange={(v) => up((d) => { d.object.price = v })} min={0} />
        <NumField label="davon Inventar / Einbauküche" unit="€" digits={0} value={o.inventory} min={0}
          info="Mitverkaufte bewegliche Gegenstände (Einbauküche, Möbel) im Kaufvertrag gesondert ausweisen: keine Grunderwerbsteuer darauf und Abschreibung über 10 Jahre statt 50. Der Betrag muss angemessen sein (Zeitwert)."
          onChange={(v) => up((d) => { d.object.inventory = v })} />
        <NumField label="Wohnfläche" unit="m²" digits={1} value={o.area} min={0} onChange={(v) => up((d) => { d.object.area = v })} />
        <NumField label="Baujahr (Fertigstellung)" plain digits={0} value={o.yearBuilt} min={1800} max={2035}
          info="Bestimmt den linearen AfA-Satz: vor 1925 → 2,5 %, 1925–2022 → 2 %, ab 2023 → 3 % (§ 7 Abs. 4 EStG)."
          onChange={(v) => up((d) => { d.object.yearBuilt = Math.round(v) })} />
        <SelectField label="Kaufmonat (Übergang Nutzen/Lasten)" value={o.purchaseMonth} options={monthOptions}
          info="Ab diesem Monat laufen Kosten, Kredit und AfA. Für die Spekulationsfrist zählt das Datum des notariellen Kaufvertrags."
          onChange={(v) => up((d) => { d.object.purchaseMonth = v })} />
        <NumField label="Kaufjahr" plain digits={0} value={o.purchaseYear} min={2000} max={2060} onChange={(v) => up((d) => { d.object.purchaseYear = Math.round(v) })} />
      </Grid>
      <Line label="Kaufpreis pro m²" value={eur(a.kpis.pricePerM2)} />

      <Sub>Kaufpreisaufteilung Boden / Gebäude</Sub>
      <Seg value={o.landMode} onChange={(v) => up((d) => { d.object.landMode = v })} options={[
        { value: 'pct', label: 'Bodenanteil in %' }, { value: 'brw', label: 'Über Bodenrichtwert' },
      ]} info="Nur der Gebäudeanteil wird abgeschrieben. Grundlage: Aufteilung im Kaufvertrag (wenn plausibel), sonst Verhältnis der Verkehrswerte – z. B. mit der Arbeitshilfe des BMF. Geplant: gesetzliche Regelung in § 6f EStG (JStG 2026), Verkehrswertverhältnis nach ImmoWertV." />
      <Grid>
        {o.landMode === 'pct' ? (
          <NumField label="Bodenanteil" unit="%" digits={1} value={o.landPct} min={0} max={90} onChange={(v) => up((d) => { d.object.landPct = v })}
            hint="Typisch: Großstadt-ETW 15–35 %, ländlich 10–20 %, EFH in Top-Lage bis 60 %." />
        ) : (
          <>
            <NumField label="Bodenrichtwert" unit="€/m²" digits={0} value={o.brw} min={0} onChange={(v) => up((d) => { d.object.brw = v })}
              info="Aus BORIS (Bodenrichtwertinformationssystem) des Bundeslandes." />
            <NumField label={o.type === 'ETW' ? 'Grundstücksanteil (MEA × Fläche)' : 'Grundstücksfläche'} unit="m²" digits={1} value={o.landArea} min={0}
              onChange={(v) => up((d) => { d.object.landArea = v })}
              info="ETW: Miteigentumsanteil laut Teilungserklärung × Grundstücksfläche, z. B. 85/1000 × 700 m² = 59,5 m²." />
          </>
        )}
      </Grid>
      <Line label="Bodenanteil" value={pct(P.landShare)} />
      <Line label="Gebäudeanteil (AfA-Basis inkl. Nebenkosten)" value={eur(P.akBuilding)} />

      <Sub>Besondere Objekte</Sub>
      <Grid>
        <SelectField label="Denkmal / Sanierungsgebiet" value={o.special} wide options={[
          { value: 'none', label: 'Nein' }, { value: 'denkmal', label: 'Baudenkmal (§ 7i EStG)' }, { value: 'sanierung', label: 'Sanierungsgebiet (§ 7h EStG)' },
        ]} info="Erhöhte AfA auf die begünstigten Sanierungskosten: 8 Jahre je 9 %, danach 4 Jahre je 7 %. Voraussetzung: Bescheinigung der Denkmal- bzw. Gemeindebehörde, Abstimmung vor Beginn der Maßnahmen." onChange={(v) => up((d) => { d.object.special = v })} />
        {o.special !== 'none' && (
          <NumField label="Begünstigte Sanierungskosten" unit="€" digits={0} value={o.specialBase} min={0} wide
            hint="Teil der Gebäude-AK bzw. der Herstellungskosten, der laut Bescheinigung begünstigt ist."
            onChange={(v) => up((d) => { d.object.specialBase = v })} />
        )}
        <Toggle label="Neubau mit Baubeginn 10/2023 – 09/2029 (degressive AfA möglich)" checked={o.newBuildDegressive}
          info="§ 7 Abs. 5a EStG: 5 % degressiv vom Restwert für Wohngebäude, die nach dem 30.09.2023 und vor dem 01.10.2029 begonnen wurden (bzw. Kauf bis Ende des Fertigstellungsjahres). Auswahl der Methode unter „Steuern“."
          onChange={(v) => up((d) => { d.object.newBuildDegressive = v })} />
        <Toggle label="Sonder-AfA § 7b (Mietwohnungsneubau EH40/QNG)" checked={o.sonder7b}
          info="Zusätzlich 4 Jahre je 5 % auf max. 4.000 €/m² Bemessungsgrundlage. Voraussetzungen: neue Wohnung, Bauantrag 2023–2029, Effizienzhaus 40 mit QNG, Baukosten max. 5.200 €/m², 10 Jahre entgeltliche Vermietung."
          onChange={(v) => up((d) => { d.object.sonder7b = v })} />
      </Grid>
    </Acc>
  )
}

export function PurchaseCostsSection({ inp, up, a }: P) {
  const p = inp.purchase
  const P = a.sim.purchase
  const st = STATES[inp.object.state]
  return (
    <Acc id="purchase" title="2 · Kaufnebenkosten" summary={`${eur(P.acqCosts)} · ${pct(P.price ? P.acqCosts / P.price : 0)}`}>
      <Grid>
        <NumField label="Grunderwerbsteuer" unit="%" value={p.grest} min={0} max={10} disabled={p.familyExempt}
          info={`Satz ${st.name}: ${st.grest.toString().replace('.', ',')} %${st.note ? ` (${st.note})` : ''}. Bemessungsgrundlage ist der Kaufpreis ohne Inventar. Mitgekaufte Erhaltungsrücklage mindert sie nicht (BFH II R 49/17).`}
          onChange={(v) => up((d) => { d.purchase.grest = v })} />
        <NumField label="Makler (Käuferanteil)" unit="%" value={p.agent} min={0} max={10}
          info="Bei ETW und Einfamilienhäusern darf der Käufer höchstens so viel zahlen wie der Verkäufer (§ 656c/d BGB). Üblich: 3,57 % inkl. USt je Seite."
          onChange={(v) => up((d) => { d.purchase.agent = v })} />
        <NumField label="Notar (Kaufvertrag, Vollzug)" unit="%" value={p.notary} min={0} max={5}
          info="Nach GNotKG, ca. 1,0–1,5 % des Kaufpreises. Gehört zu den Anschaffungskosten." onChange={(v) => up((d) => { d.purchase.notary = v })} />
        <NumField label="Grundbuch (Eigentumsumschreibung)" unit="%" value={p.registry} min={0} max={3}
          info="Ca. 0,5 %. Anschaffungskosten." onChange={(v) => up((d) => { d.purchase.registry = v })} />
        <NumField label="Notar + Grundbuch Grundschuld" unit="% der Darlehen" value={p.mortgageFees} min={0} max={3}
          info="Kosten der Grundschuldbestellung (ca. 0,4–0,6 % der Grundschuld) sind Finanzierungskosten und sofort als Werbungskosten abziehbar." onChange={(v) => up((d) => { d.purchase.mortgageFees = v })} />
        <NumField label="Gutachten / Bausachverständiger" unit="€" digits={0} value={p.appraisal} min={0}
          info="Kosten nach der Kaufentscheidung gehören zu den Anschaffungskosten." onChange={(v) => up((d) => { d.purchase.appraisal = v })} />
        <NumField label="Sonstiges (Vollmachten, Auskünfte)" unit="€" digits={0} value={p.other} min={0} onChange={(v) => up((d) => { d.purchase.other = v })} />
        <Toggle label="Kauf von Eltern / Verwandten in gerader Linie (grunderwerbsteuerfrei)" checked={p.familyExempt}
          info="§ 3 Nr. 6 GrEStG: Erwerb durch Verwandte in gerader Linie (Kinder, Enkel, Eltern) und deren Ehegatten ist von der Grunderwerbsteuer befreit; Ehegatten untereinander nach § 3 Nr. 4."
          onChange={(v) => up((d) => { d.purchase.familyExempt = v })} />
      </Grid>
      <div className="lines">
        <Line label="Grunderwerbsteuer" value={eur(P.grest)} />
        <Line label="Notar + Grundbuch (Kauf)" value={eur(P.notary + P.registry)} />
        <Line label="Makler" value={eur(P.agent)} />
        <Line label="Gutachten + Sonstiges" value={eur(P.appraisal + P.other)} />
        <Line label="Nebenkosten (Anschaffungskosten)" value={eur(P.acqCosts)} strong />
        <Line label="Grundschuld (sofort Werbungskosten)" value={eur(P.mortgageFees)} />
      </div>
    </Acc>
  )
}

const kindOptions: { value: CostKind; label: string }[] = [
  { value: 'erhaltung', label: 'Erhaltung (sofort WK)' },
  { value: 'herstellung', label: 'Herstellung (AfA)' },
  { value: 'inventar', label: 'Inventar (10 J.)' },
]

export function RenovationSection({ inp, up, a }: P) {
  const R = inp.renovation
  const P = a.sim.purchase
  const total = R.items.reduce((s, i) => s + i.amount, 0)
  const ratio = P.nearCostsLimit > 0 ? P.nearCostsNet / P.nearCostsLimit : 0
  return (
    <Acc id="renovation" title="3 · Renovierung & Investitionen" summary={eur(total)}>
      <Sub>Vor Vermietung (im Kaufmonat bezahlt)</Sub>
      {R.items.length === 0 && <p className="muted small">Noch keine Posten.</p>}
      {R.items.map((it, idx) => (
        <div className="item" key={it.id}>
          <TextField label="Maßnahme" value={it.label} onChange={(v) => up((d) => { d.renovation.items[idx].label = v })} />
          <NumField label="Betrag (brutto)" unit="€" digits={0} value={it.amount} min={0} onChange={(v) => up((d) => { d.renovation.items[idx].amount = v })} />
          <SelectField label="Steuerlich" value={it.kind} options={kindOptions} onChange={(v) => up((d) => { d.renovation.items[idx].kind = v })} />
          {it.kind === 'erhaltung' && (
            <SelectField label="Verteilen (§ 82b EStDV)" value={it.spreadYears} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 1 ? 'sofort' : `${n} Jahre` }))}
              onChange={(v) => up((d) => { d.renovation.items[idx].spreadYears = v })} />
          )}
          <button type="button" className="icon-btn" aria-label="Posten löschen" onClick={() => up((d) => { d.renovation.items.splice(idx, 1) })}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn--sm" onClick={() => up((d) => { d.renovation.items.push({ id: uid(), label: '', amount: 0, kind: 'erhaltung', spreadYears: 1 }) })}>+ Posten</button>

      <div className={`meter${P.nearCostsExceeded ? ' is-over' : ratio > 0.8 ? ' is-near' : ''}`}>
        <div className="meter__head">
          <span>15-%-Grenze anschaffungsnahe Herstellungskosten</span>
          <span className="num">{eur(P.nearCostsNet)} / {eur(P.nearCostsLimit)}</span>
        </div>
        <div className="meter__bar"><span style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
        <div className="field__hint">
          Erhaltungsaufwand (netto, ohne USt) in den ersten 3 Jahren nach Kauf, inkl. späterer Posten bis Jahr 3. Wird die Grenze überschritten, ist alles nur über die Gebäude-AfA abschreibbar (§ 6 Abs. 1 Nr. 1a EStG). Jährlich übliche Erhaltung zählt nicht mit.
        </div>
      </div>

      <Sub>Spätere Investitionen, Sonderumlagen, Modernisierung</Sub>
      {R.later.length === 0 && <p className="muted small">Noch keine Posten.</p>}
      {R.later.map((it, idx) => (
        <div className="item item--later" key={it.id}>
          <TextField label="Maßnahme" value={it.label} onChange={(v) => up((d) => { d.renovation.later[idx].label = v })} />
          <NumField label="Betrag" unit="€" digits={0} value={it.amount} min={0} onChange={(v) => up((d) => { d.renovation.later[idx].amount = v })} />
          <NumField label="im Jahr" digits={0} value={it.year} min={1} max={40} onChange={(v) => up((d) => { d.renovation.later[idx].year = Math.round(v) })} />
          <SelectField label="Steuerlich" value={it.kind} options={kindOptions} onChange={(v) => up((d) => { d.renovation.later[idx].kind = v })} />
          {it.kind === 'erhaltung' && (
            <SelectField label="Verteilen" value={it.spreadYears} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 1 ? 'sofort' : `${n} Jahre` }))}
              onChange={(v) => up((d) => { d.renovation.later[idx].spreadYears = v })} />
          )}
          <Toggle label="Modernisierungsumlage 8 % (§ 559 BGB)" checked={it.modernisation}
            info="Erhöht die Jahresmiete um 8 % der Kosten (Kappung: max. 3 €/m² in 6 Jahren, unter 7 €/m² Miete max. 2 €/m²). Nur bei echter Modernisierung (z. B. Energieeinsparung), nicht bei Instandhaltung."
            onChange={(v) => up((d) => { d.renovation.later[idx].modernisation = v })} />
          <button type="button" className="icon-btn" aria-label="Posten löschen" onClick={() => up((d) => { d.renovation.later.splice(idx, 1) })}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn--sm" onClick={() => up((d) => { d.renovation.later.push({ id: uid(), label: '', amount: 0, kind: 'erhaltung', spreadYears: 1, year: 5, modernisation: false }) })}>+ Späterer Posten</button>
      <Grid>
        <NumField label="Förderzuschüsse (z. B. BEG, KfW)" unit="€" digits={0} value={R.subsidy} min={0}
          info="Zuschüsse mindern die Anschaffungs-/Herstellungskosten bzw. den Erhaltungsaufwand (R 21.5 EStR) und reduzieren den Kapitalbedarf."
          onChange={(v) => up((d) => { d.renovation.subsidy = v })} />
      </Grid>
      {inp.object.type !== 'ETW' && (
        <Note tone="warn">
          GEG-Nachrüstpflichten nach Eigentümerwechsel (EFH/ZFH, innerhalb von 2 Jahren): oberste Geschossdecke dämmen, Öl-/Gas-Konstanttemperaturkessel über 30 Jahre austauschen, ungedämmte Heizungs- und Warmwasserrohre dämmen. Beim Heizungstausch gilt die 65-%-Erneuerbare-Regel (mit Übergangsfristen nach kommunaler Wärmeplanung). Kosten hier als Posten erfassen.
        </Note>
      )}
    </Acc>
  )
}
