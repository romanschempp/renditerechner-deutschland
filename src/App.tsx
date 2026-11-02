import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { analyse } from './engine/analysis'
import { LEGAL_DATE } from './engine/constants'
import { exportCsv, exportJson, exportPdf } from './lib/export'
import { useStore } from './state/store'
import { ObjectSection, PurchaseCostsSection, RenovationSection } from './components/sections/BuySections'
import { FinanceSection } from './components/sections/FinanceSection'
import { UsageSection } from './components/sections/UsageSection'
import { CostsSection } from './components/sections/CostsSection'
import { TaxSection } from './components/sections/TaxSection'
import { FamilySection } from './components/sections/FamilySection'
import { AssumptionsSection, SaleSection } from './components/sections/SaleSection'
import { Hero, KpiGrid, Warnings } from './components/results/Summary'
import { LoanTable, SaleBlock, TaxTable, YearTable } from './components/results/Tables'
import { CapitalChart, CashflowChart, CostsChart, HoldChart, LoanChart, ReturnChart, Tornado, WealthChart } from './components/results/Charts'
import { FamilyCompare } from './components/results/Family'
import { Knowledge } from './components/results/Knowledge'
import { Seg } from './components/ui/controls'

type Tab = 'overview' | 'years' | 'tax' | 'sale' | 'family' | 'info'

export default function App() {
  const store = useStore()
  const { state, current, update } = store
  const inputs = useDeferredValue(current.inputs)
  const calc = useDeferredValue(state.calc)
  const a = useMemo(() => analyse(inputs, calc), [inputs, calc])
  const [tab, setTab] = useState<Tab>('overview')
  const [mobile, setMobile] = useState<'inputs' | 'results'>('inputs')
  const [printing, setPrinting] = useState(false)
  const [pdfState, setPdfState] = useState<'idle' | 'busy' | 'error'>('idle')
  const resultsRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stale = inputs !== current.inputs || calc !== state.calc
  const { offlineReady: [offlineReady, setOfflineReady], needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()

  const tabs: { key: Tab; label: string; hide?: boolean }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'years', label: 'Jahre & Kredit' },
    { key: 'tax', label: 'Steuern' },
    { key: 'sale', label: 'Verkauf' },
    { key: 'family', label: 'Familie', hide: !current.inputs.family.enabled },
    { key: 'info', label: 'Wissen' },
  ]
  const show = (t: Tab) => printing || tab === t

  const pdf = async () => {
    setPdfState('busy')
    setPrinting(true)
    await new Promise((r) => setTimeout(r, 400))
    try {
      if (resultsRef.current) await exportPdf(current.inputs.object.name, resultsRef.current)
      setPdfState('idle')
    } catch {
      setPdfState('error')
    } finally {
      setPrinting(false)
    }
  }

  const name = current.inputs.object.name

  return (
    <div className={`app app--tab-${mobile} app--calc-${state.calc}`}>
      <header className="top">
        <div className="top__inner">
          <div className="brand">
            <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden><rect width="32" height="32" rx="3" fill="var(--hero-bg)" /><path d="M7 23V14l9-6 9 6v9h-6v-6h-6v6z" fill="var(--hero-gold)" /></svg>
            <div>
              <h1>Renditerechner Deutschland</h1>
              <span className="brand__sub">Kauf · Vermietung · Verkauf · Steuern · Familie</span>
            </div>
          </div>
          <div className="objbar">
            <select aria-label="Objekt wählen" value={state.currentId} onChange={(e) => store.select(e.target.value)}>
              {state.objects.map((o) => <option key={o.id} value={o.id}>{o.inputs.object.name || 'Ohne Namen'}</option>)}
            </select>
            <button type="button" className="btn btn--sm" onClick={store.add}>Neu</button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={store.duplicate}>Kopie</button>
            <button type="button" className="btn btn--sm btn--danger" onClick={() => { if (confirm(`Objekt „${name}“ löschen? Das lässt sich nicht rückgängig machen.`)) store.remove() }}>Löschen</button>
            <details className="menu">
              <summary className="btn btn--sm btn--ghost">Mehr</summary>
              <div className="menu__pop">
                <button type="button" onClick={() => { if (confirm('Aktuelles Objekt durch das Beispiel ersetzen?')) store.loadExample() }}>Beispiel „Leipzig“ laden</button>
                <button type="button" onClick={() => exportCsv(name, a)}>Jahrestabelle als CSV</button>
                <button type="button" onClick={() => exportJson(state)}>Alle Objekte sichern (JSON)</button>
                <button type="button" onClick={() => fileRef.current?.click()}>Objekte importieren (JSON)</button>
              </div>
            </details>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try { store.importJson(await f.text()) } catch { alert('Die Datei konnte nicht gelesen werden.') }
              e.target.value = ''
            }} />
            <span className="saved small">{store.savedAt ? 'Automatisch gespeichert' : ''}</span>
          </div>
        </div>
        <div className="modebar">
          <div className="modebar__inner">
            <Seg wide={false} value={state.calc} onChange={store.setCalc} options={[
              { value: 'rent', label: 'A · Ohne Verkauf', hint: 'Behalten und vermieten' },
              { value: 'sale', label: 'B · Mit Verkauf', hint: `Verkauf nach ${current.inputs.sale.years} Jahren` },
            ]} />
            <div className="peek">
              <span>EK {a.mode === 'sale' ? 'IRR' : a.kpis.stabYear ?? ''} <b className="num">{fmtPct(a.mode === 'sale' ? a.kpis.irrEk : a.kpis.ekReturn)}</b></span>
              <span>GK <b className="num">{fmtPct(a.mode === 'sale' ? a.kpis.irrGk : a.kpis.gkReturn)}</b></span>
              <span>CF <b className="num">{Math.round(a.kpis.cfPostMonth).toLocaleString('de-DE')} €</b></span>
            </div>
            <button type="button" className="btn btn--pdf btn--sm" onClick={pdf} disabled={pdfState === 'busy'}>
              {pdfState === 'busy' ? 'PDF wird erstellt …' : 'PDF'}
            </button>
          </div>
        </div>
        <nav className="mtabs" aria-label="Ansicht">
          <button type="button" className={mobile === 'inputs' ? 'is-on' : ''} onClick={() => setMobile('inputs')}>Eingaben</button>
          <button type="button" className={mobile === 'results' ? 'is-on' : ''} onClick={() => setMobile('results')}>Ergebnisse</button>
        </nav>
      </header>

      {(offlineReady || needRefresh) && (
        <div className="toast" role="status">
          <span>{needRefresh ? 'Neue Version verfügbar.' : 'Die App funktioniert jetzt auch offline.'}</span>
          {needRefresh && <button type="button" className="btn btn--sm btn--primary" onClick={() => updateServiceWorker(true)}>Neu laden</button>}
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}>Schließen</button>
        </div>
      )}
      {pdfState === 'error' && <div className="toast toast--err" role="alert">Das PDF konnte nicht erstellt werden. Bitte erneut versuchen. <button type="button" className="btn btn--sm btn--ghost" onClick={() => setPdfState('idle')}>OK</button></div>}

      <main className="cols">
        <div className="col col--inputs">
          <ObjectSection inp={current.inputs} up={update} a={a} />
          <PurchaseCostsSection inp={current.inputs} up={update} a={a} />
          <RenovationSection inp={current.inputs} up={update} a={a} />
          <FinanceSection inp={current.inputs} up={update} a={a} />
          <UsageSection inp={current.inputs} up={update} a={a} />
          <CostsSection inp={current.inputs} up={update} a={a} />
          <TaxSection inp={current.inputs} up={update} a={a} />
          <FamilySection inp={current.inputs} up={update} a={a} />
          {state.calc === 'sale' && <SaleSection inp={current.inputs} up={update} a={a} />}
          <AssumptionsSection inp={current.inputs} up={update} a={a} />
          <p className="disclaimer small">Keine Steuer-, Rechts- oder Anlageberatung. Rechtsstand {LEGAL_DATE}. Alle Werte sind Annahmen und vor einer Entscheidung mit Steuerberater bzw. Notar zu prüfen.</p>
        </div>

        <div className={`col col--results${stale ? ' is-stale' : ''}`}>
          <nav className="rtabs" aria-label="Ergebnisse">
            {tabs.filter((t) => !t.hide).map((t) => (
              <button type="button" key={t.key} className={tab === t.key ? 'is-on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </nav>
          <div ref={resultsRef} className={`results${printing ? ' is-print' : ''}`}>
            {printing && <h2 className="print-title">{name} · {state.calc === 'sale' ? `Mit Verkauf nach ${current.inputs.sale.years} Jahren` : 'Ohne Verkauf'}</h2>}
            {show('overview') && (
              <section className="panel">
                <Hero inp={inputs} a={a} />
                <Warnings a={a} />
                <KpiGrid inp={inputs} a={a} />
                <div className="charts">
                  <ReturnChart a={a} />
                  <CashflowChart a={a} />
                  <WealthChart a={a} />
                  <CapitalChart a={a} />
                </div>
                <Tornado a={a} />
              </section>
            )}
            {show('years') && (
              <section className="panel">
                <h3 className="panel__title">Jahresübersicht</h3>
                <YearTable a={a} />
                <div className="charts">
                  <CostsChart a={a} />
                  <LoanChart a={a} />
                </div>
                <h3 className="panel__title">Tilgungsplan</h3>
                <LoanTable a={a} />
              </section>
            )}
            {show('tax') && (
              <section className="panel">
                <h3 className="panel__title">Steuern pro Jahr (wie Anlage V)</h3>
                <TaxTable inp={inputs} a={a} />
              </section>
            )}
            {show('sale') && (
              <section className="panel">
                <h3 className="panel__title">{a.mode === 'sale' ? `Verkauf nach ${current.inputs.sale.years} Jahren` : 'Verkauf'}</h3>
                {a.mode === 'sale' ? <SaleBlock a={a} /> : (
                  <p className="muted">Oben auf „B · Mit Verkauf“ umschalten, um Verkaufspreis, Steuer auf den Veräußerungsgewinn und Szenarien zu sehen.</p>
                )}
                <HoldChart a={a} />
              </section>
            )}
            {show('family') && current.inputs.family.enabled && (
              <section className="panel">
                <h3 className="panel__title">Familienvergleich</h3>
                <FamilyCompare inp={inputs} a={a} />
              </section>
            )}
            {show('info') && !printing && (
              <section className="panel">
                <h3 className="panel__title">Wissen & Checklisten</h3>
                <Knowledge />
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function fmtPct(v: number | null) {
  return v == null || !isFinite(v) ? '–' : `${(v * 100).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`
}
