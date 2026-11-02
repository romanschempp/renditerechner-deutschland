import { linearAfaRate, TARIFF_2026 } from '../../engine/constants'
import type { Analysis } from '../../engine/analysis'
import { incomeTax, marginalRate } from '../../engine/incomeTax'
import type { Inputs } from '../../engine/types'
import { eur, num, pct } from '../../lib/format'
import type { Update } from '../../state/store'
import { Acc, Grid, Line, Note, NumField, Seg, Sub, Toggle } from '../ui/controls'

interface P { inp: Inputs; up: Update; a: Analysis }

export function TaxSection({ inp, up, a }: P) {
  const t = inp.tax
  const o = inp.object
  const P = a.sim.purchase
  const params = { filing: t.filing, church: t.church, index: 1 }
  const mr = marginalRate(t.zve, params)
  const est = incomeTax(t.zve, params)
  const lin = linearAfaRate(o.yearBuilt)
  const rate = t.afaMode === 'custom' ? t.customRate : t.afaMode === 'degressive' && o.newBuildDegressive ? 5 : lin
  const st = a.sim.stabilized
  const y1 = a.sim.years[0]
  return (
    <Acc id="tax" title="7 · Steuern" summary={t.mode === 'exact' ? `Grenzsteuersatz ${pct(mr, 1)}` : `${num(t.marginal, 1)} % pauschal`}>
      <Sub>Persönliche Situation</Sub>
      <Seg value={t.filing} onChange={(v) => up((d) => { d.tax.filing = v })} options={[
        { value: 'single', label: 'Einzelveranlagung' }, { value: 'joint', label: 'Zusammenveranlagung (Splitting)' },
      ]} />
      <Seg value={t.mode} onChange={(v) => up((d) => { d.tax.mode = v })} options={[
        { value: 'exact', label: 'Exakt nach Tarif', hint: 'Einkommensteuer mit und ohne Immobilie je Jahr' },
        { value: 'marginal', label: 'Fester Grenzsteuersatz', hint: 'Einfach: Ergebnis × Satz' },
      ]} info="Exakt: Für jedes Jahr wird die Einkommensteuer (§ 32a EStG) inkl. Soli und Kirchensteuer einmal mit und einmal ohne die Vermietungseinkünfte berechnet. Verluste mindern die Steuer auf das übrige Einkommen (Verlustausgleich), nicht ausgeglichene Verluste werden vorgetragen (§ 10d EStG)." />
      <Grid>
        {t.mode === 'exact' ? (
          <>
            <NumField label="Zu versteuerndes Einkommen ohne Immobilie" unit="€/Jahr" digits={0} value={t.zve} min={0}
              info="Aus dem letzten Steuerbescheid (zvE), ohne diese Immobilie. Bei Zusammenveranlagung: gemeinsames zvE."
              hint={`ESt ${eur(est.est)} · Soli ${eur(est.soli)}${est.church ? ` · KiSt ${eur(est.church)}` : ''} · Grenzsteuersatz ${pct(mr, 1)}`}
              onChange={(v) => up((d) => { d.tax.zve = v })} />
            <NumField label="Einkommensentwicklung" unit="% p. a." value={t.zveGrowth} min={-10} max={20} onChange={(v) => up((d) => { d.tax.zveGrowth = v })} />
            <Seg label="Kirchensteuer" size="sm" wide={false} value={String(t.church) as '0' | '8' | '9'} onChange={(v) => up((d) => { d.tax.church = Number(v) as 0 | 8 | 9 })} options={[
              { value: '0', label: 'keine' }, { value: '8', label: '8 % (BY, BW)' }, { value: '9', label: '9 %' },
            ]} />
            <Toggle label="Tarifeckwerte mit Inflation fortschreiben" checked={t.indexTariff}
              info={`Grundfreibetrag ${eur(TARIFF_2026.basicAllowance)} (2026) wird jährlich angepasst. Ohne Fortschreibung steigt die Steuerlast bei wachsendem Einkommen schneller (kalte Progression).`}
              onChange={(v) => up((d) => { d.tax.indexTariff = v })} />
            {t.indexTariff && <NumField label="Fortschreibung" unit="% p. a." value={t.tariffIndex} min={0} max={10} onChange={(v) => up((d) => { d.tax.tariffIndex = v })} />}
          </>
        ) : (
          <NumField label="Grenzsteuersatz inkl. Soli/KiSt" unit="%" value={t.marginal} min={0} max={55} onChange={(v) => up((d) => { d.tax.marginal = v })} />
        )}
      </Grid>

      <Sub>Abschreibung (AfA)</Sub>
      <Seg value={t.afaMode} onChange={(v) => up((d) => { d.tax.afaMode = v })} options={[
        { value: 'auto', label: `Linear ${num(lin, 1)} %` },
        { value: 'degressive', label: 'Degressiv 5 %' },
        { value: 'custom', label: 'Kürzere Nutzungsdauer' },
      ]} info="Linear nach Baujahr (§ 7 Abs. 4). Degressiv nur für Neubauten (§ 7 Abs. 5a), mit automatischem Wechsel zur linearen AfA, sobald diese höher ist. Kürzere tatsächliche Nutzungsdauer per Gutachten eines Sachverständigen (§ 7 Abs. 4 S. 2) – z. B. 40 Jahre Restnutzungsdauer = 2,5 %." />
      {t.afaMode === 'custom' && (
        <Grid>
          <NumField label="Restnutzungsdauer laut Gutachten" unit="Jahre" digits={0} value={Math.round(100 / Math.max(0.1, t.customRate))} min={5} max={100}
            onChange={(v) => up((d) => { d.tax.customRate = 100 / Math.max(5, v) })} hint={`= ${num(t.customRate, 2)} % p. a.`} />
        </Grid>
      )}
      {t.afaMode === 'degressive' && !o.newBuildDegressive && <Note tone="warn">Degressive AfA nur bei Neubau mit Baubeginn 10/2023–09/2029 (unter „Objekt“ aktivieren).</Note>}
      <div className="lines">
        <Line label="Gebäudeanteil Kaufpreis + Nebenkosten" value={eur(P.akBuilding)} />
        <Line label="Aktivierte Herstellungskosten" value={eur(Math.max(0, a.sim.akTotal - P.akLand - P.akBuilding))} />
        <Line label="Inventar (10 Jahre)" value={eur(P.akInventory)} />
        <Line label={`AfA-Satz Gebäude`} value={`${num(rate, 2)} %`} />
        {y1 && <Line label={`AfA ${y1.year} (anteilig ab Kaufmonat)`} value={eur(y1.afaBuilding + y1.afaSpecial + y1.afaInventory)} />}
        {st && <Line label={`AfA ${st.year}`} value={eur(st.afaBuilding + st.afaSpecial + st.afaInventory)} strong />}
      </div>
      <Note>
        Werbungskosten: Schuldzinsen, Finanzierungskosten, AfA, Erhaltungsaufwand, nicht umgelegte Nebenkosten, Grundsteuer, Verwaltung, Versicherungen, Fahrtkosten, Steuerberatung, Kontoführung. Tilgung ist nicht abziehbar. Kosten in Phasen ohne Vermietungsabsicht (Eigennutzung, unentgeltliche Überlassung) sind nicht abziehbar.
      </Note>
    </Acc>
  )
}
