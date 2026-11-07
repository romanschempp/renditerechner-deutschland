import { GIFT_ALLOWANCE_CHILD, lifeFactor } from '../../engine/constants'
import type { Analysis } from '../../engine/analysis'
import type { Inputs } from '../../engine/types'
import { eur, num, pct } from '../../lib/format'
import type { Update } from '../../state/store'
import { Acc, Grid, Line, Note, NumField, Seg, Sub, TextField, Toggle } from '../ui/controls'

interface P { inp: Inputs; up: Update; a: Analysis }

export function FamilySection({ inp, up, a }: P) {
  const f = inp.family
  const tr = a.sim.transfer
  return (
    <Acc id="family" title="8 · Familie & Übertragung" summary={f.enabled ? (f.transfer === 'none' ? 'aktiv' : 'mit Übertragung') : 'aus'}>
      <Toggle label="Familienmodelle berechnen (Kind, Schenkung, Nießbrauch)" checked={f.enabled} onChange={(v) => up((d) => { d.family.enabled = v })}
        hint="Zeigt den Familienvergleich in den Ergebnissen: Fremdvermietung, Vermietung an Kind, unentgeltliche Überlassung, Schenkung, Nießbrauch, Verkauf an Kind." />
      {f.enabled && (
        <>
          <Sub>Kind</Sub>
          <Grid>
            <TextField label="Name" value={f.child.name} onChange={(v) => up((d) => { d.family.child.name = v })} />
            <NumField label="Alter heute" unit="Jahre" digits={0} value={f.child.age} min={0} max={80} onChange={(v) => up((d) => { d.family.child.age = Math.round(v) })} />
            <NumField label="Kindergeldberechtigt bis" plain digits={0} value={f.child.kindergeldUntil} min={2000} max={2100}
              info="Kindergeld in der Regel bis 25 bei Ausbildung/Studium. Nur solange zählt die unentgeltliche Überlassung als eigene Nutzung für § 23 EStG (BMF 05.10.2000, Rz. 23)."
              onChange={(v) => up((d) => { d.family.child.kindergeldUntil = Math.round(v) })} />
            <NumField label="Eigenes zvE des Kindes" unit="€/Jahr" digits={0} value={f.child.zve} min={0}
              info="Nach einer Übertragung versteuert das Kind die Mieteinkünfte. Bei geringem Einkommen fällt dank Grundfreibetrag oft wenig Steuer an (Einkünfteverlagerung)."
              onChange={(v) => up((d) => { d.family.child.zve = v })} />
          </Grid>

          <Sub>Vermietung an Kind</Sub>
          <Toggle label={`Wohnung an ${f.child.name || 'das Kind'} vermieten`} checked={f.rentToChild}
            info="Ersetzt im gewählten Zeitraum die Phasen unter „5 · Nutzung“ (ein Leerstand bleibt). § 21 Abs. 2 EStG: ab 66 % der ortsüblichen Warmmiete voller Werbungskostenabzug; 50–66 % nur mit positiver Totalüberschussprognose; darunter anteilig."
            onChange={(v) => up((d) => { d.family.rentToChild = v })} />
          {f.rentToChild && (
            <Grid>
              <NumField label="Miete in % der ortsüblichen Warmmiete" unit="%" digits={0} value={f.rentPct} min={0} max={150}
                hint={`${eur((f.rentPct / 100) * (inp.rent.localRent + inp.costs.umlage))} warm / Monat · ${f.rentPct >= 66 ? 'voller Werbungskostenabzug' : f.rentPct >= 50 ? 'Totalüberschussprognose entscheidet' : 'Werbungskosten nur anteilig'}`}
                onChange={(v) => up((d) => { d.family.rentPct = v })} />
              <NumField label="Ab" unit="Jahren nach Kauf" digits={1} value={f.rentFromYear} min={0} max={40}
                hint={`≈ ${inp.object.purchaseYear + Math.floor((inp.object.purchaseMonth - 1 + f.rentFromYear * 12) / 12)}`}
                onChange={(v) => up((d) => { d.family.rentFromYear = v })} />
              <NumField label="Dauer" unit="Jahre" digits={1} value={f.rentYears || null} min={0} max={60} placeholder="bis Ende"
                onChange={(v) => up((d) => { d.family.rentYears = v })} />
            </Grid>
          )}
          {f.rentToChild && (
            <Note tone="warn">
              Fremdvergleich: schriftlicher Mietvertrag, Miete tatsächlich und regelmäßig vom Konto des Kindes, Nebenkostenabrechnung, Kind volljährig mit eigenem Haushalt. Zahlung aus dem Barunterhalt der Eltern ist zulässig (BFH IX R 30/98), eine bloße Verrechnung mit dem Unterhalt nicht. Abzugsquote aktuell {pct(a.sim.childQuota, 0)}{a.sim.childTup != null ? `, Totalüberschussprognose ${eur(a.sim.childTup)}` : ''}.
            </Note>
          )}

          <Sub>Übertragung der Immobilie</Sub>
          <Seg value={f.transfer} onChange={(v) => up((d) => { d.family.transfer = v })} options={[
            { value: 'none', label: 'Keine' },
            { value: 'gift', label: 'Schenkung' },
            { value: 'usufruct', label: 'Schenkung mit Nießbrauch' },
            { value: 'saleToChild', label: 'Verkauf an Kind' },
          ]} />
          {f.transfer !== 'none' && (
            <Grid>
              <NumField label="Übertragung nach" unit="Jahren" digits={1} value={f.transferYear} min={0.1} max={40} onChange={(v) => up((d) => { d.family.transferYear = v })}
                hint={`≈ ${inp.object.purchaseYear + Math.floor((inp.object.purchaseMonth - 1 + f.transferYear * 12) / 12)}`} />
              <Seg label="Schenkende" size="sm" wide={false} value={String(f.donors) as '1' | '2'} onChange={(v) => up((d) => { d.family.donors = Number(v) as 1 | 2 })} options={[
                { value: '1', label: 'ein Elternteil' }, { value: '2', label: 'beide (je ½)' },
              ]} info={`Freibetrag ${eur(GIFT_ALLOWANCE_CHILD)} je Elternteil und Kind, alle 10 Jahre neu (§ 16, § 14 ErbStG).`} />
              <NumField label="Frühere Schenkungen (10 Jahre)" unit="€" digits={0} value={f.priorGifts} min={0} onChange={(v) => up((d) => { d.family.priorGifts = v })} />
              <NumField label="Steuerwert (Bedarfswert)" unit="€" digits={0} value={f.taxValue || null} min={0} placeholder="= Verkehrswert"
                info="Für die Schenkungsteuer gilt der Grundbesitzwert (meist Vergleichs- oder Ertragswertverfahren). Leer lassen = prognostizierter Verkehrswert. Ein niedrigeres Verkehrswertgutachten ist möglich (§ 198 BewG)."
                onChange={(v) => up((d) => { d.family.taxValue = v })} />
              {f.transfer === 'gift' && (
                <Toggle label="Kind übernimmt die Darlehen (gemischte Schenkung)" checked={f.debtAssumed}
                  info="Die übernommenen Schulden sind ein Entgelt: Insoweit liegt eine Veräußerung der Eltern vor (§ 23 bei < 10 Jahren!) und das Kind hat neue Anschaffungskosten (neue AfA). Der Rest ist unentgeltlich: Das Kind führt AfA und Fristen fort (§ 11d EStDV)."
                  onChange={(v) => up((d) => { d.family.debtAssumed = v })} />
              )}
              {f.transfer === 'usufruct' && (
                <>
                  <NumField label="Alter des Schenkenden" unit="Jahre" digits={0} value={f.parentAge} min={18} max={100} onChange={(v) => up((d) => { d.family.parentAge = Math.round(v) })}
                    hint={`Alter bei Übertragung ${num(f.parentAge + f.transferYear, 0)} → Vervielfältiger ${num(lifeFactor(f.parentAge + f.transferYear, f.parentSex), 3)}`} />
                  <Seg label="Geschlecht (Sterbetafel)" size="sm" wide={false} value={f.parentSex} onChange={(v) => up((d) => { d.family.parentSex = v })} options={[{ value: 'm', label: 'männlich' }, { value: 'w', label: 'weiblich' }]} />
                </>
              )}
              {f.transfer === 'saleToChild' && (
                <>
                  <NumField label="Kaufpreis Kind" unit="€" digits={0} value={f.salePrice} min={0}
                    info="Unter dem Verkehrswert ist der Differenzbetrag eine Schenkung (teilentgeltlich). Keine Grunderwerbsteuer (§ 3 Nr. 6 GrEStG)." onChange={(v) => up((d) => { d.family.salePrice = v })} />
                  <NumField label="Zins Darlehen Kind" unit="%" value={f.childLoanRate} min={0} max={15} onChange={(v) => up((d) => { d.family.childLoanRate = v })} />
                  <NumField label="Tilgung Darlehen Kind" unit="%" value={f.childLoanRepay} min={0} max={15} onChange={(v) => up((d) => { d.family.childLoanRepay = v })} />
                </>
              )}
            </Grid>
          )}
          {tr && (
            <div className="lines">
              <Line label={`Verkehrswert bei Übertragung (${tr.year})`} value={eur(tr.value)} />
              {tr.kind === 'usufruct' && (
                <>
                  <Line label="Jahreswert Nießbrauch (max. Steuerwert ÷ 18,6)" value={eur(tr.usufructAnnual)} />
                  <Line label={`Kapitalwert Nießbrauch (× ${num(tr.usufructFactor, 3)})`} value={`− ${eur(tr.usufructCapital)}`} />
                </>
              )}
              {tr.consideration > 0 && <Line label={`Entgelt (${pct(tr.entgeltShare, 0)} entgeltlich)`} value={eur(tr.consideration)} />}
              <Line label="Steuerpflichtige Bereicherung (nach 10 % Abschlag § 13d)" value={eur(tr.enrichment)} />
              <Line label="Schenkungsteuer" value={eur(tr.giftTax)} strong />
              <Line label="Grunderwerbsteuer gespart" value={eur(tr.grestSaved)} />
              {tr.consideration > 0 && <Line label={`Gewinn Eltern (§ 23) ${tr.parentGainTaxable ? '– steuerpflichtig' : '– steuerfrei'}`} value={eur(tr.parentGain)} />}
              {tr.newAfaBase > 0 && <Line label="Neue AfA-Bemessungsgrundlage beim Kind" value={eur(tr.newAfaBase)} />}
            </div>
          )}
          <Note>
            Hinweise: Nach einer Schenkung führt das Kind Anschaffungskosten, AfA und die 10-Jahres-Frist der Eltern fort. Beim Nießbrauchsvorbehalt behalten die Eltern Mieten, Kosten und AfA; der Wertzuwachs entsteht schon beim Kind. Rückforderungsrechte (Notarvertrag), Pflichtteilsergänzung (10 % Abschmelzung je Jahr, beim Nießbrauch erst ab dessen Ende) und Sozialhilfe-Regress (§ 528 BGB, 10 Jahre) beachten.
          </Note>
        </>
      )}
    </Acc>
  )
}
